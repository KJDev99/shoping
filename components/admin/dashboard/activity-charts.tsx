"use client";

import { TimeSeriesChart, type ChartColor } from "@/components/charts";
import { ErrorState } from "@/components/common/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardCharts } from "@/hooks/use-dashboard";
import { formatNumber } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { DashboardRange } from "@/services/dashboard.service";
import type { DashboardCharts, TimeSeriesPoint } from "@/types";

type SeriesKey = keyof DashboardCharts;

/** Fixed color per metric — never re-assigned when ranges or data change. */
const SERIES: { key: SeriesKey; color: ChartColor }[] = [
  { key: "registrations", color: "chart-1" },
  { key: "listings", color: "chart-3" },
  { key: "exchanges", color: "chart-4" },
  { key: "barterRequests", color: "chart-2" },
  { key: "reports", color: "chart-5" },
];

function ChartCard({ title, total, subtitle, children, className }: { title: string; total: string; subtitle: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card p-4 text-card-foreground", className)}>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">{total}</span> · {subtitle}
        </p>
      </header>
      {children}
    </section>
  );
}

function ChartCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-xl border bg-card p-4", className)}>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-48 w-full sm:h-56" />
    </div>
  );
}

const sum = (points: TimeSeriesPoint[]) => points.reduce((s, p) => s + p.value, 0);

export function ActivityCharts({ range }: { range: DashboardRange }) {
  const t = useT();
  const [locale] = useLocale();
  const query = useDashboardCharts(range);
  const spanClass = (i: number) => (i === 0 ? "lg:col-span-2" : undefined);

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">{t("dashboard.charts.title")}</h2>
      {query.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {SERIES.map((s, i) => (
            <ChartCardSkeleton key={s.key} className={spanClass(i)} />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border bg-card">
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </div>
      ) : (
        <div className={cn("grid gap-4 lg:grid-cols-2", query.isPlaceholderData && "opacity-60 transition-opacity")}>
          {SERIES.map((s, i) => {
            const points = query.data[s.key];
            const title = t(`dashboard.charts.${s.key}`);
            const weekly = query.data.bucket === "week";
            return (
              <ChartCard
                key={s.key}
                title={title}
                total={t("dashboard.charts.total", { count: formatNumber(sum(points), locale) })}
                subtitle={weekly ? t("dashboard.charts.weekly") : t("dashboard.charts.daily")}
                className={spanClass(i)}
              >
                <TimeSeriesChart
                  data={points}
                  label={title}
                  color={s.color}
                  formatBucket={weekly ? (_, formatted) => t("dashboard.charts.weekOf", { date: formatted }) : undefined}
                />
              </ChartCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
