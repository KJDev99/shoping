import { z } from "./z";
import { phoneSchema } from "./auth.schema";

export const userUpdateSchema = z.object({
  firstName: z.string().trim().min(2, "validation.min2").max(50, "validation.max50"),
  lastName: z.string().trim().min(2, "validation.min2").max(50, "validation.max50"),
  phone: phoneSchema,
  email: z.string().trim().email("validation.email").nullable().or(z.literal("")),
  regionId: z.string().min(1, "validation.required"),
  districtId: z.string().nullable().optional(),
  bio: z.string().trim().max(300, "validation.max300").nullable().optional(),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const suspendUserSchema = z.object({
  reason: z.string().trim().min(3, "validation.reasonRequired").max(1000, "validation.max1000"),
  days: z.coerce.number().int().min(1, "validation.min1").max(365, "validation.max365"),
});
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
