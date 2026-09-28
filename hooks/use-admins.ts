"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/provider";
import type { AdminCreateInput, AdminRoleInput, AdminUpdateInput } from "@/schemas/admin.schema";
import type { ChangePasswordInput, ProfileInput } from "@/schemas/auth.schema";
import { adminsService } from "@/services/admins.service";
import { authService } from "@/services/auth.service";
import type { AdminSession, ListParams } from "@/types";
import { useActionMutation } from "./use-action-mutation";
import { sessionQueryKey } from "./use-session";

/** Query keys: invalidate ["admins"] to refresh every admins query. */
export const adminKeys = {
  all: ["admins"] as const,
  list: (params: ListParams) => ["admins", "list", params] as const,
  roles: ["admins", "roles"] as const,
};

export function useAdminsList(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: adminKeys.list(params),
    queryFn: () => adminsService.list(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRoles() {
  return useQuery({ queryKey: adminKeys.roles, queryFn: adminsService.roles, staleTime: 5 * 60_000 });
}

/**
 * Maps 409 responses carrying a known code (e.g. LAST_SUPER_ADMIN) to a
 * translated toast. Returns true when handled so the generic toast is skipped.
 */
export function useAdminConflictHandler() {
  const t = useT();
  return (error: unknown): boolean => {
    if (!isApiError(error) || error.status !== 409 || !error.code) return false;
    const key = `admins.errors.${error.code}`;
    const message = t.dynamic(key);
    if (message === key) return false;
    toast.error(message);
    return true;
  };
}

export function useAdminActions() {
  const t = useT();
  const onError = useAdminConflictHandler();
  const invalidate = [adminKeys.all, ["audit"], sessionQueryKey];
  return {
    create: useActionMutation({
      mutationFn: (input: AdminCreateInput) => adminsService.create(input),
      successMessage: t("admins.toasts.created"),
      invalidate,
      onError,
    }),
    update: useActionMutation({
      mutationFn: ({ id, input }: { id: string; input: AdminUpdateInput }) => adminsService.update(id, input),
      successMessage: t("admins.toasts.updated"),
      invalidate,
      onError,
    }),
    changeRole: useActionMutation({
      mutationFn: ({ id, input }: { id: string; input: AdminRoleInput }) => adminsService.changeRole(id, input),
      successMessage: t("admins.toasts.roleChanged"),
      invalidate,
      onError,
    }),
    block: useActionMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminsService.block(id, reason),
      successMessage: t("admins.toasts.blocked"),
      invalidate,
      onError,
    }),
    activate: useActionMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminsService.activate(id, reason),
      successMessage: t("admins.toasts.activated"),
      invalidate,
      onError,
    }),
  };
}

/** Self-service profile mutations for the signed-in admin. */
export function useProfileActions() {
  const t = useT();
  const qc = useQueryClient();
  return {
    updateProfile: useActionMutation({
      mutationFn: (input: ProfileInput) => authService.updateProfile(input),
      successMessage: t("profile.toasts.updated"),
      invalidate: [adminKeys.all, ["audit"]],
      onSuccess: (admin) => qc.setQueryData<AdminSession>(sessionQueryKey, (prev) => (prev ? { ...prev, admin } : prev)),
    }),
    changePassword: useActionMutation({
      mutationFn: (input: ChangePasswordInput) => authService.changePassword(input),
      successMessage: t("profile.toasts.passwordChanged"),
      invalidate: [["audit"]],
    }),
  };
}
