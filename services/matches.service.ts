import { api } from "@/lib/api/client";
import type { BarterMatchDetail } from "@/lib/matching/types";
import type { BarterMatch, ListParams } from "@/types";

export type { BarterMatchDetail };

export const matchesService = {
  list: (params: ListParams) => api.list<BarterMatch>("/matches", params),
  get: (id: string) => api.get<BarterMatchDetail>(`/matches/${encodeURIComponent(id)}`),
};
