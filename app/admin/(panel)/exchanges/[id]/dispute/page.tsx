import type { Metadata } from "next";
import { Suspense } from "react";
import { DisputePage } from "@/components/admin/exchanges/dispute-page";
import { RequirePermission } from "@/components/admin/layout/require-permission";

export const metadata: Metadata = { title: "Dispute" };

export default async function Page({ params }: PageProps<"/admin/exchanges/[id]/dispute">) {
  const { id } = await params;
  return (
    <RequirePermission permission={["exchanges.read", "disputes.manage"]}>
      <Suspense>
        <DisputePage exchangeId={id} />
      </Suspense>
    </RequirePermission>
  );
}
