"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { useUserActions } from "@/hooks/use-users";
import { useT } from "@/lib/i18n/provider";
import type { User } from "@/types";
import { UserEditSheet } from "./user-edit-sheet";

export type UserAction = "suspend" | "block" | "unblock" | "delete" | "restore" | "edit";

/**
 * Owns the dialogs for user moderation actions. Use `open(action, user)` from
 * table rows or the detail page, and render `dialogs` once.
 */
export function useUserActionDialogs() {
  const t = useT();
  const actions = useUserActions();
  const [state, setState] = useState<{ action: UserAction; user: User } | null>(null);
  const [days, setDays] = useState("7");
  const close = () => setState(null);
  const user = state?.user;
  const name = user?.fullName ?? "";
  const daysNum = Number(days);
  const daysValid = Number.isInteger(daysNum) && daysNum >= 1 && daysNum <= 365;

  const dialogs = user ? (
    <>
      <ConfirmDialog
        open={state.action === "suspend"}
        onOpenChange={(o) => !o && close()}
        title={t("users.dialogs.suspendTitle", { name })}
        description={t("users.dialogs.suspendDescription")}
        confirmLabel={t("users.actions.suspend")}
        variant="destructive"
        reason={{ required: true }}
        canConfirm={daysValid}
        onConfirm={({ reason }) => actions.suspend.mutateAsync({ id: user.id, input: { reason, days: daysNum } })}
      >
        <Field label={t("users.dialogs.suspendDays")} htmlFor="suspend-days" error={daysValid ? undefined : { message: "validation.max365" }}>
          <Input id="suspend-days" type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
        </Field>
      </ConfirmDialog>
      <ConfirmDialog
        open={state.action === "block"}
        onOpenChange={(o) => !o && close()}
        title={t("users.dialogs.blockTitle", { name })}
        description={t("users.dialogs.blockDescription")}
        confirmLabel={t("users.actions.block")}
        variant="destructive"
        reason={{ required: true }}
        onConfirm={({ reason }) => actions.block.mutateAsync({ id: user.id, reason })}
      />
      <ConfirmDialog
        open={state.action === "unblock"}
        onOpenChange={(o) => !o && close()}
        title={t("users.dialogs.unblockTitle", { name })}
        description={t("users.dialogs.unblockDescription")}
        confirmLabel={t("users.actions.unblock")}
        reason={{ required: false }}
        onConfirm={({ reason }) => actions.unblock.mutateAsync({ id: user.id, reason: reason || undefined })}
      />
      <ConfirmDialog
        open={state.action === "delete"}
        onOpenChange={(o) => !o && close()}
        title={t("users.dialogs.deleteTitle", { name })}
        description={t("users.dialogs.deleteDescription")}
        confirmLabel={t("users.actions.delete")}
        variant="destructive"
        reason={{ required: true }}
        onConfirm={({ reason }) => actions.remove.mutateAsync({ id: user.id, reason })}
      />
      <ConfirmDialog
        open={state.action === "restore"}
        onOpenChange={(o) => !o && close()}
        title={t("users.dialogs.restoreTitle", { name })}
        description={t("users.dialogs.restoreDescription")}
        confirmLabel={t("users.actions.restore")}
        onConfirm={() => actions.restore.mutateAsync({ id: user.id })}
      />
      <UserEditSheet user={user} open={state.action === "edit"} onOpenChange={(o) => !o && close()} />
    </>
  ) : null;

  return {
    open: (action: UserAction, u: User) => {
      if (action === "suspend") setDays("7");
      setState({ action, user: u });
    },
    dialogs,
  };
}
