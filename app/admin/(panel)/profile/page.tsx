import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfilePage } from "@/components/admin/profile/profile-page";

export const metadata: Metadata = { title: "My profile" };

/** Available to every authenticated admin (the panel layout already requires a session). */
export default function Page() {
  return (
    <Suspense>
      <ProfilePage />
    </Suspense>
  );
}
