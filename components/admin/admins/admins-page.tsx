"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Pencil, Plus, ShieldCheck, UserCog } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { DateCell, UserAvatar } from "@/components/common/cells";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { Pill, StatusBadge } from "@/components/common/status-badge";
import { ColumnHeader } from "@/components/tables/column-header";
import { DataTable } from "@/components/tables/data-table";
import { FacetedFilter } from "@/components/tables/filters";
import { RowActions, type RowAction } from "@/components/tables/row-actions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminsList } from "@/hooks/use-admins";
import { useListParams } from "@/hooks/use-list-params";
import { useCan, useSession } from "@/hooks/use-session";
import { useT } from "@/lib/i18n/provider";
import { ADMIN_ROLES, ADMIN_STATUSES, type Admin } from "@/types";
import { useAdminDialogs, type AdminAction } from "./admin-action-dialogs";
import { PermissionMatrix } from "./permission-matrix";

const FILTER_KEYS = ["role", "status"] as const;
type Tab = "admins" | "roles";

export function AdminsPage() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "roles" ? "roles" : "admins";
  const canManage = useCan("admins.manage");
  const { open, openCreate, dialogs } = useAdminDialogs();

  const setTab = (next: Tab) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (next === "admins") sp.delete("tab");
    else sp.set("tab", next);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admins.title")}
        description={t("admins.subtitle")}
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus /> {t("admins.create")}
            </Button>
          )
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="admins">
            <UserCog /> {t("admins.tabs.admins")}
          </TabsTrigger>
          <TabsTrigger value="roles">
            <ShieldCheck /> {t("admins.tabs.roles")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="admins" className="mt-4 space-y-3">
          {!canManage && <p className="text-sm text-muted-foreground">{t("admins.readOnlyHint")}</p>}
          <AdminsTable open={open} />
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          <PermissionMatrix />
        </TabsContent>
      </Tabs>
      {dialogs}
    </div>
  );
}

function useAdminActionItems(admin: Admin, open: (action: AdminAction, admin: Admin) => void, selfId: string | undefined): RowAction[] {
  const t = useT();
  const self = admin.id === selfId;
  return [
    { label: t("admins.actions.edit"), icon: <Pencil />, onSelect: () => open("edit", admin), permission: "admins.manage" },
    { label: t("admins.actions.changeRole"), icon: <ShieldCheck />, onSelect: () => open("role", admin), permission: "admins.manage", hidden: self },
    {
      label: t("admins.actions.block"),
      icon: <Ban />,
      onSelect: () => open("block", admin),
      permission: "admins.manage",
      hidden: self || admin.status === "BLOCKED",
      destructive: true,
      separator: true,
    },
    {
      label: t("admins.actions.activate"),
      icon: <ShieldCheck />,
      onSelect: () => open("activate", admin),
      permission: "admins.manage",
      hidden: admin.status !== "BLOCKED",
      separator: true,
    },
  ];
}

function AdminRowActions({ admin, open, selfId }: { admin: Admin; open: (action: AdminAction, admin: Admin) => void; selfId: string | undefined }) {
  return <RowActions actions={useAdminActionItems(admin, open, selfId)} />;
}

function AdminIdentity({ admin, selfId }: { admin: Admin; selfId: string | undefined }) {
  const t = useT();
  const name = `${admin.firstName} ${admin.lastName}`;
  return (
    <span className="flex min-w-44 items-center gap-2.5">
      <UserAvatar name={name} src={admin.avatar} className="size-8" />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-medium">{name}</span>
          {admin.id === selfId && <Pill tone="primary">{t("admins.you")}</Pill>}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{admin.phone}</span>
      </span>
    </span>
  );
}

function AdminsTable({ open }: { open: (action: AdminAction, admin: Admin) => void }) {
  const t = useT();
  const selfId = useSession().data?.admin.id;
  const canManage = useCan("admins.manage");
  const { params, setParams, resetFilters, activeFilterCount } = useListParams({ sort: "createdAt", order: "desc" }, FILTER_KEYS);
  const query = useAdminsList(params);
  const f = params.filters ?? {};

  const columns = useMemo<ColumnDef<Admin>[]>(
    () => [
      {
        id: "fullName",
        header: ({ column }) => <ColumnHeader column={column} title={t("admins.columns.admin")} />,
        cell: ({ row }) => <AdminIdentity admin={row.original} selfId={selfId} />,
        enableHiding: false,
      },
      {
        id: "email",
        header: ({ column }) => <ColumnHeader column={column} title={t("admins.columns.email")} />,
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
        meta: { label: t("admins.columns.email") },
      },
      {
        id: "role",
        header: ({ column }) => <ColumnHeader column={column} title={t("admins.columns.role")} />,
        cell: ({ row }) => <StatusBadge kind="adminRole" value={row.original.role} dot={false} />,
        meta: { label: t("admins.columns.role") },
      },
      {
        id: "status",
        header: t("admins.columns.status"),
        cell: ({ row }) => <StatusBadge kind="adminStatus" value={row.original.status} />,
        enableSorting: false,
        meta: { label: t("admins.columns.status") },
      },
      {
        id: "lastLoginAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("admins.columns.lastLogin")} />,
        cell: ({ row }) => <DateCell value={row.original.lastLoginAt} />,
        meta: { label: t("admins.columns.lastLogin") },
      },
      {
        id: "createdAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("admins.columns.createdAt")} />,
        cell: ({ row }) => <DateCell value={row.original.createdAt} mode="date" />,
        meta: { label: t("admins.columns.createdAt") },
      },
      ...(canManage
        ? [
            {
              id: "actions",
              header: () => <span className="sr-only">{t("common.table.actions")}</span>,
              cell: ({ row }) => <AdminRowActions admin={row.original} open={open} selfId={selfId} />,
              enableSorting: false,
              enableHiding: false,
              meta: { className: "w-10" },
            } satisfies ColumnDef<Admin>,
          ]
        : []),
    ],
    [t, selfId, canManage, open],
  );

  return (
    <DataTable
      columns={columns}
      data={query.data?.data}
      meta={query.data?.meta}
      getRowId={(a) => a.id}
      params={params}
      onParamsChange={setParams}
      isLoading={query.isPending}
      isFetching={query.isFetching}
      error={query.error}
      onRetry={() => query.refetch()}
      searchPlaceholder={t("admins.searchPlaceholder")}
      storageKey="admins"
      activeFilterCount={activeFilterCount}
      onResetFilters={resetFilters}
      emptyState={<EmptyState title={t("common.table.noResults")} description={t("common.table.noResultsHint")} />}
      filters={
        <>
          <FacetedFilter
            title={t("admins.filters.role")}
            value={f.role}
            onChange={(role) => setParams({ filters: { role } })}
            options={ADMIN_ROLES.map((r) => ({ value: r, label: t(`enums.adminRole.${r}`) }))}
          />
          <FacetedFilter
            title={t("admins.filters.status")}
            value={f.status}
            onChange={(status) => setParams({ filters: { status } })}
            options={ADMIN_STATUSES.map((s) => ({ value: s, label: t(`enums.adminStatus.${s}`) }))}
          />
        </>
      }
      mobileCard={(a) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <AdminIdentity admin={a} selfId={selfId} />
            <p className="truncate text-xs text-muted-foreground">{a.email}</p>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <StatusBadge kind="adminRole" value={a.role} dot={false} />
              <StatusBadge kind="adminStatus" value={a.status} />
              <DateCell value={a.lastLoginAt} />
            </div>
          </div>
          {canManage && <AdminRowActions admin={a} open={open} selfId={selfId} />}
        </div>
      )}
    />
  );
}
