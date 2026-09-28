"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { isApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/provider";
import type { NotificationCreateInput, NotificationTargetInput } from "@/schemas/notification.schema";
import { notificationsService } from "@/services/notifications.service";
import type { ListParams } from "@/types";
import { useActionMutation } from "./use-action-mutation";

/** Query keys: invalidate ["notifications"] to refresh every notifications query. */
export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params: ListParams) => ["notifications", "list", params] as const,
  detail: (id: string) => ["notifications", "detail", id] as const,
  channels: ["notifications", "channels"] as const,
  estimate: (target: NotificationTargetInput | null) => ["notifications", "estimate", target] as const,
  userOptions: (search: string) => ["notifications", "user-options", search] as const,
  usersByIds: (ids: string[]) => ["notifications", "users-by-ids", ids] as const,
};

export function useNotificationsList(params: ListParams) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useNotification(id: string | null) {
  return useQuery({
    queryKey: notificationKeys.detail(id ?? ""),
    queryFn: () => notificationsService.get(id!),
    enabled: !!id,
  });
}

/** Which delivery channels are currently enabled (Push/Email/SMS need provider integration). */
export function useNotificationChannels(enabled = true) {
  return useQuery({ queryKey: notificationKeys.channels, queryFn: notificationsService.channels, staleTime: 60_000, enabled });
}

/** Live recipient count for a target (pass an already-debounced target). */
export function useRecipientEstimate(target: NotificationTargetInput | null) {
  return useQuery({
    queryKey: notificationKeys.estimate(target),
    queryFn: () => notificationsService.estimate(target!),
    enabled: !!target,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useNotificationUserOptions(search: string, enabled = true) {
  return useQuery({
    queryKey: notificationKeys.userOptions(search),
    queryFn: ({ signal }) => notificationsService.userOptions({ search: search || undefined }, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/** Resolves user ids to names (e.g. to show the recipients of a sent notification). */
export function useNotificationUsersByIds(ids: string[], enabled = true) {
  return useQuery({
    queryKey: notificationKeys.usersByIds(ids),
    queryFn: ({ signal }) => notificationsService.userOptions({ ids }, signal),
    enabled: enabled && ids.length > 0,
    staleTime: 60_000,
  });
}

export function useNotificationActions() {
  const t = useT();
  const invalidate = [notificationKeys.all, ["audit"]];
  return {
    create: useActionMutation({
      mutationFn: (input: NotificationCreateInput) => notificationsService.create(input),
      successMessage: (n) =>
        n.status === "SCHEDULED" ? t("notifications.toasts.scheduled") : t("notifications.toasts.sent", { count: n.recipientsCount }),
      invalidate,
    }),
    cancel: useActionMutation({
      mutationFn: ({ id }: { id: string }) => notificationsService.cancel(id),
      successMessage: t("notifications.toasts.cancelled"),
      invalidate,
      onError: (error) => {
        if (!isApiError(error) || error.code !== "NOT_CANCELLABLE") return false;
        toast.error(t("notifications.errors.NOT_CANCELLABLE"));
        return true;
      },
    }),
  };
}

/** True for 422 responses (field errors are rendered inline by the form). */
export function isValidationError(error: unknown) {
  return isApiError(error) && error.isValidation;
}
