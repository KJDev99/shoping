"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/provider";
import type { ModerationCorrectionInput, ModerationRejectInput, ModerationSuspendInput, QueueItem } from "@/schemas/moderation.schema";
import { moderationService } from "@/services/moderation.service";
import type { ListParams, ModerationQueue, PaginatedResponse } from "@/types";
import { useApiErrorMessage } from "./use-api-error";

/** Query keys: invalidate ["moderation"] to refresh queues, counts, safety and the log. */
export const moderationKeys = {
  all: ["moderation"] as const,
  counts: ["moderation", "counts"] as const,
  queue: (queue: ModerationQueue, params: ListParams) => ["moderation", "queue", queue, params] as const,
  safety: ["moderation", "safety"] as const,
  actions: (params: ListParams) => ["moderation", "actions", params] as const,
  actionAdmins: ["moderation", "action-admins"] as const,
};

export function useQueueCounts() {
  return useQuery({ queryKey: moderationKeys.counts, queryFn: moderationService.queueCounts });
}

export function useModerationQueue(queue: ModerationQueue, params: ListParams) {
  return useQuery({ queryKey: moderationKeys.queue(queue, params), queryFn: () => moderationService.queue(queue, params), placeholderData: keepPreviousData });
}

export function useSafetyOverview() {
  return useQuery({ queryKey: moderationKeys.safety, queryFn: moderationService.safety });
}

export function useModerationLog(params: ListParams) {
  return useQuery({ queryKey: moderationKeys.actions(params), queryFn: () => moderationService.actions(params), placeholderData: keepPreviousData });
}

export function useModerationAdmins() {
  return useQuery({ queryKey: moderationKeys.actionAdmins, queryFn: moderationService.actionAdmins, staleTime: 5 * 60_000 });
}

/** Every queue action targets one row of one queue. */
export interface QueueVars {
  id: string;
  queue: ModerationQueue;
}

type Snapshot = [QueryKey, PaginatedResponse<QueueItem> | undefined][];

const INVALIDATE_AFTER: QueryKey[] = [moderationKeys.all, ["reports"], ["listings"], ["users"], ["moderation-history"], ["audit"], ["dashboard"]];

/**
 * Queue mutation with optimistic removal: the row disappears immediately,
 * comes back if the request fails, and all moderation data is refetched after.
 */
function useQueueMutation<V extends QueueVars, D>(mutationFn: (vars: V) => Promise<D>, successMessage: string) {
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  return useMutation<D, unknown, V, { snapshot: Snapshot }>({
    mutationFn,
    onMutate: async (vars) => {
      const filter = { queryKey: ["moderation", "queue", vars.queue] };
      await qc.cancelQueries(filter);
      const snapshot: Snapshot = qc.getQueriesData<PaginatedResponse<QueueItem>>(filter);
      qc.setQueriesData<PaginatedResponse<QueueItem>>(filter, (old) =>
        old ? { ...old, data: old.data.filter((i) => i.id !== vars.id), meta: { ...old.meta, total: Math.max(0, old.meta.total - 1) } } : old,
      );
      return { snapshot };
    },
    onError: (error, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(toMessage(error));
    },
    onSuccess: () => {
      toast.success(successMessage);
    },
    onSettled: () => Promise.all(INVALIDATE_AFTER.map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
}

export function useModerationQuickActions() {
  const t = useT();
  return {
    approve: useQueueMutation((v: QueueVars & { reason?: string }) => moderationService.approveListing(v.id, v.reason), t("moderation.toasts.approved")),
    reject: useQueueMutation((v: QueueVars & { input: ModerationRejectInput }) => moderationService.rejectListing(v.id, v.input), t("moderation.toasts.rejected")),
    blockListing: useQueueMutation((v: QueueVars & { reason: string }) => moderationService.blockListing(v.id, v.reason), t("moderation.toasts.listingBlocked")),
    requestCorrection: useQueueMutation(
      (v: QueueVars & { input: ModerationCorrectionInput }) => moderationService.requestCorrection(v.id, v.input),
      t("moderation.toasts.correctionRequested"),
    ),
    dismissListingReports: useQueueMutation(
      (v: QueueVars & { reason: string }) => moderationService.dismissListingReports(v.id, v.reason),
      t("moderation.toasts.reportsDismissed"),
    ),
    notDuplicate: useQueueMutation((v: QueueVars & { reason?: string }) => moderationService.notDuplicate(v.id, v.reason), t("moderation.toasts.notDuplicate")),
    blockUser: useQueueMutation((v: QueueVars & { reason: string }) => moderationService.blockUser(v.id, v.reason), t("moderation.toasts.userBlocked")),
    suspendUser: useQueueMutation((v: QueueVars & { input: ModerationSuspendInput }) => moderationService.suspendUser(v.id, v.input), t("moderation.toasts.userSuspended")),
    warnUser: useQueueMutation((v: QueueVars & { reason: string }) => moderationService.warnUser(v.id, v.reason), t("moderation.toasts.userWarned")),
    dismissUserReports: useQueueMutation(
      (v: QueueVars & { reason: string }) => moderationService.dismissUserReports(v.id, v.reason),
      t("moderation.toasts.reportsDismissed"),
    ),
  };
}
