import { z } from "./z";

/**
 * Validation messages are translation keys (resolved by the form UI), so the
 * same schema can be shared between client forms and the API layer.
 */
export const loginSchema = z.object({
  email: z.string().trim().min(1, "validation.required").email("validation.email"),
  password: z.string().min(1, "validation.required"),
  remember: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "validation.required").email("validation.email"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const passwordSchema = z
  .string()
  .min(8, "validation.passwordMin")
  .regex(/[A-Z]/, "validation.passwordUpper")
  .regex(/[0-9]/, "validation.passwordDigit");

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "validation.required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "validation.required"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "validation.passwordMismatch",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "validation.required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "validation.required"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "validation.passwordMismatch",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+998[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/, "validation.phone");

export const profileSchema = z.object({
  firstName: z.string().trim().min(2, "validation.min2").max(50, "validation.max50"),
  lastName: z.string().trim().min(2, "validation.min2").max(50, "validation.max50"),
  phone: phoneSchema,
});
export type ProfileInput = z.infer<typeof profileSchema>;
