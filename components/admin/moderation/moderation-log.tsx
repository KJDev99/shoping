"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";
import { DateCell, UserAvatar } from "@/components/common/cells";
import { Pill, StatusBadge } from "@/components/common/status-badge";
import { ColumnHeader } from "@/components/tables/column-header";
import { DataTable } from "@/components/tables/data-table";
import { DateRangeFilter, FacetedFilter } from "@/components/tables/filters";
import { useListParams } from "@/hooks/use-list-params";
import { useModerationAdmins, useModerationLog } from "@/hooks/use-moderation";
import { useT } from "@/lib/i18n/provider";
import { MODERATION_ACTION_TYPES, MODERATION_TARGET_TYPES, REJECTION_REASONS, type ModerationAction, type ModerationTargetType, type RejectionReason } from "@/types";

const FILTER_KEYS = ["action", "targetType", "adminId", "from", "to"] as const;
export const LOG_PARAM_PREFIX = "log_";

function targetHref(type: ModerationTargetType, id: string): string | null {
  switch (type) {
    case "LISTING":
      return `/admin/listings/${id}`;
    case "USER":
      return `/admin/users/${id}`;
    case "REPORT":
      return `/admin/reports/${id}`;
    case "BARTER_REQUEST":
      return `/admin/barter-requests/${id}`;
    case "EXCHANGE":
      return `/admin/exchanges/${id}`;
    case "REVIEW":
      return null;
  }
}

/** Reasons may start with a rejection-reason code ("SPAM: note"); show the translated label instead. */
function ReasonText({ reason, className }: { reason: string | null; className?: string }) {
  const t = useT();
  if (!reason) return <span className={className}>—</span>;
  const match = /^([A-Z_]+)(?::\s*([\s\S]*))?$/.exec(reason);
  const code = match?.[1];
  if (code && (REJECTION_REASONS as readonly string[]).includes(code)) {
    const label = t(`enums.rejectionReason.${code as RejectionReason}`);
    return <span className={className}>{match?.[2] ? `${label}: ${match[2]}` : label}</span>;
  }
  return <span className={className}>{reason}</span>;
}

function AdminCell({ admin }: { admin: ModerationAction["admin"] }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <UserAvatar name={admin.fullName} src={admin.avatar} className="size-7" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{admin.fullName}</span>
        <StatusBadge kind="adminRole" value={admin.role} dot={false} className="h-4 px-1.5 text-[10px]" />
      </span>
    </span>
  );
}

function TargetCell({ m }: { m: ModerationAction }) {
  const t = useT();
  const href = targetHref(m.targetType, m.targetId);
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <Pill tone="muted" className="w-fit">
        {t(`enums.moderationTarget.${m.targetType}`)}
      </Pill>
      {href ? (
        <Link href={href} className="truncate text-sm hover:underline" onClick={(e) => e.stopPropagation()}>
          {m.targetLabel}
        </Link>
      ) : (
        <span className="truncate text-sm">{m.targetLabel}</span>
      )}
    </span>
  );
}

/** Paginated log of every moderation action (server-side filters). */
export function ModerationLog() {
  const t = useT();
  const { params, setParams, resetFilters, activeFilterCount } = useListParams({ sort: "createdAt", order: "desc" }, FILTER_KEYS, LOG_PARAM_PREFIX);
  const query = useModerationLog(params);
  const admins = useModerationAdmins();
  const f = params.filters ?? {};

  const columns = useMemo<ColumnDef<ModerationAction>[]>(
    () => [
      {
        id: "admin",
        header: t("moderation.log.columns.admin"),
        cell: ({ row }) => <AdminCell admin={row.original.admin} />,
        enableSorting: false,
        enableHiding: false,
        meta: { className: "min-w-44" },
      },
      {
        id: "action",
        header: ({ column }) => <ColumnHeader column={column} title={t("moderation.log.columns.action")} />,
        cell: ({ row }) => <StatusBadge kind="moderationAction" value={row.original.action} />,
        meta: { label: t("moderation.log.columns.action") },
      },
      {
        id: "target",
        header: t("moderation.log.columns.target"),
        cell: ({ row }) => <TargetCell m={row.original} />,
        enableSorting: false,
        meta: { label: t("moderation.log.columns.target"), className: "max-w-72" },
      },
      {
        id: "reason",
        header: t("moderation.log.columns.reason"),
        cell: ({ row }) => <ReasonText reason={row.original.reason} className="line-clamp-2 max-w-80 text-sm text-muted-foreground" />,
        enableSorting: false,
        meta: { label: t("moderation.log.columns.reason") },
      },
      {
        id: "createdAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("moderation.log.columns.date")} />,
        cell: ({ row }) => <DateCell value={row.original.createdAt} mode="datetime" />,
        meta: { label: t("moderation.log.columns.date") },
      },
    ],
    [t],
  );

  return (
    <DataTable
      columns={columns}
      data={query.data?.data}
      meta={query.data?.meta}
      getRowId={(m) => m.id}
      params={params}
      onParamsChange={setParams}
      isLoading={query.isPending}
      isFetching={query.isFetching}
      error={query.error}
      onRetry={() => query.refetch()}
      searchPlaceholder={t("moderation.log.searchPlaceholder")}
      storageKey="moderation-log"
      activeFilterCount={activeFilterCount}
      onResetFilters={resetFilters}
      filters={
        <>
          <FacetedFilter
            title={t("moderation.log.filters.action")}
            value={f.action}
            onChange={(action) => setParams({ filters: { action } })}
            options={MODERATION_ACTION_TYPES.map((a) => ({ value: a, label: t(`enums.moderationAction.${a}`) }))}
          />
          <FacetedFilter
            title={t("moderation.log.filters.targetType")}
            value={f.targetType}
            onChange={(targetType) => setParams({ filters: { targetType } })}
            options={MODERATION_TARGET_TYPES.map((a) => ({ value: a, label: t(`enums.moderationTarget.${a}`) }))}
          />
          <FacetedFilter
            title={t("moderation.log.filters.admin")}
            value={f.adminId}
            onChange={(adminId) => setParams({ filters: { adminId } })}
            searchable
            options={(admins.data ?? []).map((a) => ({ value: a.id, label: a.fullName, text: a.fullName }))}
          />
          <DateRangeFilter title={t("moderation.log.filters.date")} from={f.from} to={f.to} onChange={({ from, to }) => setParams({ filters: { from, to } })} />
        </>
      }
      mobileCard={(m) => (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge kind="moderationAction" value={m.action} />
            <DateCell value={m.createdAt} className="text-xs text-muted-foreground" />
          </div>
          <TargetCell m={m} />
          {m.reason && <ReasonText reason={m.reason} className="line-clamp-2 block text-xs text-muted-foreground" />}
          <AdminCell admin={m.admin} />
        </div>
      )}
    />
  );
}
