import "server-only";

import { adminRefOf, nextId, presentExchange, userRefOf, type MockDb } from "@/lib/mock/db";
import {
  cancelExchangeSchema,
  disputeBlockSchema,
  disputeCloseSchema,
  disputeSuspendSchema,
  disputeWarnSchema,
} from "@/schemas/exchange.schema";
import type { DisputeDetail, ExchangeDetail } from "@/services/exchanges.service";
import type { Dispute, DisputeEvent, Exchange, User } from "@/types";
import { audit, recordModeration, requirePermission, type AuthedContext } from "../context";
import {
  conflict,
  csv,
  inDateRange,
  matchesSearch,
  notFound,
  ok,
  paginate,
  parseListParams,
  sortItems,
  unprocessable,
  validate,
} from "../http";
import { route } from "../router";
import { itemDetailsFor, participantInfoFor } from "./barter";

function findExchange(db: MockDb, id: string): Exchange {
  const ex = db.exchanges.find((e) => e.id === id || e.code === id);
  if (!ex) throw notFound("Exchange not found");
  return ex;
}

function findDispute(db: MockDb, exchangeId: string): { exchange: Exchange; dispute: Dispute } {
  const exchange = findExchange(db, exchangeId);
  const dispute = exchange.disputeId ? db.disputes.find((d) => d.id === exchange.disputeId) : undefined;
  if (!dispute) throw notFound("This exchange has no dispute");
  return { exchange, dispute };
}

function isClosed(d: Dispute) {
  return d.status === "RESOLVED" || d.status === "CLOSED";
}

function requireOpen(d: Dispute) {
  if (isClosed(d)) throw conflict("The dispute is already closed");
}

function adminActor(ctx: AuthedContext): DisputeEvent["actor"] {
  const a = ctx.session.admin;
  return { type: "ADMIN", id: a.id, name: `${a.firstName} ${a.lastName}` };
}

function addEvent(ctx: AuthedContext, d: Dispute, type: DisputeEvent["type"], description: string) {
  d.history.push({ id: nextId(ctx.db, "dev"), type, description, actor: adminActor(ctx), createdAt: new Date().toISOString() });
}

/** Only the two dispute parties can be targeted by dispute actions. */
function findParty(ctx: AuthedContext, d: Dispute, userId: string): User {
  if (userId !== d.openedBy.id && userId !== d.against.id) throw unprocessable({ userId: ["validation.invalid"] });
  const user = ctx.db.users.find((u) => u.id === userId);
  if (!user) throw notFound("User not found");
  return user;
}

/** Same field semantics as handlers/users.ts changeStatus. */
function setUserStatus(ctx: AuthedContext, user: User, next: User["status"], reason: string, action: string, disputeId: string) {
  const old = { status: user.status, statusReason: user.statusReason };
  user.status = next;
  user.statusReason = reason;
  user.updatedAt = new Date().toISOString();
  audit(ctx, {
    action: `user.${action}`,
    entityType: "USER",
    entityId: user.id,
    entityLabel: user.fullName,
    oldValue: old,
    newValue: { status: next, disputeId },
    reason,
  });
}

function presentDispute(db: MockDb, d: Dispute): Dispute {
  return {
    ...d,
    openedBy: userRefOf(db, d.openedBy.id),
    against: userRefOf(db, d.against.id),
    assignedTo: d.assignedTo ? adminRefOf(db, d.assignedTo.id) : null,
  };
}

export const exchangeRoutes = [
  route("GET", "/exchanges", (ctx) => {
    requirePermission(ctx, "exchanges.read");
    const p = parseListParams(ctx.url, { sort: "createdAt", order: "desc" });
    const f = p.filters;
    const statuses = csv(f.status);
    let items = ctx.db.exchanges
      .filter(
        (e) =>
          (!statuses.length || statuses.includes(e.status)) &&
          inDateRange(e.createdAt, f.from, f.to) &&
          (f.disputed === undefined || (f.disputed === "true") === !!e.disputeId) &&
          (!f.userId || e.participants.some((pt) => pt.userId === f.userId)),
      )
      .map((e) => presentExchange(ctx.db, e))
      .filter((e) =>
        matchesSearch(
          p.search,
          e.code,
          e.id,
          ...e.participants.flatMap((pt) => [pt.user.fullName, pt.user.phone, ...pt.items.map((i) => i.title)]),
        ),
      );
    items = sortItems(items, p.sort, p.order, {
      createdAt: (e) => e.createdAt,
      completedAt: (e) => e.completedAt,
      updatedAt: (e) => e.updatedAt,
    });
    return paginate(items, p);
  }),

  route("GET", "/exchanges/:id", (ctx) => {
    requirePermission(ctx, "exchanges.read");
    const e = presentExchange(ctx.db, findExchange(ctx.db, ctx.params.id));
    const br = ctx.db.barterRequests.find((b) => b.id === e.barterRequestId);
    const dispute = e.disputeId ? ctx.db.disputes.find((d) => d.id === e.disputeId) : undefined;
    const userIds = e.participants.map((pt) => pt.userId);
    const listingIds = e.participants.flatMap((pt) => pt.items.map((i) => i.id));
    const since = e.createdAt;
    const detail: ExchangeDetail = {
      ...e,
      barterRequest: br
        ? { id: br.id, code: br.code, status: br.status, message: br.message, cashDifferenceNote: br.cashDifferenceNote, createdAt: br.createdAt }
        : null,
      reviews: ctx.db.reviews.filter((r) => r.exchangeId === e.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      // Reports tied to this trade: on the originating request, the traded items, or against a participant since the trade began.
      reports: ctx.db.reports
        .filter(
          (r) =>
            (r.targetType === "BARTER_REQUEST" && r.targetId === e.barterRequestId) ||
            (r.targetType === "LISTING" && listingIds.includes(r.targetId)) ||
            ((r.targetType === "USER" || r.targetType === "MESSAGE") && !!r.target.ownerId && userIds.includes(r.target.ownerId) && r.createdAt >= since),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 20),
      dispute: dispute
        ? {
            id: dispute.id,
            status: dispute.status,
            category: dispute.category,
            resolution: dispute.resolution,
            assignedTo: dispute.assignedTo ? adminRefOf(ctx.db, dispute.assignedTo.id) : null,
            createdAt: dispute.createdAt,
          }
        : null,
      itemDetails: itemDetailsFor(ctx.db, listingIds),
      participantsInfo: participantInfoFor(ctx.db, userIds),
    };
    return ok(detail);
  }),

  route("POST", "/exchanges/:id/cancel", (ctx) => {
    requirePermission(ctx, "exchanges.manage");
    const e = findExchange(ctx.db, ctx.params.id);
    const { reason } = validate(cancelExchangeSchema, ctx.body);
    if (e.status === "COMPLETED" || e.status === "CANCELLED") throw conflict(`Exchange is already ${e.status.toLowerCase()}`);
    const old = e.status;
    const now = new Date().toISOString();
    const a = ctx.session.admin;
    e.status = "CANCELLED";
    e.cancelledAt = now;
    e.updatedAt = now;
    e.statusHistory.push({ status: "CANCELLED", at: now, note: reason, actor: { type: "ADMIN", id: a.id, name: `${a.firstName} ${a.lastName}` } });
    audit(ctx, { action: "exchange.cancel", entityType: "EXCHANGE", entityId: e.id, entityLabel: e.code, oldValue: { status: old }, newValue: { status: e.status }, reason });
    return ok(presentExchange(ctx.db, e), "Exchange cancelled");
  }),

  // ----- Disputes -----

  route("GET", "/exchanges/:id/dispute", (ctx) => {
    requirePermission(ctx, "exchanges.read", "disputes.manage");
    const { exchange, dispute } = findDispute(ctx.db, ctx.params.id);
    const detail: DisputeDetail = {
      ...presentDispute(ctx.db, dispute),
      history: [...dispute.history].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      exchange: { id: exchange.id, code: exchange.code, status: exchange.status },
      parties: participantInfoFor(ctx.db, [dispute.openedBy.id, dispute.against.id]),
    };
    return ok(detail);
  }),

  route("POST", "/exchanges/:id/dispute/assign", (ctx) => {
    requirePermission(ctx, "disputes.manage");
    const { dispute } = findDispute(ctx.db, ctx.params.id);
    requireOpen(dispute);
    const me = ctx.session.admin.id;
    if (dispute.assignedTo?.id === me && dispute.status === "UNDER_REVIEW") throw conflict("The dispute is already assigned to you");
    const old = { status: dispute.status, assignedTo: dispute.assignedTo?.id ?? null };
    dispute.assignedTo = adminRefOf(ctx.db, me);
    if (dispute.status === "OPEN") dispute.status = "UNDER_REVIEW";
    addEvent(ctx, dispute, "STATUS_CHANGED", `Assigned to ${dispute.assignedTo.fullName}`);
    audit(ctx, { action: "dispute.assign", entityType: "DISPUTE", entityId: dispute.id, entityLabel: dispute.id, oldValue: old, newValue: { status: dispute.status, assignedTo: me } });
    return ok(presentDispute(ctx.db, dispute), "Dispute assigned");
  }),

  route("POST", "/exchanges/:id/dispute/warn", (ctx) => {
    requirePermission(ctx, "disputes.manage");
    const { dispute } = findDispute(ctx.db, ctx.params.id);
    requireOpen(dispute);
    const { userId, reason } = validate(disputeWarnSchema, ctx.body);
    const user = findParty(ctx, dispute, userId);
    addEvent(ctx, dispute, "USER_WARNED", `${user.fullName}: ${reason}`);
    recordModeration(ctx, "WARN", "USER", user.id, user.fullName, reason);
    audit(ctx, { action: "dispute.warn", entityType: "DISPUTE", entityId: dispute.id, entityLabel: dispute.id, newValue: { userId }, reason });
    return ok(presentDispute(ctx.db, dispute), "Warning issued");
  }),

  route("POST", "/exchanges/:id/dispute/suspend", (ctx) => {
    requirePermission(ctx, "disputes.manage");
    const { dispute } = findDispute(ctx.db, ctx.params.id);
    requireOpen(dispute);
    const { userId, reason, days } = validate(disputeSuspendSchema, ctx.body);
    const user = findParty(ctx, dispute, userId);
    if (user.status === "DELETED") throw conflict("Deleted users cannot be suspended");
    if (user.status === "BLOCKED") throw conflict("User is already blocked");
    user.suspendedUntil = new Date(Date.now() + days * 86_400_000).toISOString();
    setUserStatus(ctx, user, "SUSPENDED", reason, "suspend", dispute.id);
    addEvent(ctx, dispute, "USER_SUSPENDED", `${user.fullName} (${days}d): ${reason}`);
    recordModeration(ctx, "SUSPEND", "USER", user.id, user.fullName, `${reason} (${days}d)`);
    return ok(presentDispute(ctx.db, dispute), "User suspended");
  }),

  route("POST", "/exchanges/:id/dispute/block", (ctx) => {
    requirePermission(ctx, "disputes.manage");
    const { dispute } = findDispute(ctx.db, ctx.params.id);
    requireOpen(dispute);
    const { userId, reason } = validate(disputeBlockSchema, ctx.body);
    const user = findParty(ctx, dispute, userId);
    if (user.status === "BLOCKED") throw conflict("User is already blocked");
    if (user.status === "DELETED") throw conflict("Deleted users cannot be blocked");
    setUserStatus(ctx, user, "BLOCKED", reason, "block", dispute.id);
    addEvent(ctx, dispute, "USER_BLOCKED", `${user.fullName}: ${reason}`);
    recordModeration(ctx, "BLOCK", "USER", user.id, user.fullName, reason);
    return ok(presentDispute(ctx.db, dispute), "User blocked");
  }),

  route("POST", "/exchanges/:id/dispute/close", (ctx) => {
    requirePermission(ctx, "disputes.manage");
    const { exchange, dispute } = findDispute(ctx.db, ctx.params.id);
    requireOpen(dispute);
    const { resolution, note } = validate(disputeCloseSchema, ctx.body);
    const now = new Date().toISOString();
    const old = { status: dispute.status };
    dispute.status = resolution === "NO_ACTION" ? "CLOSED" : "RESOLVED";
    dispute.resolution = resolution;
    dispute.resolutionNote = note;
    dispute.closedAt = now;
    if (!dispute.assignedTo) dispute.assignedTo = adminRefOf(ctx.db, ctx.session.admin.id);
    addEvent(ctx, dispute, "CLOSED", `${resolution}: ${note}`);

    if (resolution === "EXCHANGE_CANCELLED" && exchange.status !== "CANCELLED" && exchange.status !== "COMPLETED") {
      const oldEx = exchange.status;
      exchange.status = "CANCELLED";
      exchange.cancelledAt = now;
      exchange.updatedAt = now;
      exchange.statusHistory.push({ status: "CANCELLED", at: now, note, actor: { ...adminActor(ctx) } });
      audit(ctx, { action: "exchange.cancel", entityType: "EXCHANGE", entityId: exchange.id, entityLabel: exchange.code, oldValue: { status: oldEx }, newValue: { status: "CANCELLED" }, reason: note });
    }
    audit(ctx, { action: "dispute.close", entityType: "DISPUTE", entityId: dispute.id, entityLabel: dispute.id, oldValue: old, newValue: { status: dispute.status, resolution }, reason: note });
    return ok(presentDispute(ctx.db, dispute), "Dispute closed");
  }),
];
