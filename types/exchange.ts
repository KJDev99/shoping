import type { AdminRef, ID, ISODate, ListingRef, UserRef } from "./common";

export const EXCHANGE_STATUSES = ["AGREED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DISPUTED"] as const;
export type ExchangeStatus = (typeof EXCHANGE_STATUSES)[number];

export interface ExchangeParticipant {
  userId: ID;
  user: UserRef;
  /** "A" is the offer sender, "B" the receiver. */
  side: "A" | "B";
  items: ListingRef[];
  confirmedAt: ISODate | null;
}

export interface ExchangeStatusChange {
  status: ExchangeStatus;
  at: ISODate;
  note: string | null;
  actor: { type: "USER" | "ADMIN" | "SYSTEM"; id: ID | null; name: string | null };
}

export interface Exchange {
  id: ID;
  code: string;
  barterRequestId: ID;
  participants: [ExchangeParticipant, ExchangeParticipant];
  status: ExchangeStatus;
  meetingRegionId: ID | null;
  meetingNote: string | null;
  statusHistory: ExchangeStatusChange[];
  disputeId: ID | null;
  completedAt: ISODate | null;
  cancelledAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export const DISPUTE_CATEGORIES = [
  "CONDITION_MISMATCH",
  "FAKE_ITEM",
  "WRONG_ITEM",
  "NO_SHOW",
  "HARASSMENT",
  "OTHER",
] as const;
export type DisputeCategory = (typeof DISPUTE_CATEGORIES)[number];

export const DISPUTE_STATUSES = ["OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const DISPUTE_RESOLUTIONS = [
  "NO_ACTION",
  "WARNING_ISSUED",
  "USER_SUSPENDED",
  "USER_BLOCKED",
  "EXCHANGE_CANCELLED",
] as const;
export type DisputeResolution = (typeof DISPUTE_RESOLUTIONS)[number];

export interface DisputeEvidence {
  id: ID;
  uploadedBy: ID;
  url: string;
  kind: "IMAGE" | "DOCUMENT";
  caption: string | null;
  createdAt: ISODate;
}

/** A chat message between the exchange participants, surfaced for dispute review only. */
export interface DisputeMessage {
  id: ID;
  senderId: ID;
  senderName: string;
  body: string;
  createdAt: ISODate;
}

export interface DisputeEvent {
  id: ID;
  type: "OPENED" | "EVIDENCE_ADDED" | "NOTE_ADDED" | "STATUS_CHANGED" | "USER_WARNED" | "USER_SUSPENDED" | "USER_BLOCKED" | "CLOSED";
  description: string;
  actor: { type: "USER" | "ADMIN"; id: ID; name: string };
  createdAt: ISODate;
}

export interface Dispute {
  id: ID;
  exchangeId: ID;
  openedBy: UserRef;
  against: UserRef;
  category: DisputeCategory;
  description: string;
  status: DisputeStatus;
  resolution: DisputeResolution | null;
  resolutionNote: string | null;
  assignedTo: AdminRef | null;
  evidence: DisputeEvidence[];
  messages: DisputeMessage[];
  history: DisputeEvent[];
  createdAt: ISODate;
  closedAt: ISODate | null;
}
