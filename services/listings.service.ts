import { api } from "@/lib/api/client";
import type { ListingUpdateInput, RejectListingInput } from "@/schemas/listing.schema";
import type { BarterRequest, ListParams, Listing, Report } from "@/types";

export const listingsService = {
  list: (params: ListParams) => api.list<Listing>("/listings", params),
  get: (id: string) => api.get<Listing>(`/listings/${id}`),
  offers: (id: string, params: ListParams) => api.list<BarterRequest>(`/listings/${id}/offers`, params),
  reports: (id: string, params: ListParams) => api.list<Report>(`/listings/${id}/reports`, params),

  update: (id: string, input: ListingUpdateInput) => api.patch<Listing>(`/listings/${id}`, input),
  approve: (id: string, reason?: string) => api.post<Listing>(`/listings/${id}/approve`, { reason }),
  reject: (id: string, input: RejectListingInput) => api.post<Listing>(`/listings/${id}/reject`, input),
  requestCorrection: (id: string, note: string) => api.post<Listing>(`/listings/${id}/request-correction`, { note }),
  block: (id: string, reason: string) => api.post<Listing>(`/listings/${id}/block`, { reason }),
  unblock: (id: string, reason?: string) => api.post<Listing>(`/listings/${id}/unblock`, { reason }),
  archive: (id: string, reason?: string) => api.post<Listing>(`/listings/${id}/archive`, { reason }),
  remove: (id: string, reason: string) => api.delete<Listing>(`/listings/${id}`, { reason }),
  restore: (id: string) => api.post<Listing>(`/listings/${id}/restore`),
};
