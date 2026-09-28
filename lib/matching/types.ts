import type { BarterMatch, ExchangePreference, ID, Listing, MatchReason, MatchScoreBreakdown, MatchType } from "@/types";

/** Engine identifier stored on every match so results stay traceable. */
export type MatchEngineId = "RULES_V1";

/** Reference data an engine may need beyond the two listings. */
export interface MatchContext {
  /** Category id → parent category id (null for top-level categories). */
  categoryParent: ReadonlyMap<ID, ID | null>;
}

/** Result of scoring one pair of listings. `listingA`/`listingB` keep the input order. */
export interface MatchResult {
  type: MatchType;
  /** 0..100 */
  score: number;
  breakdown: MatchScoreBreakdown;
  reason: MatchReason;
}

export interface ScoredPair extends MatchResult {
  listingA: Listing;
  listingB: Listing;
}

export interface ComputeOptions {
  /** Keep at most this many best matches per listing (a pair survives if either side keeps it). */
  topPerListing?: number;
  /** Drop pairs below this score. */
  minScore?: number;
}

/**
 * Contract for anything that produces barter matches. Today a deterministic
 * rule-based scorer implements it; a recommendation service can replace it
 * later without touching the API or UI.
 */
export interface MatchEngine {
  readonly id: MatchEngineId;
  /** Scores a single pair; returns null when neither listing satisfies the other's wishes. */
  scorePair(a: Listing, b: Listing, ctx: MatchContext): MatchResult | null;
  /** Computes the best pairs across a set of listings. */
  computeAll(listings: readonly Listing[], ctx: MatchContext, opts?: ComputeOptions): ScoredPair[];
}

/** GET /matches/:id — a match plus both owners' exchange preferences for the "why matched" view. */
export interface BarterMatchDetail extends BarterMatch {
  codeA: string;
  codeB: string;
  preferencesA: ExchangePreference;
  preferencesB: ExchangePreference;
}
