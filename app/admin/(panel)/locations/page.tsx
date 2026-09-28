import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/components/admin/layout/require-permission";
import { LocationsPage } from "@/components/admin/locations/locations-page";

export const metadata: Metadata = { title: "Locations" };

export default function Page() {
  return (
    <RequirePermission permission="locations.manage">
      <Suspense>
        <LocationsPage />
      </Suspense>
    </RequirePermission>
  );
}
