"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Eye, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { DateCell, NumberCell, UserAvatar } from "@/components/common/cells";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { ColumnHeader } from "@/components/tables/column-header";
import { DataTable } from "@/components/tables/data-table";
import { DateRangeFilter, FacetedFilter } from "@/components/tables/filters";
import { RowActions } from "@/components/tables/row-actions";
import { Button } from "@/components/ui/button";
import { useListParams } from "@/hooks/use-list-params";
import { useNotificationActions, useNotificationsList } from "@/hooks/use-notifications";
import { useCan } from "@/hooks/use-session";
import { useT } from "@/lib/i18n/provider";
import { NOTIFICATION_STATUSES, NOTIFICATION_TYPES, type Notification } from "@/types";
import { NotificationDetailSheet } from "./notification-detail-sheet";
import { NotificationSendSheet } from "./notification-send-sheet";
import { ChannelPills, ReadRate, useTargetSummary } from "./notification-utils";

const FILTER_KEYS = ["status", "type", "targetKind", "from", "to"] as const;
const TARGET_KINDS = ["ALL", "USERS", "REGION", "SEGMENT"] as const;

export function NotificationsPage() {
  const t = useT();
  const canSend = useCan("notifications.send");
  const { params, setParams, resetFilters, activeFilterCount } = useListParams({ sort: "createdAt", order: "desc" }, FILTER_KEYS);
  const query = useNotificationsList(params);
  const { cancel } = useNotificationActions();
  const summary = useTargetSummary();
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState<Notification | null>(null);
  const [cancelling, setCancelling] = useState<Notification | null>(null);
  const f = params.filters ?? {};

  const columns = useMemo<ColumnDef<Notification>[]>(
    () => [
      {
        id: "title",
        header: ({ column }) => <ColumnHeader column={column} title={t("notifications.columns.title")} />,
        cell: ({ row }) => (
          <div className="max-w-80 min-w-48">
            <p className="truncate font-medium">{row.original.title}</p>
            <p className="truncate text-xs text-muted-foreground">{row.original.message}</p>
          </div>
        ),
        enableHiding: false,
      },
      {
        id: "type",
        header: t("notifications.columns.type"),
        cell: ({ row }) => <StatusBadge kind="notificationType" value={row.original.type} dot={false} />,
        enableSorting: false,
        meta: { label: t("notifications.columns.type") },
      },
      {
        id: "target",
        header: t("notifications.columns.target"),
        cell: ({ row }) => <span className="block max-w-48 truncate">{summary(row.original.target)}</span>,
        enableSorting: false,
        meta: { label: t("notifications.columns.target") },
      },
      {
        id: "channels",
        header: t("notifications.columns.channels"),
        cell: ({ row }) => <ChannelPills channels={row.original.channels} />,
        enableSorting: false,
        meta: { label: t("notifications.columns.channels") },
      },
      {
        id: "status",
        header: t("notifications.columns.status"),
        cell: ({ row }) => <StatusBadge kind="notificationStatus" value={row.original.status} />,
        enableSorting: false,
        meta: { label: t("notifications.columns.status") },
      },
      {
        id: "recipientsCount",
        header: ({ column }) => <ColumnHeader column={column} title={t("notifications.columns.recipients")} />,
        cell: ({ row }) => <NumberCell value={row.original.recipientsCount} />,
        meta: { label: t("notifications.columns.recipients"), className: "text-right", headerClassName: "text-right" },
      },
      {
        id: "readRate",
        header: ({ column }) => <ColumnHeader column={column} title={t("notifications.columns.readRate")} />,
        cell: ({ row }) => <ReadRate notification={row.original} />,
        meta: { label: t("notifications.columns.readRate") },
      },
      {
        id: "scheduledAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("notifications.columns.scheduledAt")} />,
        cell: ({ row }) => <DateCell value={row.original.sentAt ?? row.original.scheduledAt} mode="datetime" />,
        meta: { label: t("notifications.columns.scheduledAt") },
      },
      {
        id: "createdBy",
        header: t("notifications.columns.createdBy"),
        cell: ({ row }) => (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <UserAvatar name={row.original.createdBy.fullName} src={row.original.createdBy.avatar} className="size-6" />
            {row.original.createdBy.fullName}
          </span>
        ),
        enableSorting: false,
        meta: { label: t("notifications.columns.createdBy") },
      },
      {
        id: "createdAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("notifications.columns.createdAt")} />,
        cell: ({ row }) => <DateCell value={row.original.createdAt} />,
        meta: { label: t("notifications.columns.createdAt") },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("common.table.actions")}</span>,
        cell: ({ row }) => (
          <RowActions
            actions={[
              { label: t("notifications.actions.view"), icon: <Eye />, onSelect: () => setSelected(row.original) },
              {
                label: t("notifications.actions.cancel"),
                icon: <Ban />,
                onSelect: () => setCancelling(row.original),
                permission: "notifications.send",
                hidden: row.original.status !== "SCHEDULED" && row.original.status !== "DRAFT",
                destructive: true,
                separator: true,
              },
            ]}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        meta: { className: "w-10" },
      },
    ],
    [t, summary],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("notifications.title")}
        description={t("notifications.subtitle")}
        actions={
          canSend && (
            <Button onClick={() => setSending(true)}>
              <Send /> {t("notifications.send")}
            </Button>
          )
        }
      />
      <DataTable
        columns={columns}
        data={query.data?.data}
        meta={query.data?.meta}
        getRowId={(n) => n.id}
        params={params}
        onParamsChange={setParams}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        searchPlaceholder={t("notifications.searchPlaceholder")}
        storageKey="notifications"
        initialColumnVisibility={{ createdBy: false, createdAt: false }}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
        onRowClick={setSelected}
        emptyState={
          activeFilterCount ? undefined : (
            <EmptyState
              title={t("notifications.empty.title")}
              description={t("notifications.empty.description")}
              action={
                canSend && (
                  <Button onClick={() => setSending(true)}>
                    <Send /> {t("notifications.send")}
                  </Button>
                )
              }
            />
          )
        }
        filters={
          <>
            <FacetedFilter
              title={t("notifications.filters.status")}
              value={f.status}
              onChange={(status) => setParams({ filters: { status } })}
              options={NOTIFICATION_STATUSES.map((s) => ({ value: s, label: t(`enums.notificationStatus.${s}`) }))}
            />
            <FacetedFilter
              title={t("notifications.filters.type")}
              value={f.type}
              onChange={(type) => setParams({ filters: { type } })}
              options={NOTIFICATION_TYPES.map((s) => ({ value: s, label: t(`enums.notificationType.${s}`) }))}
            />
            <FacetedFilter
              title={t("notifications.filters.target")}
              value={f.targetKind}
              onChange={(targetKind) => setParams({ filters: { targetKind } })}
              options={TARGET_KINDS.map((k) => ({ value: k, label: t(`notifications.target.${k}`) }))}
            />
            <DateRangeFilter title={t("notifications.filters.created")} from={f.from} to={f.to} onChange={({ from, to }) => setParams({ filters: { from, to } })} />
          </>
        }
        mobileCard={(n) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{n.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
              </div>
              <StatusBadge kind="notificationStatus" value={n.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <StatusBadge kind="notificationType" value={n.type} dot={false} />
              <span>{summary(n.target)}</span>
              <span>· {t("notifications.columns.recipients")}: {n.recipientsCount}</span>
              <DateCell value={n.sentAt ?? n.scheduledAt ?? n.createdAt} />
            </div>
            <ReadRate notification={n} />
          </div>
        )}
      />
      <NotificationSendSheet open={sending} onOpenChange={setSending} />
      <NotificationDetailSheet notification={selected} onOpenChange={(o) => !o && setSelected(null)} onCancel={setCancelling} />
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        title={t("notifications.cancelDialog.title", { title: cancelling?.title ?? "" })}
        description={t("notifications.cancelDialog.description")}
        confirmLabel={t("notifications.cancelDialog.confirm")}
        variant="destructive"
        onConfirm={async () => {
          if (!cancelling) return;
          await cancel.mutateAsync({ id: cancelling.id });
          setSelected(null);
        }}
      />
    </div>
  );
}
