import type { ID, ISODate, ListingRef, Timestamps, UserRef } from "./common";

export const BARTER_REQUEST_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "CANCELLED",
  "EXPIRED",
  "COMPLETED",
] as const;
export type BarterRequestStatus = (typeof BARTER_REQUEST_STATUSES)[number];

export type BarterSide = "OFFERED" | "REQUESTED";

/** One listing on one side of a barter request. Supports N ↔ M barters. */
export interface BarterRequestItem {
  id: ID;
  barterRequestId: ID;
  listingId: ID;
  side: BarterSide;
  listing: ListingRef;
}

export interface BarterRequest extends Timestamps {
  id: ID;
  /** Human-friendly id, e.g. "BAR-1234". */
  code: string;
  senderId: ID;
  receiverId: ID;
  sender: UserRef;
  receiver: UserRef;
  offeredListingIds: ID[];
  requestedListingIds: ID[];
  items: BarterRequestItem[];
  message: string | null;
  /** Optional negotiated top-up; metadata only, never a payment. */
  cashDifferenceNote: string | null;
  status: BarterRequestStatus;
  expiresAt: ISODate | null;
  respondedAt: ISODate | null;
  exchangeId: ID | null;
}

export interface BarterStatusChange {
  status: BarterRequestStatus;
  at: ISODate;
  byUserId: ID | null;
}
