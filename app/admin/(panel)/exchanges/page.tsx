import type { Metadata } from "next";
import { Suspense } from "react";
import { ExchangesPage } from "@/components/admin/exchanges/exchanges-page";
import { RequirePermission } from "@/components/admin/layout/require-permission";

export const metadata: Metadata = { title: "Exchanges" };

export default function Page() {
  return (
    <RequirePermission permission="exchanges.read">
      <Suspense>
        <ExchangesPage />
      </Suspense>
    </RequirePermission>
  );
}
