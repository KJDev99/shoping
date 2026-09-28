"use client";

import { ExternalLink } from "lucide-react";
import { ButtonLink } from "@/components/common/button-link";
import { ErrorState, ListSkeleton } from "@/components/common/states";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useMatch } from "@/hooks/use-matches";
import { useT } from "@/lib/i18n/provider";
import { MatchDetailView } from "./match-detail";

export function MatchDetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useT();
  const query = useMatch(id);

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>{t("matches.detail.title")}</SheetTitle>
          <SheetDescription className="line-clamp-2">
            {query.data ? `${query.data.listingA.title} ↔ ${query.data.listingB.title}` : t("matches.engineNote.title")}
          </SheetDescription>
          {id && (
            <ButtonLink href={`/admin/matches/${encodeURIComponent(id)}`} variant="outline" size="sm" className="mt-2 w-fit">
              <ExternalLink />
              {t("matches.detail.openPage")}
            </ButtonLink>
          )}
        </SheetHeader>
        <div className="px-4 pb-6">
          {query.isPending ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-48 w-full rounded-xl" />
              <ListSkeleton rows={4} />
            </div>
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : (
            <MatchDetailView match={query.data} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
