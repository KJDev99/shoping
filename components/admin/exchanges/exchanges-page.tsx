"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeftRight, Ban, Eye, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ItemStack } from "@/components/admin/barter/barter-shared";
import { DateCell, UserCell } from "@/components/common/cells";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { ColumnHeader } from "@/components/tables/column-header";
import { DataTable } from "@/components/tables/data-table";
import { DateRangeFilter, FacetedFilter } from "@/components/tables/filters";
import { RowActions } from "@/components/tables/row-actions";
import { useExchangesList } from "@/hooks/use-exchanges";
import { useListParams } from "@/hooks/use-list-params";
import { useT } from "@/lib/i18n/provider";
import { EXCHANGE_STATUSES, type Exchange } from "@/types";
import { CancelExchangeDialog } from "./cancel-exchange-dialog";

const FILTER_KEYS = ["status", "from", "to", "disputed", "userId"] as const;

export function canCancelExchange(e: Pick<Exchange, "status">) {
  return e.status !== "COMPLETED" && e.status !== "CANCELLED";
}

function ExchangeRowActions({ exchange, onCancel }: { exchange: Exchange; onCancel: (e: Exchange) => void }) {
  const t = useT();
  const router = useRouter();
  return (
    <RowActions
      actions={[
        { label: t("exchanges.actions.view"), icon: <Eye />, onSelect: () => router.push(`/admin/exchanges/${exchange.id}`) },
        {
          label: t("exchanges.actions.openDispute"),
          icon: <Scale />,
          onSelect: () => router.push(`/admin/exchanges/${exchange.id}/dispute`),
          hidden: !exchange.disputeId,
          permission: "disputes.manage",
        },
        {
          label: t("exchanges.actions.cancel"),
          icon: <Ban />,
          onSelect: () => onCancel(exchange),
          hidden: !canCancelExchange(exchange),
          permission: "exchanges.manage",
          destructive: true,
          separator: true,
        },
      ]}
    />
  );
}

export function ExchangesPage() {
  const t = useT();
  const router = useRouter();
  const { params, setParams, resetFilters, activeFilterCount } = useListParams({ sort: "createdAt", order: "desc" }, FILTER_KEYS);
  const query = useExchangesList(params);
  const [cancelling, setCancelling] = useState<Exchange | null>(null);
  const f = params.filters ?? {};

  const columns = useMemo<ColumnDef<Exchange>[]>(
    () => [
      {
        id: "code",
        header: t("exchanges.columns.id"),
        cell: ({ row }) => <span className="font-mono text-xs whitespace-nowrap">{row.original.code}</span>,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "userA",
        header: t("exchanges.columns.userA"),
        cell: ({ row }) => <UserCell user={row.original.participants[0].user} className="min-w-40" />,
        enableSorting: false,
        meta: { label: t("exchanges.columns.userA") },
      },
      {
        id: "itemsA",
        header: t("exchanges.columns.itemsA"),
        cell: ({ row }) => <ItemStack items={row.original.participants[0].items} className="min-w-44 max-w-60" />,
        enableSorting: false,
        meta: { label: t("exchanges.columns.itemsA") },
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
        id: "userB",
        header: t("exchanges.columns.userB"),
        cell: ({ row }) => <UserCell user={row.original.participants[1].user} className="min-w-40" />,
        enableSorting: false,
        meta: { label: t("exchanges.columns.userB") },
      },
      {
        id: "itemsB",
        header: t("exchanges.columns.itemsB"),
        cell: ({ row }) => <ItemStack items={row.original.participants[1].items} className="min-w-44 max-w-60" />,
        enableSorting: false,
        meta: { label: t("exchanges.columns.itemsB") },
      },
      {
        id: "status",
        header: t("exchanges.columns.status"),
        cell: ({ row }) => <StatusBadge kind="exchangeStatus" value={row.original.status} />,
        enableSorting: false,
        meta: { label: t("exchanges.columns.status") },
      },
      {
        id: "createdAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("exchanges.columns.createdAt")} />,
        cell: ({ row }) => <DateCell value={row.original.createdAt} />,
        meta: { label: t("exchanges.columns.createdAt") },
      },
      {
        id: "completedAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("exchanges.columns.completedAt")} />,
        cell: ({ row }) => (row.original.completedAt ? <DateCell value={row.original.completedAt} /> : <span className="text-muted-foreground">—</span>),
        meta: { label: t("exchanges.columns.completedAt") },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("common.table.actions")}</span>,
        cell: ({ row }) => <ExchangeRowActions exchange={row.original} onCancel={setCancelling} />,
        enableSorting: false,
        enableHiding: false,
        meta: { className: "w-10" },
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("exchanges.title")} description={t("exchanges.subtitle")} />
      <DataTable
        columns={columns}
        data={query.data?.data}
        meta={query.data?.meta}
        getRowId={(e) => e.id}
        params={params}
        onParamsChange={setParams}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        searchPlaceholder={t("exchanges.searchPlaceholder")}
        storageKey="exchanges"
        initialColumnVisibility={{ completedAt: false }}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
        onRowClick={(e) => router.push(`/admin/exchanges/${e.id}`)}
        filters={
          <>
            <FacetedFilter
              title={t("exchanges.filters.status")}
              value={f.status}
              onChange={(status) => setParams({ filters: { status } })}
              options={EXCHANGE_STATUSES.map((s) => ({ value: s, label: t(`enums.exchangeStatus.${s}`) }))}
            />
            <FacetedFilter
              title={t("exchanges.filters.disputed")}
              value={f.disputed}
              // Single choice: keep only the latest selection.
              onChange={(v) => setParams({ filters: { disputed: v?.split(",").filter((x) => x !== f.disputed).pop() } })}
              options={[
                { value: "true", label: t("exchanges.filters.withDispute") },
                { value: "false", label: t("exchanges.filters.withoutDispute") },
              ]}
            />
            <DateRangeFilter title={t("exchanges.filters.date")} from={f.from} to={f.to} onChange={({ from, to }) => setParams({ filters: { from, to } })} />
          </>
        }
        mobileCard={(e) => {
          const [a, b] = e.participants;
          return (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs">{e.code}</span>
                <div className="flex items-center gap-1">
                  <StatusBadge kind="exchangeStatus" value={e.status} />
                  <ExchangeRowActions exchange={e} onCancel={setCancelling} />
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
                <div className="min-w-0 space-y-1.5">
                  <p className="truncate text-xs font-medium">{a.user.fullName}</p>
                  <ItemStack items={a.items} />
                </div>
                <ArrowLeftRight className="mt-6 size-4 text-muted-foreground" aria-hidden />
                <div className="min-w-0 space-y-1.5">
                  <p className="truncate text-xs font-medium">{b.user.fullName}</p>
                  <ItemStack items={b.items} />
                </div>
              </div>
              <DateCell value={e.completedAt ?? e.createdAt} className="text-xs text-muted-foreground" />
            </div>
          );
        }}
      />
      <CancelExchangeDialog exchange={cancelling} onClose={() => setCancelling(null)} />
    </div>
  );
}
