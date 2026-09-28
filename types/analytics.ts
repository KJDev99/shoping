import type { ID, ISODate, ListingRef, UserRef } from "./common";
import type { ItemCondition } from "./listing";

// ---------- Matching ----------

export const MATCH_TYPES = ["ONE_WAY_MATCH", "MUTUAL_MATCH"] as const;
export type MatchType = (typeof MATCH_TYPES)[number];

/**
 * Transparent breakdown of why two listings were matched. Produced by a
 * deterministic rule-based scorer today; a recommendation service can later
 * return the same shape.
 */
export interface MatchReason {
  /** Does A's item satisfy B's wishes? */
  aSatisfiesB: boolean;
  /** Does B's item satisfy A's wishes? */
  bSatisfiesA: boolean;
  matchingCategories: ID[];
  matchingKeywords: string[];
  locationCompatible: boolean;
  sameRegion: boolean;
  conditionCompatible: boolean;
  openToOffers: boolean;
}

export interface MatchScoreBreakdown {
  category: number;
  keywords: number;
  location: number;
  condition: number;
  total: number;
}

export interface BarterMatch {
  id: ID;
  type: MatchType;
  score: number;
  breakdown: MatchScoreBreakdown;
  reason: MatchReason;
  listingA: ListingRef & { regionId: ID; ownerName: string; conditionWanted: ItemCondition[] };
  listingB: ListingRef & { regionId: ID; ownerName: string; conditionWanted: ItemCondition[] };
  ownerA: UserRef;
  ownerB: UserRef;
  engine: "RULES_V1";
  computedAt: ISODate;
}

// ---------- Dashboard ----------

export interface DashboardOverview {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalListings: number;
  activeListings: number;
  pendingListings: number;
  rejectedListings: number;
  completedExchanges: number;
  openBarterRequests: number;
  reports: number;
  blockedUsers: number;
  /** Change vs the previous period of equal length, as a fraction (0.12 = +12%). */
  deltas: Partial<Record<Exclude<keyof DashboardOverview, "deltas">, number>>;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface DashboardCharts {
  registrations: TimeSeriesPoint[];
  listings: TimeSeriesPoint[];
  exchanges: TimeSeriesPoint[];
  barterRequests: TimeSeriesPoint[];
  reports: TimeSeriesPoint[];
}

export interface CategoryStat {
  categoryId: ID;
  name: string;
  value: number;
}

export interface RegionStat {
  regionId: ID;
  name: string;
  value: number;
}

export interface BarterInsights {
  activeListings: number;
  offersSent: number;
  /** 0..1 */
  acceptanceRate: number;
  completedExchanges: number;
  avgOffersPerListing: number;
  listingsWithoutOffers: number;
  reportedListings: number;
  blockedListings: number;
  mostActiveCategories: CategoryStat[];
  mostExchangedCategories: CategoryStat[];
  mostActiveRegions: RegionStat[];
}

// ---------- Global search ----------

export interface SearchResults {
  users: UserRef[];
  listings: (ListingRef & { code: string })[];
  barterRequests: { id: ID; code: string; senderName: string; receiverName: string; status: string }[];
  exchanges: { id: ID; code: string; participantNames: [string, string]; status: string }[];
}
