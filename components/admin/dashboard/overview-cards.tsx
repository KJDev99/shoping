"use client";

import {
  ArrowLeftRight,
  Ban,
  CircleCheck,
  Clock,
  Flag,
  Handshake,
  Package,
  PackageX,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { StatCard } from "@/components/common/stat-card";
import { CardGridSkeleton, ErrorState } from "@/components/common/states";
import { useDashboardOverview } from "@/hooks/use-dashboard";
import { useT } from "@/lib/i18n/provider";
import type { DashboardRange } from "@/services/dashboard.service";
import type { DashboardOverview } from "@/types";

type MetricKey = Exclude<keyof DashboardOverview, "deltas">;

interface CardDef {
  key: MetricKey;
  icon: ReactNode;
  href: (r: DashboardRange) => string;
  /** An increase is bad news (reports, blocks, rejections). */
  invert?: boolean;
}

const range = (r: DashboardRange) => `from=${r.from}&to=${r.to}`;

const CARDS: CardDef[] = [
  { key: "totalUsers", icon: <Users />, href: () => "/admin/users" },
  { key: "activeUsers", icon: <UserCheck />, href: () => "/admin/users?status=ACTIVE" },
  { key: "newUsers", icon: <UserPlus />, href: (r) => `/admin/users?${range(r)}` },
  { key: "totalListings", icon: <Package />, href: () => "/admin/listings" },
  { key: "activeListings", icon: <CircleCheck />, href: () => "/admin/listings?status=ACTIVE" },
  { key: "pendingListings", icon: <Clock />, href: () => "/admin/listings?status=PENDING" },
  { key: "rejectedListings", icon: <PackageX />, href: () => "/admin/listings?status=REJECTED", invert: true },
  { key: "completedExchanges", icon: <Handshake />, href: () => "/admin/exchanges?status=COMPLETED" },
  { key: "openBarterRequests", icon: <ArrowLeftRight />, href: () => "/admin/barter-requests?status=PENDING,ACCEPTED" },
  { key: "reports", icon: <Flag />, href: (r) => `/admin/reports?${range(r)}`, invert: true },
  { key: "blockedUsers", icon: <Ban />, href: () => "/admin/users?status=BLOCKED", invert: true },
];

export function OverviewCards({ range: r }: { range: DashboardRange }) {
  const t = useT();
  const query = useDashboardOverview(r);

  if (query.isPending) return <CardGridSkeleton count={CARDS.length} className="lg:grid-cols-3 xl:grid-cols-4" />;
  if (query.isError)
    return (
      <div className="rounded-xl border bg-card">
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </div>
    );

  const data = query.data;
  return (
    <div className={query.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CARDS.map((c) => {
          const delta = data.deltas[c.key];
          return (
            <StatCard
              key={c.key}
              label={t(`dashboard.stats.${c.key}`)}
              value={data[c.key]}
              icon={c.icon}
              delta={delta}
              invertDelta={c.invert}
              hint={delta !== undefined ? t("dashboard.range.vsPrevious") : undefined}
              href={c.href(r)}
            />
          );
        })}
      </div>
    </div>
  );
}
