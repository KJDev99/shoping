"use client";

import { Hash, Plus, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const MAX_TAGS = 20;
const MAX_LENGTH = 50;

function clean(tag: string) {
  return tag.replace(/^#+/, "").replace(/\s+/g, " ").trim().slice(0, MAX_LENGTH);
}

/**
 * Hashtag-style input for "what I want in return". Enter or comma adds a tag,
 * Backspace on an empty input removes the last one; suggestions add with one tap.
 */
export function HashtagInput({
  id,
  value,
  onChange,
  suggestions = [],
  placeholder,
  invalid,
}: {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  invalid?: boolean;
}) {
  const t = useT();
  const [draft, setDraft] = useState("");
  const has = (tag: string) => value.some((v) => v.toLowerCase() === tag.toLowerCase());

  const add = (raw: string) => {
    const next = [...value];
    for (const part of raw.split(/[,;\n]+/)) {
      const tag = clean(part);
      if (tag.length >= 2 && next.length < MAX_TAGS && !next.some((v) => v.toLowerCase() === tag.toLowerCase())) next.push(tag);
    }
    if (next.length !== value.length) onChange(next);
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

  const shown = suggestions.filter((s) => !has(s)).slice(0, 8);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex min-h-12 flex-wrap items-center gap-2 rounded-2xl border bg-white px-3 py-2 transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
          invalid && "border-destructive ring-3 ring-destructive/15",
        )}
      >
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-primary to-violet-600 py-1 pr-1.5 pl-3 text-sm font-medium text-white shadow-sm">
            #{tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== tag))}
              className="rounded-full p-0.5 hover:bg-white/20"
              aria-label={t("site.post.removeTag", { tag })}
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <span className="flex min-w-40 flex-1 items-center gap-1 text-muted-foreground">
          <Hash className="size-4 shrink-0" />
          <input
            id={id}
            value={draft}
            onChange={(e) => (e.target.value.includes(",") ? add(e.target.value) : setDraft(e.target.value))}
            onKeyDown={onKeyDown}
            onBlur={() => draft.trim() && add(draft)}
            placeholder={value.length ? undefined : placeholder}
            maxLength={MAX_LENGTH}
            aria-invalid={invalid || undefined}
            className="h-8 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
          />
        </span>
      </div>
      {shown.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("site.post.suggestions")}</span>
          {shown.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <Plus className="size-3" />#{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
