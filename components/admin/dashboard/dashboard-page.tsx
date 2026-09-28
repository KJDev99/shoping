"use client";

import { PageHeader } from "@/components/common/page-header";
import { useT } from "@/lib/i18n/provider";
import { ActivityCharts } from "./activity-charts";
import { BarterInsightsSection } from "./barter-insights";
import { DateRangeBar, useDashboardRange } from "./date-range-bar";
import { OverviewCards } from "./overview-cards";
import { RecentActivity } from "./recent-activity";

export function DashboardPage() {
  const t = useT();
  const { preset, range, setPreset, setCustom } = useDashboardRange();

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboard.title")} description={t("dashboard.subtitle")} />
      <DateRangeBar preset={preset} range={range} onPreset={setPreset} onCustom={setCustom} />
      <OverviewCards range={range} />
      <ActivityCharts range={range} />
      <BarterInsightsSection range={range} />
      <RecentActivity />
    </div>
  );
}
