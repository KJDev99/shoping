"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/provider";
import type { SuspendUserInput, UserUpdateInput } from "@/schemas/user.schema";
import { reviewsService, usersService } from "@/services/users.service";
import type { ListParams } from "@/types";
import { useActionMutation } from "./use-action-mutation";

/** Query keys: invalidate ["users"] to refresh every users query. */
export const userKeys = {
  all: ["users"] as const,
  list: (params: ListParams) => ["users", "list", params] as const,
  detail: (id: string) => ["users", "detail", id] as const,
  related: (id: string, kind: string, params: unknown) => ["users", "related", id, kind, params] as const,
};

export function useUsersList(params: ListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useUser(id: string) {
  return useQuery({ queryKey: userKeys.detail(id), queryFn: () => usersService.get(id) });
}

/** All user moderation actions, with toasts and cache invalidation. */
export function useUserActions() {
  const t = useT();
  const invalidate = [userKeys.all, ["moderation-history"], ["audit"]];
  return {
    update: useActionMutation({
      mutationFn: ({ id, input }: { id: string; input: UserUpdateInput }) => usersService.update(id, input),
      successMessage: t("users.toasts.updated"),
      invalidate,
    }),
    suspend: useActionMutation({
      mutationFn: ({ id, input }: { id: string; input: SuspendUserInput }) => usersService.suspend(id, input),
      successMessage: t("users.toasts.suspended"),
      invalidate,
    }),
    block: useActionMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => usersService.block(id, reason),
      successMessage: t("users.toasts.blocked"),
      invalidate,
    }),
    unblock: useActionMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) => usersService.unblock(id, reason),
      successMessage: t("users.toasts.unblocked"),
      invalidate,
    }),
    remove: useActionMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => usersService.remove(id, reason),
      successMessage: t("users.toasts.deleted"),
      invalidate,
    }),
    restore: useActionMutation({
      mutationFn: ({ id }: { id: string }) => usersService.restore(id),
      successMessage: t("users.toasts.restored"),
      invalidate,
    }),
  };
}

export function useReviewActions() {
  const t = useT();
  const invalidate = [userKeys.all, ["exchanges"], ["moderation-history"]];
  return {
    hide: useActionMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => reviewsService.hide(id, reason),
      successMessage: t("users.detail.review.updated"),
      invalidate,
    }),
    remove: useActionMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => reviewsService.remove(id, reason),
      successMessage: t("users.detail.review.updated"),
      invalidate,
    }),
    restore: useActionMutation({
      mutationFn: ({ id }: { id: string }) => reviewsService.restore(id),
      successMessage: t("users.detail.review.updated"),
      invalidate,
    }),
  };
}
