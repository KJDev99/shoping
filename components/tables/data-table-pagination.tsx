"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { SimpleSelect } from "@/components/common/simple-select";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import type { PaginationMeta } from "@/types";

export function DataTablePagination({
  meta,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 50, 100],
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  pageSizeOptions?: number[];
}) {
  const t = useT();
  const [locale] = useLocale();
  const { page, totalPages, total, limit } = meta;
  return (
    <div className="flex flex-col-reverse items-center justify-between gap-3 px-1 text-sm sm:flex-row">
      <p className="text-muted-foreground">{t("common.table.totalRows", { total: formatNumber(total, locale) })}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="hidden text-muted-foreground sm:inline">{t("common.table.rowsPerPage")}</span>
          <SimpleSelect
            size="sm"
            className="w-18"
            value={String(limit)}
            onChange={(v) => v && onLimitChange(Number(v))}
            options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
            aria-label={t("common.table.rowsPerPage")}
          />
        </div>
        <span className="tabular-nums">{t("common.table.pageOf", { page, total: totalPages })}</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(1)} disabled={page <= 1} aria-label={t("common.table.firstPage")} className="hidden sm:inline-flex">
            <ChevronsLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label={t("common.table.previousPage")}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label={t("common.table.nextPage")}>
            <ChevronRight />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} aria-label={t("common.table.lastPage")} className="hidden sm:inline-flex">
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
