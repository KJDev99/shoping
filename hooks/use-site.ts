"use client";

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useT } from "@/lib/i18n/provider";
import { siteService } from "@/services/site.service";
import type { ListParams } from "@/types";

export const siteKeys = {
  me: ["site", "me"] as const,
  config: ["site", "config"] as const,
  lookups: ["site", "lookups"] as const,
  listings: (params: Omit<ListParams, "page">) => ["site", "listings", params] as const,
  listing: (id: string) => ["site", "listing", id] as const,
  similar: (id: string) => ["site", "similar", id] as const,
  my: (params: ListParams) => ["site", "my", params] as const,
};

export function useSiteUser() {
  return useQuery({ queryKey: siteKeys.me, queryFn: siteService.me, staleTime: 60_000 });
}

export function useSiteConfig() {
  return useQuery({ queryKey: siteKeys.config, queryFn: siteService.config, staleTime: 5 * 60_000 });
}

export function useSiteLookups() {
  return useQuery({ queryKey: siteKeys.lookups, queryFn: siteService.lookups, staleTime: 5 * 60_000 });
}

/** id → localized name helpers for the public site. */
export function useSiteNames() {
  const { data } = useSiteLookups();
  const t = useT();
  const maps = useMemo(
    () => ({
      regions: new Map(data?.regions.map((r) => [r.id, r]) ?? []),
      districts: new Map(data?.districts.map((d) => [d.id, d]) ?? []),
      categories: new Map(data?.categories.map((c) => [c.id, c]) ?? []),
    }),
    [data],
  );
  const region = useCallback((id: string | null | undefined) => (id ? t.text(maps.regions.get(id)?.name) : ""), [maps, t]);
  const district = useCallback((id: string | null | undefined) => (id ? t.text(maps.districts.get(id)?.name) : ""), [maps, t]);
  const category = useCallback((id: string | null | undefined) => (id ? t.text(maps.categories.get(id)?.name) : ""), [maps, t]);
  return { region, district, category, lookups: data };
}

/** Infinite "load more" feed of public listings. */
export function usePublicListings(params: Omit<ListParams, "page">) {
  return useInfiniteQuery({
    queryKey: siteKeys.listings(params),
    queryFn: ({ pageParam }) => siteService.listings({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

export function usePublicListing(id: string) {
  return useQuery({ queryKey: siteKeys.listing(id), queryFn: () => siteService.listing(id) });
}

export function useSimilarListings(id: string) {
  return useQuery({ queryKey: siteKeys.similar(id), queryFn: () => siteService.similar(id) });
}

export function useMyListings(params: ListParams) {
  return useQuery({ queryKey: siteKeys.my(params), queryFn: () => siteService.myListings(params), placeholderData: keepPreviousData });
}
