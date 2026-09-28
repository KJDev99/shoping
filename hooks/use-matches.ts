"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { matchesService } from "@/services/matches.service";
import type { ListParams } from "@/types";

/** Query keys: invalidate ["matches"] to refresh every match query. */
export const matchKeys = {
  all: ["matches"] as const,
  list: (params: ListParams) => ["matches", "list", params] as const,
  detail: (id: string) => ["matches", "detail", id] as const,
};

export function useMatchesList(params: ListParams) {
  return useQuery({ queryKey: matchKeys.list(params), queryFn: () => matchesService.list(params), placeholderData: keepPreviousData });
}

export function useMatch(id: string | null) {
  return useQuery({ queryKey: matchKeys.detail(id ?? ""), queryFn: () => matchesService.get(id!), enabled: !!id });
}
