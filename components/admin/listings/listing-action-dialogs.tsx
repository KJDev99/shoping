"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useListingActions } from "@/hooks/use-listings";
import { useT } from "@/lib/i18n/provider";
import { REJECTION_REASONS, type Listing, type RejectionReason } from "@/types";
import { ListingEditSheet } from "./listing-edit-sheet";

export type ListingAction = "reject" | "requestCorrection" | "block" | "unblock" | "archive" | "delete" | "restore" | "edit";

/**
 * Owns the dialogs for listing moderation actions. Use `open(action, listing)`
 * from table rows or the detail page, and render `dialogs` once.
 */
export function useListingActionDialogs() {
  const t = useT();
  const actions = useListingActions();
  const [state, setState] = useState<{ action: ListingAction; listing: Listing } | null>(null);
  const close = () => setState(null);
  const listing = state?.listing;
  const title = listing?.title ?? "";
  const onOpenChange = (o: boolean) => !o && close();

  const dialogs = listing ? (
    <>
      <ConfirmDialog
        open={state.action === "reject"}
        onOpenChange={onOpenChange}
        title={t("listings.dialogs.rejectTitle", { title })}
        description={t("listings.dialogs.rejectDescription")}
        confirmLabel={t("listings.actions.reject")}
        variant="destructive"
        reason={{
          required: true,
          label: t("listings.dialogs.rejectReasonLabel"),
          options: REJECTION_REASONS.map((r) => ({ value: r, label: t(`enums.rejectionReason.${r}`) })),
        }}
        onConfirm={({ reasonCode, note }) =>
          actions.reject.mutateAsync({ id: listing.id, input: { reason: reasonCode as RejectionReason, note: note || undefined } })
        }
      />
      <ConfirmDialog
        open={state.action === "requestCorrection"}
        onOpenChange={onOpenChange}
        title={t("listings.dialogs.correctionTitle", { title })}
        description={t("listings.dialogs.correctionDescription")}
        confirmLabel={t("listings.actions.requestCorrection")}
        reason={{ required: true, label: t("listings.dialogs.correctionLabel"), placeholder: t("listings.dialogs.correctionPlaceholder") }}
        onConfirm={({ reason }) => actions.requestCorrection.mutateAsync({ id: listing.id, note: reason })}
      />
      <ConfirmDialog
        open={state.action === "block"}
        onOpenChange={onOpenChange}
        title={t("listings.dialogs.blockTitle", { title })}
        description={t("listings.dialogs.blockDescription")}
        confirmLabel={t("listings.actions.block")}
        variant="destructive"
        reason={{ required: true }}
        onConfirm={({ reason }) => actions.block.mutateAsync({ id: listing.id, reason })}
      />
      <ConfirmDialog
        open={state.action === "unblock"}
        onOpenChange={onOpenChange}
        title={t("listings.dialogs.unblockTitle", { title })}
        description={t("listings.dialogs.unblockDescription")}
        confirmLabel={t("listings.actions.unblock")}
        reason={{ required: false }}
        onConfirm={({ reason }) => actions.unblock.mutateAsync({ id: listing.id, reason: reason || undefined })}
      />
      <ConfirmDialog
        open={state.action === "archive"}
        onOpenChange={onOpenChange}
        title={t("listings.dialogs.archiveTitle", { title })}
        description={t("listings.dialogs.archiveDescription")}
        confirmLabel={t("listings.actions.archive")}
        variant="destructive"
        reason={{ required: false }}
        onConfirm={({ reason }) => actions.archive.mutateAsync({ id: listing.id, reason: reason || undefined })}
      />
      <ConfirmDialog
        open={state.action === "delete"}
        onOpenChange={onOpenChange}
        title={t("listings.dialogs.deleteTitle", { title })}
        description={t("listings.dialogs.deleteDescription")}
        confirmLabel={t("listings.actions.delete")}
        variant="destructive"
        reason={{ required: true }}
        onConfirm={({ reason }) => actions.remove.mutateAsync({ id: listing.id, reason })}
      />
      <ConfirmDialog
        open={state.action === "restore"}
        onOpenChange={onOpenChange}
        title={t("listings.dialogs.restoreTitle", { title })}
        description={t("listings.dialogs.restoreDescription")}
        confirmLabel={t("listings.actions.restore")}
        onConfirm={() => actions.restore.mutateAsync({ id: listing.id })}
      />
      <ListingEditSheet listing={listing} open={state.action === "edit"} onOpenChange={onOpenChange} />
    </>
  ) : null;

  return {
    open: (action: ListingAction, l: Listing) => setState({ action, listing: l }),
    /** Approve without a dialog (fast path for the moderation workflow). */
    approveNow: (l: Listing) => actions.approve.mutate({ id: l.id }),
    isApproving: actions.approve.isPending,
    dialogs,
  };
}
