import "server-only";

import { createRandom } from "@/lib/mock/random";
import { presentBarter, presentExchange, presentListing, recomputeAggregates, type MockDb } from "@/lib/mock/db";
import { optionalReasonSchema, reasonSchema } from "@/schemas/common.schema";
import { suspendUserSchema, userUpdateSchema } from "@/schemas/user.schema";
import type { User, UserActivity } from "@/types";
import { audit, recordModeration, requirePermission, type AuthedContext } from "../context";
import { conflict, csv, inDateRange, matchesSearch, notFound, ok, paginate, parseListParams, sortItems, validate } from "../http";
import { route } from "../router";

function findUser(db: MockDb, id: string): User {
  const user = db.users.find((u) => u.id === id);
  if (!user) throw notFound("User not found");
  return user;
}

function changeStatus(ctx: AuthedContext, user: User, next: User["status"], reason: string | null, action: string) {
  const old = { status: user.status, statusReason: user.statusReason };
  user.status = next;
  user.statusReason = reason;
  user.updatedAt = new Date().toISOString();
  audit(ctx, { action: `user.${action}`, entityType: "USER", entityId: user.id, entityLabel: user.fullName, oldValue: old, newValue: { status: next }, reason });
}

/** Deterministic, plausible activity feed for a user (a real backend reads its event log). */
function activityFor(db: MockDb, user: User): UserActivity[] {
  const rnd = createRandom(Number(user.id.replace(/\D/g, "")) || 1);
  const items: UserActivity[] = [];
  const push = (type: UserActivity["type"], description: string, at: string, entityId: string | null = null) =>
    items.push({ id: `act_${user.id}_${items.length}`, userId: user.id, type, entityId, description, ipAddress: `213.230.${rnd.int(64, 127)}.${rnd.int(2, 254)}`, createdAt: at });

  db.listings.filter((l) => l.userId === user.id).forEach((l) => push("LISTING_CREATED", l.title, l.createdAt, l.id));
  db.barterRequests.filter((b) => b.senderId === user.id).forEach((b) => push("OFFER_SENT", b.code, b.createdAt, b.id));
  db.barterRequests
    .filter((b) => b.receiverId === user.id && b.respondedAt && (b.status === "ACCEPTED" || b.status === "DECLINED" || b.status === "COMPLETED"))
    .forEach((b) => push(b.status === "DECLINED" ? "OFFER_DECLINED" : "OFFER_ACCEPTED", b.code, b.respondedAt!, b.id));
  db.exchanges
    .filter((e) => e.status === "COMPLETED" && e.participants.some((p) => p.userId === user.id))
    .forEach((e) => push("EXCHANGE_COMPLETED", e.code, e.completedAt!, e.id));
  db.reviews.filter((r) => r.authorId === user.id).forEach((r) => push("REVIEW_LEFT", `★${r.rating}`, r.createdAt, r.id));
  db.reports.filter((r) => r.reporterId === user.id).forEach((r) => push("REPORT_SUBMITTED", r.code, r.createdAt, r.id));
  if (user.lastActiveAt) push("LOGIN", "Mobile app", user.lastActiveAt);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const userRoutes = [
  route("GET", "/users", (ctx) => {
    requirePermission(ctx, "users.read");
    const p = parseListParams(ctx.url, { sort: "createdAt", order: "desc" });
    const f = p.filters;
    const statuses = csv(f.status);
    const regions = csv(f.regionId);
    const risks = csv(f.riskLevel);
    let items = ctx.db.users.filter(
      (u) =>
        (!statuses.length || statuses.includes(u.status)) &&
        (!regions.length || regions.includes(u.regionId)) &&
        (!risks.length || risks.includes(u.riskLevel)) &&
        inDateRange(u.createdAt, f.from, f.to) &&
        (f.minListings === undefined || u.listingsCount >= Number(f.minListings)) &&
        (f.maxListings === undefined || u.listingsCount <= Number(f.maxListings)) &&
        (f.minReports === undefined || u.reportsCount >= Number(f.minReports)) &&
        matchesSearch(p.search, u.fullName, u.phone, u.email, u.id, u.username),
    );
    items = sortItems(items, p.sort, p.order, {
      fullName: (u) => u.fullName,
      listingsCount: (u) => u.listingsCount,
      completedExchanges: (u) => u.completedExchanges,
      reportsCount: (u) => u.reportsCount,
      rating: (u) => u.rating,
      createdAt: (u) => u.createdAt,
      lastActiveAt: (u) => u.lastActiveAt,
    });
    return paginate(items, p);
  }),

  route("GET", "/users/:id", (ctx) => {
    requirePermission(ctx, "users.read");
    return ok(findUser(ctx.db, ctx.params.id));
  }),

  route("PATCH", "/users/:id", (ctx) => {
    requirePermission(ctx, "users.update");
    const user = findUser(ctx.db, ctx.params.id);
    const input = validate(userUpdateSchema, ctx.body);
    const normalizedPhone = input.phone.replace(/\D/g, "");
    if (ctx.db.users.some((u) => u.id !== user.id && u.phone.replace(/\D/g, "") === normalizedPhone)) {
      throw conflict("Another user already uses this phone number");
    }
    const old = { firstName: user.firstName, lastName: user.lastName, phone: user.phone, email: user.email, regionId: user.regionId };
    Object.assign(user, {
      ...input,
      email: input.email || null,
      districtId: input.districtId ?? null,
      bio: input.bio ?? null,
      fullName: `${input.firstName} ${input.lastName}`,
      updatedAt: new Date().toISOString(),
    });
    audit(ctx, { action: "user.update", entityType: "USER", entityId: user.id, entityLabel: user.fullName, oldValue: old, newValue: input });
    return ok(user, "User updated");
  }),

  route("POST", "/users/:id/suspend", (ctx) => {
    requirePermission(ctx, "users.block");
    const user = findUser(ctx.db, ctx.params.id);
    const { reason, days } = validate(suspendUserSchema, ctx.body);
    if (user.status === "DELETED") throw conflict("Deleted users cannot be suspended");
    user.suspendedUntil = new Date(Date.now() + days * 86_400_000).toISOString();
    changeStatus(ctx, user, "SUSPENDED", reason, "suspend");
    recordModeration(ctx, "SUSPEND", "USER", user.id, user.fullName, `${reason} (${days}d)`);
    return ok(user, "User suspended");
  }),

  route("POST", "/users/:id/block", (ctx) => {
    requirePermission(ctx, "users.block");
    const user = findUser(ctx.db, ctx.params.id);
    const { reason } = validate(reasonSchema, ctx.body);
    if (user.status === "BLOCKED") throw conflict("User is already blocked");
    changeStatus(ctx, user, "BLOCKED", reason, "block");
    recordModeration(ctx, "BLOCK", "USER", user.id, user.fullName, reason);
    return ok(user, "User blocked");
  }),

  route("POST", "/users/:id/unblock", (ctx) => {
    requirePermission(ctx, "users.block");
    const user = findUser(ctx.db, ctx.params.id);
    const { reason } = validate(optionalReasonSchema, ctx.body ?? {});
    if (user.status !== "BLOCKED" && user.status !== "SUSPENDED") throw conflict("User is not blocked or suspended");
    user.suspendedUntil = null;
    changeStatus(ctx, user, "ACTIVE", null, "unblock");
    recordModeration(ctx, "UNBLOCK", "USER", user.id, user.fullName, reason || null);
    return ok(user, "User unblocked");
  }),

  route("DELETE", "/users/:id", (ctx) => {
    requirePermission(ctx, "users.delete");
    const user = findUser(ctx.db, ctx.params.id);
    const reason = ctx.url.searchParams.get("reason");
    if (user.status === "DELETED") throw conflict("User is already deleted");
    // Soft delete: data is retained for audit and can be restored.
    user.deletedAt = new Date().toISOString();
    changeStatus(ctx, user, "DELETED", reason, "delete");
    recordModeration(ctx, "DELETE", "USER", user.id, user.fullName, reason);
    return ok(user, "User deleted");
  }),

  route("POST", "/users/:id/restore", (ctx) => {
    requirePermission(ctx, "users.delete");
    const user = findUser(ctx.db, ctx.params.id);
    if (user.status !== "DELETED") throw conflict("User is not deleted");
    user.deletedAt = null;
    changeStatus(ctx, user, "ACTIVE", null, "restore");
    recordModeration(ctx, "RESTORE", "USER", user.id, user.fullName, null);
    return ok(user, "User restored");
  }),

  // ----- Related collections for the user detail page -----

  route("GET", "/users/:id/listings", (ctx) => {
    requirePermission(ctx, "users.read", "listings.read");
    const p = parseListParams(ctx.url, { limit: 10 });
    const items = ctx.db.listings
      .filter((l) => l.userId === ctx.params.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((l) => presentListing(ctx.db, l));
    return paginate(items, p);
  }),

  route("GET", "/users/:id/barter-requests", (ctx) => {
    requirePermission(ctx, "users.read", "barter.read");
    const p = parseListParams(ctx.url, { limit: 10 });
    const items = ctx.db.barterRequests
      .filter((b) => b.senderId === ctx.params.id || b.receiverId === ctx.params.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((b) => presentBarter(ctx.db, b));
    return paginate(items, p);
  }),

  route("GET", "/users/:id/exchanges", (ctx) => {
    requirePermission(ctx, "users.read", "exchanges.read");
    const p = parseListParams(ctx.url, { limit: 10 });
    const items = ctx.db.exchanges
      .filter((e) => e.participants.some((pt) => pt.userId === ctx.params.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((e) => presentExchange(ctx.db, e));
    return paginate(items, p);
  }),

  route("GET", "/users/:id/reviews", (ctx) => {
    requirePermission(ctx, "users.read");
    const p = parseListParams(ctx.url, { limit: 10 });
    const direction = p.filters.direction ?? "received";
    const items = ctx.db.reviews
      .filter((r) => (direction === "written" ? r.authorId : r.targetUserId) === ctx.params.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(items, p);
  }),

  route("GET", "/users/:id/reports", (ctx) => {
    requirePermission(ctx, "users.read", "reports.read");
    const p = parseListParams(ctx.url, { limit: 10 });
    const direction = p.filters.direction ?? "against";
    const items = ctx.db.reports
      .filter((r) => (direction === "submitted" ? r.reporterId === ctx.params.id : r.target.ownerId === ctx.params.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(items, p);
  }),

  route("GET", "/users/:id/activity", (ctx) => {
    requirePermission(ctx, "users.read");
    const p = parseListParams(ctx.url, { limit: 15 });
    return paginate(activityFor(ctx.db, findUser(ctx.db, ctx.params.id)), p);
  }),

  // ----- Reviews moderation -----

  route("POST", "/reviews/:id/:action", (ctx) => {
    requirePermission(ctx, "reviews.moderate");
    const review = ctx.db.reviews.find((r) => r.id === ctx.params.id);
    if (!review) throw notFound("Review not found");
    const transitions = { hide: "HIDDEN", delete: "DELETED", restore: "VISIBLE" } as const;
    const action = ctx.params.action as keyof typeof transitions;
    if (!(action in transitions)) throw notFound();
    const { reason } = validate(action === "restore" ? optionalReasonSchema : reasonSchema, ctx.body ?? {});
    const old = review.status;
    review.status = transitions[action];
    recomputeAggregates(ctx.db);
    audit(ctx, { action: `review.${action}`, entityType: "REVIEW", entityId: review.id, entityLabel: `★${review.rating} — ${review.author.fullName}`, oldValue: { status: old }, newValue: { status: review.status }, reason: reason || null });
    recordModeration(ctx, action === "restore" ? "RESTORE" : action === "hide" ? "HIDE" : "DELETE", "REVIEW", review.id, `★${review.rating} — ${review.author.fullName}`, reason || null);
    return ok(review, "Review updated");
  }),
];
