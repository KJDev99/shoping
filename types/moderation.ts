import type { AdminRef, ID, ISODate, UserRef } from "./common";

// ---------- Reports ----------

export const REPORT_TARGET_TYPES = ["LISTING", "USER", "MESSAGE", "BARTER_REQUEST"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = [
  "SCAM",
  "FAKE_ITEM",
  "PROHIBITED_ITEM",
  "SPAM",
  "HARASSMENT",
  "MISLEADING_INFORMATION",
  "DUPLICATE",
  "OTHER",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ["NEW", "REVIEWING", "RESOLVED", "REJECTED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface ReportTargetSummary {
  type: ReportTargetType;
  id: ID;
  label: string;
  image: string | null;
  /** The user responsible for the reported content. */
  ownerId: ID | null;
  ownerName: string | null;
}

export interface Report {
  id: ID;
  code: string;
  reporterId: ID;
  reporter: UserRef;
  targetType: ReportTargetType;
  targetId: ID;
  target: ReportTargetSummary;
  reason: ReportReason;
  description: string | null;
  attachments: string[];
  status: ReportStatus;
  assignedTo: AdminRef | null;
  resolutionNote: string | null;
  resolvedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ---------- Moderation actions ----------

export const MODERATION_ACTION_TYPES = [
  "APPROVE",
  "REJECT",
  "BLOCK",
  "UNBLOCK",
  "SUSPEND",
  "ARCHIVE",
  "DELETE",
  "RESTORE",
  "REQUEST_CORRECTION",
  "WARN",
  "HIDE",
  "RESOLVE_REPORT",
  "REJECT_REPORT",
] as const;
export type ModerationActionType = (typeof MODERATION_ACTION_TYPES)[number];

export const MODERATION_TARGET_TYPES = ["LISTING", "USER", "REVIEW", "REPORT", "BARTER_REQUEST", "EXCHANGE"] as const;
export type ModerationTargetType = (typeof MODERATION_TARGET_TYPES)[number];

export interface ModerationAction {
  id: ID;
  adminId: ID;
  admin: AdminRef;
  action: ModerationActionType;
  targetType: ModerationTargetType;
  targetId: ID;
  targetLabel: string;
  reason: string | null;
  createdAt: ISODate;
}

export const MODERATION_QUEUES = [
  "PENDING_LISTINGS",
  "REPORTED_LISTINGS",
  "REPORTED_USERS",
  "SUSPICIOUS_ACCOUNTS",
  "DUPLICATE_LISTINGS",
] as const;
export type ModerationQueue = (typeof MODERATION_QUEUES)[number];

// ---------- Admin notes ----------

export const NOTE_ENTITY_TYPES = ["USER", "LISTING", "EXCHANGE", "REPORT", "DISPUTE"] as const;
export type NoteEntityType = (typeof NOTE_ENTITY_TYPES)[number];

/** Internal-only note. Never exposed through user-facing APIs. */
export interface AdminNote {
  id: ID;
  entityType: NoteEntityType;
  entityId: ID;
  author: AdminRef;
  body: string;
  createdAt: ISODate;
}

// ---------- Reviews ----------

export const REVIEW_STATUSES = ["VISIBLE", "HIDDEN", "DELETED"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface Review {
  id: ID;
  exchangeId: ID;
  /** Human-friendly exchange code, e.g. "EXC-512". */
  exchangeCode: string;
  authorId: ID;
  targetUserId: ID;
  author: UserRef;
  targetUser: UserRef;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  status: ReviewStatus;
  createdAt: ISODate;
}
