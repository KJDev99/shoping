import { api } from "@/lib/api/client";
import type {
  BarterRequest,
  BarterStatusChange,
  ExchangeStatus,
  ID,
  ListParams,
  Report,
  TranslatedText,
  User,
} from "@/types";

/** A listing attribute resolved server-side (label + value in every locale). */
export interface ResolvedAttribute {
  id: ID;
  label: TranslatedText;
  value: TranslatedText;
}

/** Extra per-listing data for the side-by-side comparison. */
export interface ItemDetail {
  code: string;
  attributes: ResolvedAttribute[];
  imagesCount: number;
}

/** Operational context about a party (never an accusation). */
export type ParticipantInfo = Pick<
  User,
  "id" | "status" | "riskLevel" | "rating" | "reviewsCount" | "completedExchanges" | "reportsCount" | "regionId" | "createdAt"
>;

export interface ExchangeSummary {
  id: ID;
  code: string;
  status: ExchangeStatus;
  disputeId: ID | null;
}

export interface BarterRequestDetail extends BarterRequest {
  statusHistory: BarterStatusChange[];
  exchange: ExchangeSummary | null;
  reports: Report[];
  itemDetails: Record<ID, ItemDetail>;
  participants: Record<ID, ParticipantInfo>;
}

export const barterService = {
  list: (params: ListParams) => api.list<BarterRequest>("/barter-requests", params),
  get: (id: string) => api.get<BarterRequestDetail>(`/barter-requests/${id}`),
};
