"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, createElement, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useT } from "@/lib/i18n/provider";
import { commonService, type Lookups } from "@/services/common.service";

export const lookupsQueryKey = ["lookups"] as const;

interface LookupsSource {
  queryKey: readonly unknown[];
  queryFn: () => Promise<Lookups>;
}

const LookupsSourceContext = createContext<LookupsSource>({ queryKey: lookupsQueryKey, queryFn: commonService.lookups });

/**
 * Overrides where reference data comes from. The admin panel uses the admin
 * API (default); the public site provides its own public lookups endpoint so
 * shared form components work for marketplace users too.
 */
export function LookupsSourceProvider({ value, children }: { value: LookupsSource; children: ReactNode }) {
  return createElement(LookupsSourceContext.Provider, { value }, children);
}

/** Reference data (regions, districts, categories, attributes) cached for the session. */
export function useLookups() {
  const source = useContext(LookupsSourceContext);
  return useQuery({ queryKey: source.queryKey, queryFn: source.queryFn, staleTime: 5 * 60_000 });
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
