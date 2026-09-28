"use client";

import Link from "next/link";
import { RankedBars } from "@/components/charts";
import { Section } from "@/components/common/info-list";
import { ErrorState } from "@/components/common/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardInsights } from "@/hooks/use-dashboard";
import { useLookupNames } from "@/hooks/use-lookups";
import { formatNumber, formatPercent } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { DashboardRange } from "@/services/dashboard.service";

function Kpi({ label, value, hint, href }: { label: string; value: string; hint: string; href?: string }) {
  const body = (
    <div className={cn("h-full rounded-lg border bg-background p-3", href && "transition-colors hover:bg-muted/40")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}

function RankedBlock({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-3">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-40" />
            {Array.from({ length: 5 }, (_, j) => (
              <Skeleton key={j} className="h-6 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarterInsightsSection({ range }: { range: DashboardRange }) {
  const t = useT();
  const [locale] = useLocale();
  const names = useLookupNames();
  const query = useDashboardInsights(range);

  return (
    <Section title={t("dashboard.insights.title")} description={t("dashboard.insights.subtitle")}>
      {query.isPending ? (
        <InsightsSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <div className={cn("space-y-6", query.isPlaceholderData && "opacity-60 transition-opacity")}>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            <Kpi label={t("dashboard.insights.acceptanceRate")} value={formatPercent(query.data.acceptanceRate, locale)} hint={t("dashboard.insights.acceptanceRateHint")} />
            <Kpi
              label={t("dashboard.insights.avgOffersPerListing")}
              value={formatNumber(query.data.avgOffersPerListing, locale, { maximumFractionDigits: 2 })}
              hint={t("dashboard.insights.avgOffersPerListingHint")}
            />
            <Kpi label={t("dashboard.insights.listingsWithoutOffers")} value={formatNumber(query.data.listingsWithoutOffers, locale)} hint={t("dashboard.insights.listingsWithoutOffersHint")} />
            <Kpi label={t("dashboard.insights.reportedListings")} value={formatNumber(query.data.reportedListings, locale)} hint={t("dashboard.insights.reportedListingsHint")} />
            <Kpi
              label={t("dashboard.insights.blockedListings")}
              value={formatNumber(query.data.blockedListings, locale)}
              hint={t("dashboard.insights.blockedListingsHint")}
              href="/admin/listings?status=BLOCKED"
            />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <RankedBlock title={t("dashboard.insights.mostActiveCategories")} hint={t("dashboard.insights.mostActiveCategoriesHint")}>
              <RankedBars
                color="chart-1"
                emptyLabel={t("dashboard.insights.empty")}
                items={query.data.mostActiveCategories.map((c) => ({ id: c.categoryId, label: names.categories.has(c.categoryId) ? names.category(c.categoryId) : c.name, value: c.value, href: `/admin/listings?categoryId=${c.categoryId}` }))}
              />
            </RankedBlock>
            <RankedBlock title={t("dashboard.insights.mostExchangedCategories")} hint={t("dashboard.insights.mostExchangedCategoriesHint")}>
              <RankedBars
                color="chart-4"
                emptyLabel={t("dashboard.insights.empty")}
                items={query.data.mostExchangedCategories.map((c) => ({ id: c.categoryId, label: names.categories.has(c.categoryId) ? names.category(c.categoryId) : c.name, value: c.value }))}
              />
            </RankedBlock>
            <RankedBlock title={t("dashboard.insights.mostActiveRegions")} hint={t("dashboard.insights.mostActiveRegionsHint")}>
              <RankedBars
                color="chart-1"
                emptyLabel={t("dashboard.insights.empty")}
                items={query.data.mostActiveRegions.map((r) => ({ id: r.regionId, label: names.regions.has(r.regionId) ? names.region(r.regionId) : r.name, value: r.value, href: `/admin/listings?regionId=${r.regionId}` }))}
              />
            </RankedBlock>
          </div>
        </div>
      )}
    </Section>
  );
}
