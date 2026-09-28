"use client";

import { useQuery } from "@tanstack/react-query";
import { hasPermission } from "@/lib/rbac";
import { authService } from "@/services/auth.service";
import type { Permission } from "@/types";

export const sessionQueryKey = ["auth", "me"] as const;

export function useSession() {
  return useQuery({ queryKey: sessionQueryKey, queryFn: authService.me, staleTime: 5 * 60_000 });
}

export function usePermissions(): readonly Permission[] {
  return useSession().data?.permissions ?? [];
}

/**
 * UI-only permission check (hide/disable controls). The backend enforces
 * every permission independently — never rely on this for security.
 */
export function useCan(required: Permission | Permission[]): boolean {
  return hasPermission(usePermissions(), required);
}
