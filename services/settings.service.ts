import { api } from "@/lib/api/client";
import type { SettingsSection, SettingsSectionInput } from "@/schemas/settings.schema";
import type { PlatformSettings } from "@/types";

export const settingsService = {
  get: () => api.get<PlatformSettings>("/settings"),
  update: <S extends SettingsSection>(section: S, input: SettingsSectionInput[S]) => api.patch<PlatformSettings>(`/settings/${section}`, input),
};
