"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ComparisonItem } from "@/components/admin/shared/barter-comparison";
import { DateCell, ItemImage } from "@/components/common/cells";
import { EmptyState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import type { Translator } from "@/lib/i18n/translate";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { ItemDetail } from "@/services/barter.service";
import type { ListingRef, Report } from "@/types";

/** Overlapping thumbnails + first title + "+N" — compact N-item cell for tables. */
export function ItemStack({ items, className }: { items: Pick<ListingRef, "id" | "title" | "image">[]; className?: string }) {
  const t = useT();
  if (!items.length) return <span className="text-muted-foreground">—</span>;
  const shown = items.slice(0, 3);
  const extra = items.length - 1;
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)} title={items.map((i) => i.title).join(" + ")}>
      <div className="flex shrink-0 -space-x-3">
        {shown.map((item, i) => (
          <ItemImage
            key={item.id}
            src={item.image}
            alt={item.title}
            className={cn("size-9 rounded-md border-2 border-background", i > 0 && "shadow-sm")}
          />
        ))}
      </div>
      <span className="min-w-0">
        <span className="line-clamp-1 text-sm font-medium">{items[0].title}</span>
        {extra > 0 && <span className="text-xs text-muted-foreground">{t("barter.moreItems", { count: extra })}</span>}
      </span>
    </div>
  );
}

/** Builds BarterComparison items, attaching server-resolved attributes in the current locale. */
export function toComparisonItems(refs: ListingRef[], details: Record<string, ItemDetail>, t: Translator): ComparisonItem[] {
  return refs.map((ref) => ({
    id: ref.id,
    title: ref.title,
    image: ref.image,
    condition: ref.condition,
    categoryId: ref.categoryId,
    status: ref.status,
    attributes: (details[ref.id]?.attributes ?? []).map((a) => ({ label: t.text(a.label), value: t.text(a.value) })),
  }));
}

export interface TimelineEntry {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  note?: ReactNode;
  tone?: "primary" | "muted" | "danger" | "success" | "warning";
}

const DOT: Record<NonNullable<TimelineEntry["tone"]>, string> = {
  primary: "bg-primary",
  muted: "bg-muted-foreground/60",
  danger: "bg-destructive",
  success: "bg-success",
  warning: "bg-warning",
};

/** Vertical timeline used for barter/exchange/dispute history. */
export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="relative space-y-4 border-l pl-5">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span className={cn("absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-background", DOT[e.tone ?? "primary"])} />
          <div className="flex flex-wrap items-center gap-2 text-sm">{e.title}</div>
          {e.note && <p className="mt-1 text-sm wrap-break-word">{e.note}</p>}
          {e.meta && <p className="mt-0.5 text-xs text-muted-foreground">{e.meta}</p>}
        </li>
      ))}
    </ol>
  );
}

/** Compact list of reports linking to the report detail page. */
export function ReportList({ reports, emptyTitle }: { reports: Report[]; emptyTitle: string }) {
  if (!reports.length) return <EmptyState icon={<Flag />} title={emptyTitle} className="py-6" />;
  return (
    <ul className="-my-2 divide-y">
      {reports.map((r) => (
        <li key={r.id}>
          <Link href={`/admin/reports/${r.id}`} className="flex flex-col gap-1.5 py-2.5 hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-3">
            <span className="font-mono text-xs sm:w-20">{r.code}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge kind="reportTarget" value={r.targetType} dot={false} />
                <StatusBadge kind="reportReason" value={r.reason} dot={false} />
              </div>
              <p className="mt-1 line-clamp-1 text-sm">{r.target.label}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{r.reporter.fullName}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge kind="reportStatus" value={r.status} />
              <DateCell value={r.createdAt} className="text-xs text-muted-foreground" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
