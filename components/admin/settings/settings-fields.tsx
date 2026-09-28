"use client";

import { Loader2, RotateCcw, X } from "lucide-react";
import { useId, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import { Pill } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { SETTINGS_LIMITS } from "@/schemas/settings.schema";

/** Card wrapper for one settings section with dirty tracking and Save / Reset. */
export function SettingsFormShell({
  id,
  title,
  description,
  canManage,
  isDirty,
  isPending,
  onSubmit,
  onReset,
  children,
}: {
  id: string;
  title: string;
  description: string;
  canManage: boolean;
  isDirty: boolean;
  isPending: boolean;
  onSubmit: () => void;
  onReset: () => void;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <form
      id={id}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (canManage) onSubmit();
      }}
      className="rounded-xl border bg-card text-card-foreground"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {isDirty && canManage && (
          <Pill tone="warning" dot>
            {t("settings.unsaved")}
          </Pill>
        )}
      </header>
      <fieldset disabled={!canManage || isPending} className="space-y-5 p-4 disabled:opacity-100">
        {children}
      </fieldset>
      {canManage && (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3">
          <Button type="button" variant="outline" onClick={onReset} disabled={!isDirty || isPending}>
            <RotateCcw /> {t("common.actions.reset")}
          </Button>
          <Button type="submit" disabled={!isDirty || isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            {t("common.actions.saveChanges")}
          </Button>
        </footer>
      )}
    </form>
  );
}

/** Label + hint on the left, switch on the right. */
export function SwitchRow({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
  badge,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  badge?: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0 space-y-0.5">
        <label htmlFor={id} className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {label}
          {badge}
        </label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(v)} disabled={disabled} className="mt-0.5" />
    </div>
  );
}

export function RangeHint({ limit, unit }: { limit: keyof typeof SETTINGS_LIMITS; unit?: string }) {
  const t = useT();
  const [min, max] = SETTINGS_LIMITS[limit];
  return (
    <>
      {t("settings.range", { min, max })}
      {unit ? ` ${unit}` : ""}
    </>
  );
}

/** Number input with a trailing unit label. */
export function UnitInput({ unit, className, ...props }: React.ComponentProps<typeof Input> & { unit?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Input type="number" inputMode="numeric" className={cn("tabular-nums", unit && "pr-14")} {...props} />
      {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{unit}</span>}
    </div>
  );
}

/**
 * Chip editor for string lists (keywords, IP addresses). Enter or comma adds,
 * Backspace on an empty input removes the last chip, pasting splits on commas/newlines.
 */
export function ChipsInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  removeLabel,
  normalize = (v) => v.trim(),
  invalidIndexes,
  mono,
}: {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  removeLabel: (item: string) => string;
  normalize?: (v: string) => string;
  invalidIndexes?: Set<number>;
  mono?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const items = raw
      .split(/[,\n]/)
      .map(normalize)
      .filter(Boolean);
    if (!items.length) return;
    const existing = new Set(value.map((v) => v.toLowerCase()));
    const next = [...value];
    for (const item of items) {
      if (!existing.has(item.toLowerCase())) {
        next.push(item);
        existing.add(item.toLowerCase());
      }
    }
    onChange(next);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (/[,\n]/.test(text)) {
      e.preventDefault();
      add(draft + text);
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent p-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        disabled && "opacity-70",
      )}
    >
      {value.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className={cn(
            "inline-flex h-6 max-w-full items-center gap-1 rounded-md bg-secondary pr-1 pl-2 text-xs text-secondary-foreground",
            mono && "font-mono",
            invalidIndexes?.has(i) && "bg-destructive/10 text-destructive ring-1 ring-destructive/40",
          )}
        >
          <span className="truncate">{item}</span>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="rounded-sm p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
              aria-label={removeLabel(item)}
            >
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => add(draft)}
          placeholder={placeholder}
          className={cn("h-6 min-w-32 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground", mono && "font-mono")}
        />
      )}
    </div>
  );
}
