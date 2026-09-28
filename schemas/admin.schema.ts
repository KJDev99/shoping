import { ADMIN_ROLES } from "@/types";
import { passwordSchema, phoneSchema } from "./auth.schema";
import { z } from "./z";

const adminProfileFields = {
  firstName: z.string().trim().min(2, "validation.min2").max(50, "validation.max50"),
  lastName: z.string().trim().min(2, "validation.min2").max(50, "validation.max50"),
  email: z.string().trim().min(1, "validation.required").email("validation.email").max(100, "validation.max100"),
  phone: phoneSchema,
};

/** POST /admins — the temporary password must follow the standard password rules. */
export const adminCreateSchema = z.object({
  ...adminProfileFields,
  role: z.enum(ADMIN_ROLES),
  password: passwordSchema,
});
export type AdminCreateInput = z.infer<typeof adminCreateSchema>;

/** PATCH /admins/:id — role and status have dedicated endpoints. */
export const adminUpdateSchema = z.object(adminProfileFields);
export type AdminUpdateInput = z.infer<typeof adminUpdateSchema>;

export const adminRoleSchema = z.object({
  role: z.enum(ADMIN_ROLES),
  reason: z.string().trim().max(1000, "validation.max1000").optional().or(z.literal("")),
});
export type AdminRoleInput = z.infer<typeof adminRoleSchema>;
