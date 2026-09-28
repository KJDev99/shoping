import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/components/admin/layout/require-permission";
import { NotificationsPage } from "@/components/admin/notifications/notifications-page";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return (
    <RequirePermission permission="notifications.read">
      <Suspense>
        <NotificationsPage />
      </Suspense>
    </RequirePermission>
  );
}
