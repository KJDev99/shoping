"use client";

import type { Table } from "@tanstack/react-table";
import { Columns3, Search, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useT } from "@/lib/i18n/provider";

export function DataTableToolbar<T>({
  table,
  search,
  onSearch,
  searchPlaceholder,
  filters,
  activeFilterCount,
  onReset,
  actions,
}: {
  table: Table<T>;
  search: string | undefined;
  onSearch: (value: string | undefined) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  activeFilterCount: number;
  onReset?: () => void;
  actions?: ReactNode;
}) {
  const t = useT();
  const [value, setValue] = useState(search ?? "");
  const debounced = useDebouncedValue(value, 400);

  // Keep the input in sync when the URL changes externally (reset, back button).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- controlled sync from URL state
    setValue(search ?? "");
  }, [search]);

  useEffect(() => {
    const next = debounced.trim() || undefined;
    if (next !== (search || undefined)) onSearch(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide() && c.columnDef.meta?.label);

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={searchPlaceholder ?? t("common.table.searchPlaceholder")}
            className="h-8 pr-8 pl-8"
            aria-label={t("common.actions.search")}
          />
          {value && (
            <button
              type="button"
              onClick={() => setValue("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground"
              aria-label={t("common.actions.reset")}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {filters}
        {activeFilterCount > 0 && onReset && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            {t("common.actions.clearFilters")}
            <X />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {hideable.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <Columns3 /> <span className="hidden sm:inline">{t("common.actions.columns")}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("common.table.toggleColumns")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideable.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(v) => column.toggleVisibility(!!v)}
                  >
                    {column.columnDef.meta?.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
