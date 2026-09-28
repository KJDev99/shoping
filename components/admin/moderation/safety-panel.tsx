"use client";

import { AlertTriangle, Copy, Flag, Info, RotateCcw, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ListingCell, UserCell } from "@/components/common/cells";
import { Section } from "@/components/common/info-list";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { Pill, StatusBadge } from "@/components/common/status-badge";
import { useSafetyOverview } from "@/hooks/use-moderation";
import { useT } from "@/lib/i18n/provider";
import type { SafetyListingRow, SafetyUserRow } from "@/schemas/moderation.schema";

function SafetyList<T>({ title, icon, items, render }: { title: string; icon: ReactNode; items: T[]; render: (item: T) => ReactNode }) {
  const t = useT();
  return (
    <Section
      title={
        <span className="inline-flex items-center gap-1.5 [&_svg]:size-4 [&_svg]:text-muted-foreground">
          {icon}
          {title}
        </span>
      }
      contentClassName={items.length ? "p-0" : undefined}
    >
      {items.length === 0 ? <EmptyState title={t("moderation.safety.empty")} className="py-6" /> : <ul className="divide-y">{items.map(render)}</ul>}
    </Section>
  );
}

function UserRow({ user }: { user: SafetyUserRow }) {
  const t = useT();
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
      <UserCell user={user} className="min-w-0 flex-1" />
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge kind="riskLevel" value={user.riskLevel} />
        {user.status !== "ACTIVE" && <StatusBadge kind="userStatus" value={user.status} />}
        {user.reportsCount > 0 && <Pill tone={user.reportsCount >= 5 ? "danger" : "neutral"}>{t("moderation.safety.reports", { count: user.reportsCount })}</Pill>}
        {user.signals
          .filter((s) => s !== "RISK_LEVEL")
          .map((s) => (
            <Pill key={s} tone="warning">
              {t(`moderation.signals.${s}`)}
            </Pill>
          ))}
      </div>
    </li>
  );
}

function ListingRow({ listing, mode }: { listing: SafetyListingRow; mode: "reports" | "rejections" | "duplicate" }) {
  const t = useT();
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
      <ListingCell listing={listing} secondary={`${listing.code} · ${listing.owner.fullName}`} className="min-w-0 flex-1" />
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge kind="listingStatus" value={listing.status} />
        {mode === "reports" && <Pill tone={listing.reportsCount >= 3 ? "danger" : "warning"}>{t("moderation.safety.reports", { count: listing.reportsCount })}</Pill>}
        {mode === "rejections" && <Pill tone="warning">{t("moderation.safety.rejections", { count: listing.rejectionCount })}</Pill>}
        {mode === "duplicate" && listing.duplicateOf && (
          <Link href={`/admin/listings/${listing.duplicateOf.id}`} className="text-xs text-primary hover:underline">
            {t("moderation.safety.duplicateOf", { code: listing.duplicateOf.code })}
          </Link>
        )}
      </div>
    </li>
  );
}

/** Operational safety indicators. Copy makes clear these are hints, never accusations. */
export function SafetyPanel() {
  const t = useT();
  const query = useSafetyOverview();

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/5 p-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <div className="space-y-2">
          <p>{t("moderation.safety.disclaimer")}</p>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge kind="riskLevel" value="LOW" />
            <StatusBadge kind="riskLevel" value="NEEDS_REVIEW" />
            <StatusBadge kind="riskLevel" value="HIGH_REPORTS" />
          </div>
        </div>
      </div>

      {query.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <ListSkeleton rows={4} />
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border bg-card">
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <SafetyList title={t("moderation.safety.usersWithManyReports")} icon={<Users />} items={query.data.usersWithManyReports} render={(u) => <UserRow key={u.id} user={u} />} />
          <SafetyList
            title={t("moderation.safety.listingsWithManyReports")}
            icon={<Flag />}
            items={query.data.listingsWithManyReports}
            render={(l) => <ListingRow key={l.id} listing={l} mode="reports" />}
          />
          <SafetyList
            title={t("moderation.safety.repeatedlyRejected")}
            icon={<RotateCcw />}
            items={query.data.repeatedlyRejectedListings}
            render={(l) => <ListingRow key={l.id} listing={l} mode="rejections" />}
          />
          <SafetyList title={t("moderation.safety.possibleDuplicates")} icon={<Copy />} items={query.data.possibleDuplicates} render={(l) => <ListingRow key={l.id} listing={l} mode="duplicate" />} />
          <SafetyList
            title={t("moderation.safety.suspiciousActivity")}
            icon={<AlertTriangle />}
            items={query.data.suspiciousActivity}
            render={(u) => <UserRow key={u.id} user={u} />}
          />
        </div>
      )}
    </div>
  );
}
