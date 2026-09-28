import "server-only";

import { userRefOf, type MockDb } from "@/lib/mock/db";
import { rulesMatchEngine, type BarterMatchDetail, type MatchContext, type ScoredPair } from "@/lib/matching";
import type { BarterMatch, ID, Listing } from "@/types";
import { requirePermission } from "../context";
import { csv, matchesSearch, notFound, ok, paginate, parseListParams, sortItems } from "../http";
import { route } from "../router";

/** Best matches kept per listing; keeps the result set focused and fast. */
const TOP_PER_LISTING = 8;

type MatchSide = BarterMatch["listingA"];

interface CacheEntry {
  version: number;
  db: MockDb;
  computedAt: string;
  matches: BarterMatch[];
  byId: Map<ID, BarterMatch>;
  listings: Map<ID, Listing>;
}

// Module-scoped cache, invalidated whenever `db.listingsVersion` changes.
let cache: CacheEntry | null = null;

function sideOf(db: MockDb, l: Listing): MatchSide {
  return {
    id: l.id,
    title: l.title,
    image: l.images.find((i) => i.isCover)?.url ?? l.images[0]?.url ?? null,
    condition: l.condition,
    categoryId: l.subcategoryId ?? l.categoryId,
    ownerId: l.userId,
    status: l.status,
    regionId: l.regionId,
    ownerName: userRefOf(db, l.userId).fullName,
    conditionWanted: l.exchangePreferences.conditions,
  };
}

function toMatch(db: MockDb, p: ScoredPair, computedAt: string): BarterMatch {
  return {
    id: `mt_${p.listingA.id}__${p.listingB.id}`,
    type: p.type,
    score: p.score,
    breakdown: p.breakdown,
    reason: p.reason,
    listingA: sideOf(db, p.listingA),
    listingB: sideOf(db, p.listingB),
    ownerA: userRefOf(db, p.listingA.userId),
    ownerB: userRefOf(db, p.listingB.userId),
    engine: rulesMatchEngine.id,
    computedAt,
  };
}

function getMatches(db: MockDb): CacheEntry {
  if (cache && cache.db === db && cache.version === db.listingsVersion) return cache;
  const ctx: MatchContext = { categoryParent: new Map(db.categories.map((c) => [c.id, c.parentId])) };
  const computedAt = new Date().toISOString();
  const matches = rulesMatchEngine.computeAll(db.listings, ctx, { topPerListing: TOP_PER_LISTING }).map((p) => toMatch(db, p, computedAt));
  cache = {
    version: db.listingsVersion,
    db,
    computedAt,
    matches,
    byId: new Map(matches.map((m) => [m.id, m])),
    listings: new Map(db.listings.map((l) => [l.id, l])),
  };
  return cache;
}

function withFreshOwners(db: MockDb, m: BarterMatch): BarterMatch {
  return { ...m, ownerA: userRefOf(db, m.ownerA.id), ownerB: userRefOf(db, m.ownerB.id) };
}

export const matchRoutes = [
  route("GET", "/matches", (ctx) => {
    requirePermission(ctx, "matches.read");
    const p = parseListParams(ctx.url, { sort: "score", order: "desc" });
    const f = p.filters;
    const { matches, listings } = getMatches(ctx.db);
    const types = csv(f.type);
    const categories = new Set(csv(f.categoryId));
    const regions = new Set(csv(f.regionId));
    const minScore = f.minScore !== undefined ? Number(f.minScore) : undefined;
    const catsOf = (id: ID) => {
      const l = listings.get(id);
      return l ? [l.categoryId, l.subcategoryId] : [];
    };
    let items = matches.filter(
      (m) =>
        (!types.length || types.includes(m.type)) &&
        (minScore === undefined || Number.isNaN(minScore) || m.score >= minScore) &&
        (!f.listingId || m.listingA.id === f.listingId || m.listingB.id === f.listingId) &&
        (!regions.size || regions.has(m.listingA.regionId) || regions.has(m.listingB.regionId)) &&
        (!categories.size || [...catsOf(m.listingA.id), ...catsOf(m.listingB.id)].some((c) => c && categories.has(c))) &&
        matchesSearch(p.search, m.listingA.title, m.listingB.title, listings.get(m.listingA.id)?.code, listings.get(m.listingB.id)?.code, m.id),
    );
    items = sortItems(items, p.sort, p.order, {
      score: (m) => m.score,
      computedAt: (m) => m.computedAt,
    });
    // Owner refs are refreshed at read time (names can change without a listings version bump).
    return paginate(
      items.map((m) => withFreshOwners(ctx.db, m)),
      p,
    );
  }),

  route("GET", "/matches/:id", (ctx) => {
    requirePermission(ctx, "matches.read");
    const { byId, listings } = getMatches(ctx.db);
    const m = byId.get(ctx.params.id);
    if (!m) throw notFound("Match not found");
    const a = listings.get(m.listingA.id);
    const b = listings.get(m.listingB.id);
    if (!a || !b) throw notFound("Match not found");
    const detail: BarterMatchDetail = {
      ...withFreshOwners(ctx.db, m),
      preferencesA: a.exchangePreferences,
      preferencesB: b.exchangePreferences,
      codeA: a.code,
      codeB: b.code,
    };
    return ok(detail);
  }),
];
