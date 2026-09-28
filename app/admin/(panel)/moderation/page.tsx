import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/components/admin/layout/require-permission";
import { ModerationPage } from "@/components/admin/moderation/moderation-page";

export const metadata: Metadata = { title: "Moderation" };

export default function Page() {
  return (
    <RequirePermission permission="moderation.read">
      <Suspense>
        <ModerationPage />
      </Suspense>
    </RequirePermission>
  );
}
