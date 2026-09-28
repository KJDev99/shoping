import type { Metadata } from "next";
import { Suspense } from "react";
import { BarterRequestDetailPage } from "@/components/admin/barter/barter-request-detail-page";
import { RequirePermission } from "@/components/admin/layout/require-permission";

export const metadata: Metadata = { title: "Barter request" };

export default async function Page({ params }: PageProps<"/admin/barter-requests/[id]">) {
  const { id } = await params;
  return (
    <RequirePermission permission="barter.read">
      <Suspense>
        <BarterRequestDetailPage id={id} />
      </Suspense>
    </RequirePermission>
  );
}
