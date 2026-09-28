import type { ID, ISODate, Timestamps, UserRef } from "./common";

export const ITEM_CONDITIONS = ["NEW", "LIKE_NEW", "GOOD", "FAIR", "DAMAGED"] as const;
export type ItemCondition = (typeof ITEM_CONDITIONS)[number];

export const LISTING_STATUSES = [
  "DRAFT",
  "PENDING",
  "ACTIVE",
  "REJECTED",
  "PAUSED",
  "EXCHANGED",
  "ARCHIVED",
  "BLOCKED",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const REJECTION_REASONS = [
  "PROHIBITED_ITEM",
  "INCORRECT_CATEGORY",
  "MISLEADING_DESCRIPTION",
  "DUPLICATE_LISTING",
  "SUSPICIOUS_CONTENT",
  "POOR_QUALITY_IMAGES",
  "SPAM",
  "OTHER",
] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];

export interface ListingImage {
  id: ID;
  url: string;
  sortOrder: number;
  isCover: boolean;
}

export interface ListingVideo {
  url: string;
  durationSec: number;
  sizeMb: number;
}

/** What the owner wants to receive. Every listing has exactly one. */
export interface ExchangePreference {
  openToOffers: boolean;
  categories: ID[];
  subcategories: ID[];
  keywords: string[];
  conditions: ItemCondition[];
  regionIds: ID[];
  /** Free-form wish list, e.g. "Samsung S23 / iPhone 13". */
  note: string | null;
  /**
   * Optional cash top-up the owner is willing to negotiate. Pure metadata:
   * only shown when the platform setting `allowCashDifference` is enabled,
   * never processed as a payment.
   */
  cashDifference: { direction: "WILL_ADD" | "EXPECTS"; note: string } | null;
}

/** Value of a dynamic category attribute on a listing, keyed by attribute id. */
export type ListingAttributeValue = string | number | boolean | string[];

export interface Listing extends Timestamps {
  id: ID;
  /** Human-friendly id displayed in UI, e.g. "LST-10234". */
  code: string;
  userId: ID;
  owner: UserRef;
  title: string;
  description: string;
  categoryId: ID;
  subcategoryId: ID | null;
  condition: ItemCondition;
  images: ListingImage[];
  video: ListingVideo | null;
  attributes: Record<ID, ListingAttributeValue>;
  regionId: ID;
  districtId: ID | null;
  location: string | null;
  exchangePreferences: ExchangePreference;
  status: ListingStatus;
  rejectionReason: RejectionReason | null;
  rejectionNote: string | null;
  rejectionCount: number;
  views: number;
  favoritesCount: number;
  offersCount: number;
  reportsCount: number;
  /** Set by the backend duplicate detector; operational hint only. */
  possibleDuplicateOf: ID | null;
  publishedAt: ISODate | null;
  expiresAt: ISODate | null;
  deletedAt: ISODate | null;
}
