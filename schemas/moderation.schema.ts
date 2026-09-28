import { REJECTION_REASONS, type Listing, type ListingRef, type ModerationQueue, type ReportReason, type User, type UserRef } from "@/types";
import { z } from "./z";

// ---------------------------------------------------------------------------
// Request bodies for /moderation/... quick actions
// ---------------------------------------------------------------------------

export const moderationRejectSchema = z
  .object({
    reason: z.enum(REJECTION_REASONS),
    note: z.string().trim().max(1000, "validation.max1000").optional().or(z.literal("")),
  })
  .refine((v) => v.reason !== "OTHER" || (v.note ?? "").trim().length >= 3, { path: ["note"], message: "validation.reasonRequired" });
export type ModerationRejectInput = z.infer<typeof moderationRejectSchema>;

export const moderationCorrectionSchema = z.object({
  reason: z.enum(REJECTION_REASONS).optional(),
  note: z.string().trim().min(3, "validation.reasonRequired").max(1000, "validation.max1000"),
});
export type ModerationCorrectionInput = z.infer<typeof moderationCorrectionSchema>;

export const moderationReasonSchema = z.object({
  reason: z.string().trim().min(3, "validation.reasonRequired").max(1000, "validation.max1000"),
});
export type ModerationReasonInput = z.infer<typeof moderationReasonSchema>;

export const moderationOptionalReasonSchema = z.object({
  reason: z.string().trim().max(1000, "validation.max1000").optional().or(z.literal("")),
});
export type ModerationOptionalReasonInput = z.infer<typeof moderationOptionalReasonSchema>;

export const moderationSuspendSchema = z.object({
  reason: z.string().trim().min(3, "validation.reasonRequired").max(1000, "validation.max1000"),
  days: z.coerce.number().int().min(1, "validation.min1").max(365, "validation.max365"),
});
export type ModerationSuspendInput = z.infer<typeof moderationSuspendSchema>;

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export type QueueCounts = Record<ModerationQueue, number>;

export interface ReasonCount {
  reason: ReportReason;
  count: number;
}

/** Operational signals that put an account in the "suspicious" queue. Never an accusation. */
export type SuspicionSignal = "RISK_LEVEL" | "REPEATED_REJECTIONS" | "BURST_LISTINGS";

export interface ListingQueueItem {
  kind: "LISTING";
  id: string;
  listing: Listing;
  /** Open (NEW / REVIEWING) reports on this listing. */
  openReports: number;
  reasons: ReasonCount[];
  /** For DUPLICATE_LISTINGS: the listing this one may duplicate. */
  duplicateOf: (ListingRef & { code: string; owner: UserRef; description: string; createdAt: string }) | null;
}

export interface UserQueueItem {
  kind: "USER";
  id: string;
  user: User;
  openReports: number;
  reasons: ReasonCount[];
  rejectedListings: number;
  newListings24h: number;
  signals: SuspicionSignal[];
}

export type QueueItem = ListingQueueItem | UserQueueItem;

export interface SafetyUserRow extends UserRef {
  status: User["status"];
  riskLevel: User["riskLevel"];
  reportsCount: number;
  listingsCount: number;
  rejectedListings: number;
  newListings24h: number;
  signals: SuspicionSignal[];
}

export interface SafetyListingRow extends ListingRef {
  code: string;
  owner: UserRef;
  reportsCount: number;
  rejectionCount: number;
  duplicateOf: (ListingRef & { code: string }) | null;
}

export interface SafetyOverview {
  usersWithManyReports: SafetyUserRow[];
  listingsWithManyReports: SafetyListingRow[];
  repeatedlyRejectedListings: SafetyListingRow[];
  possibleDuplicates: SafetyListingRow[];
  suspiciousActivity: SafetyUserRow[];
}
