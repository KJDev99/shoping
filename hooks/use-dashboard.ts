"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { dashboardService, type DashboardRange } from "@/services/dashboard.service";

/** Query keys: invalidate ["dashboard"] to refresh every dashboard widget. */
export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: (range: DashboardRange) => ["dashboard", "overview", range] as const,
  charts: (range: DashboardRange) => ["dashboard", "charts", range] as const,
  insights: (range: DashboardRange) => ["dashboard", "insights", range] as const,
  recent: () => ["dashboard", "recent"] as const,
};

const STALE = 60_000;

export function useDashboardOverview(range: DashboardRange) {
  return useQuery({ queryKey: dashboardKeys.overview(range), queryFn: () => dashboardService.overview(range), placeholderData: keepPreviousData, staleTime: STALE });
}

export function useDashboardCharts(range: DashboardRange) {
  return useQuery({ queryKey: dashboardKeys.charts(range), queryFn: () => dashboardService.charts(range), placeholderData: keepPreviousData, staleTime: STALE });
}

export function useDashboardInsights(range: DashboardRange) {
  return useQuery({ queryKey: dashboardKeys.insights(range), queryFn: () => dashboardService.insights(range), placeholderData: keepPreviousData, staleTime: STALE });
}

export function useDashboardRecent() {
  return useQuery({ queryKey: dashboardKeys.recent(), queryFn: dashboardService.recent, staleTime: STALE });
}
