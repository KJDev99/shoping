import { api } from "@/lib/api/client";
import type { ReportDetail, ReportSuspendInput } from "@/schemas/report.schema";
import type { ListParams, Report } from "@/types";

export const reportsService = {
  list: (params: ListParams) => api.list<Report>("/reports", params),
  get: (id: string) => api.get<ReportDetail>(`/reports/${id}`),
  review: (id: string) => api.post<Report>(`/reports/${id}/review`),
  resolve: (id: string, note: string) => api.post<Report>(`/reports/${id}/resolve`, { note }),
  reject: (id: string, note: string) => api.post<Report>(`/reports/${id}/reject`, { note }),
  blockListing: (id: string, reason: string) => api.post<Report>(`/reports/${id}/actions/block-listing`, { reason }),
  blockUser: (id: string, reason: string) => api.post<Report>(`/reports/${id}/actions/block-user`, { reason }),
  suspendUser: (id: string, input: ReportSuspendInput) => api.post<Report>(`/reports/${id}/actions/suspend-user`, input),
};
