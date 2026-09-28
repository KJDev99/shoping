import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/components/admin/layout/require-permission";
import { ReportsPage } from "@/components/admin/reports/reports-page";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return (
    <RequirePermission permission="reports.read">
      <Suspense>
        <ReportsPage />
      </Suspense>
    </RequirePermission>
  );
}
