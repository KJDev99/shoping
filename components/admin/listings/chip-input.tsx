"use client";

import { X } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Free-text tag input: Enter or comma adds a chip, Backspace on an empty input
 * removes the last one. Values are trimmed and de-duplicated (case-insensitive).
 */
export function ChipInput({
  id,
  value,
  onChange,
  placeholder,
  maxItems = 20,
  maxLength = 50,
  invalid,
  disabled,
  className,
}: {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  maxLength?: number;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const t = useT();
  const autoId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const full = value.length >= maxItems;

  const commit = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim().slice(0, maxLength))
      .filter(Boolean);
    setDraft("");
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) {
      if (next.length >= maxItems) break;
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    }
    if (next.length !== value.length) onChange(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        invalid && "border-destructive ring-3 ring-destructive/20",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((chip) => (
        <span key={chip} className="inline-flex h-6 max-w-full items-center gap-1 rounded-md bg-secondary pr-1 pl-2 text-xs font-medium text-secondary-foreground">
          <span className="truncate">{chip}</span>
          <button
            type="button"
            className="rounded-sm p-0.5 text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={t("listings.picker.remove", { item: chip })}
            onClick={(e) => {
              e.stopPropagation();
              onChange(value.filter((v) => v !== chip));
            }}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id ?? autoId}
        value={draft}
        disabled={disabled || full}
        maxLength={maxLength}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(",")) commit(v);
          else setDraft(v);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        placeholder={full ? undefined : placeholder}
        aria-invalid={invalid || undefined}
        className="h-6 min-w-24 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
    </div>
  );
}
