"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { SimpleSelect, type SelectOption } from "@/components/common/simple-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export interface ConfirmPayload {
  /** Free-text reason, or the selected option's label when no text was entered. */
  reason: string;
  /** Selected option value when `reasonOptions` is used (e.g. "PROHIBITED_ITEM"). */
  reasonCode?: string;
  /** Free-text note as typed (may be empty). */
  note: string;
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  /** Ask for a reason. `required` enforces min 3 chars (or a selected option). */
  reason?: {
    required?: boolean;
    label?: string;
    placeholder?: string;
    /** Predefined reasons. Choosing the option with value "OTHER" makes free text required. */
    options?: SelectOption[];
  };
  /** Extra form fields (e.g. suspension days). */
  children?: ReactNode;
  /** Extra validation for `children` fields. */
  canConfirm?: boolean;
  /**
   * Called on confirm. Return a promise: the dialog stays open with a spinner
   * until it settles and closes on success. Errors are surfaced by the caller's
   * mutation (toast), and the dialog stays open so the admin can retry.
   */
  onConfirm: (payload: ConfirmPayload) => Promise<unknown> | void;
}

/**
 * Standard confirmation for dangerous actions (delete, block, suspend, reject…).
 * Never use window.confirm / alert / prompt.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant = "default",
  reason,
  children,
  canConfirm = true,
  onConfirm,
}: ConfirmDialogProps) {
  const t = useT();
  const id = useId();
  const [note, setNote] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);

  const reset = () => {
    setNote("");
    setCode(null);
    setTouched(false);
  };

  const needsText = !!reason?.required && (!reason.options || code === "OTHER");
  const noteValid = !needsText || note.trim().length >= 3;
  const codeValid = !reason?.required || !reason.options || !!code;
  const valid = noteValid && codeValid && canConfirm;

  const handleConfirm = async () => {
    setTouched(true);
    if (!valid || pending) return;
    const optionLabel = reason?.options?.find((o) => o.value === code)?.label;
    const payload: ConfirmPayload = {
      reason: note.trim() || (typeof optionLabel === "string" ? optionLabel : code ?? ""),
      reasonCode: code ?? undefined,
      note: note.trim(),
    };
    setPending(true);
    try {
      await onConfirm(payload);
      onOpenChange(false);
      reset();
    } catch {
      // Error feedback is handled by the mutation; keep the dialog open.
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            {variant === "destructive" && (
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-4" />
              </span>
            )}
            <div className="space-y-1.5">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {description}
                {description && " "}
                <span className="text-xs">{t("common.confirm.irreversible")}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {(reason || children) && (
          <div className="space-y-4">
            {reason?.options && (
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-code`}>{reason.label ?? t("common.confirm.reasonLabel")}</Label>
                <SimpleSelect
                  id={`${id}-code`}
                  value={code}
                  onChange={setCode}
                  options={reason.options}
                  placeholder={t("common.confirm.reasonLabel")}
                  invalid={touched && !codeValid}
                />
                {touched && !codeValid && <p className="text-xs text-destructive">{t("common.confirm.reasonRequired")}</p>}
              </div>
            )}
            {reason && (
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-note`}>
                  {reason.options ? t("common.fields.notes") : (reason.label ?? t("common.confirm.reasonLabel"))}
                  {needsText && <span className="text-destructive"> *</span>}
                </Label>
                <Textarea
                  id={`${id}-note`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={reason.placeholder ?? t("common.confirm.reasonPlaceholder")}
                  rows={3}
                  maxLength={1000}
                  aria-invalid={touched && !noteValid}
                />
                {touched && !noteValid && <p className="text-xs text-destructive">{t("validation.reasonRequired")}</p>}
              </div>
            )}
            {children}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t("common.actions.cancel")}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            className={cn(variant === "destructive" && "bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90")}
            onClick={handleConfirm}
            disabled={pending || (touched && !valid)}
          >
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel ?? t("common.actions.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
