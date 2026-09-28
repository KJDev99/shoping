import { AuthLayoutShell } from "@/components/admin/auth/auth-layout-shell";

export default function AuthLayout({ children }: LayoutProps<"/admin">) {
  return <AuthLayoutShell>{children}</AuthLayoutShell>;
}
