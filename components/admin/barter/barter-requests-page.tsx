"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeftRight, Eye, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { DateCell, UserCell } from "@/components/common/cells";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { ColumnHeader } from "@/components/tables/column-header";
import { DataTable } from "@/components/tables/data-table";
import { DateRangeFilter, FacetedFilter } from "@/components/tables/filters";
import { RowActions } from "@/components/tables/row-actions";
import { useBarterRequestsList } from "@/hooks/use-barter";
import { useListParams } from "@/hooks/use-list-params";
import { useT } from "@/lib/i18n/provider";
import { BARTER_REQUEST_STATUSES, type BarterRequest } from "@/types";
import { ItemStack } from "./barter-shared";

const FILTER_KEYS = ["status", "shape", "from", "to", "userId", "listingId"] as const;

const sideItems = (b: BarterRequest, side: "OFFERED" | "REQUESTED") => b.items.filter((i) => i.side === side).map((i) => i.listing);

export function BarterRequestsPage() {
  const t = useT();
  const router = useRouter();
  const { params, setParams, resetFilters, activeFilterCount } = useListParams({ sort: "createdAt", order: "desc" }, FILTER_KEYS);
  const query = useBarterRequestsList(params);
  const f = params.filters ?? {};

  const columns = useMemo<ColumnDef<BarterRequest>[]>(
    () => [
      {
        id: "code",
        header: t("barter.columns.id"),
        cell: ({ row }) => <span className="font-mono text-xs whitespace-nowrap">{row.original.code}</span>,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "sender",
        header: t("barter.columns.sender"),
        cell: ({ row }) => <UserCell user={row.original.sender} className="min-w-40" />,
        enableSorting: false,
        meta: { label: t("barter.columns.sender") },
      },
      {
        id: "offered",
        header: t("barter.columns.offered"),
        cell: ({ row }) => <ItemStack items={sideItems(row.original, "OFFERED")} className="min-w-44 max-w-60" />,
        enableSorting: false,
        meta: { label: t("barter.columns.offered") },
      },
      {
        id: "arrow",
        header: () => <span className="sr-only">↔</span>,
        cell: () => <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />,
        enableSorting: false,
        enableHiding: false,
        meta: { className: "w-8 px-0 text-center" },
      },
      {
        id: "receiver",
        header: t("barter.columns.receiver"),
        cell: ({ row }) => <UserCell user={row.original.receiver} className="min-w-40" />,
        enableSorting: false,
        meta: { label: t("barter.columns.receiver") },
      },
      {
        id: "requested",
        header: t("barter.columns.requested"),
        cell: ({ row }) => <ItemStack items={sideItems(row.original, "REQUESTED")} className="min-w-44 max-w-60" />,
        enableSorting: false,
        meta: { label: t("barter.columns.requested") },
      },
      {
        id: "status",
        header: ({ column }) => <ColumnHeader column={column} title={t("barter.columns.status")} />,
        cell: ({ row }) => <StatusBadge kind="barterStatus" value={row.original.status} />,
        meta: { label: t("barter.columns.status") },
      },
      {
        id: "createdAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("barter.columns.createdAt")} />,
        cell: ({ row }) => <DateCell value={row.original.createdAt} />,
        meta: { label: t("barter.columns.createdAt") },
      },
      {
        id: "updatedAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("barter.columns.updatedAt")} />,
        cell: ({ row }) => <DateCell value={row.original.updatedAt} />,
        meta: { label: t("barter.columns.updatedAt") },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("common.table.actions")}</span>,
        cell: ({ row }) => (
          <RowActions actions={[{ label: t("barter.actions.view"), icon: <Eye />, onSelect: () => router.push(`/admin/barter-requests/${row.original.id}`) }]} />
        ),
        enableSorting: false,
        enableHiding: false,
        meta: { className: "w-10" },
      },
    ],
    [t, router],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("barter.title")} description={t("barter.subtitle")} />
      <div className="flex items-start gap-3 rounded-xl border bg-info/5 p-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <p>
          <span className="font-medium">{t("barter.readOnlyTitle")}.</span> <span className="text-muted-foreground">{t("barter.readOnlyHint")}</span>
        </p>
      </div>
      <DataTable
        columns={columns}
        data={query.data?.data}
        meta={query.data?.meta}
        getRowId={(b) => b.id}
        params={params}
        onParamsChange={setParams}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        searchPlaceholder={t("barter.searchPlaceholder")}
        storageKey="barter-requests"
        initialColumnVisibility={{ updatedAt: false }}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
        onRowClick={(b) => router.push(`/admin/barter-requests/${b.id}`)}
        filters={
          <>
            <FacetedFilter
              title={t("barter.filters.status")}
              value={f.status}
              onChange={(status) => setParams({ filters: { status } })}
              options={BARTER_REQUEST_STATUSES.map((s) => ({ value: s, label: t(`enums.barterStatus.${s}`) }))}
            />
            <FacetedFilter
              title={t("barter.filters.shape")}
              value={f.shape}
              onChange={(shape) => setParams({ filters: { shape } })}
              options={[
                { value: "1:1", label: t("barter.filters.shapeOneToOne") },
                { value: "multi", label: t("barter.filters.shapeMulti") },
              ]}
            />
            <DateRangeFilter title={t("barter.filters.created")} from={f.from} to={f.to} onChange={({ from, to }) => setParams({ filters: { from, to } })} />
          </>
        }
        mobileCard={(b) => (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs">{b.code}</span>
              <StatusBadge kind="barterStatus" value={b.status} />
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
              <div className="min-w-0 space-y-1.5">
                <p className="truncate text-xs font-medium">{b.sender.fullName}</p>
                <ItemStack items={sideItems(b, "OFFERED")} />
              </div>
              <ArrowLeftRight className="mt-6 size-4 text-muted-foreground" aria-hidden />
              <div className="min-w-0 space-y-1.5">
                <p className="truncate text-xs font-medium">{b.receiver.fullName}</p>
                <ItemStack items={sideItems(b, "REQUESTED")} />
              </div>
            </div>
            <DateCell value={b.createdAt} className="text-xs text-muted-foreground" />
          </div>
        )}
      />
    </div>
  );
}
