"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, UserCheck, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { CopyId, DateCell, UserAvatar, UserCell } from "@/components/common/cells";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { ColumnHeader } from "@/components/tables/column-header";
import { DataTable } from "@/components/tables/data-table";
import { DateRangeFilter, FacetedFilter } from "@/components/tables/filters";
import { RowActions } from "@/components/tables/row-actions";
import { Button } from "@/components/ui/button";
import { useListParams } from "@/hooks/use-list-params";
import { useReportsList } from "@/hooks/use-reports";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { REPORT_REASONS, REPORT_STATUSES, REPORT_TARGET_TYPES, type Report } from "@/types";
import { useReportActionDialogs, type ReportAction } from "./report-action-dialogs";
import { ReportTargetCell } from "./report-target";

const FILTER_KEYS = ["status", "targetType", "reason", "from", "to", "assignedToMe"] as const;

function AssignedCell({ report }: { report: Report }) {
  const t = useT();
  if (!report.assignedTo) return <span className="text-muted-foreground">{t("reports.unassigned")}</span>;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <UserAvatar name={report.assignedTo.fullName} src={report.assignedTo.avatar} className="size-6" />
      <span className="truncate text-sm">{report.assignedTo.fullName}</span>
    </span>
  );
}

function ReportRowActions({ report, open, myId }: { report: Report; open: (action: ReportAction, target: { report: Report }) => void; myId: string | undefined }) {
  const t = useT();
  const router = useRouter();
  const isOpen = report.status === "NEW" || report.status === "REVIEWING";
  const mine = report.assignedTo?.id === myId;
  return (
    <RowActions
      actions={[
        { label: t("reports.actions.open"), icon: <Eye />, onSelect: () => router.push(`/admin/reports/${report.id}`) },
        {
          label: report.status === "REVIEWING" ? t("reports.actions.takeOver") : t("reports.actions.review"),
          icon: <UserCheck />,
          onSelect: () => open("review", { report }),
          permission: "reports.resolve",
          hidden: !isOpen || (report.status === "REVIEWING" && mine),
          separator: true,
        },
      ]}
    />
  );
}

export function ReportsPage() {
  const t = useT();
  const router = useRouter();
  const session = useSession();
  const myId = session.data?.admin.id;
  const { params, setParams, resetFilters, activeFilterCount } = useListParams({ sort: "createdAt", order: "desc" }, FILTER_KEYS);
  const query = useReportsList(params);
  const { open, dialogs } = useReportActionDialogs();
  const f = params.filters ?? {};
  const assignedToMe = f.assignedToMe === "true";

  const columns = useMemo<ColumnDef<Report>[]>(
    () => [
      {
        id: "code",
        header: t("reports.columns.id"),
        cell: ({ row }) => <CopyId value={row.original.id} display={row.original.code} />,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "target",
        header: t("reports.columns.target"),
        cell: ({ row }) => <ReportTargetCell target={row.original.target} className="max-w-64 min-w-48" />,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "reason",
        header: t("reports.columns.reason"),
        cell: ({ row }) => <StatusBadge kind="reportReason" value={row.original.reason} dot={false} />,
        enableSorting: false,
        meta: { label: t("reports.columns.reason") },
      },
      {
        id: "reporter",
        header: t("reports.columns.reporter"),
        cell: ({ row }) => <UserCell user={row.original.reporter} className="min-w-40" />,
        enableSorting: false,
        meta: { label: t("reports.columns.reporter") },
      },
      {
        id: "status",
        header: ({ column }) => <ColumnHeader column={column} title={t("reports.columns.status")} />,
        cell: ({ row }) => <StatusBadge kind="reportStatus" value={row.original.status} />,
        meta: { label: t("reports.columns.status") },
      },
      {
        id: "assigned",
        header: t("reports.columns.assigned"),
        cell: ({ row }) => <AssignedCell report={row.original} />,
        enableSorting: false,
        meta: { label: t("reports.columns.assigned") },
      },
      {
        id: "createdAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("reports.columns.createdAt")} />,
        cell: ({ row }) => <DateCell value={row.original.createdAt} />,
        meta: { label: t("reports.columns.createdAt") },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("common.table.actions")}</span>,
        cell: ({ row }) => <ReportRowActions report={row.original} open={open} myId={myId} />,
        enableSorting: false,
        enableHiding: false,
        meta: { className: "w-10" },
      },
    ],
    [t, open, myId],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("reports.title")} description={t("reports.subtitle")} />
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
        searchPlaceholder={t("reports.searchPlaceholder")}
        storageKey="reports"
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
        onRowClick={(r) => router.push(`/admin/reports/${r.id}`)}
        filters={
          <>
            <FacetedFilter
              title={t("reports.filters.status")}
              value={f.status}
              onChange={(status) => setParams({ filters: { status } })}
              options={REPORT_STATUSES.map((s) => ({ value: s, label: t(`enums.reportStatus.${s}`) }))}
            />
            <FacetedFilter
              title={t("reports.filters.type")}
              value={f.targetType}
              onChange={(targetType) => setParams({ filters: { targetType } })}
              options={REPORT_TARGET_TYPES.map((s) => ({ value: s, label: t(`enums.reportTarget.${s}`) }))}
            />
            <FacetedFilter
              title={t("reports.filters.reason")}
              value={f.reason}
              onChange={(reason) => setParams({ filters: { reason } })}
              options={REPORT_REASONS.map((s) => ({ value: s, label: t(`enums.reportReason.${s}`) }))}
            />
            <DateRangeFilter title={t("reports.filters.created")} from={f.from} to={f.to} onChange={({ from, to }) => setParams({ filters: { from, to } })} />
            <Button
              variant="outline"
              size="sm"
              aria-pressed={assignedToMe}
              className={cn("border-dashed", assignedToMe && "border-solid border-primary/50 bg-primary/10 text-primary hover:bg-primary/15")}
              onClick={() => setParams({ filters: { assignedToMe: assignedToMe ? undefined : "true" } })}
            >
              <UserRoundCheck className="opacity-70" />
              {t("reports.filters.assignedToMe")}
            </Button>
          </>
        }
        mobileCard={(r) => (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <ReportTargetCell target={r.target} link={false} />
              <ReportRowActions report={r} open={open} myId={myId} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-mono">{r.code}</span>
              <StatusBadge kind="reportStatus" value={r.status} />
              <StatusBadge kind="reportReason" value={r.reason} dot={false} />
              <DateCell value={r.createdAt} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <UserCell user={r.reporter} link={false} />
              <AssignedCell report={r} />
            </div>
          </div>
        )}
      />
      {dialogs}
    </div>
  );
}
