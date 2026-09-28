"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DateCell, UserAvatar } from "@/components/common/cells";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { Pill } from "@/components/common/status-badge";
import { ColumnHeader } from "@/components/tables/column-header";
import { DataTable } from "@/components/tables/data-table";
import { DateRangeFilter, FacetedFilter, type FilterOption } from "@/components/tables/filters";
import { useAdminsList } from "@/hooks/use-admins";
import { useAuditActions, useAuditList } from "@/hooks/use-audit";
import { useListParams } from "@/hooks/use-list-params";
import { useCan } from "@/hooks/use-session";
import { useT } from "@/lib/i18n/provider";
import { AUDIT_ENTITY_TYPES, type AuditLog } from "@/types";
import { AuditDetailSheet } from "./audit-detail-sheet";
import { AuditEntityBadge, auditEntityHref, useAuditEntityLabel, useAuditSentence } from "./audit-utils";

const FILTER_KEYS = ["adminId", "action", "entityType", "from", "to"] as const;
const ADMIN_OPTIONS_PARAMS = { page: 1, limit: 100, sort: "fullName", order: "asc" as const };

export function AuditLogsPage() {
  const t = useT();
  const { params, setParams, resetFilters, activeFilterCount } = useListParams({ sort: "createdAt", order: "desc" }, FILTER_KEYS);
  const query = useAuditList(params);
  const canReadAdmins = useCan("admins.read");
  const adminsQuery = useAdminsList(ADMIN_OPTIONS_PARAMS, canReadAdmins);
  const actionsQuery = useAuditActions();
  const sentence = useAuditSentence();
  const entityLabel = useAuditEntityLabel();
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const f = params.filters ?? {};

  const actionOptions = useMemo<FilterOption[]>(() => {
    const actions = actionsQuery.data ?? [];
    const groups = [...new Set(actions.map((a) => a.split(".")[0]))];
    return [
      ...groups.map((g) => ({ value: `${g}.`, label: t("audit.filters.allOf", { group: g }), text: g })),
      ...actions.map((a) => ({ value: a, label: <code className="font-mono text-xs">{a}</code>, text: a })),
    ];
  }, [actionsQuery.data, t]);

  const columns = useMemo<ColumnDef<AuditLog>[]>(
    () => [
      {
        id: "createdAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("audit.columns.date")} />,
        cell: ({ row }) => <DateCell value={row.original.createdAt} mode="datetime" />,
        enableHiding: false,
      },
      {
        id: "admin",
        header: t("audit.columns.admin"),
        cell: ({ row }) => (
          <span className="flex min-w-36 items-center gap-2">
            <UserAvatar name={row.original.admin.fullName} src={row.original.admin.avatar} className="size-7" />
            <span className="min-w-0">
              <span className="block truncate font-medium">{row.original.admin.fullName}</span>
              <span className="block truncate text-xs text-muted-foreground">{t(`enums.adminRole.${row.original.admin.role}`)}</span>
            </span>
          </span>
        ),
        enableSorting: false,
        meta: { label: t("audit.columns.admin") },
      },
      {
        id: "action",
        header: ({ column }) => <ColumnHeader column={column} title={t("audit.columns.action")} />,
        cell: ({ row }) => (
          <div className="max-w-md min-w-56 space-y-0.5">
            <p className="line-clamp-2">{sentence(row.original)}</p>
            {row.original.reason && <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.reason}</p>}
          </div>
        ),
        enableHiding: false,
      },
      {
        id: "entityType",
        header: t("audit.columns.entityType"),
        cell: ({ row }) => <AuditEntityBadge type={row.original.entityType} />,
        enableSorting: false,
        meta: { label: t("audit.columns.entityType") },
      },
      {
        id: "entity",
        header: t("audit.columns.entity"),
        cell: ({ row }) => <EntityLink log={row.original} label={entityLabel(row.original)} />,
        enableSorting: false,
        meta: { label: t("audit.columns.entity") },
      },
      {
        id: "ip",
        header: t("audit.columns.ip"),
        cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.ipAddress}</span>,
        enableSorting: false,
        meta: { label: t("audit.columns.ip") },
      },
    ],
    [t, sentence, entityLabel],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("audit.title")}
        description={t("audit.subtitle")}
        meta={
          <Pill tone="muted">
            <Lock className="size-3" /> {t("audit.readOnly")}
          </Pill>
        }
      />
      <DataTable
        columns={columns}
        data={query.data?.data}
        meta={query.data?.meta}
        getRowId={(l) => l.id}
        params={params}
        onParamsChange={setParams}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        searchPlaceholder={t("audit.searchPlaceholder")}
        storageKey="audit-logs"
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
        onRowClick={setSelected}
        emptyState={<EmptyState title={t("audit.empty.title")} description={t("audit.empty.description")} />}
        filters={
          <>
            {canReadAdmins && (
              <FacetedFilter
                title={t("audit.filters.admin")}
                value={f.adminId}
                onChange={(adminId) => setParams({ filters: { adminId } })}
                searchable
                options={(adminsQuery.data?.data ?? []).map((a) => ({
                  value: a.id,
                  label: `${a.firstName} ${a.lastName}`,
                  text: `${a.firstName} ${a.lastName} ${a.email}`,
                }))}
              />
            )}
            <FacetedFilter title={t("audit.filters.action")} value={f.action} onChange={(action) => setParams({ filters: { action } })} searchable options={actionOptions} />
            <FacetedFilter
              title={t("audit.filters.entity")}
              value={f.entityType}
              onChange={(entityType) => setParams({ filters: { entityType } })}
              options={AUDIT_ENTITY_TYPES.map((e) => ({ value: e, label: t(`enums.auditEntity.${e}`) }))}
            />
            <DateRangeFilter title={t("audit.filters.date")} from={f.from} to={f.to} onChange={({ from, to }) => setParams({ filters: { from, to } })} />
          </>
        }
        mobileCard={(l) => (
          <div className="space-y-2">
            <p className="text-sm">{sentence(l)}</p>
            {l.reason && <p className="line-clamp-2 text-xs text-muted-foreground">{l.reason}</p>}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <AuditEntityBadge type={l.entityType} />
              <DateCell value={l.createdAt} />
              <span className="font-mono">{l.ipAddress}</span>
            </div>
          </div>
        )}
      />
      <AuditDetailSheet log={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}

function EntityLink({ log, label }: { log: AuditLog; label: string }) {
  const href = auditEntityHref(log);
  if (!href) return <span className="block max-w-48 truncate text-muted-foreground">{label}</span>;
  return (
    <Link href={href} onClick={(e) => e.stopPropagation()} className="block max-w-48 truncate text-primary hover:underline" title={label}>
      {label}
    </Link>
  );
}
