import { DISPUTE_RESOLUTIONS } from "@/types";
import { z } from "./z";

const reason = z.string().trim().min(3, "validation.reasonRequired").max(1000, "validation.max1000");

/** Admin cancellation of an exchange (never on behalf of a user — an administrative stop). */
export const cancelExchangeSchema = z.object({ reason });
export type CancelExchangeInput = z.infer<typeof cancelExchangeSchema>;

/** Warn one of the dispute parties. */
export const disputeWarnSchema = z.object({
  userId: z.string().min(1, "validation.required"),
  reason,
});
export type DisputeWarnInput = z.infer<typeof disputeWarnSchema>;

/** Suspend one of the dispute parties for N days. */
export const disputeSuspendSchema = z.object({
  userId: z.string().min(1, "validation.required"),
  reason,
  days: z.coerce.number().int().min(1, "validation.min1").max(365, "validation.max365"),
});
export type DisputeSuspendInput = z.infer<typeof disputeSuspendSchema>;

/** Block one of the dispute parties. */
export const disputeBlockSchema = z.object({
  userId: z.string().min(1, "validation.required"),
  reason,
});
export type DisputeBlockInput = z.infer<typeof disputeBlockSchema>;

/** Close a dispute with a final resolution. */
export const disputeCloseSchema = z.object({
  resolution: z.enum(DISPUTE_RESOLUTIONS),
  note: reason,
});
export type DisputeCloseInput = z.infer<typeof disputeCloseSchema>;
