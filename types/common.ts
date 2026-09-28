/** Shared primitive types used across the domain model. */

export type ID = string;

/** ISO-8601 date-time string as returned by the API. */
export type ISODate = string;

export const LOCALES = ["uz", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Text stored in all supported languages (categories, locations, etc.). */
export type TranslatedText = Record<Locale, string>;

export interface Timestamps {
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Lightweight reference to a user, embedded in list responses to avoid N+1 lookups. */
export interface UserRef {
  id: ID;
  fullName: string;
  avatar: string | null;
  phone: string;
}

/** Lightweight reference to a listing, embedded in barter/exchange responses. */
export interface ListingRef {
  id: ID;
  title: string;
  image: string | null;
  condition: import("./listing").ItemCondition;
  categoryId: ID;
  ownerId: ID;
  status: import("./listing").ListingStatus;
}

/** Lightweight reference to an admin account. */
export interface AdminRef {
  id: ID;
  fullName: string;
  avatar: string | null;
  role: import("./admin").AdminRole;
}
