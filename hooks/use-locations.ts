"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocale, useT } from "@/lib/i18n/provider";
import type { DistrictInput, DistrictUpdateInput, RegionInput, RegionUpdateInput } from "@/schemas/location.schema";
import { locationsService } from "@/services/locations.service";
import type { ListParams } from "@/types";
import { useActionMutation } from "./use-action-mutation";
import { lookupsQueryKey } from "./use-lookups";

/** Query keys: invalidate ["locations"] to refresh regions and districts. */
export const locationKeys = {
  all: ["locations"] as const,
  regions: (params: ListParams) => ["locations", "regions", params] as const,
  region: (id: string) => ["locations", "region", id] as const,
  districts: (regionId: string) => ["locations", "districts", regionId] as const,
};

/** Location changes also refresh lookups (region/district selects elsewhere) and the audit log. */
const invalidate = [locationKeys.all, lookupsQueryKey, ["audit"]];

export function useRegionsList(params: ListParams) {
  const [locale] = useLocale();
  // The locale lets the server sort by the name the admin actually sees.
  const withLocale: ListParams = { ...params, filters: { ...params.filters, locale } };
  return useQuery({
    queryKey: locationKeys.regions(withLocale),
    queryFn: () => locationsService.regions(withLocale),
    placeholderData: keepPreviousData,
  });
}

export function useRegion(id: string | null) {
  return useQuery({ queryKey: locationKeys.region(id ?? ""), queryFn: () => locationsService.region(id!), enabled: !!id });
}

export function useDistricts(regionId: string | null) {
  return useQuery({ queryKey: locationKeys.districts(regionId ?? ""), queryFn: () => locationsService.districts(regionId!), enabled: !!regionId });
}

export function useLocationActions() {
  const t = useT();
  return {
    createRegion: useActionMutation({
      mutationFn: (input: RegionInput) => locationsService.createRegion(input),
      successMessage: t("locations.toasts.regionCreated"),
      invalidate,
    }),
    updateRegion: useActionMutation({
      mutationFn: ({ id, input }: { id: string; input: RegionUpdateInput }) => locationsService.updateRegion(id, input),
      successMessage: (_, v) =>
        v.input.name === undefined && v.input.enabled !== undefined
          ? v.input.enabled
            ? t("locations.toasts.regionEnabled")
            : t("locations.toasts.regionDisabled")
          : t("locations.toasts.regionUpdated"),
      invalidate,
    }),
    createDistrict: useActionMutation({
      mutationFn: ({ regionId, input }: { regionId: string; input: DistrictInput }) => locationsService.createDistrict(regionId, input),
      successMessage: t("locations.toasts.districtCreated"),
      invalidate,
    }),
    updateDistrict: useActionMutation({
      mutationFn: ({ id, input }: { id: string; input: DistrictUpdateInput }) => locationsService.updateDistrict(id, input),
      successMessage: (_, v) =>
        v.input.name === undefined && v.input.type === undefined && v.input.enabled !== undefined
          ? v.input.enabled
            ? t("locations.toasts.districtEnabled")
            : t("locations.toasts.districtDisabled")
          : t("locations.toasts.districtUpdated"),
      invalidate,
    }),
    removeDistrict: useActionMutation({
      mutationFn: ({ id }: { id: string }) => locationsService.removeDistrict(id),
      successMessage: t("locations.toasts.districtDeleted"),
      invalidate,
    }),
  };
}
