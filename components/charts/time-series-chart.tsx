"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { formatDate, formatNumber, formatShortDate } from "@/lib/format";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { Locale, TimeSeriesPoint } from "@/types";

/** One fixed CSS color per metric (never re-assigned by rank). */
export type ChartColor = "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5";

/** "YYYY-MM-DD" → local Date (avoids UTC shift). */
function parseDay(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function formatDay(s: string, locale: Locale, withYear = false): string {
  if (locale === "uz") {
    const d = parseDay(s);
    return withYear ? formatDate(d.toISOString(), locale) : formatShortDate(d.toISOString(), locale);
  }
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) }).format(parseDay(s));
}

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  /** Series name shown in the tooltip (the card title names the chart; no legend for a single series). */
  label: string;
  color: ChartColor;
  /** Formats the tooltip heading for a bucket start date (e.g. "Week of 3 Mar"). */
  formatBucket?: (date: string, formatted: string) => string;
  className?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  seriesLabel,
  color,
  heading,
}: Pick<TooltipContentProps<number, string>, "active" | "payload" | "label"> & { seriesLabel: string; color: ChartColor; heading: (date: string) => string }) {
  const [locale] = useLocale();
  if (!active || !payload?.length || typeof label !== "string") return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="min-w-36 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{heading(label)}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden className="size-2 rounded-full" style={{ background: `var(--${color})` }} />
          {seriesLabel}
        </span>
        <span className="font-medium tabular-nums">{formatNumber(value, locale)}</span>
      </div>
    </div>
  );
}

/**
 * Single-series area chart for counts over time: 2px line, light fill,
 * recessive grid, crosshair tooltip. Colors come from `var(--chart-N)` so
 * light/dark themes are handled by CSS tokens.
 */
export function TimeSeriesChart({ data, label, color, formatBucket, className }: TimeSeriesChartProps) {
  const [locale] = useLocale();
  const spansYears = useMemo(() => data.length > 1 && data[0].date.slice(0, 4) !== data[data.length - 1].date.slice(0, 4), [data]);
  const stroke = `var(--${color})`;
  const heading = (d: string) => {
    const formatted = formatDay(d, locale, true);
    return formatBucket ? formatBucket(d, formatted) : formatted;
  };

  return (
    <div className={cn("h-48 w-full sm:h-56", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(d: string) => formatDay(d, locale, spansYears && d.endsWith("-01"))}
            minTickGap={24}
            tickMargin={6}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(v: number) => formatNumber(v, locale, { notation: "compact" })}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
            content={({ active, payload, label: l }) => (
              <ChartTooltip active={active} payload={payload} label={l} seriesLabel={label} color={color} heading={heading} />
            )}
          />
          <Area
            type="monotone"
            dataKey="value"
            name={label}
            stroke={stroke}
            strokeWidth={2}
            fill={stroke}
            fillOpacity={0.12}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: stroke }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
