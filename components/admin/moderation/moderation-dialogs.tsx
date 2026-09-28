"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { useModerationQuickActions } from "@/hooks/use-moderation";
import { useT } from "@/lib/i18n/provider";
import { REJECTION_REASONS, type ModerationQueue, type RejectionReason } from "@/types";

export type ListingDialog = "reject" | "block" | "requestCorrection" | "dismissReports" | "notDuplicate";
export type UserDialog = "blockUser" | "suspend" | "warn" | "dismissUserReports";

type DialogState =
  | { kind: "listing"; action: ListingDialog; id: string; title: string; queue: ModerationQueue }
  | { kind: "user"; action: UserDialog; id: string; name: string; queue: ModerationQueue };

export type OpenListingDialog = (action: ListingDialog, listing: { id: string; title: string }, queue: ModerationQueue) => void;
export type OpenUserDialog = (action: UserDialog, user: { id: string; fullName: string }, queue: ModerationQueue) => void;

/** Confirmation dialogs for queue quick actions. Render `dialogs` once per queue view. */
export function useModerationDialogs() {
  const t = useT();
  const actions = useModerationQuickActions();
  const [state, setState] = useState<DialogState | null>(null);
  const [days, setDays] = useState("7");
  const close = () => setState(null);
  const daysNum = Number(days);
  const daysValid = Number.isInteger(daysNum) && daysNum >= 1 && daysNum <= 365;
  const rejectionOptions = REJECTION_REASONS.map((r) => ({ value: r, label: t(`enums.rejectionReason.${r}`) }));

  const listing = state?.kind === "listing" ? state : null;
  const user = state?.kind === "user" ? state : null;
  const onOpenChange = (o: boolean) => !o && close();

  const dialogs = (
    <>
      {listing && (
        <>
          <ConfirmDialog
            open={listing.action === "reject"}
            onOpenChange={onOpenChange}
            title={t("moderation.dialogs.rejectTitle", { title: listing.title })}
            description={t("moderation.dialogs.rejectDescription")}
            confirmLabel={t("moderation.actions.reject")}
            variant="destructive"
            reason={{ required: true, options: rejectionOptions, label: t("moderation.dialogs.rejectReason") }}
            onConfirm={({ reasonCode, note }) =>
              actions.reject.mutateAsync({ id: listing.id, queue: listing.queue, input: { reason: (reasonCode ?? "OTHER") as RejectionReason, note } })
            }
          />
          <ConfirmDialog
            open={listing.action === "requestCorrection"}
            onOpenChange={onOpenChange}
            title={t("moderation.dialogs.correctionTitle", { title: listing.title })}
            description={t("moderation.dialogs.correctionDescription")}
            confirmLabel={t("moderation.actions.requestCorrection")}
            reason={{ required: true, label: t("moderation.dialogs.correctionNote") }}
            onConfirm={({ reason }) => actions.requestCorrection.mutateAsync({ id: listing.id, queue: listing.queue, input: { note: reason } })}
          />
          <ConfirmDialog
            open={listing.action === "block"}
            onOpenChange={onOpenChange}
            title={t("moderation.dialogs.blockListingTitle", { title: listing.title })}
            description={t("moderation.dialogs.blockListingDescription")}
            confirmLabel={t("moderation.actions.block")}
            variant="destructive"
            reason={{ required: true }}
            onConfirm={({ reason }) => actions.blockListing.mutateAsync({ id: listing.id, queue: listing.queue, reason })}
          />
          <ConfirmDialog
            open={listing.action === "dismissReports"}
            onOpenChange={onOpenChange}
            title={t("moderation.dialogs.dismissTitle", { title: listing.title })}
            description={t("moderation.dialogs.dismissDescription")}
            confirmLabel={t("moderation.actions.dismissReports")}
            reason={{ required: true }}
            onConfirm={({ reason }) => actions.dismissListingReports.mutateAsync({ id: listing.id, queue: listing.queue, reason })}
          />
          <ConfirmDialog
            open={listing.action === "notDuplicate"}
            onOpenChange={onOpenChange}
            title={t("moderation.dialogs.notDuplicateTitle", { title: listing.title })}
            description={t("moderation.dialogs.notDuplicateDescription")}
            confirmLabel={t("moderation.actions.notDuplicate")}
            reason={{ required: false }}
            onConfirm={({ reason }) => actions.notDuplicate.mutateAsync({ id: listing.id, queue: listing.queue, reason: reason || undefined })}
          />
        </>
      )}
      {user && (
        <>
          <ConfirmDialog
            open={user.action === "blockUser"}
            onOpenChange={onOpenChange}
            title={t("moderation.dialogs.blockUserTitle", { name: user.name })}
            description={t("moderation.dialogs.blockUserDescription")}
            confirmLabel={t("moderation.actions.blockUser")}
            variant="destructive"
            reason={{ required: true }}
            onConfirm={({ reason }) => actions.blockUser.mutateAsync({ id: user.id, queue: user.queue, reason })}
          />
          <ConfirmDialog
            open={user.action === "suspend"}
            onOpenChange={onOpenChange}
            title={t("moderation.dialogs.suspendTitle", { name: user.name })}
            description={t("moderation.dialogs.suspendDescription")}
            confirmLabel={t("moderation.actions.suspend")}
            variant="destructive"
            reason={{ required: true }}
            canConfirm={daysValid}
            onConfirm={({ reason }) => actions.suspendUser.mutateAsync({ id: user.id, queue: user.queue, input: { reason, days: daysNum } })}
          >
            <Field label={t("moderation.dialogs.suspendDays")} htmlFor="moderation-suspend-days" error={daysValid ? undefined : { message: "validation.max365" }}>
              <Input id="moderation-suspend-days" type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
            </Field>
          </ConfirmDialog>
          <ConfirmDialog
            open={user.action === "warn"}
            onOpenChange={onOpenChange}
            title={t("moderation.dialogs.warnTitle", { name: user.name })}
            description={t("moderation.dialogs.warnDescription")}
            confirmLabel={t("moderation.actions.warn")}
            reason={{ required: true }}
            onConfirm={({ reason }) => actions.warnUser.mutateAsync({ id: user.id, queue: user.queue, reason })}
          />
          <ConfirmDialog
            open={user.action === "dismissUserReports"}
            onOpenChange={onOpenChange}
            title={t("moderation.dialogs.dismissUserTitle", { name: user.name })}
            description={t("moderation.dialogs.dismissUserDescription")}
            confirmLabel={t("moderation.actions.dismissReports")}
            reason={{ required: true }}
            onConfirm={({ reason }) => actions.dismissUserReports.mutateAsync({ id: user.id, queue: user.queue, reason })}
          />
        </>
      )}
    </>
  );

  const openListing: OpenListingDialog = (action, l, queue) => setState({ kind: "listing", action, id: l.id, title: l.title, queue });
  const openUser: OpenUserDialog = (action, u, queue) => {
    if (action === "suspend") setDays("7");
    setState({ kind: "user", action, id: u.id, name: u.fullName, queue });
  };

  return { openListing, openUser, dialogs, approve: actions.approve };
}
