import { api } from "@/lib/api/client";
import type {
  ModerationCorrectionInput,
  ModerationRejectInput,
  ModerationSuspendInput,
  QueueCounts,
  QueueItem,
  SafetyOverview,
} from "@/schemas/moderation.schema";
import type { AdminRef, ListParams, Listing, ModerationAction, ModerationQueue, User } from "@/types";

export const moderationService = {
  queueCounts: () => api.get<QueueCounts>("/moderation/queues"),
  queue: (queue: ModerationQueue, params: ListParams) => api.list<QueueItem>(`/moderation/queue/${queue}`, params),
  safety: () => api.get<SafetyOverview>("/moderation/safety"),
  actions: (params: ListParams) => api.list<ModerationAction>("/moderation/actions", params),
  actionAdmins: () => api.get<AdminRef[]>("/moderation/actions/admins"),

  approveListing: (id: string, reason?: string) => api.post<Listing>(`/moderation/listings/${id}/approve`, { reason }),
  rejectListing: (id: string, input: ModerationRejectInput) => api.post<Listing>(`/moderation/listings/${id}/reject`, input),
  blockListing: (id: string, reason: string) => api.post<Listing>(`/moderation/listings/${id}/block`, { reason }),
  requestCorrection: (id: string, input: ModerationCorrectionInput) => api.post<Listing>(`/moderation/listings/${id}/request-correction`, input),
  dismissListingReports: (id: string, reason: string) => api.post<{ closed: number }>(`/moderation/listings/${id}/dismiss-reports`, { reason }),
  notDuplicate: (id: string, reason?: string) => api.post<Listing>(`/moderation/listings/${id}/not-duplicate`, { reason }),

  blockUser: (id: string, reason: string) => api.post<User>(`/moderation/users/${id}/block`, { reason }),
  suspendUser: (id: string, input: ModerationSuspendInput) => api.post<User>(`/moderation/users/${id}/suspend`, input),
  warnUser: (id: string, reason: string) => api.post<User>(`/moderation/users/${id}/warn`, { reason }),
  dismissUserReports: (id: string, reason: string) => api.post<{ closed: number }>(`/moderation/users/${id}/dismiss-reports`, { reason }),
};
