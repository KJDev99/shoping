"use client";

import { CalendarRange } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { DATE_PRESETS, presetToRange } from "@/components/tables/filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { DateRangePreset } from "@/types";
import type { DashboardRange } from "@/services/dashboard.service";

const DEFAULT_PRESET = "30d" satisfies DateRangePreset;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Dashboard period stored in the URL: `?range=7d` or `?range=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`. */
export function useDashboardRange() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = sp.get("range");
  const from = sp.get("from");
  const to = sp.get("to");

  const { preset, range } = useMemo((): { preset: DateRangePreset; range: DashboardRange } => {
    if (raw === "custom" && from && to && DATE_RE.test(from) && DATE_RE.test(to) && from <= to) return { preset: "custom", range: { from, to } };
    const p = DATE_PRESETS.find((x) => x === raw) ?? DEFAULT_PRESET;
    return { preset: p, range: presetToRange(p) };
  }, [raw, from, to]);

  const navigate = useCallback(
    (next: Record<string, string | undefined>) => {
      const params = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v) params.set(k, v);
        else params.delete(k);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname],
  );

  const setPreset = useCallback(
    (p: Exclude<DateRangePreset, "custom">) => navigate({ range: p === DEFAULT_PRESET ? undefined : p, from: undefined, to: undefined }),
    [navigate],
  );
  const setCustom = useCallback((r: DashboardRange) => navigate({ range: "custom", from: r.from, to: r.to }), [navigate]);

  return { preset, range, setPreset, setCustom };
}

/** Preset chips (Today … 1 year) plus a custom range popover. Scrolls horizontally on phones. */
export function DateRangeBar({
  preset,
  range,
  onPreset,
  onCustom,
}: {
  preset: DateRangePreset;
  range: DashboardRange;
  onPreset: (p: Exclude<DateRangePreset, "custom">) => void;
  onCustom: (r: DashboardRange) => void;
}) {
  const t = useT();
  const [locale] = useLocale();
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(range.from);
  const [draftTo, setDraftTo] = useState(range.to);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label={t("dashboard.range.label")}>
        <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-1">
          {DATE_PRESETS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={preset === p ? "secondary" : "ghost"}
              aria-pressed={preset === p}
              className={cn("whitespace-nowrap", preset === p && "font-semibold")}
              onClick={() => onPreset(p)}
            >
              {t(`common.dateRange.${p}`)}
            </Button>
          ))}
          <Popover
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (o) {
                setDraftFrom(range.from);
                setDraftTo(range.to);
              }
            }}
          >
            <PopoverTrigger
              render={
                <Button size="sm" variant={preset === "custom" ? "secondary" : "ghost"} aria-pressed={preset === "custom"} className={cn("whitespace-nowrap", preset === "custom" && "font-semibold")} />
              }
            >
              <CalendarRange />
              {t("common.dateRange.custom")}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3 p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="dash-from" className="text-xs">
                    {t("dashboard.range.from")}
                  </Label>
                  <Input id="dash-from" type="date" value={draftFrom} max={draftTo || undefined} onChange={(e) => setDraftFrom(e.target.value)} className="h-8 px-1.5 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dash-to" className="text-xs">
                    {t("dashboard.range.to")}
                  </Label>
                  <Input id="dash-to" type="date" value={draftTo} min={draftFrom || undefined} onChange={(e) => setDraftTo(e.target.value)} className="h-8 px-1.5 text-xs" />
                </div>
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={!draftFrom || !draftTo || draftFrom > draftTo}
                onClick={() => {
                  onCustom({ from: draftFrom, to: draftTo });
                  setOpen(false);
                }}
              >
                {t("dashboard.range.apply")}
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <p className="text-xs text-muted-foreground tabular-nums" suppressHydrationWarning>
        {range.from === range.to ? formatDate(`${range.from}T00:00:00`, locale) : `${formatDate(`${range.from}T00:00:00`, locale)} – ${formatDate(`${range.to}T00:00:00`, locale)}`}
      </p>
    </div>
  );
}
