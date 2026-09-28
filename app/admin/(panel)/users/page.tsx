import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/components/admin/layout/require-permission";
import { UsersPage } from "@/components/admin/users/users-page";

export const metadata: Metadata = { title: "Users" };

export default function Page() {
  return (
    <RequirePermission permission="users.read">
      <Suspense>
        <UsersPage />
      </Suspense>
    </RequirePermission>
  );
}
