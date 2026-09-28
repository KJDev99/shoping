"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/format";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  /** Fractional change vs. previous period (0.12 = +12%). */
  delta?: number;
  /** When true, an increase is bad (e.g. reports, blocked users). */
  invertDelta?: boolean;
  hint?: ReactNode;
  href?: string;
  className?: string;
}

export function StatCard({ label, value, icon, delta, invertDelta, hint, href, className }: StatCardProps) {
  const [locale] = useLocale();
  const good = delta === undefined ? null : invertDelta ? delta <= 0 : delta >= 0;
  const body = (
    <Card className={cn("gap-2 p-4 transition-colors", href && "hover:bg-muted/40", className)}>
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="truncate">{label}</span>
        {icon && <span className="text-muted-foreground/70 [&_svg]:size-4">{icon}</span>}
      </div>
      <div className="text-2xl font-semibold tracking-tight">{typeof value === "number" ? formatNumber(value, locale) : value}</div>
      {(delta !== undefined || hint) && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {delta !== undefined && (
            <span className={cn("inline-flex items-center gap-0.5 font-medium", good ? "text-success" : "text-destructive")}>
              {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {delta >= 0 ? "+" : ""}
              {formatPercent(delta, locale)}
            </span>
          )}
          {hint}
        </div>
      )}
    </Card>
  );
  return href ? <Link href={href} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">{body}</Link> : body;
}
