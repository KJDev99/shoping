import "server-only";

import type { MockDb } from "@/lib/mock/db";
import type { Listing, MyListing, PublicListing, PublicListingCard, SiteConfig } from "@/types";
import { csv, matchesSearch, notFound, ok, paginate, parseListParams, sortItems } from "../../http";
import { clientIp } from "../../context";
import { appRoute } from "../core";

const recentVideoViews = new Map<string, number>();

export function toCard(l: Listing): PublicListingCard {
  const p = l.exchangePreferences;
  return {
    id: l.id,
    code: l.code,
    title: l.title,
    image: l.images[0]?.url ?? null,
    imagesCount: l.images.length,
    condition: l.condition,
    categoryId: l.categoryId,
    subcategoryId: l.subcategoryId,
    regionId: l.regionId,
    districtId: l.districtId,
    wants: { openToOffers: p.openToOffers, subcategories: p.subcategories, categories: p.categories, keywords: p.keywords, note: p.note },
    views: l.views,
    favoritesCount: l.favoritesCount,
    publishedAt: l.publishedAt,
    createdAt: l.createdAt,
  };
}

export function toMyListing(l: Listing): MyListing {
  return {
    ...toCard(l),
    status: l.status,
    rejectionReason: l.rejectionReason,
    rejectionNote: l.rejectionNote,
    offersCount: l.offersCount,
    updatedAt: l.updatedAt,
  };
}

function toPublic(db: MockDb, l: Listing): PublicListing {
  const owner = db.users.find((u) => u.id === l.userId)!;
  const { image: _image, imagesCount: _count, wants: _wants, ...card } = toCard(l);
  void _image;
  void _count;
  void _wants;
  return {
    ...card,
    description: l.description,
    images: l.images,
    // Only real uploads are playable (seeded demo rows point at a placeholder path).
    video: l.video?.url.startsWith("/api/app/uploads/") ? l.video : null,
    attributes: l.attributes,
    location: l.location,
    exchangePreferences: db.settings.barter.allowCashDifference ? l.exchangePreferences : { ...l.exchangePreferences, cashDifference: null },
    offersCount: l.offersCount,
    owner: {
      id: owner.id,
      fullName: owner.fullName,
      avatar: owner.avatar,
      regionId: owner.regionId,
      rating: owner.rating,
      reviewsCount: owner.reviewsCount,
      completedExchanges: owner.completedExchanges,
      memberSince: owner.createdAt,
    },
  };
}

/** Publicly visible: active, not deleted, and the owner's account is in good standing. */
function isPublic(db: MockDb, l: Listing) {
  if (l.status !== "ACTIVE" || l.deletedAt) return false;
  const owner = db.users.find((u) => u.id === l.userId);
  return !!owner && owner.status !== "BLOCKED" && owner.status !== "DELETED";
}

export const catalogRoutes = [
  appRoute(
    "GET",
    "/config",
    (ctx) => {
      const s = ctx.db.settings;
      const config: SiteConfig = {
        maxImages: s.listings.maxImages,
        requireModeration: s.listings.requireModeration,
        allowCashDifference: s.barter.allowCashDifference,
        allowOpenOffers: s.barter.allowOpenOffers,
      };
      return ok(config);
    },
    { public: true },
  ),

  /** Only enabled regions/districts and active categories are offered to users. */
  appRoute(
    "GET",
    "/lookups",
    (ctx) => {
      const activeCats = ctx.db.categories.filter((c) => {
        if (c.status !== "ACTIVE") return false;
        const parent = c.parentId ? ctx.db.categories.find((p) => p.id === c.parentId) : null;
        return !parent || parent.status === "ACTIVE";
      });
      const catIds = new Set(activeCats.map((c) => c.id));
      const regions = ctx.db.regions.filter((r) => r.enabled);
      const regionIds = new Set(regions.map((r) => r.id));
      return ok({
        regions,
        districts: ctx.db.districts.filter((d) => d.enabled && regionIds.has(d.regionId)),
        categories: activeCats,
        attributes: ctx.db.attributes.filter((a) => catIds.has(a.categoryId)),
        settings: { allowCashDifference: ctx.db.settings.barter.allowCashDifference },
      });
    },
    { public: true },
  ),

  appRoute(
    "GET",
    "/listings",
    (ctx) => {
      const p = parseListParams(ctx.url, { limit: 24, sort: "createdAt", order: "desc" });
      const f = p.filters;
      const categories = csv(f.categoryId);
      const regions = csv(f.regionId);
      const conditions = csv(f.condition);
      let items = ctx.db.listings.filter(
        (l) =>
          isPublic(ctx.db, l) &&
          (!categories.length || categories.includes(l.categoryId) || (!!l.subcategoryId && categories.includes(l.subcategoryId))) &&
          (!regions.length || regions.includes(l.regionId)) &&
          (!conditions.length || conditions.includes(l.condition)) &&
          (f.openToOffers !== "true" || l.exchangePreferences.openToOffers) &&
          matchesSearch(p.search, l.title, l.description, l.code, ...l.exchangePreferences.keywords),
      );
      items = sortItems(items, p.sort, p.order, {
        createdAt: (l) => l.publishedAt ?? l.createdAt,
        views: (l) => l.views,
        favoritesCount: (l) => l.favoritesCount,
      });
      return paginate(items.map(toCard), p);
    },
    { public: true },
  ),

  appRoute(
    "GET",
    "/listings/:id",
    (ctx) => {
      const l = ctx.db.listings.find((x) => x.id === ctx.params.id);
      const isOwner = !!l && ctx.user?.id === l.userId;
      // Owners may preview their own pending/rejected listings; everyone else sees active ones only.
      if (!l || l.deletedAt || (!isPublic(ctx.db, l) && !isOwner)) throw notFound("Listing not found");
      if (!isOwner && l.status === "ACTIVE") l.views += 1;
      const myOffer = ctx.user
        ? ctx.db.barterRequests.find((b) => b.senderId === ctx.user!.id && b.requestedListingIds.includes(l.id) && (b.status === "PENDING" || b.status === "ACCEPTED"))
        : undefined;
      return ok({ listing: toPublic(ctx.db, l), status: l.status, isOwner, myOffer: myOffer ? { id: myOffer.id, status: myOffer.status } : null });
    },
    { public: true },
  ),

  /** Counts a video play. Owners are not counted and one visitor counts once per 30 minutes. */
  appRoute(
    "POST",
    "/listings/:id/video-view",
    (ctx) => {
      const l = ctx.db.listings.find((x) => x.id === ctx.params.id);
      if (!l || !l.video || !isPublic(ctx.db, l)) throw notFound("Listing not found");
      if (ctx.user?.id === l.userId) return ok({ views: l.video.views });
      const viewer = ctx.user?.id ?? clientIp(ctx.req);
      const key = `${l.id}:${viewer}`;
      const last = recentVideoViews.get(key) ?? 0;
      if (Date.now() - last > 30 * 60_000) {
        recentVideoViews.set(key, Date.now());
        l.video.views += 1;
      }
      return ok({ views: l.video.views });
    },
    { public: true },
  ),

  appRoute(
    "GET",
    "/listings/:id/similar",
    (ctx) => {
      const l = ctx.db.listings.find((x) => x.id === ctx.params.id);
      if (!l) throw notFound("Listing not found");
      const items = ctx.db.listings
        .filter((x) => x.id !== l.id && isPublic(ctx.db, x) && (x.subcategoryId ?? x.categoryId) === (l.subcategoryId ?? l.categoryId))
        .slice(0, 8)
        .map(toCard);
      return ok(items);
    },
    { public: true },
  ),
];
