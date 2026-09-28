import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/components/admin/layout/require-permission";
import { SettingsPage } from "@/components/admin/settings/settings-page";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <RequirePermission permission="settings.read">
      <Suspense>
        <SettingsPage />
      </Suspense>
    </RequirePermission>
  );
}
