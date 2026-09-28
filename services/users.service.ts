import { api } from "@/lib/api/client";
import type { SuspendUserInput, UserUpdateInput } from "@/schemas/user.schema";
import type { BarterRequest, Exchange, ListParams, Listing, Report, Review, User, UserActivity } from "@/types";

export const usersService = {
  list: (params: ListParams) => api.list<User>("/users", params),
  get: (id: string) => api.get<User>(`/users/${id}`),
  update: (id: string, input: UserUpdateInput) => api.patch<User>(`/users/${id}`, input),
  suspend: (id: string, input: SuspendUserInput) => api.post<User>(`/users/${id}/suspend`, input),
  block: (id: string, reason: string) => api.post<User>(`/users/${id}/block`, { reason }),
  unblock: (id: string, reason?: string) => api.post<User>(`/users/${id}/unblock`, { reason }),
  remove: (id: string, reason: string) => api.delete<User>(`/users/${id}`, { reason }),
  restore: (id: string) => api.post<User>(`/users/${id}/restore`),

  listings: (id: string, params: ListParams) => api.list<Listing>(`/users/${id}/listings`, params),
  barterRequests: (id: string, params: ListParams) => api.list<BarterRequest>(`/users/${id}/barter-requests`, params),
  exchanges: (id: string, params: ListParams) => api.list<Exchange>(`/users/${id}/exchanges`, params),
  reviews: (id: string, direction: "received" | "written", params: ListParams) =>
    api.list<Review>(`/users/${id}/reviews`, { ...params, filters: { ...params.filters, direction } }),
  reports: (id: string, direction: "against" | "submitted", params: ListParams) =>
    api.list<Report>(`/users/${id}/reports`, { ...params, filters: { ...params.filters, direction } }),
  activity: (id: string, params: ListParams) => api.list<UserActivity>(`/users/${id}/activity`, params),
};

export const reviewsService = {
  hide: (id: string, reason: string) => api.post<Review>(`/reviews/${id}/hide`, { reason }),
  remove: (id: string, reason: string) => api.post<Review>(`/reviews/${id}/delete`, { reason }),
  restore: (id: string) => api.post<Review>(`/reviews/${id}/restore`),
};
