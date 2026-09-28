"use client";

import { ArrowLeftRight, Handshake, Loader2, PackagePlus, SearchX } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { CategoryIcon } from "@/components/admin/categories/category-icon";
import { ButtonLink } from "@/components/common/button-link";
import { SimpleSelect } from "@/components/common/simple-select";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLookupNames } from "@/hooks/use-lookups";
import { usePublicListings } from "@/hooks/use-site";
import { formatNumber } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { ITEM_CONDITIONS } from "@/types";
import { ListingCard, ListingGridSkeleton } from "./listing-card";

const PAGE_SIZE = 24;

export function HomePage() {
  const t = useT();
  const [locale] = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { lookups } = useLookupNames();

  const filters = {
    search: sp.get("search") ?? undefined,
    categoryId: sp.get("categoryId") ?? undefined,
    regionId: sp.get("regionId") ?? undefined,
    condition: sp.get("condition") ?? undefined,
    openToOffers: sp.get("openToOffers") === "true" ? "true" : undefined,
  };
  const sort = sp.get("sort") === "views" ? "views" : "createdAt";

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const query = usePublicListings({
    limit: PAGE_SIZE,
    search: filters.search,
    sort,
    order: "desc",
    filters: { categoryId: filters.categoryId, regionId: filters.regionId, condition: filters.condition, openToOffers: filters.openToOffers },
  });
  const items = query.data?.pages.flatMap((p) => p.data) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? 0;

  const parents = useMemo(
    () => (lookups?.categories ?? []).filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder),
    [lookups],
  );
  const categoryOptions = useMemo(() => {
    const cats = lookups?.categories ?? [];
    return parents.flatMap((p) => [
      { value: p.id, label: t.text(p.name) },
      ...cats
        .filter((c) => c.parentId === p.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => ({ value: c.id, label: `   ${t.text(c.name)}` })),
    ]);
  }, [lookups, parents, t]);
  const activeParent = parents.find((p) => p.id === filters.categoryId) ?? parents.find((p) => lookups?.categories.find((c) => c.id === filters.categoryId)?.parentId === p.id);
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      {!hasFilters && (
        <section className="grid gap-6 rounded-2xl border bg-card p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{t("site.home.title")}</h1>
            <p className="max-w-xl text-muted-foreground">{t("site.home.subtitle")}</p>
            <ButtonLink href="/listings/new" className="h-10 px-4">
              <PackagePlus /> {t("site.nav.post")}
            </ButtonLink>
          </div>
          <ol className="grid gap-3 text-sm">
            {(
              [
                ["one", PackagePlus],
                ["two", ArrowLeftRight],
                ["three", Handshake],
              ] as const
            ).map(([k, Icon], i) => (
              <li key={k} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="text-muted-foreground">{i + 1}. </span>
                  {t(`site.home.how.${k}`)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Category shortcuts */}
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <CategoryChip active={!filters.categoryId} onClick={() => setParam("categoryId", null)} label={t("site.home.allCategories")} />
        {parents.map((p) => (
          <CategoryChip
            key={p.id}
            active={activeParent?.id === p.id}
            onClick={() => setParam("categoryId", p.id)}
            label={t.text(p.name)}
            icon={<CategoryIcon name={p.icon} className="size-4" />}
          />
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <SimpleSelect
          className="w-full sm:w-56"
          value={filters.categoryId ?? null}
          onChange={(v) => setParam("categoryId", v)}
          options={categoryOptions}
          clearLabel={t("site.home.allCategories")}
          aria-label={t("site.post.category")}
        />
        <SimpleSelect
          className="w-full sm:w-52"
          value={filters.regionId ?? null}
          onChange={(v) => setParam("regionId", v)}
          options={(lookups?.regions ?? []).map((r) => ({ value: r.id, label: t.text(r.name) }))}
          clearLabel={t("site.home.allRegions")}
          aria-label={t("site.post.region")}
        />
        <SimpleSelect
          className="w-full sm:w-44"
          value={filters.condition ?? null}
          onChange={(v) => setParam("condition", v)}
          options={ITEM_CONDITIONS.map((c) => ({ value: c, label: t(`enums.itemCondition.${c}`) }))}
          clearLabel={t("site.home.anyCondition")}
          aria-label={t("site.post.condition")}
        />
        <label className="flex h-8 items-center gap-2 rounded-lg border bg-background px-2.5 text-sm">
          <Switch checked={!!filters.openToOffers} onCheckedChange={(v) => setParam("openToOffers", v ? "true" : null)} />
          {t("site.home.openToOffersOnly")}
        </label>
        <SimpleSelect
          className="w-full sm:ml-auto sm:w-44"
          value={sort}
          onChange={(v) => setParam("sort", v === "views" ? "views" : null)}
          options={[
            { value: "createdAt", label: t("site.home.sort.newest") },
            { value: "views", label: t("site.home.sort.popular") },
          ]}
        />
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {query.isPending ? "…" : t("site.home.results", { count: formatNumber(total, locale) })}
        {filters.search && <span> · “{filters.search}”</span>}
      </p>

      {query.isPending ? (
        <ListingGridSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title={t("site.home.empty")}
          description={t("site.home.emptyHint")}
          action={<ButtonLink href="/listings/new">{t("site.nav.post")}</ButtonLink>}
          className="rounded-xl border bg-card"
        />
      ) : (
        <>
          <div className={cn("grid grid-cols-2 gap-3 transition-opacity sm:gap-4 md:grid-cols-3 lg:grid-cols-4", query.isFetching && !query.isFetchingNextPage && "opacity-70")}>
            {items.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
          {query.hasNextPage && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} className="h-10 px-6">
                {query.isFetchingNextPage && <Loader2 className="animate-spin" />}
                {t("site.home.loadMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CategoryChip({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
