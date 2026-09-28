import "server-only";

import { presentBarter, presentListing, recomputeAggregates, type MockDb } from "@/lib/mock/db";
import { optionalReasonSchema, reasonSchema } from "@/schemas/common.schema";
import {
  LISTING_VALIDATION,
  attributesFor,
  listingUpdateSchema,
  rejectListingSchema,
  requestCorrectionSchema,
  validateListingAttributes,
  type ListingUpdateInput,
} from "@/schemas/listing.schema";
import type { FieldErrors, Listing, ListingStatus, ModerationActionType } from "@/types";
import { audit, recordModeration, requirePermission, type AuthedContext } from "../context";
import { conflict, csv, inDateRange, matchesSearch, notFound, ok, paginate, parseListParams, sortItems, unprocessable, validate } from "../http";
import { route } from "../router";
import { closeOpenReports } from "./moderation";

const DAY = 86_400_000;

function findListing(db: MockDb, id: string): Listing {
  const listing = db.listings.find((l) => l.id === id || l.code.toLowerCase() === id.toLowerCase());
  if (!listing) throw notFound("Listing not found");
  return listing;
}

function assertNotDeleted(listing: Listing) {
  if (listing.deletedAt) throw conflict("Listing is deleted. Restore it first.");
}

function assertStatus(listing: Listing, allowed: readonly ListingStatus[], action: string) {
  assertNotDeleted(listing);
  if (!allowed.includes(listing.status)) throw conflict(`Cannot ${action} a listing with status ${listing.status}`);
}

/** Persists a status change and records audit + moderation entries. */
function transition(
  ctx: AuthedContext,
  listing: Listing,
  opts: {
    next: ListingStatus;
    action: string;
    moderation: ModerationActionType;
    reason: string | null;
    patch?: Partial<Listing>;
    /** Resolve the listing's open reports with this note (same rule as the moderation queues). */
    resolveReports?: string;
  },
) {
  const old = { status: listing.status, rejectionReason: listing.rejectionReason, deletedAt: listing.deletedAt };
  listing.status = opts.next;
  Object.assign(listing, opts.patch ?? {});
  listing.updatedAt = new Date().toISOString();
  if (opts.resolveReports) {
    closeOpenReports(ctx, (r) => r.targetType === "LISTING" && r.targetId === listing.id, "RESOLVED", opts.resolveReports);
  }
  ctx.db.listingsVersion++;
  recomputeAggregates(ctx.db);
  audit(ctx, {
    action: `listing.${opts.action}`,
    entityType: "LISTING",
    entityId: listing.id,
    entityLabel: `${listing.code} — ${listing.title}`,
    oldValue: old,
    newValue: { status: listing.status, ...(opts.patch ?? {}) },
    reason: opts.reason,
  });
  recordModeration(ctx, opts.moderation, "LISTING", listing.id, `${listing.code} — ${listing.title}`, opts.reason);
  return ok(presentListing(ctx.db, listing), "Listing updated");
}

/** Validates references (category tree, region/district, preferences) that a Zod schema can't know about. */
export function validateReferences(db: MockDb, input: ListingUpdateInput, current: Listing | null): FieldErrors {
  const errors: FieldErrors = {};
  const add = (k: string, m: string) => (errors[k] ??= []).push(m);
  const cats = new Map(db.categories.map((c) => [c.id, c]));

  const category = cats.get(input.categoryId);
  if (!category || category.parentId !== null) add("categoryId", "validation.invalid");
  if (input.subcategoryId) {
    const sub = cats.get(input.subcategoryId);
    if (!sub) add("subcategoryId", "validation.invalid");
    else if (sub.parentId !== input.categoryId) add("subcategoryId", LISTING_VALIDATION.subcategoryMismatch);
  }
  if (!db.regions.some((r) => r.id === input.regionId)) add("regionId", "validation.invalid");
  if (input.districtId) {
    const d = db.districts.find((x) => x.id === input.districtId);
    if (!d) add("districtId", "validation.invalid");
    else if (d.regionId !== input.regionId) add("districtId", LISTING_VALIDATION.districtMismatch);
  }

  const p = input.exchangePreferences;
  if (p.categories.some((id) => cats.get(id)?.parentId !== null)) add("exchangePreferences.categories", "validation.invalid");
  if (p.subcategories.some((id) => !cats.get(id)?.parentId)) add("exchangePreferences.subcategories", "validation.invalid");
  if (p.regionIds.some((id) => !db.regions.some((r) => r.id === id))) add("exchangePreferences.regionIds", "validation.invalid");
  if (
    p.cashDifference &&
    !db.settings.barter.allowCashDifference &&
    JSON.stringify(p.cashDifference) !== JSON.stringify(current?.exchangePreferences.cashDifference ?? null)
  ) {
    add("exchangePreferences.cashDifference", LISTING_VALIDATION.cashDifferenceDisabled);
  }
  return errors;
}

const REJECTABLE: ListingStatus[] = ["PENDING", "ACTIVE", "PAUSED"];
const ARCHIVABLE: ListingStatus[] = ["DRAFT", "PENDING", "ACTIVE", "REJECTED", "PAUSED", "EXCHANGED"];

export const listingRoutes = [
  route("GET", "/listings", (ctx) => {
    requirePermission(ctx, "listings.read");
    const p = parseListParams(ctx.url, { sort: "createdAt", order: "desc" });
    const f = p.filters;
    const statuses = csv(f.status);
    const categories = csv(f.categoryId);
    const conditions = csv(f.condition);
    const regions = csv(f.regionId);
    const users = new Map(ctx.db.users.map((u) => [u.id, u]));

    let items = ctx.db.listings.filter((l) => {
      if (statuses.length && !statuses.includes(l.status)) return false;
      if (categories.length && !categories.includes(l.categoryId) && !(l.subcategoryId && categories.includes(l.subcategoryId))) return false;
      if (conditions.length && !conditions.includes(l.condition)) return false;
      if (regions.length && !regions.includes(l.regionId)) return false;
      if (f.userId && l.userId !== f.userId) return false;
      if (f.reported === "true" && l.reportsCount <= 0) return false;
      if (f.duplicate === "true" && !l.possibleDuplicateOf) return false;
      if (f.deleted === "true" && !l.deletedAt) return false;
      if (f.deleted === "false" && l.deletedAt) return false;
      if (!inDateRange(l.createdAt, f.from, f.to)) return false;
      if (p.search) {
        const owner = users.get(l.userId);
        return matchesSearch(p.search, l.id, l.code, l.title, owner?.fullName, owner?.username, owner?.phone);
      }
      return true;
    });
    items = sortItems(items, p.sort, p.order, {
      title: (l) => l.title,
      views: (l) => l.views,
      offersCount: (l) => l.offersCount,
      reportsCount: (l) => l.reportsCount,
      createdAt: (l) => l.createdAt,
      updatedAt: (l) => l.updatedAt,
    });
    return paginate(
      items.map((l) => presentListing(ctx.db, l)),
      p,
    );
  }),

  route("GET", "/listings/:id", (ctx) => {
    requirePermission(ctx, "listings.read");
    return ok(presentListing(ctx.db, findListing(ctx.db, ctx.params.id)));
  }),

  route("GET", "/listings/:id/offers", (ctx) => {
    requirePermission(ctx, "listings.read", "barter.read");
    const listing = findListing(ctx.db, ctx.params.id);
    const p = parseListParams(ctx.url, { limit: 10 });
    const statuses = csv(p.filters.status);
    const items = ctx.db.barterRequests
      .filter(
        (b) =>
          (b.offeredListingIds.includes(listing.id) || b.requestedListingIds.includes(listing.id)) &&
          (!statuses.length || statuses.includes(b.status)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((b) => presentBarter(ctx.db, b));
    return paginate(items, p);
  }),

  route("GET", "/listings/:id/reports", (ctx) => {
    requirePermission(ctx, "listings.read", "reports.read");
    const listing = findListing(ctx.db, ctx.params.id);
    const p = parseListParams(ctx.url, { limit: 10 });
    const items = ctx.db.reports
      .filter((r) => r.targetType === "LISTING" && r.targetId === listing.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(items, p);
  }),

  route("PATCH", "/listings/:id", (ctx) => {
    requirePermission(ctx, "listings.update");
    const listing = findListing(ctx.db, ctx.params.id);
    assertNotDeleted(listing);
    const input = validate(listingUpdateSchema, ctx.body);
    const errors = validateReferences(ctx.db, input, listing);
    const defs = attributesFor(ctx.db.attributes, input.categoryId, input.subcategoryId);
    const attrs = validateListingAttributes(defs, input.attributes);
    Object.assign(errors, attrs.errors);
    if (Object.keys(errors).length) throw unprocessable(errors);

    const old = {
      title: listing.title,
      description: listing.description,
      categoryId: listing.categoryId,
      subcategoryId: listing.subcategoryId,
      condition: listing.condition,
      regionId: listing.regionId,
      districtId: listing.districtId,
      location: listing.location,
      attributes: listing.attributes,
      exchangePreferences: listing.exchangePreferences,
    };
    const prefs = input.exchangePreferences;
    Object.assign(listing, {
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId || null,
      condition: input.condition,
      regionId: input.regionId,
      districtId: input.districtId || null,
      location: input.location?.trim() || null,
      attributes: attrs.values,
      exchangePreferences: {
        openToOffers: prefs.openToOffers,
        categories: [...new Set(prefs.categories)],
        subcategories: [...new Set(prefs.subcategories)],
        keywords: [...new Set(prefs.keywords.map((k) => k.trim()).filter(Boolean))],
        conditions: [...new Set(prefs.conditions)],
        regionIds: [...new Set(prefs.regionIds)],
        note: prefs.note?.trim() || null,
        cashDifference: prefs.cashDifference ?? null,
      },
      updatedAt: new Date().toISOString(),
    } satisfies Partial<Listing>);
    ctx.db.listingsVersion++;
    recomputeAggregates(ctx.db);
    audit(ctx, {
      action: "listing.update",
      entityType: "LISTING",
      entityId: listing.id,
      entityLabel: `${listing.code} — ${listing.title}`,
      oldValue: old,
      newValue: { ...input, attributes: attrs.values },
    });
    return ok(presentListing(ctx.db, listing), "Listing updated");
  }),

  route("POST", "/listings/:id/approve", (ctx) => {
    requirePermission(ctx, "listings.approve");
    const listing = findListing(ctx.db, ctx.params.id);
    const { reason } = validate(optionalReasonSchema, ctx.body ?? {});
    assertStatus(listing, ["PENDING"], "approve");
    const now = Date.now();
    return transition(ctx, listing, {
      next: "ACTIVE",
      action: "approve",
      moderation: "APPROVE",
      reason: reason || null,
      patch: {
        publishedAt: listing.publishedAt ?? new Date(now).toISOString(),
        expiresAt: new Date(now + ctx.db.settings.listings.expirationDays * DAY).toISOString(),
        rejectionReason: null,
        rejectionNote: null,
      },
    });
  }),

  route("POST", "/listings/:id/reject", (ctx) => {
    requirePermission(ctx, "listings.reject");
    const listing = findListing(ctx.db, ctx.params.id);
    const { reason, note } = validate(rejectListingSchema, ctx.body);
    assertStatus(listing, REJECTABLE, "reject");
    return transition(ctx, listing, {
      next: "REJECTED",
      action: "reject",
      moderation: "REJECT",
      reason: note ? `${reason}: ${note}` : reason,
      patch: { rejectionReason: reason, rejectionNote: note || null, rejectionCount: listing.rejectionCount + 1, expiresAt: null },
      resolveReports: `Listing rejected: ${note || reason}`,
    });
  }),

  route("POST", "/listings/:id/request-correction", (ctx) => {
    requirePermission(ctx, "listings.reject");
    const listing = findListing(ctx.db, ctx.params.id);
    const { note } = validate(requestCorrectionSchema, ctx.body);
    assertStatus(listing, REJECTABLE, "request a correction for");
    return transition(ctx, listing, {
      next: "REJECTED",
      action: "request_correction",
      moderation: "REQUEST_CORRECTION",
      reason: note,
      patch: { rejectionReason: null, rejectionNote: note, expiresAt: null },
      resolveReports: `Correction requested: ${note}`,
    });
  }),

  route("POST", "/listings/:id/block", (ctx) => {
    requirePermission(ctx, "listings.block");
    const listing = findListing(ctx.db, ctx.params.id);
    const { reason } = validate(reasonSchema, ctx.body);
    assertNotDeleted(listing);
    if (listing.status === "BLOCKED") throw conflict("Listing is already blocked");
    return transition(ctx, listing, { next: "BLOCKED", action: "block", moderation: "BLOCK", reason, patch: { expiresAt: null }, resolveReports: `Listing blocked: ${reason}` });
  }),

  route("POST", "/listings/:id/unblock", (ctx) => {
    requirePermission(ctx, "listings.block");
    const listing = findListing(ctx.db, ctx.params.id);
    const { reason } = validate(optionalReasonSchema, ctx.body ?? {});
    assertStatus(listing, ["BLOCKED"], "unblock");
    const now = Date.now();
    return transition(ctx, listing, {
      next: "ACTIVE",
      action: "unblock",
      moderation: "UNBLOCK",
      reason: reason || null,
      patch: {
        publishedAt: listing.publishedAt ?? new Date(now).toISOString(),
        expiresAt: new Date(now + ctx.db.settings.listings.expirationDays * DAY).toISOString(),
      },
    });
  }),

  route("POST", "/listings/:id/archive", (ctx) => {
    requirePermission(ctx, "listings.update");
    const listing = findListing(ctx.db, ctx.params.id);
    const { reason } = validate(optionalReasonSchema, ctx.body ?? {});
    assertStatus(listing, ARCHIVABLE, "archive");
    return transition(ctx, listing, { next: "ARCHIVED", action: "archive", moderation: "ARCHIVE", reason: reason || null, patch: { expiresAt: null } });
  }),

  route("DELETE", "/listings/:id", (ctx) => {
    requirePermission(ctx, "listings.delete");
    const listing = findListing(ctx.db, ctx.params.id);
    const reason = ctx.url.searchParams.get("reason")?.trim() || null;
    if (listing.deletedAt) throw conflict("Listing is already deleted");
    if (!reason || reason.length < 3) throw unprocessable({ reason: ["validation.reasonRequired"] });
    // Soft delete: the previous status is kept in the audit log so restore can bring it back.
    return transition(ctx, listing, {
      next: "ARCHIVED",
      action: "delete",
      moderation: "DELETE",
      reason,
      patch: { deletedAt: new Date().toISOString(), expiresAt: null },
    });
  }),

  route("POST", "/listings/:id/restore", (ctx) => {
    requirePermission(ctx, "listings.delete");
    const listing = findListing(ctx.db, ctx.params.id);
    if (!listing.deletedAt) throw conflict("Listing is not deleted");
    const deletion = ctx.db.auditLogs.find((a) => a.action === "listing.delete" && a.entityId === listing.id);
    const prev = deletion?.oldValue?.status as ListingStatus | undefined;
    // Back to the pre-deletion status (a blocked listing stays blocked); ACTIVE gets a fresh expiry.
    const next: ListingStatus = prev ?? "ARCHIVED";
    return transition(ctx, listing, {
      next,
      action: "restore",
      moderation: "RESTORE",
      reason: null,
      patch: {
        deletedAt: null,
        expiresAt: next === "ACTIVE" ? new Date(Date.now() + ctx.db.settings.listings.expirationDays * DAY).toISOString() : listing.expiresAt,
      },
    });
  }),
];
