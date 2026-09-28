"use client";

import Link from "next/link";
import { formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { ChartColor } from "./time-series-chart";

export interface RankedBarItem {
  id: string;
  label: string;
  value: number;
  href?: string;
}

/**
 * Horizontal ranked bars (single hue). Values are printed in text tokens next
 * to each bar, so the chart reads without hover and works at phone width.
 */
export function RankedBars({ items, color = "chart-1", emptyLabel, className }: { items: RankedBarItem[]; color?: ChartColor; emptyLabel: string; className?: string }) {
  const [locale] = useLocale();
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className={cn("py-6 text-center text-sm text-muted-foreground", className)}>{emptyLabel}</p>;
  return (
    <ol className={cn("space-y-2.5", className)}>
      {items.map((item) => {
        const label = item.href ? (
          <Link href={item.href} className="truncate hover:underline">
            {item.label}
          </Link>
        ) : (
          <span className="truncate">{item.label}</span>
        );
        return (
          <li key={item.id} className="space-y-1" title={`${item.label}: ${formatNumber(item.value, locale)}`}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              {label}
              <span className="shrink-0 font-medium tabular-nums">{formatNumber(item.value, locale)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: `var(--${color})` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
