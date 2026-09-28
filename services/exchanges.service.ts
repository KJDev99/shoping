import { api } from "@/lib/api/client";
import type {
  CancelExchangeInput,
  DisputeBlockInput,
  DisputeCloseInput,
  DisputeSuspendInput,
  DisputeWarnInput,
} from "@/schemas/exchange.schema";
import type {
  AdminRef,
  BarterRequestStatus,
  Dispute,
  DisputeCategory,
  DisputeResolution,
  DisputeStatus,
  Exchange,
  ExchangeStatus,
  ID,
  ISODate,
  ListParams,
  Report,
  Review,
} from "@/types";
import type { ItemDetail, ParticipantInfo } from "./barter.service";

export interface DisputeSummary {
  id: ID;
  status: DisputeStatus;
  category: DisputeCategory;
  resolution: DisputeResolution | null;
  assignedTo: AdminRef | null;
  createdAt: ISODate;
}

export interface OriginalBarterSummary {
  id: ID;
  code: string;
  status: BarterRequestStatus;
  message: string | null;
  cashDifferenceNote: string | null;
  createdAt: ISODate;
}

export interface ExchangeDetail extends Exchange {
  barterRequest: OriginalBarterSummary | null;
  reviews: Review[];
  reports: Report[];
  dispute: DisputeSummary | null;
  itemDetails: Record<ID, ItemDetail>;
  participantsInfo: Record<ID, ParticipantInfo>;
}

export interface DisputeDetail extends Dispute {
  exchange: { id: ID; code: string; status: ExchangeStatus };
  parties: Record<ID, ParticipantInfo>;
}

export const exchangesService = {
  list: (params: ListParams) => api.list<Exchange>("/exchanges", params),
  get: (id: string) => api.get<ExchangeDetail>(`/exchanges/${id}`),
  cancel: (id: string, input: CancelExchangeInput) => api.post<Exchange>(`/exchanges/${id}/cancel`, input),
};

export const disputesService = {
  get: (exchangeId: string) => api.get<DisputeDetail>(`/exchanges/${exchangeId}/dispute`),
  assign: (exchangeId: string) => api.post<Dispute>(`/exchanges/${exchangeId}/dispute/assign`),
  warn: (exchangeId: string, input: DisputeWarnInput) => api.post<Dispute>(`/exchanges/${exchangeId}/dispute/warn`, input),
  suspend: (exchangeId: string, input: DisputeSuspendInput) => api.post<Dispute>(`/exchanges/${exchangeId}/dispute/suspend`, input),
  block: (exchangeId: string, input: DisputeBlockInput) => api.post<Dispute>(`/exchanges/${exchangeId}/dispute/block`, input),
  close: (exchangeId: string, input: DisputeCloseInput) => api.post<Dispute>(`/exchanges/${exchangeId}/dispute/close`, input),
};
