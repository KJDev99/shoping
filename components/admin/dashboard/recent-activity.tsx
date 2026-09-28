"use client";

import { ArrowLeftRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { DateCell, ItemImage, UserAvatar } from "@/components/common/cells";
import { ButtonLink } from "@/components/common/button-link";
import { Section } from "@/components/common/info-list";
import { StatusBadge } from "@/components/common/status-badge";
import { ErrorState, ListSkeleton } from "@/components/common/states";
import { useDashboardRecent } from "@/hooks/use-dashboard";
import { useLookupNames } from "@/hooks/use-lookups";
import { useT } from "@/lib/i18n/provider";

function Row({ href, media, title, meta, aside }: { href: string; media: ReactNode; title: ReactNode; meta: ReactNode; aside?: ReactNode }) {
  return (
    <li>
      <Link href={href} className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
        <span className="shrink-0">{media}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium group-hover:underline">{title}</span>
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">{meta}</span>
        </span>
        {aside && <span className="hidden shrink-0 sm:block">{aside}</span>}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />
      </Link>
    </li>
  );
}

function RecentList({ title, viewAllHref, isEmpty, children }: { title: string; viewAllHref: string; isEmpty: boolean; children: ReactNode }) {
  const t = useT();
  return (
    <Section
      title={title}
      contentClassName="px-4 py-2"
      action={
        <ButtonLink href={viewAllHref} variant="ghost" size="xs">
          {t("dashboard.recent.viewAll")}
        </ButtonLink>
      }
    >
      {isEmpty ? <p className="py-6 text-center text-sm text-muted-foreground">{t("dashboard.recent.empty")}</p> : <ul className="divide-y">{children}</ul>}
    </Section>
  );
}

function SectionSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <ListSkeleton rows={5} />
    </div>
  );
}

export function RecentActivity() {
  const t = useT();
  const names = useLookupNames();
  const query = useDashboardRecent();

  if (query.isPending)
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <SectionSkeleton key={i} />
        ))}
      </div>
    );
  if (query.isError)
    return (
      <div className="rounded-xl border bg-card">
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </div>
    );

  const { users, listings, barterRequests, reports } = query.data;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <RecentList title={t("dashboard.recent.users")} viewAllHref="/admin/users" isEmpty={!users.length}>
        {users.map((u) => (
          <Row
            key={u.id}
            href={`/admin/users/${u.id}`}
            media={<UserAvatar name={u.fullName} src={u.avatar} className="size-9" />}
            title={u.fullName}
            meta={
              <>
                <span>{names.region(u.regionId)}</span>
                <span aria-hidden>·</span>
                <DateCell value={u.createdAt} />
              </>
            }
            aside={<StatusBadge kind="userStatus" value={u.status} />}
          />
        ))}
      </RecentList>

      <RecentList title={t("dashboard.recent.listings")} viewAllHref="/admin/listings" isEmpty={!listings.length}>
        {listings.map((l) => (
          <Row
            key={l.id}
            href={`/admin/listings/${l.id}`}
            media={<ItemImage src={l.images[0]?.url} alt={l.title} className="size-9 rounded-md" />}
            title={l.title}
            meta={
              <>
                <span className="font-mono">{l.code}</span>
                <span aria-hidden>·</span>
                <span className="truncate">{l.owner.fullName}</span>
                <span aria-hidden>·</span>
                <DateCell value={l.createdAt} />
              </>
            }
            aside={<StatusBadge kind="listingStatus" value={l.status} />}
          />
        ))}
      </RecentList>

      <RecentList title={t("dashboard.recent.barterRequests")} viewAllHref="/admin/barter-requests" isEmpty={!barterRequests.length}>
        {barterRequests.map((b) => (
          <Row
            key={b.id}
            href={`/admin/barter-requests/${b.id}`}
            media={
              <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <ArrowLeftRight className="size-4" />
              </span>
            }
            title={
              <>
                {b.sender.fullName} <span className="text-muted-foreground">→</span> {b.receiver.fullName}
              </>
            }
            meta={
              <>
                <span className="font-mono">{b.code}</span>
                <span aria-hidden>·</span>
                <span>{t("common.misc.items", { count: b.items.length })}</span>
                <span aria-hidden>·</span>
                <DateCell value={b.createdAt} />
              </>
            }
            aside={<StatusBadge kind="barterStatus" value={b.status} />}
          />
        ))}
      </RecentList>

      <RecentList title={t("dashboard.recent.reports")} viewAllHref="/admin/reports" isEmpty={!reports.length}>
        {reports.map((r) => (
          <Row
            key={r.id}
            href={`/admin/reports/${r.id}`}
            media={<ItemImage src={r.target.image} alt={r.target.label} className="size-9 rounded-md" />}
            title={r.target.label}
            meta={
              <>
                <span className="font-mono">{r.code}</span>
                <span aria-hidden>·</span>
                <span>{t(`enums.reportReason.${r.reason}`)}</span>
                <span aria-hidden>·</span>
                <DateCell value={r.createdAt} />
              </>
            }
            aside={<StatusBadge kind="reportStatus" value={r.status} />}
          />
        ))}
      </RecentList>
    </div>
  );
}
