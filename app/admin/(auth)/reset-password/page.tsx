import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/admin/auth/password-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
