import type { AdminRef, ID, ISODate, Locale, TranslatedText } from "./common";

// ---------- Locations ----------

export interface Country {
  id: ID;
  code: string;
  name: TranslatedText;
}

export interface Region {
  id: ID;
  countryId: ID;
  name: TranslatedText;
  slug: string;
  enabled: boolean;
  sortOrder: number;
  districtsCount: number;
  listingsCount: number;
  usersCount: number;
}

export interface District {
  id: ID;
  regionId: ID;
  name: TranslatedText;
  type: "DISTRICT" | "CITY";
  enabled: boolean;
}

// ---------- Notifications ----------

export const NOTIFICATION_TYPES = ["SYSTEM", "MODERATION", "ANNOUNCEMENT", "SECURITY"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_STATUSES = ["DRAFT", "SCHEDULED", "SENDING", "SENT", "FAILED", "CANCELLED"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

/** Delivery channels. Only IN_APP is live; the others are reserved for future providers. */
export const NOTIFICATION_CHANNELS = ["IN_APP", "PUSH", "EMAIL", "SMS"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const USER_SEGMENTS = [
  "NEW_USERS",
  "ACTIVE_TRADERS",
  "INACTIVE_30D",
  "NO_LISTINGS",
  "HIGH_RATED",
] as const;
export type UserSegment = (typeof USER_SEGMENTS)[number];

export type NotificationTarget =
  | { kind: "ALL" }
  | { kind: "USERS"; userIds: ID[] }
  | { kind: "REGION"; regionIds: ID[] }
  | { kind: "SEGMENT"; segment: UserSegment };

export interface Notification {
  id: ID;
  type: NotificationType;
  title: string;
  message: string;
  target: NotificationTarget;
  channels: NotificationChannel[];
  status: NotificationStatus;
  recipientsCount: number;
  readCount: number;
  createdBy: AdminRef;
  scheduledAt: ISODate | null;
  sentAt: ISODate | null;
  createdAt: ISODate;
}

/** Operational alert for admins, shown in the header bell. */
export interface AdminAlert {
  id: ID;
  kind: "NEW_REPORT" | "PENDING_LISTING" | "DISPUTE_OPENED" | "SUSPICIOUS_ACCOUNT";
  title: string;
  href: string;
  read: boolean;
  createdAt: ISODate;
}

// ---------- Audit logs ----------

export const AUDIT_ENTITY_TYPES = [
  "USER",
  "LISTING",
  "BARTER_REQUEST",
  "EXCHANGE",
  "DISPUTE",
  "CATEGORY",
  "ATTRIBUTE",
  "REPORT",
  "REVIEW",
  "REGION",
  "DISTRICT",
  "NOTIFICATION",
  "ADMIN",
  "SETTINGS",
  "AUTH",
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export interface AuditLog {
  id: ID;
  adminId: ID;
  admin: AdminRef;
  /** Dotted action identifier, e.g. "listing.reject". */
  action: string;
  entityType: AuditEntityType;
  entityId: ID | null;
  entityLabel: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  reason: string | null;
  ipAddress: string;
  userAgent: string;
  createdAt: ISODate;
}

// ---------- Settings ----------

export interface PlatformSettings {
  general: {
    platformName: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    defaultLanguage: Locale;
    supportedLanguages: Locale[];
    maintenanceMode: boolean;
    supportEmail: string;
    supportPhone: string;
  };
  listings: {
    maxImages: number;
    maxVideoSizeMb: number;
    expirationDays: number;
    requireModeration: boolean;
    autoPublishTrustedUsers: boolean;
    trustedUserMinExchanges: number;
  };
  barter: {
    maxItemsPerOffer: number;
    offerExpirationHours: number;
    allowMultiItemBarter: boolean;
    allowOpenOffers: boolean;
    /** Disabled by default. When enabled, a top-up is negotiation metadata only — never a payment. */
    allowCashDifference: boolean;
  };
  moderation: {
    reportThreshold: number;
    autoHideAfterThreshold: boolean;
    blockedKeywords: string[];
  };
  security: {
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    requireTwoFactorForAdmins: boolean;
    allowedAdminIps: string[];
  };
  notifications: {
    enableInApp: boolean;
    enablePush: boolean;
    enableEmail: boolean;
    enableSms: boolean;
    adminDigestEmail: boolean;
  };
  updatedAt: ISODate;
  updatedBy: AdminRef | null;
}
