"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/provider";
import type { ListingUpdateInput, RejectListingInput } from "@/schemas/listing.schema";
import { listingsService } from "@/services/listings.service";
import type { ListParams } from "@/types";
import { useActionMutation } from "./use-action-mutation";

/** Query keys: invalidate ["listings"] to refresh every listings query. */
export const listingKeys = {
  all: ["listings"] as const,
  list: (params: ListParams) => ["listings", "list", params] as const,
  detail: (id: string) => ["listings", "detail", id] as const,
  offers: (id: string, params: ListParams) => ["listings", "offers", id, params] as const,
  reports: (id: string, params: ListParams) => ["listings", "reports", id, params] as const,
};

export function useListingsList(params: ListParams) {
  return useQuery({
    queryKey: listingKeys.list(params),
    queryFn: () => listingsService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useListing(id: string) {
  return useQuery({ queryKey: listingKeys.detail(id), queryFn: () => listingsService.get(id) });
}

export function useListingOffers(id: string, params: ListParams, enabled = true) {
  return useQuery({
    queryKey: listingKeys.offers(id, params),
    queryFn: () => listingsService.offers(id, params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useListingReports(id: string, params: ListParams, enabled = true) {
  return useQuery({
    queryKey: listingKeys.reports(id, params),
    queryFn: () => listingsService.reports(id, params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** All listing moderation actions, with toasts and cache invalidation. */
export function useListingActions() {
  const t = useT();
  // Listing changes affect user counters, moderation queues, the dashboard and the audit log.
  const invalidate = [listingKeys.all, ["users"], ["moderation"], ["moderation-history"], ["audit"], ["dashboard"], ["matches"]];
  return {
    update: useActionMutation({
      mutationFn: ({ id, input }: { id: string; input: ListingUpdateInput }) => listingsService.update(id, input),
      successMessage: t("listings.toasts.updated"),
      invalidate,
    }),
    approve: useActionMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) => listingsService.approve(id, reason),
      successMessage: t("listings.toasts.approved"),
      invalidate,
    }),
    reject: useActionMutation({
      mutationFn: ({ id, input }: { id: string; input: RejectListingInput }) => listingsService.reject(id, input),
      successMessage: t("listings.toasts.rejected"),
      invalidate,
    }),
    requestCorrection: useActionMutation({
      mutationFn: ({ id, note }: { id: string; note: string }) => listingsService.requestCorrection(id, note),
      successMessage: t("listings.toasts.correctionRequested"),
      invalidate,
    }),
    block: useActionMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => listingsService.block(id, reason),
      successMessage: t("listings.toasts.blocked"),
      invalidate,
    }),
    unblock: useActionMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) => listingsService.unblock(id, reason),
      successMessage: t("listings.toasts.unblocked"),
      invalidate,
    }),
    archive: useActionMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) => listingsService.archive(id, reason),
      successMessage: t("listings.toasts.archived"),
      invalidate,
    }),
    remove: useActionMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => listingsService.remove(id, reason),
      successMessage: t("listings.toasts.deleted"),
      invalidate,
    }),
    restore: useActionMutation({
      mutationFn: ({ id }: { id: string }) => listingsService.restore(id),
      successMessage: t("listings.toasts.restored"),
      invalidate,
    }),
  };
}
