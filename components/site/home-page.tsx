"use client";

import { LayoutGrid, Loader2, Plus, SearchX, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { CategoryIcon } from "@/components/admin/categories/category-icon";
import { ButtonLink } from "@/components/common/button-link";
import { SimpleSelect } from "@/components/common/simple-select";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useLookupNames } from "@/hooks/use-lookups";
import { usePublicListings } from "@/hooks/use-site";
import { formatNumber } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { ListingCard, ListingGridSkeleton } from "./listing-card";

const PAGE_SIZE = 24;

export function HomePage() {
  const t = useT();
  const [locale] = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { lookups, category } = useLookupNames();

  const search = sp.get("search") ?? undefined;
  const categoryId = sp.get("categoryId") ?? undefined;
  const regionId = sp.get("regionId") ?? undefined;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const query = usePublicListings({ limit: PAGE_SIZE, search, sort: "createdAt", order: "desc", filters: { categoryId, regionId } });
  const items = query.data?.pages.flatMap((p) => p.data) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? 0;

  const parents = useMemo(
    () => (lookups?.categories ?? []).filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder),
    [lookups],
  );
  const activeParentId = categoryId && (lookups?.categories.find((c) => c.id === categoryId)?.parentId ?? categoryId);
  const hasFilters = !!(search || categoryId || regionId);

  return (
    <div className="space-y-8">
      {!hasFilters && <Hero />}

      <nav aria-label={t("site.post.category")} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0 lg:grid-cols-9">
        <CategoryTile active={!categoryId} onClick={() => setParam("categoryId", null)} label={t("site.home.all")} icon={<LayoutGrid className="size-5" />} />
        {parents.map((p) => (
          <CategoryTile
            key={p.id}
            active={activeParentId === p.id}
            onClick={() => setParam("categoryId", p.id)}
            label={t.text(p.name)}
            icon={<CategoryIcon name={p.icon} className="size-5" />}
          />
        ))}
      </nav>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold tracking-tight">
              {search ? t("site.home.searchResults", { q: search }) : categoryId ? category(categoryId) : t("site.home.latest")}
            </h2>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {query.isPending ? "…" : t("site.home.results", { count: formatNumber(total, locale) })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SimpleSelect
              className="w-full rounded-full bg-white shadow-sm data-[size=default]:h-10 sm:w-56"
              value={regionId ?? null}
              onChange={(v) => setParam("regionId", v)}
              options={(lookups?.regions ?? []).map((r) => ({ value: r.id, label: t.text(r.name) }))}
              clearLabel={t("site.home.allRegions")}
              aria-label={t("site.post.region")}
            />
            {hasFilters && (
              <Button variant="ghost" className="h-10 shrink-0 rounded-full" onClick={() => router.replace(pathname, { scroll: false })}>
                <X /> {t("common.actions.clearFilters")}
              </Button>
            )}
          </div>
        </div>

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
            className="rounded-2xl surface"
          />
        ) : (
          <>
            <div className={cn("grid grid-cols-2 gap-3 transition-opacity sm:gap-5 md:grid-cols-3 lg:grid-cols-4", query.isFetching && !query.isFetchingNextPage && "opacity-70")}>
              {items.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
            {query.hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} className="h-11 rounded-full px-8">
                  {query.isFetchingNextPage && <Loader2 className="animate-spin" />}
                  {t("site.home.loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Hero() {
  const t = useT();
  const steps = [t("site.home.how.one"), t("site.home.how.two"), t("site.home.how.three")];
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-linear-to-br from-primary via-indigo-600 to-violet-600 px-5 py-7 text-primary-foreground shadow-2xl shadow-primary/30 sm:px-10 sm:py-12">
      <div aria-hidden className="absolute -top-24 -right-16 -z-10 size-80 rounded-full bg-white/20 blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 left-1/3 -z-10 size-96 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-4xl">{t("site.home.title")}</h1>
        <p className="text-base text-pretty opacity-90 sm:text-lg">{t("site.home.subtitle")}</p>
        <ButtonLink href="/listings/new" variant="secondary" className="h-11 rounded-full bg-white px-6 text-base text-primary shadow-lg hover:bg-white/90">
          <Plus /> {t("site.nav.post")}
        </ButtonLink>
      </div>
      <ol className="mt-6 grid gap-2 text-sm sm:mt-8 sm:grid-cols-3 sm:gap-3">
        {steps.map((text, i) => (
          <li key={i} className="flex items-center gap-3 rounded-2xl bg-white/12 px-3 py-2 ring-1 ring-white/20 backdrop-blur-sm sm:p-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-sm font-semibold text-primary sm:size-8">{i + 1}</span>
            <span className="leading-snug">{text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CategoryTile({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl p-3 text-center text-xs font-medium transition-all sm:w-auto",
        active ? "bg-linear-to-br from-primary to-violet-600 text-primary-foreground shadow-lg shadow-primary/30" : "surface hover:-translate-y-0.5 hover:shadow-lg",
      )}
    >
      <span className={cn("flex size-10 items-center justify-center rounded-full", active ? "bg-primary-foreground/15" : "bg-primary/10 text-primary")}>{icon}</span>
      <span className="line-clamp-1 w-full">{label}</span>
    </button>
  );
}
