import type { ID, ISODate } from "./common";
import type { BarterRequestStatus } from "./barter";
import type { ExchangePreference, ItemCondition, ListingAttributeValue, ListingImage, ListingStatus, ListingVideo, RejectionReason } from "./listing";

/**
 * Public marketplace shapes. They intentionally omit phone numbers, report
 * counts, internal notes and other moderation data.
 */
export interface PublicOwner {
  id: ID;
  fullName: string;
  avatar: string | null;
  regionId: ID;
  rating: number | null;
  reviewsCount: number;
  completedExchanges: number;
  memberSince: ISODate;
}

export interface PublicListingCard {
  id: ID;
  code: string;
  title: string;
  image: string | null;
  imagesCount: number;
  condition: ItemCondition;
  categoryId: ID;
  subcategoryId: ID | null;
  regionId: ID;
  districtId: ID | null;
  /** Short "wants in return" summary. */
  wants: { openToOffers: boolean; subcategories: ID[]; categories: ID[]; keywords: string[]; note: string | null };
  views: number;
  favoritesCount: number;
  publishedAt: ISODate | null;
  createdAt: ISODate;
}

export interface PublicListing extends Omit<PublicListingCard, "image" | "imagesCount" | "wants"> {
  description: string;
  images: ListingImage[];
  video: ListingVideo | null;
  attributes: Record<ID, ListingAttributeValue>;
  location: string | null;
  exchangePreferences: ExchangePreference;
  owner: PublicOwner;
  offersCount: number;
}

/** A listing as its owner sees it in "My listings" (includes moderation outcome). */
export interface MyListing extends PublicListingCard {
  status: ListingStatus;
  rejectionReason: RejectionReason | null;
  rejectionNote: string | null;
  offersCount: number;
  updatedAt: ISODate;
}

/** The signed-in marketplace user. */
export interface SiteUser {
  id: ID;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  avatar: string | null;
  regionId: ID;
  status: "ACTIVE" | "SUSPENDED";
  suspendedUntil: ISODate | null;
  listingsCount: number;
}

export interface SiteConfig {
  maxImages: number;
  requireModeration: boolean;
  allowCashDifference: boolean;
  allowOpenOffers: boolean;
}

/** A barter offer as one of its two participants sees it. */
export interface SiteOffer {
  id: ID;
  code: string;
  status: BarterRequestStatus;
  direction: "incoming" | "outgoing";
  /** Items the sender gives. */
  offered: PublicListingCard[];
  /** Items the sender wants (the receiver's listings). */
  requested: PublicListingCard[];
  counterpart: {
    id: ID;
    fullName: string;
    avatar: string | null;
    /** Revealed to both sides only after the offer is accepted. */
    phone: string | null;
  };
  message: string | null;
  createdAt: ISODate;
  respondedAt: ISODate | null;
}
