import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/components/admin/layout/require-permission";
import { MatchesPage } from "@/components/admin/matches/matches-page";

export const metadata: Metadata = { title: "Matching" };

export default function Page() {
  return (
    <RequirePermission permission="matches.read">
      <Suspense>
        <MatchesPage />
      </Suspense>
    </RequirePermission>
  );
}
