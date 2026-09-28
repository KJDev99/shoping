"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/provider";
import type { ReportSuspendInput } from "@/schemas/report.schema";
import { reportsService } from "@/services/reports.service";
import type { ListParams } from "@/types";
import { useActionMutation } from "./use-action-mutation";

/** Query keys: invalidate ["reports"] to refresh every reports query. */
export const reportKeys = {
  all: ["reports"] as const,
  list: (params: ListParams) => ["reports", "list", params] as const,
  detail: (id: string) => ["reports", "detail", id] as const,
};

export function useReportsList(params: ListParams) {
  return useQuery({ queryKey: reportKeys.list(params), queryFn: () => reportsService.list(params), placeholderData: keepPreviousData });
}

export function useReport(id: string) {
  return useQuery({ queryKey: reportKeys.detail(id), queryFn: () => reportsService.get(id) });
}

/** Report workflow + enforcement actions. Enforcement also refreshes users/listings/moderation data. */
export function useReportActions() {
  const t = useT();
  const invalidate = [reportKeys.all, ["moderation"], ["moderation-history"], ["users"], ["listings"], ["audit"], ["dashboard"]];
  return {
    review: useActionMutation({
      mutationFn: ({ id }: { id: string }) => reportsService.review(id),
      successMessage: t("reports.toasts.taken"),
      invalidate,
    }),
    resolve: useActionMutation({
      mutationFn: ({ id, note }: { id: string; note: string }) => reportsService.resolve(id, note),
      successMessage: t("reports.toasts.resolved"),
      invalidate,
    }),
    reject: useActionMutation({
      mutationFn: ({ id, note }: { id: string; note: string }) => reportsService.reject(id, note),
      successMessage: t("reports.toasts.rejected"),
      invalidate,
    }),
    blockListing: useActionMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => reportsService.blockListing(id, reason),
      successMessage: t("reports.toasts.listingBlocked"),
      invalidate,
    }),
    blockUser: useActionMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => reportsService.blockUser(id, reason),
      successMessage: t("reports.toasts.userBlocked"),
      invalidate,
    }),
    suspendUser: useActionMutation({
      mutationFn: ({ id, input }: { id: string; input: ReportSuspendInput }) => reportsService.suspendUser(id, input),
      successMessage: t("reports.toasts.userSuspended"),
      invalidate,
    }),
  };
}
