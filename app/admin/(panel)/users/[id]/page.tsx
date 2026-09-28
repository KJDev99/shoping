import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/components/admin/layout/require-permission";
import { UserDetailPage } from "@/components/admin/users/user-detail-page";

export const metadata: Metadata = { title: "User" };

export default async function Page({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  return (
    <RequirePermission permission="users.read">
      <Suspense>
        <UserDetailPage id={id} />
      </Suspense>
    </RequirePermission>
  );
}
