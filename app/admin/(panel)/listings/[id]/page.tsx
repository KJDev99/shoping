import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/components/admin/layout/require-permission";
import { ListingDetailPage } from "@/components/admin/listings/listing-detail-page";

export const metadata: Metadata = { title: "Listing" };

export default async function Page({ params }: PageProps<"/admin/listings/[id]">) {
  const { id } = await params;
  return (
    <RequirePermission permission="listings.read">
      <Suspense>
        <ListingDetailPage id={id} />
      </Suspense>
    </RequirePermission>
  );
}
