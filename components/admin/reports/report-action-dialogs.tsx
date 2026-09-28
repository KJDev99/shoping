"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { useReportActions } from "@/hooks/use-reports";
import { useT } from "@/lib/i18n/provider";
import type { Report } from "@/types";

export type ReportAction = "review" | "resolve" | "reject" | "blockListing" | "blockUser" | "suspendUser";

export interface ReportActionTarget {
  report: Report;
  /** Display name of the responsible user (block / suspend dialogs). */
  userName?: string;
  /** Title of the reported listing (block listing dialog). */
  listingTitle?: string;
}

/**
 * Owns the confirmation dialogs for report workflow and enforcement actions.
 * Call `open(action, target)` and render `dialogs` once.
 */
export function useReportActionDialogs() {
  const t = useT();
  const actions = useReportActions();
  const [state, setState] = useState<{ action: ReportAction; target: ReportActionTarget } | null>(null);
  const [days, setDays] = useState("7");
  const close = () => setState(null);
  const daysNum = Number(days);
  const daysValid = Number.isInteger(daysNum) && daysNum >= 1 && daysNum <= 365;

  const report = state?.target.report;
  const name = state?.target.userName ?? "";
  const title = state?.target.listingTitle ?? report?.target.label ?? "";
  const assignedToOther = report?.status === "REVIEWING" && report.assignedTo;

  const dialogs = report ? (
    <>
      <ConfirmDialog
        open={state.action === "review"}
        onOpenChange={(o) => !o && close()}
        title={t("reports.dialogs.reviewTitle")}
        description={assignedToOther ? t("reports.dialogs.takeOverDescription", { name: report.assignedTo?.fullName ?? "" }) : t("reports.dialogs.reviewDescription")}
        confirmLabel={assignedToOther ? t("reports.actions.takeOver") : t("reports.actions.review")}
        onConfirm={() => actions.review.mutateAsync({ id: report.id })}
      />
      <ConfirmDialog
        open={state.action === "resolve"}
        onOpenChange={(o) => !o && close()}
        title={t("reports.dialogs.resolveTitle", { code: report.code })}
        description={t("reports.dialogs.resolveDescription")}
        confirmLabel={t("reports.actions.resolve")}
        reason={{ required: true, label: t("reports.dialogs.noteLabel"), placeholder: t("reports.dialogs.notePlaceholder") }}
        onConfirm={({ reason }) => actions.resolve.mutateAsync({ id: report.id, note: reason })}
      />
      <ConfirmDialog
        open={state.action === "reject"}
        onOpenChange={(o) => !o && close()}
        title={t("reports.dialogs.rejectTitle", { code: report.code })}
        description={t("reports.dialogs.rejectDescription")}
        confirmLabel={t("reports.actions.reject")}
        variant="destructive"
        reason={{ required: true, label: t("reports.dialogs.noteLabel"), placeholder: t("reports.dialogs.notePlaceholder") }}
        onConfirm={({ reason }) => actions.reject.mutateAsync({ id: report.id, note: reason })}
      />
      <ConfirmDialog
        open={state.action === "blockListing"}
        onOpenChange={(o) => !o && close()}
        title={t("reports.dialogs.blockListingTitle", { title })}
        description={t("reports.dialogs.blockListingDescription")}
        confirmLabel={t("reports.actions.blockListing")}
        variant="destructive"
        reason={{ required: true }}
        onConfirm={({ reason }) => actions.blockListing.mutateAsync({ id: report.id, reason })}
      />
      <ConfirmDialog
        open={state.action === "blockUser"}
        onOpenChange={(o) => !o && close()}
        title={t("reports.dialogs.blockUserTitle", { name })}
        description={t("reports.dialogs.blockUserDescription")}
        confirmLabel={t("reports.actions.blockUser")}
        variant="destructive"
        reason={{ required: true }}
        onConfirm={({ reason }) => actions.blockUser.mutateAsync({ id: report.id, reason })}
      />
      <ConfirmDialog
        open={state.action === "suspendUser"}
        onOpenChange={(o) => !o && close()}
        title={t("reports.dialogs.suspendUserTitle", { name })}
        description={t("reports.dialogs.suspendUserDescription")}
        confirmLabel={t("reports.actions.suspendUser")}
        variant="destructive"
        reason={{ required: true }}
        canConfirm={daysValid}
        onConfirm={({ reason }) => actions.suspendUser.mutateAsync({ id: report.id, input: { reason, days: daysNum } })}
      >
        <Field label={t("reports.dialogs.suspendDays")} htmlFor="report-suspend-days" error={daysValid ? undefined : { message: "validation.max365" }}>
          <Input id="report-suspend-days" type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
        </Field>
      </ConfirmDialog>
    </>
  ) : null;

  return {
    open: (action: ReportAction, target: ReportActionTarget) => {
      if (action === "suspendUser") setDays("7");
      setState({ action, target });
    },
    dialogs,
    isPending: Object.values(actions).some((m) => m.isPending),
  };
}
