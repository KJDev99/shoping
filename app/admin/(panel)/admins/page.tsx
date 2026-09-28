import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminsPage } from "@/components/admin/admins/admins-page";
import { RequirePermission } from "@/components/admin/layout/require-permission";

export const metadata: Metadata = { title: "Admins & roles" };

export default function Page() {
  return (
    <RequirePermission permission="admins.read">
      <Suspense>
        <AdminsPage />
      </Suspense>
    </RequirePermission>
  );
}
