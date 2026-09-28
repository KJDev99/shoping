import type { ID, ISODate, Timestamps } from "./common";

export const USER_STATUSES = ["ACTIVE", "BLOCKED", "SUSPENDED", "DELETED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Operational indicator only — never an accusation of fraud. */
export const RISK_LEVELS = ["LOW", "NEEDS_REVIEW", "HIGH_REPORTS"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export interface User extends Timestamps {
  id: ID;
  firstName: string;
  lastName: string;
  fullName: string;
  username: string;
  phone: string;
  email: string | null;
  avatar: string | null;
  bio: string | null;
  regionId: ID;
  districtId: ID | null;
  status: UserStatus;
  /** Reason recorded with the most recent status change (suspend/block). */
  statusReason: string | null;
  suspendedUntil: ISODate | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  language: "uz" | "ru" | "en";
  listingsCount: number;
  completedExchanges: number;
  reportsCount: number;
  reportsSubmittedCount: number;
  rating: number | null;
  reviewsCount: number;
  riskLevel: RiskLevel;
  registeredVia: "PHONE" | "GOOGLE" | "TELEGRAM";
  lastActiveAt: ISODate | null;
  deletedAt: ISODate | null;
}

export interface UserActivity {
  id: ID;
  userId: ID;
  type:
    | "LOGIN"
    | "LISTING_CREATED"
    | "LISTING_UPDATED"
    | "OFFER_SENT"
    | "OFFER_ACCEPTED"
    | "OFFER_DECLINED"
    | "EXCHANGE_COMPLETED"
    | "REVIEW_LEFT"
    | "REPORT_SUBMITTED"
    | "PROFILE_UPDATED";
  entityId: ID | null;
  description: string;
  ipAddress: string | null;
  createdAt: ISODate;
}

export interface Favorite {
  id: ID;
  userId: ID;
  listingId: ID;
  createdAt: ISODate;
}
