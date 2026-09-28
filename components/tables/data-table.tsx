"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { SearchX } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ListParamsUpdate } from "@/hooks/use-list-params";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { ListParams, PaginationMeta } from "@/types";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Human label for the column-visibility menu. */
    label?: string;
    className?: string;
    headerClassName?: string;
  }
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[] | undefined;
  meta: PaginationMeta | undefined;
  getRowId: (row: T) => string;
  params: ListParams;
  onParamsChange: (update: ListParamsUpdate) => void;
  isLoading: boolean;
  /** Background refetch (keeps rows visible, dims them). */
  isFetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  searchPlaceholder?: string;
  /** Filter controls rendered in the toolbar. */
  filters?: ReactNode;
  activeFilterCount?: number;
  onResetFilters?: () => void;
  /** Extra toolbar content on the right (e.g. export). */
  toolbarActions?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Card layout for small screens. When omitted the table scrolls horizontally. */
  mobileCard?: (row: T) => ReactNode;
  emptyState?: ReactNode;
  /** Persist column visibility in localStorage under this key. */
  storageKey?: string;
  initialColumnVisibility?: VisibilityState;
  hideToolbar?: boolean;
  pageSizeOptions?: number[];
  className?: string;
}

function readVisibility(key: string | undefined, fallback: VisibilityState): VisibilityState {
  if (!key || typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`dt:${key}`);
    return raw ? { ...fallback, ...(JSON.parse(raw) as VisibilityState) } : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Server-driven data table. Pagination, sorting, search and filters are all
 * sent to the API (manual* modes) — the browser only ever holds one page.
 * Column ids double as server sort keys.
 */
export function DataTable<T>({
  columns,
  data,
  meta,
  getRowId,
  params,
  onParamsChange,
  isLoading,
  isFetching,
  error,
  onRetry,
  searchPlaceholder,
  filters,
  activeFilterCount = 0,
  onResetFilters,
  toolbarActions,
  onRowClick,
  mobileCard,
  emptyState,
  storageKey,
  initialColumnVisibility = {},
  hideToolbar,
  pageSizeOptions,
  className,
}: DataTableProps<T>) {
  const t = useT();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility);

  // Hydrate persisted visibility after mount (avoids SSR mismatch).
  useEffect(() => {
    setColumnVisibility(readVisibility(storageKey, initialColumnVisibility));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(`dt:${storageKey}`, JSON.stringify(columnVisibility));
    } catch {
      // storage unavailable (private mode) — ignore
    }
  }, [columnVisibility, storageKey]);

  const sorting: SortingState = useMemo(
    () => (params.sort ? [{ id: params.sort, desc: params.order !== "asc" }] : []),
    [params.sort, params.order],
  );

  // TanStack Table returns non-memoizable functions; the React Compiler must skip this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data ?? [],
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableSortingRemoval: false,
    pageCount: meta?.totalPages ?? -1,
    state: {
      sorting,
      columnVisibility,
      pagination: { pageIndex: (params.page ?? 1) - 1, pageSize: params.limit },
    },
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      onParamsChange({ sort: first?.id, order: first ? (first.desc ? "desc" : "asc") : undefined });
    },
  });

  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const rows = table.getRowModel().rows;
  const showSkeleton = isLoading && !data;
  const showError = !!error && !data;
  const isEmpty = !showSkeleton && !showError && rows.length === 0;

  const empty = emptyState ?? (
    <EmptyState
      icon={<SearchX />}
      title={t("common.table.noResults")}
      description={activeFilterCount > 0 ? t("common.table.noResultsHint") : undefined}
    />
  );

  return (
    <div className={cn("space-y-3", className)}>
      {!hideToolbar && (
        <DataTableToolbar
          table={table}
          search={params.search}
          onSearch={(search) => onParamsChange({ search })}
          searchPlaceholder={searchPlaceholder}
          filters={filters}
          activeFilterCount={activeFilterCount}
          onReset={onResetFilters}
          actions={toolbarActions}
        />
      )}

      <div className={cn("overflow-hidden rounded-xl border bg-card transition-opacity", isFetching && !showSkeleton && "opacity-70")}>
        {/* Desktop / tablet table */}
        <div className={cn(mobileCard && "hidden md:block")}>
          <Table>
            <TableHeader className="bg-muted/40">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="hover:bg-transparent">
                  {hg.headers.map((header) => (
                    <TableHead key={header.id} className={cn("h-10 text-xs", header.column.columnDef.meta?.headerClassName)}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {showSkeleton ? (
                Array.from({ length: Math.min(params.limit, 8) }, (_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    {Array.from({ length: visibleColumnCount }, (_, j) => (
                      <TableCell key={j}>
                        <Skeleton className={cn("h-4", j === 0 ? "w-40" : "w-20")} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : showError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={visibleColumnCount}>
                    <ErrorState error={error} onRetry={onRetry} />
                  </TableCell>
                </TableRow>
              ) : isEmpty ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={visibleColumnCount}>{empty}</TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(onRowClick && "cursor-pointer")}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        {mobileCard && (
          <div className="divide-y md:hidden">
            {showSkeleton ? (
              Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="space-y-2 p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))
            ) : showError ? (
              <ErrorState error={error} onRetry={onRetry} />
            ) : isEmpty ? (
              empty
            ) : (
              rows.map((row) => (
                <div
                  key={row.id}
                  className={cn("p-4", onRowClick && "cursor-pointer active:bg-muted/50")}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {mobileCard(row.original)}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {meta && meta.total > 0 && (
        <DataTablePagination meta={meta} onPageChange={(page) => onParamsChange({ page })} onLimitChange={(limit) => onParamsChange({ limit })} pageSizeOptions={pageSizeOptions} />
      )}
    </div>
  );
}
