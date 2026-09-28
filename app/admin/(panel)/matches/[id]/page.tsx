import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/components/admin/layout/require-permission";
import { MatchDetailPage } from "@/components/admin/matches/match-detail-page";

export const metadata: Metadata = { title: "Match" };

export default async function Page({ params }: PageProps<"/admin/matches/[id]">) {
  const { id } = await params;
  return (
    <RequirePermission permission="matches.read">
      <Suspense>
        <MatchDetailPage id={decodeURIComponent(id)} />
      </Suspense>
    </RequirePermission>
  );
}
