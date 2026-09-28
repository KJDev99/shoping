import type { BarterRequestStatus, ItemCondition, ListingRef, ListingStatus, Report, RiskLevel, UserRef, UserStatus } from "@/types";
import { z } from "./z";

// ---------------------------------------------------------------------------
// Request bodies (shared by the report detail dialogs and the mock API)
// ---------------------------------------------------------------------------

/** Resolve / reject a report: the note is shown in the report history. */
export const reportNoteSchema = z.object({
  note: z.string().trim().min(3, "validation.reasonRequired").max(1000, "validation.max1000"),
});
export type ReportNoteInput = z.infer<typeof reportNoteSchema>;

/** Enforcement actions taken from a report (block listing / block user). */
export const reportEnforcementSchema = z.object({
  reason: z.string().trim().min(3, "validation.reasonRequired").max(1000, "validation.max1000"),
});
export type ReportEnforcementInput = z.infer<typeof reportEnforcementSchema>;

export const reportSuspendSchema = z.object({
  reason: z.string().trim().min(3, "validation.reasonRequired").max(1000, "validation.max1000"),
  days: z.coerce.number().int().min(1, "validation.min1").max(365, "validation.max365"),
});
export type ReportSuspendInput = z.infer<typeof reportSuspendSchema>;

// ---------------------------------------------------------------------------
// Response shapes for GET /reports/:id
// ---------------------------------------------------------------------------

/** The user responsible for the reported content (listing owner, message sender…). */
export interface ReportedUserSummary extends UserRef {
  status: UserStatus;
  riskLevel: RiskLevel;
  reportsCount: number;
  listingsCount: number;
  suspendedUntil: string | null;
}

export interface ReportedListingSummary {
  id: string;
  code: string;
  title: string;
  image: string | null;
  status: ListingStatus;
  condition: ItemCondition;
  categoryId: string;
  reportsCount: number;
  rejectionCount: number;
  createdAt: string;
}

export interface ReportedBarterSummary {
  id: string;
  code: string;
  status: BarterRequestStatus;
  sender: UserRef;
  receiver: UserRef;
  offered: ListingRef[];
  requested: ListingRef[];
  message: string | null;
  createdAt: string;
}

export type ReportTargetDetails =
  | { type: "LISTING"; listing: ReportedListingSummary | null }
  | { type: "USER"; user: ReportedUserSummary | null }
  | { type: "BARTER_REQUEST"; request: ReportedBarterSummary | null }
  | { type: "MESSAGE"; message: { id: string; text: string; sender: UserRef | null } };

export interface ReportDetail {
  report: Report;
  target: ReportTargetDetails;
  /** Owner / author of the reported content; target of user enforcement actions. */
  responsibleUser: ReportedUserSummary | null;
  /** Most recent other reports on the same target (max 10). */
  otherReports: Report[];
  otherReportsTotal: number;
  /** How many reports this reporter has submitted in total, and how many were rejected. */
  reporterStats: { submitted: number; rejected: number; resolved: number };
}
