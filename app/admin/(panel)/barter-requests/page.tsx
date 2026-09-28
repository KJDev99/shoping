import type { Metadata } from "next";
import { Suspense } from "react";
import { BarterRequestsPage } from "@/components/admin/barter/barter-requests-page";
import { RequirePermission } from "@/components/admin/layout/require-permission";

export const metadata: Metadata = { title: "Barter requests" };

export default function Page() {
  return (
    <RequirePermission permission="barter.read">
      <Suspense>
        <BarterRequestsPage />
      </Suspense>
    </RequirePermission>
  );
}
