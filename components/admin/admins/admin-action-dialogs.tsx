"use client";

import { ArrowRight, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { SimpleSelect } from "@/components/common/simple-select";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Field } from "@/components/forms/field";
import { Textarea } from "@/components/ui/textarea";
import { useAdminActions } from "@/hooks/use-admins";
import { useT } from "@/lib/i18n/provider";
import { ROLE_PERMISSIONS } from "@/lib/rbac";
import { ADMIN_ROLES, type Admin, type AdminRole } from "@/types";
import { AdminCreateSheet, AdminEditSheet } from "./admin-form-sheet";

export type AdminAction = "edit" | "role" | "block" | "activate";

function RoleChangeSummary({ from, to }: { from: AdminRole; to: AdminRole | null }) {
  const t = useT();
  if (!to || to === from) return <p className="text-xs text-muted-foreground">{t("admins.roleDialog.noChange")}</p>;
  const before = new Set(ROLE_PERMISSIONS[from]);
  const after = new Set(ROLE_PERMISSIONS[to]);
  const gained = [...after].filter((p) => !before.has(p));
  const lost = [...before].filter((p) => !after.has(p));
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
      <div className="flex items-center gap-2">
        <StatusBadge kind="adminRole" value={from} dot={false} />
        <ArrowRight className="size-3.5 text-muted-foreground" />
        <StatusBadge kind="adminRole" value={to} dot={false} />
      </div>
      {gained.length > 0 && (
        <div>
          <p className="flex items-center gap-1 font-medium text-success">
            <Plus className="size-3.5" /> {t("admins.roleDialog.gained", { count: gained.length })}
          </p>
          <ul className="mt-1 ml-5 list-disc text-muted-foreground">
            {gained.map((p) => (
              <li key={p}>{t(`admins.permissions.${p}`)}</li>
            ))}
          </ul>
        </div>
      )}
      {lost.length > 0 && (
        <div>
          <p className="flex items-center gap-1 font-medium text-destructive">
            <Minus className="size-3.5" /> {t("admins.roleDialog.lost", { count: lost.length })}
          </p>
          <ul className="mt-1 ml-5 list-disc text-muted-foreground">
            {lost.map((p) => (
              <li key={p}>{t(`admins.permissions.${p}`)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Owns the admin management dialogs. Use `open(action, admin)` / `openCreate()`
 * and render `dialogs` once.
 */
export function useAdminDialogs() {
  const t = useT();
  const actions = useAdminActions();
  const [state, setState] = useState<{ action: AdminAction; admin: Admin } | null>(null);
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [roleReason, setRoleReason] = useState("");
  const close = () => setState(null);
  const admin = state?.admin;
  const name = admin ? `${admin.firstName} ${admin.lastName}` : "";

  const dialogs = (
    <>
      <AdminCreateSheet open={creating} onOpenChange={setCreating} />
      {admin && (
        <>
          <AdminEditSheet admin={admin} open={state.action === "edit"} onOpenChange={(o) => !o && close()} />
          <ConfirmDialog
            open={state.action === "role"}
            onOpenChange={(o) => !o && close()}
            title={t("admins.roleDialog.title", { name })}
            description={t("admins.roleDialog.description")}
            confirmLabel={t("admins.roleDialog.confirm")}
            canConfirm={!!role && role !== admin.role}
            onConfirm={() => actions.changeRole.mutateAsync({ id: admin.id, input: { role: role!, reason: roleReason.trim() } })}
          >
            <Field label={t("admins.roleDialog.newRole")} htmlFor="admin-new-role">
              <SimpleSelect
                id="admin-new-role"
                value={role}
                onChange={setRole}
                options={ADMIN_ROLES.map((r) => ({ value: r, label: t(`enums.adminRole.${r}`), disabled: r === admin.role }))}
              />
            </Field>
            <RoleChangeSummary from={admin.role} to={role} />
            <Field label={t("common.confirm.reasonLabel")} htmlFor="admin-role-reason">
              <Textarea
                id="admin-role-reason"
                rows={2}
                maxLength={1000}
                value={roleReason}
                onChange={(e) => setRoleReason(e.target.value)}
                placeholder={t("admins.roleDialog.reasonPlaceholder")}
              />
            </Field>
          </ConfirmDialog>
          <ConfirmDialog
            open={state.action === "block"}
            onOpenChange={(o) => !o && close()}
            title={t("admins.blockDialog.title", { name })}
            description={t("admins.blockDialog.description")}
            confirmLabel={t("admins.actions.block")}
            variant="destructive"
            reason={{ required: false }}
            onConfirm={({ reason }) => actions.block.mutateAsync({ id: admin.id, reason: reason || undefined })}
          />
          <ConfirmDialog
            open={state.action === "activate"}
            onOpenChange={(o) => !o && close()}
            title={t("admins.activateDialog.title", { name })}
            description={t("admins.activateDialog.description")}
            confirmLabel={t("admins.actions.activate")}
            reason={{ required: false }}
            onConfirm={({ reason }) => actions.activate.mutateAsync({ id: admin.id, reason: reason || undefined })}
          />
        </>
      )}
    </>
  );

  return {
    open: (action: AdminAction, a: Admin) => {
      if (action === "role") {
        setRole(null);
        setRoleReason("");
      }
      setState({ action, admin: a });
    },
    openCreate: () => setCreating(true),
    dialogs,
  };
}
