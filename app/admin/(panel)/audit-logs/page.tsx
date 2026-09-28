import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditLogsPage } from "@/components/admin/audit/audit-logs-page";
import { RequirePermission } from "@/components/admin/layout/require-permission";

export const metadata: Metadata = { title: "Audit logs" };

export default function Page() {
  return (
    <RequirePermission permission="audit.read">
      <Suspense>
        <AuditLogsPage />
      </Suspense>
    </RequirePermission>
  );
}
