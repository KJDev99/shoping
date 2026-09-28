import { z } from "./z";

/** Body for any moderation-style action that must carry a justification. */
export const reasonSchema = z.object({
  reason: z.string().trim().min(3, "validation.reasonRequired").max(1000, "validation.max1000"),
});
export type ReasonInput = z.infer<typeof reasonSchema>;

/** Same, but reason is optional (e.g. approve, restore, unblock). */
export const optionalReasonSchema = z.object({
  reason: z.string().trim().max(1000, "validation.max1000").optional().or(z.literal("")),
});
export type OptionalReasonInput = z.infer<typeof optionalReasonSchema>;

export const noteSchema = z.object({
  body: z.string().trim().min(3, "validation.min3").max(2000, "validation.max2000"),
});
export type NoteInput = z.infer<typeof noteSchema>;
