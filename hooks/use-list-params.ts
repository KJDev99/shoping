"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { ListParams, SortOrder } from "@/types";

export interface ListParamsDefaults {
  limit?: number;
  sort?: string;
  order?: SortOrder;
}

export type ListParamsUpdate = Partial<Omit<ListParams, "filters">> & { filters?: Record<string, string | undefined> };

/**
 * Table state (page, limit, search, sort, filters) stored in the URL so views
 * are shareable and survive reloads. All values are sent to the server —
 * pagination/sorting/filtering never happen client-side.
 *
 * `prefix` namespaces the params when one page hosts several tables.
 */
export function useListParams(defaults: ListParamsDefaults = {}, filterKeys: readonly string[] = [], prefix = "") {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const k = useCallback((key: string) => `${prefix}${key}`, [prefix]);
  const { limit: defaultLimit, sort: defaultSort, order: defaultOrder } = defaults;

  const filterKeysStr = filterKeys.join(",");
  const params: ListParams = useMemo(() => {
    const filters: Record<string, string | undefined> = {};
    for (const key of filterKeysStr ? filterKeysStr.split(",") : []) {
      const v = searchParams.get(k(key));
      if (v) filters[key] = v;
    }
    return {
      page: Number(searchParams.get(k("page"))) || 1,
      limit: Number(searchParams.get(k("limit"))) || defaultLimit || 20,
      search: searchParams.get(k("search")) || undefined,
      sort: searchParams.get(k("sort")) || defaultSort,
      order: (searchParams.get(k("order")) as SortOrder) || defaultOrder || "desc",
      filters,
    };
  }, [searchParams, filterKeysStr, k, defaultLimit, defaultSort, defaultOrder]);

  const setParams = useCallback(
    (update: ListParamsUpdate) => {
      const sp = new URLSearchParams(searchParams.toString());
      const set = (key: string, value: string | number | undefined) => {
        if (value === undefined || value === "") sp.delete(k(key));
        else sp.set(k(key), String(value));
      };
      const { filters, ...rest } = update;
      for (const [key, value] of Object.entries(rest)) set(key, value as string | number | undefined);
      if (filters) for (const [key, value] of Object.entries(filters)) set(key, value);
      // Any change other than paging resets to page 1.
      if (update.page === undefined) sp.delete(k("page"));
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname, k],
  );

  const resetFilters = useCallback(() => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const key of [...(filterKeysStr ? filterKeysStr.split(",") : []), "search", "page"]) sp.delete(k(key));
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname, filterKeysStr, k]);

  const activeFilterCount = Object.values(params.filters ?? {}).filter(Boolean).length + (params.search ? 1 : 0);

  return { params, setParams, resetFilters, activeFilterCount };
}
