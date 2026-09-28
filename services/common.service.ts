import { api } from "@/lib/api/client";
import type {
  AdminAlert,
  AdminNote,
  Category,
  CategoryAttribute,
  District,
  ModerationAction,
  ModerationTargetType,
  NoteEntityType,
  Region,
  SearchResults,
} from "@/types";

export interface Lookups {
  regions: Region[];
  districts: District[];
  categories: Category[];
  attributes: CategoryAttribute[];
  settings: { allowCashDifference: boolean };
}

export const commonService = {
  lookups: () => api.get<Lookups>("/lookups"),
  search: (q: string, signal?: AbortSignal) => api.get<SearchResults>("/search", { q }, signal),
  alerts: () => api.get<AdminAlert[]>("/alerts"),
  markAlertsRead: () => api.post<null>("/alerts/read-all"),
  notes: (entityType: NoteEntityType, entityId: string) => api.get<AdminNote[]>("/notes", { entityType, entityId }),
  addNote: (entityType: NoteEntityType, entityId: string, body: string) =>
    api.post<AdminNote>("/notes", { entityType, entityId, body }),
  moderationHistory: (targetType: ModerationTargetType, targetId: string) =>
    api.get<ModerationAction[]>("/moderation/history", { targetType, targetId }),
};
