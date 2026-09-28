import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardPage } from "@/components/admin/dashboard/dashboard-page";
import { RequirePermission } from "@/components/admin/layout/require-permission";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <RequirePermission permission="dashboard.read">
      <Suspense>
        <DashboardPage />
      </Suspense>
    </RequirePermission>
  );
}
