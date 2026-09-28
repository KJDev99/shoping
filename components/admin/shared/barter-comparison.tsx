"use client";

import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ItemImage, UserCell } from "@/components/common/cells";
import { StatusBadge } from "@/components/common/status-badge";
import { useLookupNames } from "@/hooks/use-lookups";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { ItemCondition, ListingStatus, UserRef } from "@/types";

export interface ComparisonItem {
  id: string;
  title: string;
  image: string | null;
  condition: ItemCondition;
  categoryId: string;
  status?: ListingStatus;
  /** Key attributes to show side-by-side (e.g. Storage: 128 GB). */
  attributes?: { label: string; value: string }[];
}

export interface ComparisonSide {
  /** e.g. "User A · Offered" */
  label: string;
  user: UserRef;
  items: ComparisonItem[];
  footer?: ReactNode;
}

function ItemCard({ item }: { item: ComparisonItem }) {
  const { category } = useLookupNames();
  return (
    <Link
      href={`/admin/listings/${item.id}`}
      className="group flex gap-3 rounded-lg border bg-background p-2.5 transition-colors hover:bg-muted/50"
    >
      <ItemImage src={item.image} alt={item.title} className="size-16 shrink-0 rounded-md sm:size-20" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="line-clamp-2 text-sm font-medium group-hover:underline">{item.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge kind="itemCondition" value={item.condition} dot={false} />
          {item.status && <StatusBadge kind="listingStatus" value={item.status} />}
        </div>
        <p className="truncate text-xs text-muted-foreground">{category(item.categoryId)}</p>
        {item.attributes && item.attributes.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1 text-xs">
            {item.attributes.slice(0, 6).map((a) => (
              <div key={a.label} className="flex min-w-0 gap-1">
                <dt className="shrink-0 text-muted-foreground">{a.label}:</dt>
                <dd className="truncate">{a.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Link>
  );
}

function SideColumn({ side, accent }: { side: ComparisonSide; accent: "a" | "b" }) {
  const t = useT();
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-3 rounded-xl border p-3 sm:p-4", accent === "a" ? "bg-primary/[0.03]" : "bg-chart-3/[0.04]")}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-xs font-semibold tracking-wide uppercase", accent === "a" ? "text-primary" : "text-chart-3")}>{side.label}</span>
        <span className="text-xs text-muted-foreground">{t("common.misc.items", { count: side.items.length })}</span>
      </div>
      <UserCell user={side.user} />
      <div className="flex flex-col gap-2">
        {side.items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
      {side.footer}
    </div>
  );
}

/**
 * The core barter visual: what side A gives ↔ what side B gives.
 * Supports N ↔ M items. Used by barter requests, exchanges and matches.
 */
export function BarterComparison({ left, right, center, className }: { left: ComparisonSide; right: ComparisonSide; center?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-stretch gap-3 lg:flex-row", className)}>
      <SideColumn side={left} accent="a" />
      <div className="flex shrink-0 flex-row items-center justify-center gap-2 lg:w-20 lg:flex-col">
        <span className="flex size-10 items-center justify-center rounded-full border bg-background shadow-sm">
          <ArrowLeftRight className="size-4 rotate-90 lg:rotate-0" />
        </span>
        {center}
      </div>
      <SideColumn side={right} accent="b" />
    </div>
  );
}
