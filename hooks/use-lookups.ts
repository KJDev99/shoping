"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useT } from "@/lib/i18n/provider";
import { commonService } from "@/services/common.service";

export const lookupsQueryKey = ["lookups"] as const;

/** Reference data (regions, districts, categories, attributes) cached for the session. */
export function useLookups() {
  return useQuery({ queryKey: lookupsQueryKey, queryFn: commonService.lookups, staleTime: 5 * 60_000 });
}

/** Helpers resolving ids to localized names. Returns "—" while loading or when unknown. */
export function useLookupNames() {
  const { data } = useLookups();
  const t = useT();
  const maps = useMemo(
    () => ({
      regions: new Map(data?.regions.map((r) => [r.id, r]) ?? []),
      districts: new Map(data?.districts.map((d) => [d.id, d]) ?? []),
      categories: new Map(data?.categories.map((c) => [c.id, c]) ?? []),
      attributes: new Map(data?.attributes.map((a) => [a.id, a]) ?? []),
    }),
    [data],
  );
  const region = useCallback((id: string | null | undefined) => (id ? t.text(maps.regions.get(id)?.name) || "—" : "—"), [maps, t]);
  const district = useCallback((id: string | null | undefined) => (id ? t.text(maps.districts.get(id)?.name) || "—" : "—"), [maps, t]);
  const category = useCallback((id: string | null | undefined) => (id ? t.text(maps.categories.get(id)?.name) || "—" : "—"), [maps, t]);
  return { ...maps, region, district, category, lookups: data };
}
