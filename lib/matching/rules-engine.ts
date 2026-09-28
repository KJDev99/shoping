import type { ID, Listing, MatchReason, MatchScoreBreakdown } from "@/types";
import type { ComputeOptions, MatchContext, MatchEngine, MatchResult, ScoredPair } from "./types";

/**
 * RULES_V1 — deterministic, explainable barter matching.
 *
 * "A satisfies B" when B's owner would accept A's item:
 *   • B is open to any offers, OR
 *   • A's category/subcategory is in B's wanted categories/subcategories, OR
 *   • A's title (or its text attributes such as brand/model) contains one of B's wanted keywords.
 *
 * Score (0–100) = category (≤40) + keywords (≤30) + location (≤15) + condition (≤15).
 * Each satisfied direction contributes up to half of the category points, so a
 * one-way match tops out at 80 and only mutual matches can reach 100.
 */

export const SCORE_WEIGHTS = {
  /** Per satisfied direction. */
  categoryExact: 20,
  categoryParent: 14,
  categoryOpenOnly: 8,
  /** Per matched keyword, capped at `keywordsMax`. */
  keyword: 10,
  keywordsMax: 30,
  locationCompatible: 10,
  sameRegion: 5,
  condition: 15,
} as const;

export const SCORE_MAX = { category: 40, keywords: 30, location: 15, condition: 15, total: 100 } as const;

interface Direction {
  satisfied: boolean;
  categoryPoints: number;
  categories: ID[];
  keywords: string[];
  viaOpenOnly: boolean;
  locationOk: boolean;
  conditionOk: boolean;
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Searchable text describing what an item *is* (title + text attributes like brand/model). */
export function itemHaystack(l: Listing): string {
  const attrText = Object.values(l.attributes)
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((v): v is string => typeof v === "string");
  return normalize([l.title, ...attrText].join(" "));
}

function categoriesOf(l: Listing, ctx: MatchContext): ID[] {
  const ids = [l.categoryId];
  if (l.subcategoryId) ids.push(l.subcategoryId);
  const parent = ctx.categoryParent.get(l.categoryId);
  if (parent) ids.push(parent);
  return ids;
}

/** Evaluates whether `giver`'s item satisfies `receiver`'s exchange preferences. */
function evaluate(giver: Listing, receiver: Listing, ctx: MatchContext, haystack: string): Direction {
  const prefs = receiver.exchangePreferences;
  const wanted = new Set([...prefs.categories, ...prefs.subcategories]);
  const exactId = giver.subcategoryId ?? giver.categoryId;
  const categories: ID[] = [];
  let categoryPoints = 0;
  if (wanted.has(exactId)) {
    categories.push(exactId);
    categoryPoints = SCORE_WEIGHTS.categoryExact;
  } else {
    const hit = categoriesOf(giver, ctx).find((c) => wanted.has(c));
    if (hit) {
      categories.push(hit);
      categoryPoints = SCORE_WEIGHTS.categoryParent;
    }
  }
  const keywords = prefs.keywords.filter((k) => k.trim() && haystack.includes(normalize(k)));
  const explicit = categories.length > 0 || keywords.length > 0;
  const satisfied = explicit || prefs.openToOffers;
  return {
    satisfied,
    categoryPoints: explicit ? categoryPoints : satisfied ? SCORE_WEIGHTS.categoryOpenOnly : 0,
    categories,
    keywords,
    viaOpenOnly: satisfied && !explicit,
    locationOk: prefs.regionIds.length === 0 || prefs.regionIds.includes(giver.regionId),
    conditionOk: prefs.conditions.length === 0 || prefs.conditions.includes(giver.condition),
  };
}

function combine(ab: Direction, ba: Direction, a: Listing, b: Listing): MatchResult {
  const dirs = [ab, ba].filter((d) => d.satisfied);
  const locationCompatible = dirs.every((d) => d.locationOk);
  const conditionCompatible = dirs.every((d) => d.conditionOk);
  const sameRegion = a.regionId === b.regionId;
  const keywords = [...new Set(dirs.flatMap((d) => d.keywords))];

  const breakdown: MatchScoreBreakdown = {
    category: Math.min(SCORE_MAX.category, dirs.reduce((s, d) => s + d.categoryPoints, 0)),
    keywords: Math.min(SCORE_WEIGHTS.keywordsMax, keywords.length * SCORE_WEIGHTS.keyword),
    location: (locationCompatible ? SCORE_WEIGHTS.locationCompatible : 0) + (sameRegion ? SCORE_WEIGHTS.sameRegion : 0),
    condition: conditionCompatible ? SCORE_WEIGHTS.condition : 0,
    total: 0,
  };
  breakdown.total = Math.min(100, breakdown.category + breakdown.keywords + breakdown.location + breakdown.condition);

  const reason: MatchReason = {
    aSatisfiesB: ab.satisfied,
    bSatisfiesA: ba.satisfied,
    matchingCategories: [...new Set(dirs.flatMap((d) => d.categories))],
    matchingKeywords: keywords,
    locationCompatible,
    sameRegion,
    conditionCompatible,
    openToOffers: dirs.some((d) => d.viaOpenOnly),
  };
  return { type: ab.satisfied && ba.satisfied ? "MUTUAL_MATCH" : "ONE_WAY_MATCH", score: breakdown.total, breakdown, reason };
}

/** Pure pair scorer. Returns null for same-owner pairs, non-active listings, or when nobody's wishes are met. */
export function scoreMatch(a: Listing, b: Listing, ctx: MatchContext): MatchResult | null {
  if (a.id === b.id || a.userId === b.userId) return null;
  if (a.status !== "ACTIVE" || b.status !== "ACTIVE") return null;
  const ab = evaluate(a, b, ctx, itemHaystack(a));
  const ba = evaluate(b, a, ctx, itemHaystack(b));
  if (!ab.satisfied && !ba.satisfied) return null;
  return combine(ab, ba, a, b);
}

/**
 * Candidate generation via inverted indexes (wanted category → listings,
 * wanted keyword → listings, open-to-offers set) instead of naive all-pairs.
 */
function candidatePairs(listings: readonly Listing[], ctx: MatchContext): Array<[Listing, Listing]> {
  const byWantedCategory = new Map<ID, Listing[]>();
  const byWantedKeyword = new Map<string, Listing[]>();
  const openToOffers: Listing[] = [];
  const push = <K>(m: Map<K, Listing[]>, k: K, l: Listing) => {
    const arr = m.get(k);
    if (arr) arr.push(l);
    else m.set(k, [l]);
  };
  for (const l of listings) {
    const p = l.exchangePreferences;
    if (p.openToOffers) openToOffers.push(l);
    for (const c of new Set([...p.categories, ...p.subcategories])) push(byWantedCategory, c, l);
    for (const k of new Set(p.keywords.map(normalize).filter(Boolean))) push(byWantedKeyword, k, l);
  }
  const keywordEntries = [...byWantedKeyword.entries()];

  const seen = new Set<string>();
  const pairs: Array<[Listing, Listing]> = [];
  const add = (x: Listing, y: Listing) => {
    if (x.userId === y.userId) return;
    const [a, b] = x.id < y.id ? [x, y] : [y, x];
    const key = `${a.id}|${b.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push([a, b]);
  };
  for (const giver of listings) {
    for (const c of categoriesOf(giver, ctx)) for (const r of byWantedCategory.get(c) ?? []) add(giver, r);
    const hay = itemHaystack(giver);
    for (const [k, receivers] of keywordEntries) if (hay.includes(k)) for (const r of receivers) add(giver, r);
    for (const r of openToOffers) add(giver, r);
  }
  return pairs;
}

export const rulesMatchEngine: MatchEngine = {
  id: "RULES_V1",
  scorePair: scoreMatch,
  computeAll(listings, ctx, opts: ComputeOptions = {}): ScoredPair[] {
    const { topPerListing = 8, minScore = 0 } = opts;
    const active = listings.filter((l) => l.status === "ACTIVE" && !l.deletedAt);
    const scored: ScoredPair[] = [];
    for (const [a, b] of candidatePairs(active, ctx)) {
      const r = scoreMatch(a, b, ctx);
      if (!r || r.score < minScore) continue;
      // One-way matches are oriented so that A's item satisfies B's wishes.
      if (!r.reason.aSatisfiesB) scored.push({ ...scoreMatch(b, a, ctx)!, listingA: b, listingB: a });
      else scored.push({ ...r, listingA: a, listingB: b });
    }
    // Keep the best N per listing; a pair survives if either side keeps it.
    const byListing = new Map<ID, ScoredPair[]>();
    for (const p of scored) {
      for (const id of [p.listingA.id, p.listingB.id]) {
        const arr = byListing.get(id);
        if (arr) arr.push(p);
        else byListing.set(id, [p]);
      }
    }
    const keep = new Set<ScoredPair>();
    for (const arr of byListing.values()) {
      arr
        .sort((x, y) => y.score - x.score || (x.type === y.type ? 0 : x.type === "MUTUAL_MATCH" ? -1 : 1))
        .slice(0, topPerListing)
        .forEach((p) => keep.add(p));
    }
    return scored.filter((p) => keep.has(p)).sort((x, y) => y.score - x.score);
  },
};
