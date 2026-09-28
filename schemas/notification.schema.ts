import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES, USER_SEGMENTS } from "@/types";
import { z } from "./z";

export const NOTIFICATION_TITLE_MAX = 120;
export const NOTIFICATION_MESSAGE_MAX = 1000;
export const NOTIFICATION_MAX_USERS = 500;

export const notificationTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ALL") }),
  z.object({
    kind: z.literal("USERS"),
    userIds: z.array(z.string().min(1)).min(1, "validation.atLeastOne").max(NOTIFICATION_MAX_USERS, "validation.invalid"),
  }),
  z.object({ kind: z.literal("REGION"), regionIds: z.array(z.string().min(1)).min(1, "validation.atLeastOne") }),
  z.object({ kind: z.literal("SEGMENT"), segment: z.enum(USER_SEGMENTS) }),
]);
export type NotificationTargetInput = z.infer<typeof notificationTargetSchema>;

/** API body for POST /notifications. `scheduledAt` (ISO) must be in the future when present. */
export const notificationCreateSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().trim().min(3, "validation.min3").max(NOTIFICATION_TITLE_MAX, "validation.max120"),
  message: z.string().trim().min(3, "validation.min3").max(NOTIFICATION_MESSAGE_MAX, "validation.max1000"),
  target: notificationTargetSchema,
  channels: z.array(z.enum(NOTIFICATION_CHANNELS)).min(1, "validation.atLeastOne"),
  scheduledAt: z
    .string()
    .datetime({ offset: true, message: "validation.invalid" })
    .nullable()
    .optional()
    .refine((v) => !v || new Date(v).getTime() > Date.now(), "validation.futureDate"),
});
export type NotificationCreateInput = z.infer<typeof notificationCreateSchema>;

export const notificationEstimateSchema = z.object({ target: notificationTargetSchema });
export type NotificationEstimateInput = z.infer<typeof notificationEstimateSchema>;

/**
 * Flat shape used by the "Send notification" form (radio + conditional
 * fields). Converted to `NotificationCreateInput` with `toNotificationInput`.
 */
export const notificationFormSchema = z
  .object({
    type: z.enum(NOTIFICATION_TYPES),
    title: z.string().trim().min(3, "validation.min3").max(NOTIFICATION_TITLE_MAX, "validation.max120"),
    message: z.string().trim().min(3, "validation.min3").max(NOTIFICATION_MESSAGE_MAX, "validation.max1000"),
    targetKind: z.enum(["ALL", "USERS", "REGION", "SEGMENT"]),
    userIds: z.array(z.string()),
    regionIds: z.array(z.string()),
    segment: z.enum(USER_SEGMENTS).nullable(),
    channels: z.array(z.enum(NOTIFICATION_CHANNELS)).min(1, "validation.atLeastOne"),
    schedule: z.boolean(),
    /** `datetime-local` value (YYYY-MM-DDTHH:mm, local time). */
    scheduledAt: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.targetKind === "USERS" && v.userIds.length === 0) ctx.addIssue({ code: "custom", path: ["userIds"], message: "validation.atLeastOne" });
    if (v.targetKind === "REGION" && v.regionIds.length === 0) ctx.addIssue({ code: "custom", path: ["regionIds"], message: "validation.atLeastOne" });
    if (v.targetKind === "SEGMENT" && !v.segment) ctx.addIssue({ code: "custom", path: ["segment"], message: "validation.required" });
    if (v.schedule) {
      const ts = v.scheduledAt ? new Date(v.scheduledAt).getTime() : NaN;
      if (Number.isNaN(ts)) ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: "validation.required" });
      else if (ts <= Date.now()) ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: "validation.futureDate" });
    }
  });
export type NotificationFormValues = z.infer<typeof notificationFormSchema>;

export function targetFromForm(v: Pick<NotificationFormValues, "targetKind" | "userIds" | "regionIds" | "segment">): NotificationTargetInput | null {
  switch (v.targetKind) {
    case "ALL":
      return { kind: "ALL" };
    case "USERS":
      return v.userIds.length ? { kind: "USERS", userIds: v.userIds } : null;
    case "REGION":
      return v.regionIds.length ? { kind: "REGION", regionIds: v.regionIds } : null;
    case "SEGMENT":
      return v.segment ? { kind: "SEGMENT", segment: v.segment } : null;
  }
}

export function toNotificationInput(v: NotificationFormValues): NotificationCreateInput {
  return {
    type: v.type,
    title: v.title,
    message: v.message,
    target: targetFromForm(v) ?? { kind: "ALL" },
    channels: v.channels,
    scheduledAt: v.schedule && v.scheduledAt ? new Date(v.scheduledAt).toISOString() : null,
  };
}
