"use client";

import { Clock, PackageOpen, Plus, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/common/button-link";
import { EmptyState, ErrorState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyListings, useSiteUser } from "@/hooks/use-site";
import { useT } from "@/lib/i18n/provider";
import type { ListingStatus, MyListing } from "@/types";
import { ListingCard, ListingGridSkeleton } from "./listing-card";

const TABS = ["ALL", "ACTIVE", "PENDING", "REJECTED"] as const;

export function MyListingsPage() {
  const t = useT();
  const router = useRouter();
  const user = useSiteUser();
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");
  const query = useMyListings({ page: 1, limit: 100, filters: { status: tab === "ALL" ? undefined : tab } });

  useEffect(() => {
    if (user.isSuccess && !user.data) router.replace("/login?next=/my/listings");
  }, [user.isSuccess, user.data, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("site.my.title")}</h1>
          <p className="text-muted-foreground">{t("site.my.subtitle")}</p>
        </div>
        <ButtonLink href="/listings/new" className="h-11 rounded-full px-5">
          <Plus /> {t("site.nav.post")}
        </ButtonLink>
      </div>

      <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Tabs value={tab} onValueChange={(v) => setTab(v as (typeof TABS)[number])}>
          <TabsList>
            {TABS.map((s) => (
              <TabsTrigger key={s} value={s}>
                {s === "ALL" ? t("site.my.all") : t(`enums.listingStatus.${s}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {query.isPending || user.isPending ? (
        <ListingGridSkeleton count={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          icon={<PackageOpen />}
          title={t("site.my.empty")}
          action={<ButtonLink href="/listings/new">{t("site.my.emptyCta")}</ButtonLink>}
          className="rounded-3xl surface"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {query.data.data.map((l) => (
            <ListingCard key={l.id} listing={l} footer={<StatusFooter listing={l} />} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusFooter({ listing: l }: { listing: MyListing }) {
  const t = useT();
  const reason = l.rejectionNote || (l.rejectionReason ? t(`enums.rejectionReason.${l.rejectionReason}`) : "");
  return (
    <div className="space-y-1.5 border-t px-3 py-2.5 text-xs sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <StatusBadge kind="listingStatus" value={l.status as ListingStatus} />
        <span className="text-muted-foreground">{t("site.my.views", { count: l.views })}</span>
      </div>
      {l.status === "PENDING" && (
        <p className="flex items-center gap-1 text-muted-foreground">
          <Clock className="size-3" /> {t("site.my.pendingHint")}
        </p>
      )}
      {l.status === "REJECTED" && reason && (
        <p className="flex items-start gap-1 text-destructive">
          <XCircle className="mt-px size-3 shrink-0" /> {t("site.my.rejected", { reason })}
        </p>
      )}
    </div>
  );
}
