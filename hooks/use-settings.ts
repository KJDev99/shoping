"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/provider";
import type { SettingsSection, SettingsSectionInput } from "@/schemas/settings.schema";
import { settingsService } from "@/services/settings.service";
import type { PlatformSettings } from "@/types";
import { useActionMutation } from "./use-action-mutation";
import { lookupsQueryKey } from "./use-lookups";

export const settingsKeys = { all: ["settings"] as const };

export function useSettings() {
  return useQuery({ queryKey: settingsKeys.all, queryFn: settingsService.get });
}

/** Saves one settings section; the response (full settings) replaces the cache. */
export function useUpdateSettings<S extends SettingsSection>(section: S) {
  const t = useT();
  const qc = useQueryClient();
  return useActionMutation({
    mutationFn: (input: SettingsSectionInput[S]) => settingsService.update(section, input),
    successMessage: t("settings.toasts.saved"),
    // Lookups carry allowCashDifference; the notifications module reads channel availability.
    invalidate: [["audit"], lookupsQueryKey, ["notifications", "channels"]],
    onSuccess: (data) => qc.setQueryData<PlatformSettings>(settingsKeys.all, data),
  });
}
