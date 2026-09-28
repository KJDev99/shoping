"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/provider";
import type { DisputeBlockInput, DisputeCloseInput, DisputeSuspendInput, DisputeWarnInput } from "@/schemas/exchange.schema";
import { disputesService, exchangesService } from "@/services/exchanges.service";
import type { ListParams } from "@/types";
import { useActionMutation } from "./use-action-mutation";

/** Query keys: invalidate ["exchanges"] to refresh every exchange + dispute query. */
export const exchangeKeys = {
  all: ["exchanges"] as const,
  list: (params: ListParams) => ["exchanges", "list", params] as const,
  detail: (id: string) => ["exchanges", "detail", id] as const,
  dispute: (exchangeId: string) => ["exchanges", "dispute", exchangeId] as const,
};

export function useExchangesList(params: ListParams) {
  return useQuery({
    queryKey: exchangeKeys.list(params),
    queryFn: () => exchangesService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useExchange(id: string) {
  return useQuery({ queryKey: exchangeKeys.detail(id), queryFn: () => exchangesService.get(id) });
}

export function useDispute(exchangeId: string) {
  return useQuery({ queryKey: exchangeKeys.dispute(exchangeId), queryFn: () => disputesService.get(exchangeId) });
}

export function useExchangeActions() {
  const t = useT();
  return {
    cancel: useActionMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => exchangesService.cancel(id, { reason }),
      successMessage: t("exchanges.toasts.cancelled"),
      invalidate: [exchangeKeys.all, ["barter-requests"], ["users"], ["audit"]],
    }),
  };
}

/** Dispute actions. Suspend/block change the user's account status, so user queries are invalidated too. */
export function useDisputeActions(exchangeId: string) {
  const t = useT();
  const invalidate = [exchangeKeys.all, ["users"], ["moderation-history"], ["audit"], ["alerts"]];
  return {
    assign: useActionMutation({
      mutationFn: () => disputesService.assign(exchangeId),
      successMessage: t("exchanges.dispute.toasts.assigned"),
      invalidate,
    }),
    warn: useActionMutation({
      mutationFn: (input: DisputeWarnInput) => disputesService.warn(exchangeId, input),
      successMessage: t("exchanges.dispute.toasts.warned"),
      invalidate,
    }),
    suspend: useActionMutation({
      mutationFn: (input: DisputeSuspendInput) => disputesService.suspend(exchangeId, input),
      successMessage: t("exchanges.dispute.toasts.suspended"),
      invalidate,
    }),
    block: useActionMutation({
      mutationFn: (input: DisputeBlockInput) => disputesService.block(exchangeId, input),
      successMessage: t("exchanges.dispute.toasts.blocked"),
      invalidate,
    }),
    close: useActionMutation({
      mutationFn: (input: DisputeCloseInput) => disputesService.close(exchangeId, input),
      successMessage: t("exchanges.dispute.toasts.closed"),
      invalidate: [...invalidate, ["barter-requests"]],
    }),
  };
}
