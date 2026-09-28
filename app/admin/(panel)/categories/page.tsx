import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoriesPage } from "@/components/admin/categories/categories-page";
import { RequirePermission } from "@/components/admin/layout/require-permission";

export const metadata: Metadata = { title: "Categories" };

export default function Page() {
  return (
    <RequirePermission permission="categories.manage">
      <Suspense>
        <CategoriesPage />
      </Suspense>
    </RequirePermission>
  );
}
