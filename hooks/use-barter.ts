"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { barterService } from "@/services/barter.service";
import type { ListParams } from "@/types";

/** Query keys: invalidate ["barter-requests"] to refresh every barter query. */
export const barterKeys = {
  all: ["barter-requests"] as const,
  list: (params: ListParams) => ["barter-requests", "list", params] as const,
  detail: (id: string) => ["barter-requests", "detail", id] as const,
};

export function useBarterRequestsList(params: ListParams) {
  return useQuery({
    queryKey: barterKeys.list(params),
    queryFn: () => barterService.list(params),
    placeholderData: keepPreviousData,
  });
}

/** Barter requests are read-only for admins: users accept/decline, never admins. */
export function useBarterRequest(id: string) {
  return useQuery({ queryKey: barterKeys.detail(id), queryFn: () => barterService.get(id) });
}
