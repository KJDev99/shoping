"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Check, Copy, Flag, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { CopyId, DateCell, ItemImage, NumberCell, UserCell } from "@/components/common/cells";
import { PageHeader } from "@/components/common/page-header";
import { Pill, StatusBadge } from "@/components/common/status-badge";
import { ColumnHeader } from "@/components/tables/column-header";
import { DataTable } from "@/components/tables/data-table";
import { DateRangeFilter, FacetedFilter } from "@/components/tables/filters";
import { Button } from "@/components/ui/button";
import { useListingsList } from "@/hooks/use-listings";
import { useListParams } from "@/hooks/use-list-params";
import { useLookupNames } from "@/hooks/use-lookups";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { ITEM_CONDITIONS, LISTING_STATUSES, type Listing } from "@/types";
import { useListingActionDialogs } from "./listing-action-dialogs";
import { ListingRowActions } from "./listing-row-actions";
import { useCategoryOptions } from "./use-category-options";

const FILTER_KEYS = ["status", "categoryId", "condition", "regionId", "from", "to", "reported", "duplicate", "deleted", "userId"] as const;

/** On/off filter chip stored as `"true"` in the URL. */
function ToggleFilter({ label, icon, active, onChange }: { label: string; icon: ReactNode; active: boolean; onChange: (active: boolean) => void }) {
  return (
    <Button
      variant={active ? "secondary" : "outline"}
      size="sm"
      aria-pressed={active}
      className={cn(!active && "border-dashed")}
      onClick={() => onChange(!active)}
    >
      {active ? <Check /> : icon}
      {label}
    </Button>
  );
}

export function ListingsPage() {
  const t = useT();
  const router = useRouter();
  const names = useLookupNames();
  const cats = useCategoryOptions();
  const { params, setParams, resetFilters, activeFilterCount } = useListParams({ sort: "createdAt", order: "desc" }, FILTER_KEYS);
  const query = useListingsList(params);
  const actionDialogs = useListingActionDialogs();
  const { dialogs } = actionDialogs;
  const f = params.filters ?? {};

  const columns = useMemo<ColumnDef<Listing>[]>(
    () => [
      {
        id: "image",
        header: () => <span className="sr-only">{t("listings.columns.image")}</span>,
        cell: ({ row }) => {
          const l = row.original;
          return (
            <div className="relative size-12 shrink-0">
              <ItemImage src={l.images[0]?.url} alt={l.title} className="size-12 rounded-md" />
              {l.video && (
                <span className="absolute right-0.5 bottom-0.5 rounded bg-background/90 p-0.5" title={t("listings.flags.video")}>
                  <Video className="size-3" aria-label={t("listings.flags.video")} />
                </span>
              )}
            </div>
          );
        },
        enableSorting: false,
        meta: { label: t("listings.columns.image"), className: "w-16" },
      },
      {
        id: "title",
        header: ({ column }) => <ColumnHeader column={column} title={t("listings.columns.title")} />,
        cell: ({ row }) => {
          const l = row.original;
          return (
            <div className="max-w-72 min-w-44 space-y-0.5">
              <Link href={`/admin/listings/${l.id}`} className="line-clamp-2 font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                {l.title}
              </Link>
              <div className="flex flex-wrap items-center gap-1.5">
                <CopyId value={l.code} />
                {l.possibleDuplicateOf && (
                  <Pill tone="warning">
                    <Copy className="size-3" aria-hidden />
                    {t("listings.flags.possibleDuplicate")}
                  </Pill>
                )}
              </div>
            </div>
          );
        },
        enableHiding: false,
      },
      {
        id: "owner",
        header: t("listings.columns.owner"),
        cell: ({ row }) => <UserCell user={row.original.owner} className="min-w-40" />,
        enableSorting: false,
        meta: { label: t("listings.columns.owner") },
      },
      {
        id: "category",
        header: t("listings.columns.category"),
        cell: ({ row }) => {
          const l = row.original;
          return (
            <div className="min-w-28">
              <span className="block whitespace-nowrap">{names.category(l.subcategoryId ?? l.categoryId)}</span>
              {l.subcategoryId && <span className="block text-xs whitespace-nowrap text-muted-foreground">{names.category(l.categoryId)}</span>}
            </div>
          );
        },
        enableSorting: false,
        meta: { label: t("listings.columns.category") },
      },
      {
        id: "condition",
        header: t("listings.columns.condition"),
        cell: ({ row }) => <StatusBadge kind="itemCondition" value={row.original.condition} dot={false} />,
        enableSorting: false,
        meta: { label: t("listings.columns.condition") },
      },
      {
        id: "location",
        header: t("listings.columns.location"),
        cell: ({ row }) => (
          <div className="min-w-28">
            <span className="block whitespace-nowrap">{names.region(row.original.regionId)}</span>
            {row.original.districtId && <span className="block text-xs whitespace-nowrap text-muted-foreground">{names.district(row.original.districtId)}</span>}
          </div>
        ),
        enableSorting: false,
        meta: { label: t("listings.columns.location") },
      },
      {
        id: "offersCount",
        header: ({ column }) => <ColumnHeader column={column} title={t("listings.columns.offers")} />,
        cell: ({ row }) => <NumberCell value={row.original.offersCount} />,
        meta: { label: t("listings.columns.offers"), className: "text-right", headerClassName: "text-right" },
      },
      {
        id: "views",
        header: ({ column }) => <ColumnHeader column={column} title={t("listings.columns.views")} />,
        cell: ({ row }) => <NumberCell value={row.original.views} />,
        meta: { label: t("listings.columns.views"), className: "text-right", headerClassName: "text-right" },
      },
      {
        id: "reportsCount",
        header: ({ column }) => <ColumnHeader column={column} title={t("listings.columns.reports")} />,
        cell: ({ row }) =>
          row.original.reportsCount > 0 ? (
            <span className="inline-flex items-center gap-1 font-medium text-destructive tabular-nums">
              <Flag className="size-3.5" aria-hidden />
              {row.original.reportsCount}
            </span>
          ) : (
            <span className="text-muted-foreground tabular-nums">0</span>
          ),
        meta: { label: t("listings.columns.reports"), className: "text-right", headerClassName: "text-right" },
      },
      {
        id: "status",
        header: t("listings.columns.status"),
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge kind="listingStatus" value={row.original.status} />
            {row.original.deletedAt && (
              <Pill tone="muted">
                <Trash2 className="size-3" aria-hidden />
                {t("listings.flags.deleted")}
              </Pill>
            )}
          </div>
        ),
        enableSorting: false,
        meta: { label: t("listings.columns.status") },
      },
      {
        id: "createdAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("listings.columns.createdAt")} />,
        cell: ({ row }) => <DateCell value={row.original.createdAt} mode="date" />,
        meta: { label: t("listings.columns.createdAt") },
      },
      {
        id: "updatedAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("listings.columns.updatedAt")} />,
        cell: ({ row }) => <DateCell value={row.original.updatedAt} />,
        meta: { label: t("listings.columns.updatedAt") },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("common.table.actions")}</span>,
        cell: ({ row }) => <ListingRowActions listing={row.original} dialogs={actionDialogs} />,
        enableSorting: false,
        enableHiding: false,
        meta: { className: "w-10" },
      },
    ],
    [t, names, actionDialogs],
  );

  const toggle = (key: "reported" | "duplicate" | "deleted") => (on: boolean) => setParams({ filters: { [key]: on ? "true" : undefined } });

  return (
    <div className="space-y-6">
      <PageHeader title={t("listings.title")} description={t("listings.subtitle")} />
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
        searchPlaceholder={t("listings.searchPlaceholder")}
        storageKey="listings"
        initialColumnVisibility={{ updatedAt: false }}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
        onRowClick={(l) => router.push(`/admin/listings/${l.id}`)}
        filters={
          <>
            <FacetedFilter
              title={t("listings.filters.status")}
              value={f.status}
              onChange={(status) => setParams({ filters: { status } })}
              options={LISTING_STATUSES.map((s) => ({ value: s, label: t(`enums.listingStatus.${s}`) }))}
            />
            <FacetedFilter
              title={t("listings.filters.category")}
              value={f.categoryId}
              onChange={(categoryId) => setParams({ filters: { categoryId } })}
              searchable
              options={cats.treeOptions.map((o) => ({
                value: o.value,
                text: o.text,
                label: <span className={cn(o.depth === 0 ? "font-medium" : "pl-3 text-muted-foreground")}>{o.label}</span>,
              }))}
            />
            <FacetedFilter
              title={t("listings.filters.condition")}
              value={f.condition}
              onChange={(condition) => setParams({ filters: { condition } })}
              options={ITEM_CONDITIONS.map((c) => ({ value: c, label: t(`enums.itemCondition.${c}`) }))}
            />
            <FacetedFilter
              title={t("listings.filters.region")}
              value={f.regionId}
              onChange={(regionId) => setParams({ filters: { regionId } })}
              searchable
              options={(names.lookups?.regions ?? []).map((r) => ({ value: r.id, label: t.text(r.name), text: t.text(r.name) }))}
            />
            <DateRangeFilter title={t("listings.filters.created")} from={f.from} to={f.to} onChange={({ from, to }) => setParams({ filters: { from, to } })} />
            <ToggleFilter label={t("listings.filters.reportedOnly")} icon={<Flag />} active={f.reported === "true"} onChange={toggle("reported")} />
            <ToggleFilter label={t("listings.filters.duplicatesOnly")} icon={<Copy />} active={f.duplicate === "true"} onChange={toggle("duplicate")} />
            <ToggleFilter label={t("listings.filters.deletedOnly")} icon={<Trash2 />} active={f.deleted === "true"} onChange={toggle("deleted")} />
            {f.userId && (
              <Button variant="secondary" size="sm" onClick={() => setParams({ filters: { userId: undefined } })}>
                {t("listings.filters.owner")}: <span className="font-mono text-xs">{f.userId}</span> ×
              </Button>
            )}
          </>
        }
        mobileCard={(l) => (
          <div className="flex items-start gap-3">
            <ItemImage src={l.images[0]?.url} alt={l.title} className="size-16 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="line-clamp-2 leading-snug font-medium">{l.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {l.code} · {l.owner.fullName} · {names.category(l.subcategoryId ?? l.categoryId)}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <StatusBadge kind="listingStatus" value={l.status} />
                {l.deletedAt && <Pill tone="muted">{t("listings.flags.deleted")}</Pill>}
                {l.possibleDuplicateOf && <Pill tone="warning">{t("listings.flags.possibleDuplicate")}</Pill>}
                <StatusBadge kind="itemCondition" value={l.condition} dot={false} />
                <span>{names.region(l.regionId)}</span>
                <span>· {t("common.misc.offers", { count: l.offersCount })}</span>
                {l.reportsCount > 0 && <span className="font-medium text-destructive">· {t("common.misc.reports", { count: l.reportsCount })}</span>}
              </div>
            </div>
            <ListingRowActions listing={l} dialogs={actionDialogs} />
          </div>
        )}
      />
      {dialogs}
    </div>
  );
}
