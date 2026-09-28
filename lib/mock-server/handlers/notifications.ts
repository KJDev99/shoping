import "server-only";

import { adminRefOf, nextId, type MockDb } from "@/lib/mock/db";
import { notificationCreateSchema, notificationEstimateSchema, type NotificationTargetInput } from "@/schemas/notification.schema";
import type { Notification, NotificationChannel, User, UserSegment } from "@/types";
import { audit, requirePermission } from "../context";
import { csv, HttpError, inDateRange, matchesSearch, notFound, ok, paginate, parseListParams, sortItems, unprocessable, validate } from "../http";
import { route } from "../router";

const DAY = 86_400_000;

/** Users that can receive notifications (deleted and blocked accounts are excluded). */
function reachable(u: User) {
  return u.status !== "DELETED" && u.status !== "BLOCKED";
}

function inSegment(u: User, segment: UserSegment, now: number) {
  const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : 0;
  switch (segment) {
    case "NEW_USERS":
      return now - new Date(u.createdAt).getTime() <= 30 * DAY;
    case "ACTIVE_TRADERS":
      return u.completedExchanges >= 1 && now - lastActive <= 30 * DAY;
    case "INACTIVE_30D":
      return now - lastActive > 30 * DAY;
    case "NO_LISTINGS":
      return u.listingsCount === 0;
    case "HIGH_RATED":
      return (u.rating ?? 0) >= 4.5 && u.reviewsCount >= 3;
  }
}

export function recipientsFor(db: MockDb, target: NotificationTargetInput): User[] {
  const now = Date.now();
  const users = db.users.filter(reachable);
  switch (target.kind) {
    case "ALL":
      return users;
    case "USERS": {
      const ids = new Set(target.userIds);
      return users.filter((u) => ids.has(u.id));
    }
    case "REGION": {
      const ids = new Set(target.regionIds);
      return users.filter((u) => ids.has(u.regionId));
    }
    case "SEGMENT":
      return users.filter((u) => inSegment(u, target.segment, now));
  }
}

/** Channel availability derived from platform settings (providers for Push/Email/SMS are not integrated yet). */
function channelAvailability(db: MockDb): Record<NotificationChannel, boolean> {
  const s = db.settings.notifications;
  return { IN_APP: s.enableInApp, PUSH: s.enablePush, EMAIL: s.enableEmail, SMS: s.enableSms };
}

/** Delivers scheduled notifications whose time has come (a real backend runs a job queue). */
function deliverDue(db: MockDb) {
  const now = Date.now();
  for (const n of db.notifications) {
    if (n.status === "SCHEDULED" && n.scheduledAt && new Date(n.scheduledAt).getTime() <= now) {
      n.status = "SENT";
      n.sentAt = n.scheduledAt;
      n.recipientsCount = recipientsFor(db, n.target).length;
    }
  }
}

function present(db: MockDb, n: Notification): Notification {
  return { ...n, createdBy: adminRefOf(db, n.createdBy.id) };
}

function findNotification(db: MockDb, id: string) {
  const n = db.notifications.find((x) => x.id === id);
  if (!n) throw notFound("Notification not found");
  return n;
}

function targetLabel(target: NotificationTargetInput) {
  switch (target.kind) {
    case "ALL":
      return "all users";
    case "USERS":
      return `${target.userIds.length} users`;
    case "REGION":
      return `regions: ${target.regionIds.join(", ")}`;
    case "SEGMENT":
      return `segment: ${target.segment}`;
  }
}

export const notificationRoutes = [
  route("GET", "/notifications", (ctx) => {
    requirePermission(ctx, "notifications.read");
    deliverDue(ctx.db);
    const p = parseListParams(ctx.url, { sort: "createdAt", order: "desc" });
    const f = p.filters;
    const statuses = csv(f.status);
    const types = csv(f.type);
    const targets = csv(f.targetKind);
    let items = ctx.db.notifications.filter(
      (n) =>
        (!statuses.length || statuses.includes(n.status)) &&
        (!types.length || types.includes(n.type)) &&
        (!targets.length || targets.includes(n.target.kind)) &&
        inDateRange(n.createdAt, f.from, f.to) &&
        matchesSearch(p.search, n.title, n.id),
    );
    items = sortItems(items, p.sort, p.order, {
      title: (n) => n.title,
      recipientsCount: (n) => n.recipientsCount,
      readRate: (n) => (n.recipientsCount ? n.readCount / n.recipientsCount : null),
      scheduledAt: (n) => n.scheduledAt ?? n.sentAt,
      sentAt: (n) => n.sentAt,
      createdAt: (n) => n.createdAt,
    });
    return paginate(
      items.map((n) => present(ctx.db, n)),
      p,
    );
  }),

  route("GET", "/notifications/channels", (ctx) => {
    requirePermission(ctx, "notifications.read");
    return ok(channelAvailability(ctx.db));
  }),

  route("GET", "/notifications/user-options", (ctx) => {
    requirePermission(ctx, "notifications.send");
    const search = ctx.url.searchParams.get("search")?.trim() || undefined;
    const ids = csv(ctx.url.searchParams.get("ids") ?? undefined);
    const users = ids.length
      ? ctx.db.users.filter((u) => ids.includes(u.id))
      : ctx.db.users.filter((u) => reachable(u) && matchesSearch(search, u.fullName, u.phone, u.id, u.username)).slice(0, 20);
    return ok(users.map((u) => ({ id: u.id, fullName: u.fullName, phone: u.phone, avatar: u.avatar })));
  }),

  route("POST", "/notifications/estimate", (ctx) => {
    requirePermission(ctx, "notifications.send");
    const { target } = validate(notificationEstimateSchema, ctx.body);
    return ok({ recipientsCount: recipientsFor(ctx.db, target).length });
  }),

  route("GET", "/notifications/:id", (ctx) => {
    requirePermission(ctx, "notifications.read");
    deliverDue(ctx.db);
    return ok(present(ctx.db, findNotification(ctx.db, ctx.params.id)));
  }),

  route("POST", "/notifications", (ctx) => {
    requirePermission(ctx, "notifications.send");
    const input = validate(notificationCreateSchema, ctx.body);
    const available = channelAvailability(ctx.db);
    const disabled = input.channels.filter((c) => !available[c]);
    if (disabled.length) {
      throw unprocessable({ channels: ["notifications.validation.channelDisabled"] }, `Channel not enabled: ${disabled.join(", ")}`);
    }
    if (input.target.kind === "REGION") {
      const unknown = input.target.regionIds.filter((id) => !ctx.db.regions.some((r) => r.id === id));
      if (unknown.length) throw unprocessable({ "target.regionIds": ["validation.invalid"] });
    }
    const recipients = recipientsFor(ctx.db, input.target).length;
    if (recipients === 0) throw unprocessable({ target: ["notifications.validation.noRecipients"] }, "The selected audience has no recipients");

    const now = new Date().toISOString();
    const scheduled = !!input.scheduledAt;
    const notification: Notification = {
      id: nextId(ctx.db, "ntf"),
      type: input.type,
      title: input.title,
      message: input.message,
      target: input.target,
      channels: [...new Set(input.channels)],
      status: scheduled ? "SCHEDULED" : "SENT",
      recipientsCount: recipients,
      readCount: 0,
      createdBy: adminRefOf(ctx.db, ctx.session.admin.id),
      scheduledAt: input.scheduledAt ?? null,
      sentAt: scheduled ? null : now,
      createdAt: now,
    };
    ctx.db.notifications.unshift(notification);
    audit(ctx, {
      action: scheduled ? "notification.schedule" : "notification.send",
      entityType: "NOTIFICATION",
      entityId: notification.id,
      entityLabel: notification.title,
      newValue: {
        type: notification.type,
        target: targetLabel(notification.target),
        channels: notification.channels,
        recipientsCount: recipients,
        scheduledAt: notification.scheduledAt,
      },
    });
    return ok(notification, scheduled ? "Notification scheduled" : "Notification sent", { status: 201 });
  }),

  route("POST", "/notifications/:id/cancel", (ctx) => {
    requirePermission(ctx, "notifications.send");
    deliverDue(ctx.db);
    const n = findNotification(ctx.db, ctx.params.id);
    if (n.status !== "SCHEDULED" && n.status !== "DRAFT") throw new HttpError(409, "Only scheduled or draft notifications can be cancelled", "NOT_CANCELLABLE");
    const old = n.status;
    n.status = "CANCELLED";
    audit(ctx, { action: "notification.cancel", entityType: "NOTIFICATION", entityId: n.id, entityLabel: n.title, oldValue: { status: old }, newValue: { status: n.status } });
    return ok(present(ctx.db, n), "Notification cancelled");
  }),
];
