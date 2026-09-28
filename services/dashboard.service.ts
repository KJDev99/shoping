import { api } from "@/lib/api/client";
import type { BarterInsights, BarterRequest, DashboardCharts, DashboardOverview, Listing, Report, User } from "@/types";

/** Inclusive YYYY-MM-DD range. */
export interface DashboardRange {
  from: string;
  to: string;
}

export interface DashboardChartsResponse extends DashboardCharts {
  /** Daily buckets, or weekly when the range is longer than 90 days. */
  bucket: "day" | "week";
}

export interface DashboardRecent {
  users: User[];
  listings: Listing[];
  barterRequests: BarterRequest[];
  reports: Report[];
}

export const dashboardService = {
  overview: (range: DashboardRange) => api.get<DashboardOverview>("/dashboard/overview", { ...range }),
  charts: (range: DashboardRange) => api.get<DashboardChartsResponse>("/dashboard/charts", { ...range }),
  insights: (range: DashboardRange) => api.get<BarterInsights>("/dashboard/insights", { ...range }),
  recent: () => api.get<DashboardRecent>("/dashboard/recent"),
};
