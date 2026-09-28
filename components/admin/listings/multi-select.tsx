"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
  /** Optional group heading (e.g. the parent category). Options must be sorted by group. */
  group?: string;
}

/**
 * Searchable multi-select for forms. Selected values are shown as removable
 * chips under the trigger so the selection is always visible.
 */
export function MultiSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
  disabled,
  searchable = true,
  className,
}: {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
}) {
  const t = useT();
  const [q, setQ] = useState("");
  const selected = new Set(value);
  const byValue = new Map(options.map((o) => [o.value, o]));
  const needle = q.trim().toLowerCase();
  const shown = needle ? options.filter((o) => o.label.toLowerCase().includes(needle) || !!o.group?.toLowerCase().includes(needle)) : options;
  const toggle = (v: string) => onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div className={cn("space-y-2", className)}>
      <Popover onOpenChange={(o) => !o && setQ("")}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              aria-invalid={invalid || undefined}
              className={cn("w-full justify-between font-normal", !value.length && "text-muted-foreground", invalid && "border-destructive")}
            />
          }
        >
          <span className="truncate">{value.length ? t("listings.picker.selected", { count: value.length }) : (placeholder ?? t("listings.picker.placeholder"))}</span>
          <ChevronsUpDown className="opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) min-w-60 gap-1 p-1">
          {searchable && (
            <div className="p-1">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("listings.picker.search")} className="h-8" aria-label={t("listings.picker.search")} />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto" role="listbox" aria-multiselectable>
            {shown.length === 0 && <p className="px-2 py-4 text-center text-sm text-muted-foreground">{t("listings.picker.noOptions")}</p>}
            {shown.map((o, i) => {
              const heading = o.group && o.group !== shown[i - 1]?.group ? o.group : null;
              const isSel = selected.has(o.value);
              return (
                <Fragment key={o.value}>
                  {heading && <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">{heading}</p>}
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onClick={() => toggle(o.value)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-sm border", isSel ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                      {isSel && <Check className="size-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  </button>
                </Fragment>
              );
            })}
          </div>
          {value.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="w-full rounded-md border-t px-2 py-1.5 text-center text-sm hover:bg-accent">
              {t("listings.picker.clear")}
            </button>
          )}
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => {
            const label = byValue.get(v)?.label ?? v;
            return (
              <span key={v} className="inline-flex h-6 max-w-full items-center gap-1 rounded-md bg-secondary pr-1 pl-2 text-xs font-medium text-secondary-foreground">
                <span className="truncate">{label}</span>
                <button
                  type="button"
                  disabled={disabled}
                  className="rounded-sm p-0.5 text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={t("listings.picker.remove", { item: label })}
                  onClick={() => toggle(v)}
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
