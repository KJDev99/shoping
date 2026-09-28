import "server-only";

import { adminRefOf, listingRefOf, presentListing, recomputeAggregates, userRefOf, type MockDb } from "@/lib/mock/db";
import {
  moderationCorrectionSchema,
  moderationOptionalReasonSchema,
  moderationReasonSchema,
  moderationRejectSchema,
  moderationSuspendSchema,
  type ListingQueueItem,
  type QueueCounts,
  type QueueItem,
  type ReasonCount,
  type SafetyListingRow,
  type SafetyOverview,
  type SafetyUserRow,
  type SuspicionSignal,
  type UserQueueItem,
} from "@/schemas/moderation.schema";
import { MODERATION_QUEUES, type AdminRef, type Listing, type ModerationQueue, type Report, type User } from "@/types";
import { audit, recordModeration, requirePermission, type AuthedContext } from "../context";
import { conflict, csv, inDateRange, matchesSearch, notFound, ok, paginate, parseListParams, sortItems, validate } from "../http";
import { route } from "../router";

// ---------------------------------------------------------------------------
// Shared moderation helpers (also used by the reports handler)
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
/** New listings within 24h at or above this count are flagged as a burst (operational hint). */
export const BURST_LISTINGS_THRESHOLD = 5;
/** Rejections (summed over a user's listings) at or above this count are flagged. */
export const REPEATED_REJECTIONS_THRESHOLD = 3;
/** A WARN within this window hides the account from the suspicious queue ("already reviewed"). */
const WARN_SNOOZE_MS = 14 * DAY_MS;

export const OPEN_REPORT_STATUSES: readonly Report["status"][] = ["NEW", "REVIEWING"];
export const isOpenReport = (r: Report) => OPEN_REPORT_STATUSES.includes(r.status);

export function findListing(db: MockDb, id: string): Listing {
  const listing = db.listings.find((l) => l.id === id && !l.deletedAt);
  if (!listing) throw notFound("Listing not found");
  return listing;
}

export function findUser(db: MockDb, id: string): User {
  const user = db.users.find((u) => u.id === id);
  if (!user) throw notFound("User not found");
  return user;
}

/** Same semantics as the users module (status + statusReason + audit). */
function changeUserStatus(ctx: AuthedContext, user: User, next: User["status"], reason: string | null, action: string) {
  const old = { status: user.status, statusReason: user.statusReason };
  user.status = next;
  user.statusReason = reason;
  user.updatedAt = new Date().toISOString();
  audit(ctx, { action: `user.${action}`, entityType: "USER", entityId: user.id, entityLabel: user.fullName, oldValue: old, newValue: { status: next }, reason });
}

export function blockUser(ctx: AuthedContext, user: User, reason: string) {
  if (user.status === "BLOCKED") throw conflict("User is already blocked");
  if (user.status === "DELETED") throw conflict("Deleted users cannot be blocked");
  changeUserStatus(ctx, user, "BLOCKED", reason, "block");
  recordModeration(ctx, "BLOCK", "USER", user.id, user.fullName, reason);
}

export function suspendUser(ctx: AuthedContext, user: User, reason: string, days: number) {
  if (user.status === "DELETED") throw conflict("Deleted users cannot be suspended");
  if (user.status === "BLOCKED") throw conflict("User is blocked; unblock before suspending");
  user.suspendedUntil = new Date(Date.now() + days * DAY_MS).toISOString();
  changeUserStatus(ctx, user, "SUSPENDED", reason, "suspend");
  recordModeration(ctx, "SUSPEND", "USER", user.id, user.fullName, `${reason} (${days}d)`);
}

function touchListing(ctx: AuthedContext, listing: Listing) {
  listing.updatedAt = new Date().toISOString();
  ctx.db.listingsVersion++;
}

export function blockListing(ctx: AuthedContext, listing: Listing, reason: string) {
  if (listing.status === "BLOCKED") throw conflict("Listing is already blocked");
  const old = { status: listing.status };
  listing.status = "BLOCKED";
  listing.rejectionNote = reason;
  touchListing(ctx, listing);
  audit(ctx, { action: "listing.block", entityType: "LISTING", entityId: listing.id, entityLabel: listing.title, oldValue: old, newValue: { status: "BLOCKED" }, reason });
  recordModeration(ctx, "BLOCK", "LISTING", listing.id, listing.title, reason);
}

/** Closes a report (RESOLVED or REJECTED), assigning it to the acting admin if unassigned. */
export function closeReport(ctx: AuthedContext, report: Report, status: "RESOLVED" | "REJECTED", note: string) {
  const now = new Date().toISOString();
  const old = { status: report.status };
  report.status = status;
  report.resolutionNote = note;
  report.resolvedAt = now;
  report.updatedAt = now;
  report.assignedTo ??= adminRefOf(ctx.db, ctx.session.admin.id);
  audit(ctx, {
    action: status === "RESOLVED" ? "report.resolve" : "report.reject",
    entityType: "REPORT",
    entityId: report.id,
    entityLabel: report.code,
    oldValue: old,
    newValue: { status },
    reason: note,
  });
  recordModeration(ctx, status === "RESOLVED" ? "RESOLVE_REPORT" : "REJECT_REPORT", "REPORT", report.id, report.code, note);
}

/** Closes every open report matching `predicate`. Returns how many were closed. */
export function closeOpenReports(ctx: AuthedContext, predicate: (r: Report) => boolean, status: "RESOLVED" | "REJECTED", note: string) {
  const open = ctx.db.reports.filter((r) => isOpenReport(r) && predicate(r));
  open.forEach((r) => closeReport(ctx, r, status, note));
  return open.length;
}

// ---------------------------------------------------------------------------
// Queue computation
// ---------------------------------------------------------------------------

/** Listing reports concern the listing; all other target types concern the person. */
const isPersonReport = (r: Report) => r.targetType !== "LISTING";

function reasonSummary(reports: Report[]): ReasonCount[] {
  const counts = new Map<Report["reason"], number>();
  reports.forEach((r) => counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1));
  return [...counts.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
}

interface Index {
  openByListing: Map<string, Report[]>;
  openPersonByUser: Map<string, Report[]>;
  rejectedByUser: Map<string, number>;
  newListings24h: Map<string, number>;
  recentlyWarned: Set<string>;
}

function buildIndex(db: MockDb): Index {
  const openByListing = new Map<string, Report[]>();
  const openPersonByUser = new Map<string, Report[]>();
  for (const r of db.reports) {
    if (!isOpenReport(r)) continue;
    if (r.targetType === "LISTING") openByListing.set(r.targetId, [...(openByListing.get(r.targetId) ?? []), r]);
    else if (r.target.ownerId) openPersonByUser.set(r.target.ownerId, [...(openPersonByUser.get(r.target.ownerId) ?? []), r]);
  }
  const rejectedByUser = new Map<string, number>();
  const newListings24h = new Map<string, number>();
  const since = Date.now() - DAY_MS;
  for (const l of db.listings) {
    if (l.deletedAt) continue;
    if (l.rejectionCount > 0) rejectedByUser.set(l.userId, (rejectedByUser.get(l.userId) ?? 0) + l.rejectionCount);
    if (new Date(l.createdAt).getTime() >= since) newListings24h.set(l.userId, (newListings24h.get(l.userId) ?? 0) + 1);
  }
  const warnSince = Date.now() - WARN_SNOOZE_MS;
  const recentlyWarned = new Set(
    db.moderationActions.filter((m) => m.action === "WARN" && m.targetType === "USER" && new Date(m.createdAt).getTime() >= warnSince).map((m) => m.targetId),
  );
  return { openByListing, openPersonByUser, rejectedByUser, newListings24h, recentlyWarned };
}

function signalsOf(user: User, idx: Index): SuspicionSignal[] {
  const signals: SuspicionSignal[] = [];
  if (user.riskLevel !== "LOW") signals.push("RISK_LEVEL");
  if ((idx.rejectedByUser.get(user.id) ?? 0) >= REPEATED_REJECTIONS_THRESHOLD) signals.push("REPEATED_REJECTIONS");
  if ((idx.newListings24h.get(user.id) ?? 0) >= BURST_LISTINGS_THRESHOLD) signals.push("BURST_LISTINGS");
  return signals;
}

const REVIEWABLE_LISTING: readonly Listing["status"][] = ["PENDING", "ACTIVE", "PAUSED"];

function duplicateOriginal(db: MockDb, l: Listing): ListingQueueItem["duplicateOf"] {
  if (!l.possibleDuplicateOf) return null;
  const orig = db.listings.find((x) => x.id === l.possibleDuplicateOf);
  if (!orig) return null;
  return { ...listingRefOf(db, orig.id), code: orig.code, owner: userRefOf(db, orig.userId), description: orig.description, createdAt: orig.createdAt };
}

function listingItem(db: MockDb, l: Listing, idx: Index): ListingQueueItem {
  const open = idx.openByListing.get(l.id) ?? [];
  return { kind: "LISTING", id: l.id, listing: presentListing(db, l), openReports: open.length, reasons: reasonSummary(open), duplicateOf: duplicateOriginal(db, l) };
}

function userItem(user: User, idx: Index): UserQueueItem {
  const open = idx.openPersonByUser.get(user.id) ?? [];
  return {
    kind: "USER",
    id: user.id,
    user,
    openReports: open.length,
    reasons: reasonSummary(open),
    rejectedListings: idx.rejectedByUser.get(user.id) ?? 0,
    newListings24h: idx.newListings24h.get(user.id) ?? 0,
    signals: signalsOf(user, idx),
  };
}

function queueItems(db: MockDb, queue: ModerationQueue, idx: Index): QueueItem[] {
  switch (queue) {
    case "PENDING_LISTINGS":
      return db.listings
        .filter((l) => !l.deletedAt && l.status === "PENDING")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((l) => listingItem(db, l, idx));
    case "REPORTED_LISTINGS":
      return db.listings
        .filter((l) => !l.deletedAt && REVIEWABLE_LISTING.includes(l.status) && (idx.openByListing.get(l.id)?.length ?? 0) > 0)
        .map((l) => listingItem(db, l, idx))
        .sort((a, b) => b.listing.reportsCount - a.listing.reportsCount || b.openReports - a.openReports);
    case "REPORTED_USERS":
      return db.users
        .filter((u) => (u.status === "ACTIVE" || u.status === "SUSPENDED") && u.reportsCount > 0 && (idx.openPersonByUser.get(u.id)?.length ?? 0) > 0)
        .sort((a, b) => b.reportsCount - a.reportsCount)
        .map((u) => userItem(u, idx));
    case "SUSPICIOUS_ACCOUNTS":
      return db.users
        .filter((u) => u.status === "ACTIVE" && !idx.recentlyWarned.has(u.id) && signalsOf(u, idx).length > 0)
        .map((u) => userItem(u, idx))
        .sort((a, b) => b.signals.length - a.signals.length || b.user.reportsCount - a.user.reportsCount);
    case "DUPLICATE_LISTINGS":
      return db.listings
        .filter((l) => !l.deletedAt && !!l.possibleDuplicateOf && REVIEWABLE_LISTING.includes(l.status))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((l) => listingItem(db, l, idx));
  }
}

function parseQueue(value: string): ModerationQueue {
  if (!(MODERATION_QUEUES as readonly string[]).includes(value)) throw notFound("Unknown moderation queue");
  return value as ModerationQueue;
}

// ---------------------------------------------------------------------------
// Safety overview
// ---------------------------------------------------------------------------

const SAFETY_LIMIT = 8;

function safetyUser(user: User, idx: Index): SafetyUserRow {
  return {
    ...{ id: user.id, fullName: user.fullName, avatar: user.avatar, phone: user.phone },
    status: user.status,
    riskLevel: user.riskLevel,
    reportsCount: user.reportsCount,
    listingsCount: user.listingsCount,
    rejectedListings: idx.rejectedByUser.get(user.id) ?? 0,
    newListings24h: idx.newListings24h.get(user.id) ?? 0,
    signals: signalsOf(user, idx),
  };
}

function safetyListing(db: MockDb, l: Listing): SafetyListingRow {
  const orig = l.possibleDuplicateOf ? db.listings.find((x) => x.id === l.possibleDuplicateOf) : undefined;
  return {
    ...listingRefOf(db, l.id),
    code: l.code,
    owner: userRefOf(db, l.userId),
    reportsCount: l.reportsCount,
    rejectionCount: l.rejectionCount,
    duplicateOf: orig ? { ...listingRefOf(db, orig.id), code: orig.code } : null,
  };
}

function safetyOverview(db: MockDb): SafetyOverview {
  const idx = buildIndex(db);
  const liveUsers = db.users.filter((u) => u.status !== "DELETED");
  const liveListings = db.listings.filter((l) => !l.deletedAt);
  return {
    usersWithManyReports: liveUsers
      .filter((u) => u.reportsCount > 0)
      .sort((a, b) => b.reportsCount - a.reportsCount)
      .slice(0, SAFETY_LIMIT)
      .map((u) => safetyUser(u, idx)),
    listingsWithManyReports: liveListings
      .filter((l) => l.reportsCount > 0)
      .sort((a, b) => b.reportsCount - a.reportsCount)
      .slice(0, SAFETY_LIMIT)
      .map((l) => safetyListing(db, l)),
    repeatedlyRejectedListings: liveListings
      .filter((l) => l.rejectionCount >= 2)
      .sort((a, b) => b.rejectionCount - a.rejectionCount)
      .slice(0, SAFETY_LIMIT)
      .map((l) => safetyListing(db, l)),
    possibleDuplicates: liveListings
      .filter((l) => !!l.possibleDuplicateOf && l.status !== "BLOCKED")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, SAFETY_LIMIT)
      .map((l) => safetyListing(db, l)),
    suspiciousActivity: liveUsers
      .filter((u) => u.status === "ACTIVE")
      .map((u) => safetyUser(u, idx))
      .filter((u) => u.signals.length > 0)
      .sort((a, b) => b.signals.length - a.signals.length || b.reportsCount - a.reportsCount)
      .slice(0, SAFETY_LIMIT),
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

function afterListingChange(ctx: AuthedContext) {
  recomputeAggregates(ctx.db);
}

function assertReviewable(listing: Listing, action: string) {
  if (!REVIEWABLE_LISTING.includes(listing.status)) throw conflict(`Listing in status ${listing.status} cannot be ${action}`);
}

export const moderationRoutes = [
  route("GET", "/moderation/queues", (ctx) => {
    requirePermission(ctx, "moderation.read");
    const idx = buildIndex(ctx.db);
    const counts = Object.fromEntries(MODERATION_QUEUES.map((q) => [q, queueItems(ctx.db, q, idx).length])) as QueueCounts;
    return ok(counts);
  }),

  route("GET", "/moderation/queue/:queue", (ctx) => {
    requirePermission(ctx, "moderation.read");
    const queue = parseQueue(ctx.params.queue);
    const p = parseListParams(ctx.url, { limit: 20 });
    const items = queueItems(ctx.db, queue, buildIndex(ctx.db)).filter((item) =>
      item.kind === "LISTING"
        ? matchesSearch(p.search, item.listing.title, item.listing.code, item.listing.id, item.listing.owner.fullName)
        : matchesSearch(p.search, item.user.fullName, item.user.phone, item.user.id, item.user.username),
    );
    return paginate(items, p);
  }),

  route("GET", "/moderation/safety", (ctx) => {
    requirePermission(ctx, "moderation.read");
    return ok(safetyOverview(ctx.db));
  }),

  route("GET", "/moderation/actions", (ctx) => {
    requirePermission(ctx, "moderation.read");
    const p = parseListParams(ctx.url, { sort: "createdAt", order: "desc" });
    const f = p.filters;
    const actions = csv(f.action);
    const targetTypes = csv(f.targetType);
    const adminIds = csv(f.adminId);
    let items = ctx.db.moderationActions.filter(
      (m) =>
        (!actions.length || actions.includes(m.action)) &&
        (!targetTypes.length || targetTypes.includes(m.targetType)) &&
        (!adminIds.length || adminIds.includes(m.adminId)) &&
        inDateRange(m.createdAt, f.from, f.to) &&
        matchesSearch(p.search, m.targetLabel, m.targetId, m.admin.fullName, m.reason),
    );
    items = sortItems(items, p.sort, p.order, { createdAt: (m) => m.createdAt, action: (m) => m.action });
    return paginate(items, p);
  }),

  /** Admins who appear in the moderation log (for the log's admin filter). */
  route("GET", "/moderation/actions/admins", (ctx) => {
    requirePermission(ctx, "moderation.read");
    const seen = new Map<string, AdminRef>();
    for (const m of ctx.db.moderationActions) if (!seen.has(m.adminId)) seen.set(m.adminId, adminRefOf(ctx.db, m.adminId));
    return ok([...seen.values()].sort((a, b) => a.fullName.localeCompare(b.fullName)));
  }),

  // ----- Listing quick actions -----

  route("POST", "/moderation/listings/:id/approve", (ctx) => {
    requirePermission(ctx, "moderation.act", "listings.approve");
    const listing = findListing(ctx.db, ctx.params.id);
    const { reason } = validate(moderationOptionalReasonSchema, ctx.body ?? {});
    if (listing.status !== "PENDING") throw conflict("Only pending listings can be approved");
    const now = Date.now();
    listing.status = "ACTIVE";
    listing.publishedAt = new Date(now).toISOString();
    listing.expiresAt = new Date(now + ctx.db.settings.listings.expirationDays * DAY_MS).toISOString();
    // Approving from the duplicate queue confirms it is not a duplicate.
    listing.possibleDuplicateOf = null;
    touchListing(ctx, listing);
    audit(ctx, { action: "listing.approve", entityType: "LISTING", entityId: listing.id, entityLabel: listing.title, oldValue: { status: "PENDING" }, newValue: { status: "ACTIVE" }, reason: reason || null });
    recordModeration(ctx, "APPROVE", "LISTING", listing.id, listing.title, reason || null);
    afterListingChange(ctx);
    return ok(presentListing(ctx.db, listing), "Listing approved");
  }),

  route("POST", "/moderation/listings/:id/reject", (ctx) => {
    requirePermission(ctx, "moderation.act", "listings.reject");
    const listing = findListing(ctx.db, ctx.params.id);
    const { reason, note } = validate(moderationRejectSchema, ctx.body);
    assertReviewable(listing, "rejected");
    const old = { status: listing.status };
    listing.status = "REJECTED";
    listing.rejectionReason = reason;
    listing.rejectionNote = note || null;
    listing.rejectionCount += 1;
    touchListing(ctx, listing);
    const text = note ? `${reason}: ${note}` : reason;
    audit(ctx, { action: "listing.reject", entityType: "LISTING", entityId: listing.id, entityLabel: listing.title, oldValue: old, newValue: { status: "REJECTED", rejectionReason: reason }, reason: text });
    recordModeration(ctx, "REJECT", "LISTING", listing.id, listing.title, text);
    closeOpenReports(ctx, (r) => r.targetType === "LISTING" && r.targetId === listing.id, "RESOLVED", `Listing rejected: ${text}`);
    afterListingChange(ctx);
    return ok(presentListing(ctx.db, listing), "Listing rejected");
  }),

  route("POST", "/moderation/listings/:id/block", (ctx) => {
    requirePermission(ctx, "moderation.act", "listings.block");
    const listing = findListing(ctx.db, ctx.params.id);
    const { reason } = validate(moderationReasonSchema, ctx.body);
    blockListing(ctx, listing, reason);
    closeOpenReports(ctx, (r) => r.targetType === "LISTING" && r.targetId === listing.id, "RESOLVED", `Listing blocked: ${reason}`);
    afterListingChange(ctx);
    return ok(presentListing(ctx.db, listing), "Listing blocked");
  }),

  route("POST", "/moderation/listings/:id/request-correction", (ctx) => {
    requirePermission(ctx, "moderation.act", "listings.reject");
    const listing = findListing(ctx.db, ctx.params.id);
    const { reason, note } = validate(moderationCorrectionSchema, ctx.body);
    assertReviewable(listing, "sent back for correction");
    const old = { status: listing.status };
    listing.status = "REJECTED";
    listing.rejectionReason = reason ?? "OTHER";
    listing.rejectionNote = note;
    // A correction request is not a rejection: rejectionCount (a safety signal) is unchanged.
    touchListing(ctx, listing);
    audit(ctx, { action: "listing.request_correction", entityType: "LISTING", entityId: listing.id, entityLabel: listing.title, oldValue: old, newValue: { status: "REJECTED" }, reason: note });
    recordModeration(ctx, "REQUEST_CORRECTION", "LISTING", listing.id, listing.title, note);
    closeOpenReports(ctx, (r) => r.targetType === "LISTING" && r.targetId === listing.id, "RESOLVED", `Correction requested: ${note}`);
    afterListingChange(ctx);
    return ok(presentListing(ctx.db, listing), "Correction requested");
  }),

  /** Reviewed, no violation: rejects the listing's open reports. */
  route("POST", "/moderation/listings/:id/dismiss-reports", (ctx) => {
    requirePermission(ctx, "moderation.act", "reports.resolve");
    const listing = findListing(ctx.db, ctx.params.id);
    const { reason } = validate(moderationReasonSchema, ctx.body);
    const closed = closeOpenReports(ctx, (r) => r.targetType === "LISTING" && r.targetId === listing.id, "REJECTED", reason);
    if (!closed) throw conflict("This listing has no open reports");
    afterListingChange(ctx);
    return ok({ closed }, "Reports dismissed");
  }),

  /** Reviewed, not a duplicate: clears the duplicate-detector flag. */
  route("POST", "/moderation/listings/:id/not-duplicate", (ctx) => {
    requirePermission(ctx, "moderation.act");
    const listing = findListing(ctx.db, ctx.params.id);
    const { reason } = validate(moderationOptionalReasonSchema, ctx.body ?? {});
    if (!listing.possibleDuplicateOf) throw conflict("Listing is not flagged as a duplicate");
    const old = { possibleDuplicateOf: listing.possibleDuplicateOf };
    listing.possibleDuplicateOf = null;
    touchListing(ctx, listing);
    audit(ctx, { action: "listing.not_duplicate", entityType: "LISTING", entityId: listing.id, entityLabel: listing.title, oldValue: old, newValue: { possibleDuplicateOf: null }, reason: reason || null });
    return ok(presentListing(ctx.db, listing), "Duplicate flag cleared");
  }),

  // ----- User quick actions -----

  route("POST", "/moderation/users/:id/block", (ctx) => {
    requirePermission(ctx, "moderation.act", "users.block");
    const user = findUser(ctx.db, ctx.params.id);
    const { reason } = validate(moderationReasonSchema, ctx.body);
    blockUser(ctx, user, reason);
    closeOpenReports(ctx, (r) => isPersonReport(r) && r.target.ownerId === user.id, "RESOLVED", `User blocked: ${reason}`);
    recomputeAggregates(ctx.db);
    return ok(user, "User blocked");
  }),

  route("POST", "/moderation/users/:id/suspend", (ctx) => {
    requirePermission(ctx, "moderation.act", "users.block");
    const user = findUser(ctx.db, ctx.params.id);
    const { reason, days } = validate(moderationSuspendSchema, ctx.body);
    suspendUser(ctx, user, reason, days);
    closeOpenReports(ctx, (r) => isPersonReport(r) && r.target.ownerId === user.id, "RESOLVED", `User suspended for ${days}d: ${reason}`);
    recomputeAggregates(ctx.db);
    return ok(user, "User suspended");
  }),

  route("POST", "/moderation/users/:id/warn", (ctx) => {
    requirePermission(ctx, "moderation.act");
    const user = findUser(ctx.db, ctx.params.id);
    const { reason } = validate(moderationReasonSchema, ctx.body);
    if (user.status === "DELETED" || user.status === "BLOCKED") throw conflict(`Cannot warn a ${user.status.toLowerCase()} user`);
    audit(ctx, { action: "user.warn", entityType: "USER", entityId: user.id, entityLabel: user.fullName, reason });
    recordModeration(ctx, "WARN", "USER", user.id, user.fullName, reason);
    closeOpenReports(ctx, (r) => isPersonReport(r) && r.target.ownerId === user.id, "RESOLVED", `User warned: ${reason}`);
    recomputeAggregates(ctx.db);
    return ok(user, "Warning recorded");
  }),

  route("POST", "/moderation/users/:id/dismiss-reports", (ctx) => {
    requirePermission(ctx, "moderation.act", "reports.resolve");
    const user = findUser(ctx.db, ctx.params.id);
    const { reason } = validate(moderationReasonSchema, ctx.body);
    const closed = closeOpenReports(ctx, (r) => isPersonReport(r) && r.target.ownerId === user.id, "REJECTED", reason);
    if (!closed) throw conflict("This user has no open reports");
    recomputeAggregates(ctx.db);
    return ok({ closed }, "Reports dismissed");
  }),
];
