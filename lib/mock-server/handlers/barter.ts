import "server-only";

import { presentBarter, type MockDb } from "@/lib/mock/db";
import type { BarterRequestDetail, ItemDetail, ParticipantInfo, ResolvedAttribute } from "@/services/barter.service";
import type { BarterRequest, BarterStatusChange, CategoryAttribute, ID, ListingAttributeValue, TranslatedText } from "@/types";
import { requirePermission } from "../context";
import { csv, inDateRange, matchesSearch, notFound, ok, paginate, parseListParams, sortItems } from "../http";
import { route } from "../router";

const same = (s: string): TranslatedText => ({ uz: s, ru: s, en: s });
const YES: TranslatedText = { uz: "Ha", ru: "Да", en: "Yes" };
const NO: TranslatedText = { uz: "Yo'q", ru: "Нет", en: "No" };

function optionLabel(attr: CategoryAttribute, value: string): TranslatedText {
  return attr.options.find((o) => o.value === value)?.label ?? same(value);
}

function resolveValue(attr: CategoryAttribute, value: ListingAttributeValue): TranslatedText {
  const unit = attr.unit ? ` ${attr.unit}` : "";
  if (typeof value === "boolean") return value ? YES : NO;
  if (typeof value === "number") return same(`${value}${unit}`);
  if (Array.isArray(value)) {
    const labels = value.map((v) => optionLabel(attr, v));
    return { uz: labels.map((l) => l.uz).join(", "), ru: labels.map((l) => l.ru).join(", "), en: labels.map((l) => l.en).join(", ") };
  }
  if (attr.options.length) return optionLabel(attr, value);
  return same(`${value}${unit}`);
}

/** Resolves each listing's dynamic attributes against the attribute definitions (server-side, so the client needs no extra calls). */
export function itemDetailsFor(db: MockDb, listingIds: ID[]): Record<ID, ItemDetail> {
  const attrById = new Map(db.attributes.map((a) => [a.id, a]));
  const out: Record<ID, ItemDetail> = {};
  for (const id of listingIds) {
    const l = db.listings.find((x) => x.id === id);
    if (!l) continue;
    const attributes: ResolvedAttribute[] = Object.entries(l.attributes)
      .map(([attrId, value]) => ({ attr: attrById.get(attrId), value }))
      .filter((x): x is { attr: CategoryAttribute; value: ListingAttributeValue } => !!x.attr)
      .sort((a, b) => a.attr.sortOrder - b.attr.sortOrder)
      .map(({ attr, value }) => ({ id: attr.id, label: attr.name, value: resolveValue(attr, value) }));
    out[id] = { code: l.code, attributes, imagesCount: l.images.length };
  }
  return out;
}

export function participantInfoFor(db: MockDb, userIds: ID[]): Record<ID, ParticipantInfo> {
  const out: Record<ID, ParticipantInfo> = {};
  for (const id of userIds) {
    const u = db.users.find((x) => x.id === id);
    if (!u) continue;
    out[id] = {
      id: u.id,
      status: u.status,
      riskLevel: u.riskLevel,
      rating: u.rating,
      reviewsCount: u.reviewsCount,
      completedExchanges: u.completedExchanges,
      reportsCount: u.reportsCount,
      regionId: u.regionId,
      createdAt: u.createdAt,
    };
  }
  return out;
}

/** Derives the status timeline from the request's timestamps (a real backend stores an event log). */
function statusHistoryOf(db: MockDb, b: BarterRequest): BarterStatusChange[] {
  const history: BarterStatusChange[] = [{ status: "PENDING", at: b.createdAt, byUserId: b.senderId }];
  if (b.respondedAt) {
    if (b.status === "ACCEPTED" || b.status === "COMPLETED") history.push({ status: "ACCEPTED", at: b.respondedAt, byUserId: b.receiverId });
    if (b.status === "DECLINED") history.push({ status: "DECLINED", at: b.respondedAt, byUserId: b.receiverId });
    if (b.status === "CANCELLED") history.push({ status: "CANCELLED", at: b.respondedAt, byUserId: b.senderId });
  }
  if (b.status === "COMPLETED") {
    const ex = b.exchangeId ? db.exchanges.find((e) => e.id === b.exchangeId) : undefined;
    history.push({ status: "COMPLETED", at: ex?.completedAt ?? b.updatedAt, byUserId: null });
  }
  if (b.status === "EXPIRED") history.push({ status: "EXPIRED", at: b.expiresAt ?? b.updatedAt, byUserId: null });
  return history;
}

function isMulti(b: BarterRequest) {
  return b.offeredListingIds.length > 1 || b.requestedListingIds.length > 1;
}

export const barterRoutes = [
  route("GET", "/barter-requests", (ctx) => {
    requirePermission(ctx, "barter.read");
    const p = parseListParams(ctx.url, { sort: "createdAt", order: "desc" });
    const f = p.filters;
    const statuses = csv(f.status);
    const shapes = csv(f.shape);
    let items = ctx.db.barterRequests
      .filter(
        (b) =>
          (!statuses.length || statuses.includes(b.status)) &&
          (!shapes.length || shapes.includes(isMulti(b) ? "multi" : "1:1")) &&
          inDateRange(b.createdAt, f.from, f.to) &&
          (!f.userId || b.senderId === f.userId || b.receiverId === f.userId) &&
          (!f.listingId || b.offeredListingIds.includes(f.listingId) || b.requestedListingIds.includes(f.listingId)),
      )
      .map((b) => presentBarter(ctx.db, b))
      .filter((b) =>
        matchesSearch(
          p.search,
          b.code,
          b.id,
          b.sender.fullName,
          b.sender.phone,
          b.receiver.fullName,
          b.receiver.phone,
          ...b.items.map((i) => i.listing.title),
        ),
      );
    items = sortItems(items, p.sort, p.order, {
      createdAt: (b) => b.createdAt,
      updatedAt: (b) => b.updatedAt,
      status: (b) => b.status,
    });
    return paginate(items, p);
  }),

  route("GET", "/barter-requests/:id", (ctx) => {
    requirePermission(ctx, "barter.read");
    const raw = ctx.db.barterRequests.find((b) => b.id === ctx.params.id || b.code === ctx.params.id);
    if (!raw) throw notFound("Barter request not found");
    const b = presentBarter(ctx.db, raw);
    const ex = b.exchangeId ? ctx.db.exchanges.find((e) => e.id === b.exchangeId) : undefined;
    const detail: BarterRequestDetail = {
      ...b,
      statusHistory: statusHistoryOf(ctx.db, b),
      exchange: ex ? { id: ex.id, code: ex.code, status: ex.status, disputeId: ex.disputeId } : null,
      reports: ctx.db.reports
        .filter((r) => r.targetType === "BARTER_REQUEST" && r.targetId === b.id)
        .sort((x, y) => y.createdAt.localeCompare(x.createdAt)),
      itemDetails: itemDetailsFor(ctx.db, [...b.offeredListingIds, ...b.requestedListingIds]),
      participants: participantInfoFor(ctx.db, [b.senderId, b.receiverId]),
    };
    return ok(detail);
  }),
];
