"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeftRight, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { DateCell, ListingCell } from "@/components/common/cells";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { ColumnHeader } from "@/components/tables/column-header";
import { DataTable } from "@/components/tables/data-table";
import { FacetedFilter, NumberRangeFilter } from "@/components/tables/filters";
import { useListParams } from "@/hooks/use-list-params";
import { useLookupNames } from "@/hooks/use-lookups";
import { useMatchesList } from "@/hooks/use-matches";
import { useT } from "@/lib/i18n/provider";
import { MATCH_TYPES, type BarterMatch } from "@/types";
import { MatchDetailSheet } from "./match-detail-sheet";
import { EngineNote } from "./match-detail-page";
import { CompatibilityIcons, ScoreBar } from "./match-parts";

const FILTER_KEYS = ["type", "minScore", "categoryId", "regionId", "listingId"] as const;

function PairCell({ match, compact = false }: { match: BarterMatch; compact?: boolean }) {
  const names = useLookupNames();
  const sub = (l: BarterMatch["listingA"]) => `${l.ownerName} · ${names.region(l.regionId)}`;
  return (
    <div className={compact ? "flex flex-col gap-2" : "flex min-w-[26rem] items-center gap-2"}>
      <ListingCell listing={match.listingA} secondary={sub(match.listingA)} className="min-w-0 flex-1" />
      <ArrowLeftRight className={compact ? "ml-3 size-3.5 rotate-90 text-muted-foreground" : "size-4 shrink-0 text-muted-foreground"} aria-hidden />
      <ListingCell listing={match.listingB} secondary={sub(match.listingB)} className="min-w-0 flex-1" />
    </div>
  );
}

export function MatchesPage() {
  const t = useT();
  const names = useLookupNames();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { params, setParams, resetFilters, activeFilterCount } = useListParams({ sort: "score", order: "desc" }, FILTER_KEYS);
  const query = useMatchesList(params);
  const f = params.filters ?? {};
  const openId = searchParams.get("match");

  // The open match lives in the URL (?match=…) so the sheet survives reloads and can be shared.
  const setOpenId = useCallback(
    (id: string | null) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (id) sp.set("match", id);
      else sp.delete("match");
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const categoryOptions = useMemo(() => {
    const cats = names.lookups?.categories ?? [];
    const label = (id: string) => t.text(cats.find((c) => c.id === id)?.name);
    return cats
      .map((c) => {
        const text = c.parentId ? `${label(c.parentId)} › ${t.text(c.name)}` : t.text(c.name);
        return { value: c.id, label: text, text };
      })
      .sort((a, b) => a.text.localeCompare(b.text));
  }, [names.lookups, t]);

  const columns = useMemo<ColumnDef<BarterMatch>[]>(
    () => [
      {
        id: "score",
        header: ({ column }) => <ColumnHeader column={column} title={t("matches.columns.score")} />,
        cell: ({ row }) => <ScoreBar score={row.original.score} className="w-32" />,
        enableHiding: false,
        meta: { label: t("matches.columns.score") },
      },
      {
        id: "pair",
        header: t("matches.columns.pair"),
        cell: ({ row }) => <PairCell match={row.original} />,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "type",
        header: t("matches.columns.type"),
        cell: ({ row }) => <StatusBadge kind="matchType" value={row.original.type} />,
        enableSorting: false,
        meta: { label: t("matches.columns.type") },
      },
      {
        id: "compatibility",
        header: t("matches.columns.compatibility"),
        cell: ({ row }) => <CompatibilityIcons reason={row.original.reason} />,
        enableSorting: false,
        meta: { label: t("matches.columns.compatibility") },
      },
      {
        id: "computedAt",
        header: ({ column }) => <ColumnHeader column={column} title={t("matches.columns.computedAt")} />,
        cell: ({ row }) => <DateCell value={row.original.computedAt} />,
        meta: { label: t("matches.columns.computedAt") },
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("matches.title")} description={t("matches.subtitle")} />
      <EngineNote />
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
        searchPlaceholder={t("matches.searchPlaceholder")}
        storageKey="matches"
        initialColumnVisibility={{ computedAt: false }}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
        onRowClick={(m) => setOpenId(m.id)}
        filters={
          <>
            <FacetedFilter
              title={t("matches.filters.type")}
              value={f.type}
              onChange={(type) => setParams({ filters: { type } })}
              options={MATCH_TYPES.map((v) => ({ value: v, label: t(`enums.matchType.${v}`) }))}
            />
            <NumberRangeFilter title={t("matches.filters.minScore")} min={f.minScore} max={undefined} onChange={({ min }) => setParams({ filters: { minScore: min } })} />
            <FacetedFilter
              title={t("matches.filters.category")}
              value={f.categoryId}
              onChange={(categoryId) => setParams({ filters: { categoryId } })}
              searchable
              options={categoryOptions}
            />
            <FacetedFilter
              title={t("matches.filters.region")}
              value={f.regionId}
              onChange={(regionId) => setParams({ filters: { regionId } })}
              searchable
              options={(names.lookups?.regions ?? []).map((r) => ({ value: r.id, label: t.text(r.name), text: t.text(r.name) }))}
            />
            {f.listingId && (
              <Button variant="secondary" size="sm" onClick={() => setParams({ filters: { listingId: undefined } })}>
                {t("matches.filters.listing", { id: f.listingId })}
                <X />
              </Button>
            )}
          </>
        }
        mobileCard={(m) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <StatusBadge kind="matchType" value={m.type} />
              <CompatibilityIcons reason={m.reason} />
            </div>
            <PairCell match={m} compact />
            <ScoreBar score={m.score} />
          </div>
        )}
      />
      <MatchDetailSheet id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
