import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/components/admin/layout/require-permission";
import { ListingsPage } from "@/components/admin/listings/listings-page";

export const metadata: Metadata = { title: "Listings" };

export default function Page() {
  return (
    <RequirePermission permission="listings.read">
      <Suspense>
        <ListingsPage />
      </Suspense>
    </RequirePermission>
  );
}
