"use client";

import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/** Sortable header. Clicking toggles desc → asc; the column id is sent as `sort` to the API. */
export function ColumnHeader<T>({ column, title, className }: { column: Column<T>; title: string; className?: string }) {
  const t = useT();
  if (!column.getCanSort()) return <span className={className}>{title}</span>;
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "desc" ? false : true)}
      className={cn("-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted hover:text-foreground", sorted && "text-foreground", className)}
      aria-label={`${title}: ${sorted === "asc" ? t("common.table.sortAsc") : sorted === "desc" ? t("common.table.sortDesc") : ""}`}
    >
      {title}
      {sorted === "asc" ? <ArrowUp className="size-3.5" /> : sorted === "desc" ? <ArrowDown className="size-3.5" /> : <ChevronsUpDown className="size-3.5 opacity-50" />}
    </button>
  );
}
