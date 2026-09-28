import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin/layout/admin-shell";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const sidebarState = (await cookies()).get("sidebar_state")?.value;
  return <AdminShell defaultSidebarOpen={sidebarState !== "false"}>{children}</AdminShell>;
}
