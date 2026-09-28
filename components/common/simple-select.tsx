"use client";

import type { ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SelectOption<V extends string = string> {
  value: V;
  label: ReactNode;
  disabled?: boolean;
}

interface SimpleSelectProps<V extends string> {
  value: V | null | undefined;
  onChange: (value: V | null) => void;
  options: SelectOption<V>[];
  placeholder?: string;
  /** Adds an item that clears the value (e.g. "All"). */
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
  id?: string;
  invalid?: boolean;
  "aria-label"?: string;
}

const CLEAR = "__clear__";

/** Single-value select built on the Base UI primitive, with label resolution handled for you. */
export function SimpleSelect<V extends string>({
  value,
  onChange,
  options,
  placeholder,
  clearLabel,
  disabled,
  className,
  size,
  id,
  invalid,
  ...rest
}: SimpleSelectProps<V>) {
  const items = [
    ...(clearLabel ? [{ value: CLEAR, label: clearLabel }] : []),
    ...options.map((o) => ({ value: o.value as string, label: o.label })),
  ];
  return (
    <Select<string>
      items={items}
      value={value ?? (clearLabel ? CLEAR : null)}
      onValueChange={(v) => onChange(!v || v === CLEAR ? null : (v as V))}
      disabled={disabled}
    >
      <SelectTrigger id={id} size={size} className={cn("w-full min-w-0", className)} aria-invalid={invalid || undefined} aria-label={rest["aria-label"]}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {clearLabel && <SelectItem value={CLEAR}>{clearLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
