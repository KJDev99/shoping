"use client";

import { Info } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DetailSkeleton, ErrorState } from "@/components/common/states";
import { useMatch } from "@/hooks/use-matches";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { MatchDetailView } from "./match-detail";

/** Explains that matches come from deterministic rules (RULES_V1), not AI. */
export function EngineNote({ className }: { className?: string }) {
  const t = useT();
  return (
    <div className={cn("flex gap-3 rounded-xl border bg-info/5 p-3 text-sm", className)}>
      <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
      <div className="space-y-0.5">
        <p className="font-medium">{t("matches.engineNote.title")}</p>
        <p className="text-muted-foreground">{t("matches.engineNote.body")}</p>
      </div>
    </div>
  );
}

export function MatchDetailPage({ id }: { id: string }) {
  const t = useT();
  const query = useMatch(id);

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} backHref="/admin/matches" className="min-h-[50vh]" />;

  const m = query.data;
  return (
    <div className="space-y-6">
      <PageHeader title={`${m.listingA.title} ↔ ${m.listingB.title}`} description={t("matches.detail.title")} backHref="/admin/matches" backLabel={t("matches.detail.back")} />
      <EngineNote />
      <MatchDetailView match={m} />
    </div>
  );
}
