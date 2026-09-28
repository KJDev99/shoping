"use client";

import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useExchangeActions } from "@/hooks/use-exchanges";
import { useT } from "@/lib/i18n/provider";
import type { Exchange } from "@/types";

/** Admin cancellation with a mandatory reason (audited, added to the status history). */
export function CancelExchangeDialog({ exchange, onClose }: { exchange: Pick<Exchange, "id" | "code"> | null; onClose: () => void }) {
  const t = useT();
  const { cancel } = useExchangeActions();
  return (
    <ConfirmDialog
      open={!!exchange}
      onOpenChange={(o) => !o && onClose()}
      title={t("exchanges.dialogs.cancelTitle", { code: exchange?.code ?? "" })}
      description={t("exchanges.dialogs.cancelDescription")}
      confirmLabel={t("exchanges.actions.cancel")}
      variant="destructive"
      reason={{ required: true }}
      onConfirm={({ reason }) => (exchange ? cancel.mutateAsync({ id: exchange.id, reason }) : undefined)}
    />
  );
}
