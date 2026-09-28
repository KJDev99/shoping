import type { Metadata } from "next";
import { Suspense } from "react";
import { ExchangeDetailPage } from "@/components/admin/exchanges/exchange-detail-page";
import { RequirePermission } from "@/components/admin/layout/require-permission";

export const metadata: Metadata = { title: "Exchange" };

export default async function Page({ params }: PageProps<"/admin/exchanges/[id]">) {
  const { id } = await params;
  return (
    <RequirePermission permission="exchanges.read">
      <Suspense>
        <ExchangeDetailPage id={id} />
      </Suspense>
    </RequirePermission>
  );
}
