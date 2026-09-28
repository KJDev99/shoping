import { api } from "@/lib/api/client";
import type { ChangePasswordInput, ForgotPasswordInput, LoginInput, ProfileInput, ResetPasswordInput } from "@/schemas/auth.schema";
import type { Admin, AdminSession } from "@/types";

export const authService = {
  login: (input: LoginInput) => api.post<AdminSession>("/auth/login", input),
  logout: () => api.post<null>("/auth/logout"),
  me: () => api.get<AdminSession>("/auth/me"),
  forgotPassword: (input: ForgotPasswordInput) => api.post<{ devResetToken: string | null }>("/auth/forgot-password", input),
  resetPassword: (input: ResetPasswordInput) => api.post<null>("/auth/reset-password", input),
  updateProfile: (input: ProfileInput) => api.patch<Admin>("/auth/profile", input),
  changePassword: (input: ChangePasswordInput) => api.post<null>("/auth/change-password", input),
};
