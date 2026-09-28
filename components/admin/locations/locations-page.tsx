"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ListTree, MapPin, Pencil, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { NumberCell } from "@/components/common/cells";
import { PageHeader } from "@/components/common/page-header";
import { Pill } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { ColumnHeader } from "@/components/tables/column-header";
import { DataTable } from "@/components/tables/data-table";
import { FacetedFilter } from "@/components/tables/filters";
import { RowActions } from "@/components/tables/row-actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useListParams } from "@/hooks/use-list-params";
import { useLocationActions, useRegionsList } from "@/hooks/use-locations";
import { useLocale, useT } from "@/lib/i18n/provider";
import { formatNumber } from "@/lib/format";
import type { Region } from "@/types";
import { DistrictsSheet, OtherNames } from "./districts-sheet";
import { RegionFormDialog } from "./location-form-dialogs";

const FILTER_KEYS = ["enabled"] as const;
const DEFAULTS = { sort: "sortOrder", order: "asc", limit: 20 } as const;

export function LocationsPage() {
  const t = useT();
  const [locale] = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { params, setParams, resetFilters, activeFilterCount } = useListParams(DEFAULTS, FILTER_KEYS);
  const query = useRegionsList(params);
  const { updateRegion } = useLocationActions();
  const [form, setForm] = useState<{ open: boolean; region: Region | null }>({ open: false, region: null });
  const [disabling, setDisabling] = useState<{ open: boolean; region: Region | null }>({ open: false, region: null });

  const openRegionId = searchParams.get("region");
  const openDistricts = useCallback(
    (id: string | null) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (id) sp.set("region", id);
      else sp.delete("region");
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const toggle = useCallback(
    (region: Region, enabled: boolean) => {
      if (enabled) updateRegion.mutate({ id: region.id, input: { enabled: true } });
      else setDisabling({ open: true, region });
    },
    [updateRegion],
  );

  const pendingToggleId = updateRegion.isPending ? updateRegion.variables?.id : undefined;

  const enabledSwitch = useCallback(
    (r: Region) => (
      <span onClick={(e) => e.stopPropagation()} className="inline-flex">
        <Switch
          checked={r.enabled}
          onCheckedChange={(v) => toggle(r, v)}
          disabled={pendingToggleId === r.id}
          aria-label={t("locations.regions.toggle", { name: t.text(r.name) })}
        />
      </span>
    ),
    [toggle, pendingToggleId, t],
  );

  const actions = useCallback(
    (r: Region) => (
      <RowActions
        label={t("locations.actions.more", { name: t.text(r.name) })}
        actions={[
          { label: t("locations.actions.districts"), icon: <ListTree />, onSelect: () => openDistricts(r.id) },
          { label: t("common.actions.edit"), icon: <Pencil />, onSelect: () => setForm({ open: true, region: r }) },
        ]}
      />
    ),
    [t, openDistricts],
  );

  const columns = useMemo<ColumnDef<Region>[]>(
    () => [
      {
        id: "sortOrder",
        header: ({ column }) => <ColumnHeader column={column} title="#" />,
        cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.original.sortOrder + 1}</span>,
        meta: { label: "#", className: "w-12" },
      },
      {
        id: "name",
        header: ({ column }) => <ColumnHeader column={column} title={t("locations.columns.name")} />,
        cell: ({ row }) => (
          <div className="min-w-44">
            <span className="font-medium">{t.text(row.original.name)}</span>
            <OtherNames name={row.original.name} />
          </div>
        ),
        enableHiding: false,
      },
      {
        id: "districtsCount",
        header: ({ column }) => <ColumnHeader column={column} title={t("locations.columns.districts")} />,
        cell: ({ row }) => <NumberCell value={row.original.districtsCount} />,
        meta: { label: t("locations.columns.districts"), className: "text-right", headerClassName: "text-right" },
      },
      {
        id: "usersCount",
        header: ({ column }) => <ColumnHeader column={column} title={t("locations.columns.users")} />,
        cell: ({ row }) => <NumberCell value={row.original.usersCount} />,
        meta: { label: t("locations.columns.users"), className: "text-right", headerClassName: "text-right" },
      },
      {
        id: "listingsCount",
        header: ({ column }) => <ColumnHeader column={column} title={t("locations.columns.listings")} />,
        cell: ({ row }) => <NumberCell value={row.original.listingsCount} />,
        meta: { label: t("locations.columns.listings"), className: "text-right", headerClassName: "text-right" },
      },
      {
        id: "enabled",
        header: t("locations.columns.enabled"),
        cell: ({ row }) => enabledSwitch(row.original),
        enableSorting: false,
        meta: { label: t("locations.columns.enabled") },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("common.table.actions")}</span>,
        cell: ({ row }) => actions(row.original),
        enableSorting: false,
        enableHiding: false,
        meta: { className: "w-10" },
      },
    ],
    [t, enabledSwitch, actions],
  );

  const disablingRegion = disabling.region;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("locations.title")}
        description={t("locations.subtitle")}
        meta={<Pill tone="primary">{t("locations.country")}</Pill>}
        actions={
          <Button onClick={() => setForm({ open: true, region: null })}>
            <Plus /> {t("locations.regions.add")}
          </Button>
        }
      />

      <div role="note" className="flex gap-3 rounded-xl border bg-card p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MapPin className="size-4" />
        </span>
        <div className="space-y-1 text-sm">
          <p className="font-medium">{t("locations.why.title")}</p>
          <p className="text-muted-foreground">{t("locations.why.body")}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data}
        meta={query.data?.meta}
        getRowId={(r) => r.id}
        params={params}
        onParamsChange={setParams}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        searchPlaceholder={t("locations.regions.searchPlaceholder")}
        storageKey="regions"
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
        onRowClick={(r) => openDistricts(r.id)}
        filters={
          <FacetedFilter
            title={t("locations.columns.enabled")}
            value={params.filters?.enabled}
            onChange={(v) => setParams({ filters: { enabled: v } })}
            options={[
              { value: "true", label: t("locations.status.enabled") },
              { value: "false", label: t("locations.status.disabled") },
            ]}
          />
        }
        mobileCard={(r) => (
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t.text(r.name)}</p>
              <OtherNames name={r.name} />
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                {t("locations.regions.mobileStats", {
                  districts: formatNumber(r.districtsCount, locale),
                  users: formatNumber(r.usersCount, locale),
                  listings: formatNumber(r.listingsCount, locale),
                })}
              </p>
            </div>
            {enabledSwitch(r)}
            <span onClick={(e) => e.stopPropagation()}>{actions(r)}</span>
          </div>
        )}
      />

      <RegionFormDialog region={form.region} open={form.open} onOpenChange={(open) => setForm((s) => ({ ...s, open }))} />

      <ConfirmDialog
        open={disabling.open}
        onOpenChange={(open) => setDisabling((s) => ({ ...s, open }))}
        title={t("locations.dialogs.disableRegionTitle", { name: t.text(disablingRegion?.name) })}
        description={t("locations.dialogs.disableRegionDescription", {
          users: formatNumber(disablingRegion?.usersCount ?? 0, locale),
          listings: formatNumber(disablingRegion?.listingsCount ?? 0, locale),
        })}
        confirmLabel={t("locations.actions.disable")}
        onConfirm={() => (disablingRegion ? updateRegion.mutateAsync({ id: disablingRegion.id, input: { enabled: false } }) : undefined)}
      />

      <DistrictsSheet regionId={openRegionId} onOpenChange={(open) => !open && openDistricts(null)} />
    </div>
  );
}
