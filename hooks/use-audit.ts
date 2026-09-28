"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { auditService } from "@/services/audit.service";
import type { ListParams } from "@/types";

/** Query keys: mutations elsewhere invalidate ["audit"]. */
export const auditKeys = {
  all: ["audit"] as const,
  list: (params: ListParams) => ["audit", "list", params] as const,
  detail: (id: string) => ["audit", "detail", id] as const,
  actions: ["audit", "actions"] as const,
};

export function useAuditList(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditService.list(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useAuditLog(id: string | null) {
  return useQuery({ queryKey: auditKeys.detail(id ?? ""), queryFn: () => auditService.get(id!), enabled: !!id });
}

export function useAuditActions(enabled = true) {
  return useQuery({ queryKey: auditKeys.actions, queryFn: auditService.actions, staleTime: 60_000, enabled });
}
