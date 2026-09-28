"use client";

import { AlertTriangle, Building2, MapPinned, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Pill } from "@/components/common/status-badge";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { RowActions } from "@/components/tables/row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useDistricts, useLocationActions, useRegion } from "@/hooks/use-locations";
import { useLocale, useT } from "@/lib/i18n/provider";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DistrictWithStats } from "@/services/locations.service";
import type { Locale, TranslatedText } from "@/types";
import { DistrictFormDialog } from "./location-form-dialogs";

const LANGS: Locale[] = ["uz", "ru", "en"];

/** Other-language names, muted, so admins can check translations at a glance. */
export function OtherNames({ name, className }: { name: TranslatedText; className?: string }) {
  const [locale] = useLocale();
  return (
    <span className={cn("block truncate text-xs text-muted-foreground", className)}>
      {LANGS.filter((l) => l !== locale)
        .map((l) => name[l])
        .join(" · ")}
    </span>
  );
}

type DialogState = { kind: "form"; district: DistrictWithStats | null } | { kind: "disable" | "delete"; district: DistrictWithStats };

export function DistrictsSheet({ regionId, onOpenChange }: { regionId: string | null; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const [locale] = useLocale();
  const region = useRegion(regionId);
  const query = useDistricts(regionId);
  const { updateDistrict, removeDistrict } = useLocationActions();
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; value: DialogState | null }>({ open: false, value: null });
  const openDialog = (value: DialogState) => setDialog({ open: true, value });
  const regionName = t.text(region.data?.name);

  const districts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = query.data ?? [];
    const filtered = q ? all.filter((d) => LANGS.some((l) => d.name[l].toLowerCase().includes(q))) : all;
    // Cities first, then districts, alphabetically in the admin's language.
    return [...filtered].sort((a, b) => (a.type === b.type ? t.text(a.name).localeCompare(t.text(b.name), locale) : a.type === "CITY" ? -1 : 1));
  }, [query.data, search, t, locale]);

  const toggle = (d: DistrictWithStats, enabled: boolean) => {
    if (enabled) updateDistrict.mutate({ id: d.id, input: { enabled: true } });
    else openDialog({ kind: "disable", district: d });
  };

  const value = dialog.value;
  const targetName = value?.district ? t.text(value.district.name) : "";
  const deleteBlocked = value?.kind === "delete" && (value.district.usersCount > 0 || value.district.listingsCount > 0);

  return (
    <Sheet open={!!regionId} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 w-full sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle className="pr-8">
            {region.isPending ? <Skeleton className="h-5 w-48" /> : t("locations.districts.title", { region: regionName })}
          </SheetTitle>
          <SheetDescription>{t("locations.districts.description")}</SheetDescription>
          {region.data && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              <OtherNames name={region.data.name} className="w-auto" />
              <span aria-hidden>·</span>
              <span>{t("locations.districts.stats", { users: formatNumber(region.data.usersCount, locale), listings: formatNumber(region.data.listingsCount, locale) })}</span>
            </div>
          )}
        </SheetHeader>

        {region.data && !region.data.enabled && (
          <div role="note" className="flex items-start gap-2 border-b bg-warning/10 px-4 py-2.5 text-xs">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
            {t("locations.districts.regionDisabled")}
          </div>
        )}

        <div className="flex items-center gap-2 border-b p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("locations.districts.searchPlaceholder")}
              aria-label={t("locations.districts.searchPlaceholder")}
              className="pl-8"
            />
          </div>
          <Button onClick={() => openDialog({ kind: "form", district: null })} disabled={!regionId}>
            <Plus /> <span className="hidden sm:inline">{t("locations.districts.add")}</span>
            <span className="sr-only sm:hidden">{t("locations.districts.add")}</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {query.isPending ? (
            <div className="p-4">
              <ListSkeleton rows={6} />
            </div>
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : districts.length === 0 ? (
            search ? (
              <EmptyState icon={<Search />} title={t("common.table.noResults")} />
            ) : (
              <EmptyState
                icon={<MapPinned />}
                title={t("locations.districts.empty")}
                description={t("locations.districts.emptyHint")}
                action={
                  <Button variant="outline" size="sm" onClick={() => openDialog({ kind: "form", district: null })}>
                    <Plus /> {t("locations.districts.add")}
                  </Button>
                }
              />
            )
          ) : (
            <ul className="divide-y">
              {districts.map((d) => {
                const name = t.text(d.name);
                return (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      {d.type === "CITY" ? <Building2 className="size-4" /> : <MapPinned className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("truncate text-sm font-medium", !d.enabled && "text-muted-foreground")}>{name}</span>
                        <Pill tone={d.type === "CITY" ? "info" : "neutral"}>{t(`enums.districtType.${d.type}`)}</Pill>
                        {!d.enabled && <Pill tone="muted">{t("locations.status.disabled")}</Pill>}
                      </div>
                      <OtherNames name={d.name} />
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {t("locations.districts.stats", { users: formatNumber(d.usersCount, locale), listings: formatNumber(d.listingsCount, locale) })}
                      </span>
                    </div>
                    <Switch
                      checked={d.enabled}
                      onCheckedChange={(v) => toggle(d, v)}
                      disabled={updateDistrict.isPending && updateDistrict.variables?.id === d.id}
                      aria-label={t("locations.districts.toggle", { name })}
                    />
                    <RowActions
                      label={t("locations.actions.more", { name })}
                      actions={[
                        { label: t("common.actions.edit"), icon: <Pencil />, onSelect: () => openDialog({ kind: "form", district: d }) },
                        { label: t("common.actions.delete"), icon: <Trash2 />, destructive: true, separator: true, onSelect: () => openDialog({ kind: "delete", district: d }) },
                      ]}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {regionId && (
          <DistrictFormDialog
            regionId={regionId}
            regionName={regionName}
            district={value?.kind === "form" ? value.district : null}
            open={dialog.open && value?.kind === "form"}
            onOpenChange={(open) => setDialog((s) => ({ ...s, open }))}
          />
        )}

        <ConfirmDialog
          open={dialog.open && value?.kind === "disable"}
          onOpenChange={(open) => setDialog((s) => ({ ...s, open }))}
          title={t("locations.dialogs.disableDistrictTitle", { name: targetName })}
          description={t("locations.dialogs.disableDistrictDescription")}
          confirmLabel={t("locations.actions.disable")}
          onConfirm={() => (value?.kind === "disable" ? updateDistrict.mutateAsync({ id: value.district.id, input: { enabled: false } }) : undefined)}
        />

        <ConfirmDialog
          open={dialog.open && value?.kind === "delete"}
          onOpenChange={(open) => setDialog((s) => ({ ...s, open }))}
          variant="destructive"
          title={t("locations.dialogs.deleteDistrictTitle", { name: targetName })}
          description={t("locations.dialogs.deleteDistrictDescription")}
          confirmLabel={t("common.actions.delete")}
          onConfirm={() => (value?.kind === "delete" ? removeDistrict.mutateAsync({ id: value.district.id }) : undefined)}
        >
          {deleteBlocked && value?.kind === "delete" && (
            <div role="note" className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <p>
                {t("locations.dialogs.deleteDistrictBlocked", {
                  users: formatNumber(value.district.usersCount, locale),
                  listings: formatNumber(value.district.listingsCount, locale),
                })}
              </p>
              {value.district.enabled && (
                <Button type="button" variant="outline" size="sm" onClick={() => setDialog({ open: true, value: { kind: "disable", district: value.district } })}>
                  {t("locations.dialogs.disableInstead")}
                </Button>
              )}
            </div>
          )}
        </ConfirmDialog>
      </SheetContent>
    </Sheet>
  );
}
