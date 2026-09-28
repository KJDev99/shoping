import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/components/admin/layout/require-permission";
import { ReportDetailPage } from "@/components/admin/reports/report-detail-page";

export const metadata: Metadata = { title: "Report" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequirePermission permission="reports.read">
      <Suspense>
        <ReportDetailPage id={id} />
      </Suspense>
    </RequirePermission>
  );
}
