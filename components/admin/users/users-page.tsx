"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { CopyId, DateCell, NumberCell, Rating, UserCell } from "@/components/common/cells";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { ColumnHeader } from "@/components/tables/column-header";
import { DataTable } from "@/components/tables/data-table";
import { DateRangeFilter, FacetedFilter, NumberRangeFilter } from "@/components/tables/filters";
import { useListParams } from "@/hooks/use-list-params";
import { useLookupNames } from "@/hooks/use-lookups";
import { useUsersList } from "@/hooks/use-users";
import { useT } from "@/lib/i18n/provider";
import { RISK_LEVELS, USER_STATUSES, type User } from "@/types";
import { useUserActionDialogs } from "./user-action-dialogs";
import { UserRowActions } from "./user-row-actions";

const FILTER_KEYS = ["status", "regionId", "riskLevel", "from", "to", "minListings", "maxListings", "minReports"] as const;

export function UsersPage() {
  const t = useT();
  const router = useRouter();
  const names = useLookupNames();
  const { params, setParams, resetFilters, activeFilterCount } = useListParams({ sort: "createdAt", order: "desc" }, FILTER_KEYS);
  const query = useUsersList(params);
  const { open, dialogs } = useUserActionDialogs();
  const f = params.filters ?? {};

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: "id",
        header: t("common.fields.id"),
        cell: ({ row }) => <CopyId value={row.original.id} />,
        enableSorting: false,
        meta: { label: t("common.fields.id") },
      },
      {
        id: "fullName",
        header: ({ column }) => <ColumnHeader column={column} title={t("users.columns.user")} />,
        cell: ({ row }) => <UserCell user={row.original} secondary={row.original.username && `@${row.original.username}`} className="min-w-44" />,
        enableHiding: false,
      },
      {
        id: "phone",
        header: t("users.columns.phone"),
        cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{row.original.phone}</span>,
        enableSorting: false,
        meta: { label: t("users.columns.phone") },
      },
      {
        id: "email",
        header: t("users.columns.email"),
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.email ?? "—"}</span>,
        enableSorting: false,
        meta: { label: t("users.columns.email") },
      },
      {
        id: "region",
        header: t("users.columns.location"),
        cell: ({ row }) => <span className="whitespace-nowrap">{names.region(row.original.regionId)}</span>,
        enableSorting: false,
        meta: { label: t("users.columns.location") },
      },
      {
        id: "listingsCount",
        header: ({ column }) => <ColumnHeader column={column} title={t("users.columns.listings")} />,
        cell: ({ row }) => <NumberCell value={row.original.listingsCount} />,
        meta: { label: t("users.columns.listings"), className: "text-right", headerClassName: "text-right" },
      },
      {
        id: "completedExchanges",
        header: ({ column }) => <ColumnHeader column={column} title={t("users.columns.exchanges")} />,
        cell: ({ row }) => <NumberCell value={row.original.completedExchanges} />,
        meta: { label: t("users.columns.exchanges"), className: "text-right", headerClassName: "text-right" },
      },
      {
        id: "reportsCount",
        header: ({ column }) => <ColumnHeader column={column} title={t("users.columns.reports")} />,
        cell: ({ row }) => (
          <span className={row.original.reportsCount >= 3 ? "font-medium text-destructive tabular-nums" : "tabular-nums"}>{row.original.reportsCount}</span>
        ),
        meta: { label: t("users.columns.reports"), className: "text-right", headerClassName: "text-right" },
      },
      {
        id: "rating",
        header: ({ column }) => <ColumnHeader column={column} title={t("users.columns.rating")} />,
        cell: ({ row }) => <Rating value={row.original.rating} count={row.original.reviewsCount} />,
        meta: { label: t("users.columns.rating") },
      },
      {
        id: "riskLevel",
        header: t("users.columns.risk"),
        cell: ({ row }) => (row.original.riskLevel === "LOW" ? <span className="text-muted-foreground">—</span> : <StatusBadge kind="riskLevel" value={row.original.riskLevel} />),
        enableSorting: false,
        meta: { label: t("users.columns.risk") },
      },
      {
        id: "status",
        header: t("users.columns.status"),
        cell: ({ row }) => <StatusBadge kind="userStatus" value={row.original.status} />,
        enableSorting: false,
        meta: { label: t("users.columns.status") },
      },
      {
        id: "createdAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("users.columns.registeredAt")} />,
        cell: ({ row }) => <DateCell value={row.original.createdAt} mode="date" />,
        meta: { label: t("users.columns.registeredAt") },
      },
      {
        id: "lastActiveAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("users.columns.lastActive")} />,
        cell: ({ row }) => <DateCell value={row.original.lastActiveAt} />,
        meta: { label: t("users.columns.lastActive") },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("common.table.actions")}</span>,
        cell: ({ row }) => <UserRowActions user={row.original} open={open} />,
        enableSorting: false,
        enableHiding: false,
        meta: { className: "w-10" },
      },
    ],
    [t, names, open],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("users.title")} description={t("users.subtitle")} />
      <DataTable
        columns={columns}
        data={query.data?.data}
        meta={query.data?.meta}
        getRowId={(u) => u.id}
        params={params}
        onParamsChange={setParams}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        searchPlaceholder={t("users.searchPlaceholder")}
        storageKey="users"
        initialColumnVisibility={{ id: false, email: false }}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
        onRowClick={(u) => router.push(`/admin/users/${u.id}`)}
        filters={
          <>
            <FacetedFilter
              title={t("users.filters.status")}
              value={f.status}
              onChange={(status) => setParams({ filters: { status } })}
              options={USER_STATUSES.map((s) => ({ value: s, label: t(`enums.userStatus.${s}`) }))}
            />
            <FacetedFilter
              title={t("users.filters.region")}
              value={f.regionId}
              onChange={(regionId) => setParams({ filters: { regionId } })}
              searchable
              options={(names.lookups?.regions ?? []).map((r) => ({ value: r.id, label: t.text(r.name), text: t.text(r.name) }))}
            />
            <FacetedFilter
              title={t("users.filters.risk")}
              value={f.riskLevel}
              onChange={(riskLevel) => setParams({ filters: { riskLevel } })}
              options={RISK_LEVELS.map((s) => ({ value: s, label: t(`enums.riskLevel.${s}`) }))}
            />
            <DateRangeFilter title={t("users.filters.registered")} from={f.from} to={f.to} onChange={({ from, to }) => setParams({ filters: { from, to } })} />
            <NumberRangeFilter
              title={t("users.filters.listings")}
              min={f.minListings}
              max={f.maxListings}
              onChange={({ min, max }) => setParams({ filters: { minListings: min, maxListings: max } })}
            />
            <NumberRangeFilter title={t("users.filters.minReports")} min={f.minReports} max={undefined} onChange={({ min }) => setParams({ filters: { minReports: min } })} />
          </>
        }
        mobileCard={(u) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <UserCell user={u} link={false} />
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <StatusBadge kind="userStatus" value={u.status} />
                {u.riskLevel !== "LOW" && <StatusBadge kind="riskLevel" value={u.riskLevel} />}
                <span>{names.region(u.regionId)}</span>
                <span>· {t("users.columns.listings")}: {u.listingsCount}</span>
                <span>· {t("users.columns.reports")}: {u.reportsCount}</span>
              </div>
            </div>
            <UserRowActions user={u} open={open} />
          </div>
        )}
      />
      {dialogs}
    </div>
  );
}
