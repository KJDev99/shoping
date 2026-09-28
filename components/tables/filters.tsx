"use client";

import { CalendarRange, Check, PlusCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { toDateParam } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { DateRangePreset } from "@/types";

export interface FilterOption {
  value: string;
  label: ReactNode;
  /** Plain text used for the in-popover search. */
  text?: string;
}

function TriggerButton({ title, count, summary, icon }: { title: string; count: number; summary?: ReactNode; icon?: ReactNode }) {
  return (
    <>
      {icon ?? <PlusCircle className="opacity-60" />}
      {title}
      {count > 0 && (
        <>
          <Separator orientation="vertical" className="mx-0.5 h-4" />
          <Badge variant="secondary" className="rounded-sm px-1 font-normal">
            {summary ?? count}
          </Badge>
        </>
      )}
    </>
  );
}

/** Multi-select filter stored as a comma-separated URL value. */
export function FacetedFilter({
  title,
  options,
  value,
  onChange,
  searchable,
}: {
  title: string;
  options: FilterOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  searchable?: boolean;
}) {
  const t = useT();
  const [q, setQ] = useState("");
  const selected = new Set(value ? value.split(",") : []);
  const shown = q ? options.filter((o) => (o.text ?? String(o.label)).toLowerCase().includes(q.toLowerCase())) : options;
  const toggle = (v: string) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(next.size ? [...next].join(",") : undefined);
  };
  const single = selected.size === 1 ? options.find((o) => selected.has(o.value))?.label : undefined;
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="border-dashed" />}>
        <TriggerButton title={title} count={selected.size} summary={single ?? t("common.filters.selectedCount", { count: selected.size })} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-1">
        {searchable && (
          <div className="p-1">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.actions.search")} className="h-8" />
          </div>
        )}
        <div className="max-h-72 overflow-y-auto">
          {shown.length === 0 && <p className="px-2 py-4 text-center text-sm text-muted-foreground">{t("common.filters.noOptions")}</p>}
          {shown.map((o) => {
            const isSel = selected.has(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                role="menuitemcheckbox"
                aria-checked={isSel}
              >
                <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-sm border", isSel ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                  {isSel && <Check className="size-3" />}
                </span>
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
        {selected.size > 0 && (
          <>
            <Separator className="my-1" />
            <button type="button" onClick={() => onChange(undefined)} className="w-full rounded-md px-2 py-1.5 text-center text-sm hover:bg-accent">
              {t("common.filters.clear")}
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export const DATE_PRESETS: Exclude<DateRangePreset, "custom">[] = ["today", "7d", "30d", "3m", "6m", "1y"];

/** Computes an inclusive YYYY-MM-DD range for a preset, ending today. */
export function presetToRange(preset: Exclude<DateRangePreset, "custom">): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  switch (preset) {
    case "today":
      break;
    case "7d":
      from.setDate(from.getDate() - 6);
      break;
    case "30d":
      from.setDate(from.getDate() - 29);
      break;
    case "3m":
      from.setMonth(from.getMonth() - 3);
      break;
    case "6m":
      from.setMonth(from.getMonth() - 6);
      break;
    case "1y":
      from.setFullYear(from.getFullYear() - 1);
      break;
  }
  return { from: toDateParam(from), to: toDateParam(to) };
}

/** Date range filter with presets (Today, 7d, 30d, 3m, 6m, 1y) and a custom range. */
export function DateRangeFilter({
  title,
  from,
  to,
  onChange,
}: {
  title: string;
  from: string | undefined;
  to: string | undefined;
  onChange: (range: { from: string | undefined; to: string | undefined }) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");
  const active = !!(from || to);
  const matchingPreset = DATE_PRESETS.find((p) => {
    const r = presetToRange(p);
    return r.from === from && r.to === to;
  });
  const summary = matchingPreset ? t(`common.dateRange.${matchingPreset}`) : `${from ?? "…"} – ${to ?? "…"}`;
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setCustomFrom(from ?? "");
          setCustomTo(to ?? "");
        }
      }}
    >
      <PopoverTrigger render={<Button variant="outline" size="sm" className="border-dashed" />}>
        <TriggerButton title={title} count={active ? 1 : 0} summary={summary} icon={<CalendarRange className="opacity-60" />} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        {DATE_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => {
              onChange(presetToRange(p));
              setOpen(false);
            }}
          >
            {t(`common.dateRange.${p}`)}
            {matchingPreset === p && <Check className="size-4" />}
          </button>
        ))}
        <Separator className="my-1" />
        <div className="space-y-2 p-2">
          <p className="text-xs font-medium text-muted-foreground">{t("common.dateRange.custom")}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("common.filters.from")}</Label>
              <Input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 px-1.5 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("common.filters.to")}</Label>
              <Input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} className="h-8 px-1.5 text-xs" />
            </div>
          </div>
          <div className="flex justify-between gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({ from: undefined, to: undefined });
                setOpen(false);
              }}
            >
              {t("common.filters.clear")}
            </Button>
            <Button
              size="sm"
              disabled={!customFrom && !customTo}
              onClick={() => {
                onChange({ from: customFrom || undefined, to: customTo || undefined });
                setOpen(false);
              }}
            >
              {t("common.actions.apply")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Min/max numeric filter. */
export function NumberRangeFilter({
  title,
  min,
  max,
  onChange,
}: {
  title: string;
  min: string | undefined;
  max: string | undefined;
  onChange: (range: { min: string | undefined; max: string | undefined }) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [lo, setLo] = useState(min ?? "");
  const [hi, setHi] = useState(max ?? "");
  const active = !!(min || max);
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setLo(min ?? "");
          setHi(max ?? "");
        }
      }}
    >
      <PopoverTrigger render={<Button variant="outline" size="sm" className="border-dashed" />}>
        <TriggerButton title={title} count={active ? 1 : 0} summary={`${min ?? "0"}–${max ?? "∞"}`} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">{t("common.filters.min")}</Label>
            <Input type="number" min={0} inputMode="numeric" value={lo} onChange={(e) => setLo(e.target.value)} className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("common.filters.max")}</Label>
            <Input type="number" min={0} inputMode="numeric" value={hi} onChange={(e) => setHi(e.target.value)} className="h-8" />
          </div>
        </div>
        <div className="flex justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange({ min: undefined, max: undefined });
              setOpen(false);
            }}
          >
            {t("common.filters.clear")}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onChange({ min: lo || undefined, max: hi || undefined });
              setOpen(false);
            }}
          >
            {t("common.actions.apply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
