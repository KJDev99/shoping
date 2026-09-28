import { api } from "@/lib/api/client";
import type { NotificationCreateInput, NotificationTargetInput } from "@/schemas/notification.schema";
import type { ListParams, Notification, NotificationChannel } from "@/types";

/** Minimal user record for the "specific users" recipient picker. */
export interface NotificationUserOption {
  id: string;
  fullName: string;
  phone: string;
  avatar: string | null;
}

export const notificationsService = {
  list: (params: ListParams) => api.list<Notification>("/notifications", params),
  get: (id: string) => api.get<Notification>(`/notifications/${id}`),
  create: (input: NotificationCreateInput) => api.post<Notification>("/notifications", input),
  cancel: (id: string) => api.post<Notification>(`/notifications/${id}/cancel`),
  estimate: (target: NotificationTargetInput) => api.post<{ recipientsCount: number }>("/notifications/estimate", { target }),
  channels: () => api.get<Record<NotificationChannel, boolean>>("/notifications/channels"),
  userOptions: (params: { search?: string; ids?: string[] }, signal?: AbortSignal) =>
    api.get<NotificationUserOption[]>("/notifications/user-options", { search: params.search, ids: params.ids?.join(",") }, signal),
};
