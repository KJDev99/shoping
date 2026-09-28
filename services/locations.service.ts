import { api } from "@/lib/api/client";
import type { DistrictInput, DistrictUpdateInput, RegionInput, RegionUpdateInput } from "@/schemas/location.schema";
import type { District, ListParams, Region } from "@/types";

/** District with live usage counters (users registered there, listings located there). */
export interface DistrictWithStats extends District {
  usersCount: number;
  listingsCount: number;
}

export const locationsService = {
  regions: (params: ListParams) => api.list<Region>("/regions", params),
  region: (id: string) => api.get<Region>(`/regions/${id}`),
  createRegion: (input: RegionInput) => api.post<Region>("/regions", input),
  updateRegion: (id: string, input: RegionUpdateInput) => api.patch<Region>(`/regions/${id}`, input),

  districts: (regionId: string) => api.get<DistrictWithStats[]>(`/regions/${regionId}/districts`),
  createDistrict: (regionId: string, input: DistrictInput) => api.post<DistrictWithStats>(`/regions/${regionId}/districts`, input),
  updateDistrict: (id: string, input: DistrictUpdateInput) => api.patch<DistrictWithStats>(`/districts/${id}`, input),
  removeDistrict: (id: string) => api.delete<null>(`/districts/${id}`),
};
