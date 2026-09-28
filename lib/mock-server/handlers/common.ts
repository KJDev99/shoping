import "server-only";

import { z } from "@/schemas/z";
import { adminRefOf, listingRefOf, nextId } from "@/lib/mock/db";
import { NOTE_ENTITY_TYPES, type SearchResults } from "@/types";
import { audit, requireAuth, requirePermission } from "../context";
import { badRequest, forbidden, matchesSearch, ok, validate } from "../http";
import { route } from "../router";

const noteSchema = z.object({
  entityType: z.enum(NOTE_ENTITY_TYPES),
  entityId: z.string().min(1),
  body: z.string().trim().min(3, "validation.min3").max(2000, "validation.max2000"),
});

export const commonRoutes = [
  /** Reference data for filters/selects and for resolving ids → names on the client. */
  route("GET", "/lookups", (ctx) => {
    requireAuth(ctx);
    return ok({
      regions: ctx.db.regions,
      districts: ctx.db.districts,
      categories: ctx.db.categories,
      attributes: ctx.db.attributes,
      settings: { allowCashDifference: ctx.db.settings.barter.allowCashDifference },
    });
  }),

  route("GET", "/search", (ctx) => {
    requireAuth(ctx);
    const q = ctx.url.searchParams.get("q")?.trim() ?? "";
    const perms = ctx.session.permissions;
    const empty: SearchResults = { users: [], listings: [], barterRequests: [], exchanges: [] };
    if (q.length < 2) return ok(empty);
    const LIMIT = 5;
    const data: SearchResults = {
      users: perms.includes("users.read")
        ? ctx.db.users
            .filter((u) => matchesSearch(q, u.fullName, u.phone, u.email, u.id, u.username))
            .slice(0, LIMIT)
            .map((u) => ({ id: u.id, fullName: u.fullName, avatar: u.avatar, phone: u.phone }))
        : [],
      listings: perms.includes("listings.read")
        ? ctx.db.listings
            .filter((l) => !l.deletedAt && matchesSearch(q, l.title, l.code, l.id))
            .slice(0, LIMIT)
            .map((l) => ({ ...listingRefOf(ctx.db, l.id), code: l.code }))
        : [],
      barterRequests: perms.includes("barter.read")
        ? ctx.db.barterRequests
            .filter((b) => matchesSearch(q, b.code, b.id))
            .slice(0, LIMIT)
            .map((b) => ({ id: b.id, code: b.code, senderName: b.sender.fullName, receiverName: b.receiver.fullName, status: b.status }))
        : [],
      exchanges: perms.includes("exchanges.read")
        ? ctx.db.exchanges
            .filter((e) => matchesSearch(q, e.code, e.id))
            .slice(0, LIMIT)
            .map((e) => ({
              id: e.id,
              code: e.code,
              participantNames: [e.participants[0].user.fullName, e.participants[1].user.fullName] as [string, string],
              status: e.status,
            }))
        : [],
    };
    return ok(data);
  }),

  route("GET", "/alerts", (ctx) => {
    requireAuth(ctx);
    return ok(ctx.db.alerts.slice(0, 15));
  }),

  route("POST", "/alerts/read-all", (ctx) => {
    requireAuth(ctx);
    ctx.db.alerts.forEach((a) => (a.read = true));
    return ok(null);
  }),

  // ----- Internal admin notes (never exposed to marketplace users) -----
  route("GET", "/notes", (ctx) => {
    requireAuth(ctx);
    const entityType = ctx.url.searchParams.get("entityType");
    const entityId = ctx.url.searchParams.get("entityId");
    if (!entityType || !entityId) throw badRequest("entityType and entityId are required");
    const notes = ctx.db.notes
      .filter((n) => n.entityType === entityType && n.entityId === entityId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return ok(notes);
  }),

  route("POST", "/notes", (ctx) => {
    requireAuth(ctx);
    const input = validate(noteSchema, ctx.body);
    // Dispute handlers may annotate exchanges/disputes even without the general notes permission.
    const perms = ctx.session.permissions;
    const allowed = perms.includes("users.notes") || ((input.entityType === "EXCHANGE" || input.entityType === "DISPUTE") && perms.includes("disputes.manage"));
    if (!allowed) throw forbidden("Missing permission: users.notes");
    const note = {
      id: nextId(ctx.db, "note"),
      entityType: input.entityType,
      entityId: input.entityId,
      author: adminRefOf(ctx.db, ctx.session.admin.id),
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    ctx.db.notes.unshift(note);
    audit(ctx, {
      action: "note.create",
      entityType: input.entityType === "DISPUTE" ? "DISPUTE" : input.entityType,
      entityId: input.entityId,
      newValue: { body: input.body },
    });
    return ok(note, "Note added", { status: 201 });
  }),

  /** Moderation history for any target (user, listing, report...). */
  route("GET", "/moderation/history", (ctx) => {
    requirePermission(ctx, "moderation.read");
    const targetType = ctx.url.searchParams.get("targetType");
    const targetId = ctx.url.searchParams.get("targetId");
    if (!targetType || !targetId) throw badRequest("targetType and targetId are required");
    return ok(ctx.db.moderationActions.filter((m) => m.targetType === targetType && m.targetId === targetId));
  }),
];
