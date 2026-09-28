"use client";

import { ArrowDown, ArrowUp, Check, Minus, Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { Section } from "@/components/common/info-list";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/common/states";
import { Pill } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { RowActions } from "@/components/tables/row-actions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAttributeActions, useCategoryAttributes, useReorderAttributes } from "@/hooks/use-categories";
import { useLocale, useT } from "@/lib/i18n/provider";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { hasOptions } from "@/schemas/category.schema";
import type { CategoryAttributeWithUsage } from "@/services/categories.service";
import type { Category } from "@/types";
import { AttributeFormDialog } from "./attribute-form-dialog";

function Flag({ value, label }: { value: boolean; label: string }) {
  const t = useT();
  return value ? (
    <Check className="size-4 text-success" aria-label={`${label}: ${t("common.misc.yes")}`} />
  ) : (
    <Minus className="size-4 text-muted-foreground/50" aria-label={`${label}: ${t("common.misc.no")}`} />
  );
}

function ReorderButtons({ index, total, name, disabled, onMove }: { index: number; total: number; name: string; disabled: boolean; onMove: (from: number, to: number) => void }) {
  const t = useT();
  return (
    <div className="flex items-center">
      <Button variant="ghost" size="icon-xs" aria-label={t("categories.tree.moveUp", { name })} disabled={disabled || index === 0} onClick={() => onMove(index, index - 1)}>
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={t("categories.tree.moveDown", { name })}
        disabled={disabled || index === total - 1}
        onClick={() => onMove(index, index + 1)}
      >
        <ArrowDown />
      </Button>
    </div>
  );
}

export function AttributesManager({ category, isParentWithChildren }: { category: Category; isParentWithChildren: boolean }) {
  const t = useT();
  const [locale] = useLocale();
  const query = useCategoryAttributes(category.id);
  const reorder = useReorderAttributes(category.id);
  const { remove } = useAttributeActions(category.id);
  // Keep the target after closing so dialogs don't flash empty content during their exit animation.
  const [editing, setEditing] = useState<{ open: boolean; attribute: CategoryAttributeWithUsage | null }>({ open: false, attribute: null });
  const [deleting, setDeleting] = useState<{ open: boolean; attribute: CategoryAttributeWithUsage | null }>({ open: false, attribute: null });
  const openForm = (attribute: CategoryAttributeWithUsage | null) => setEditing({ open: true, attribute });
  const attributes = query.data ?? [];

  const move = (from: number, to: number) => {
    const ids = attributes.map((a) => a.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    reorder.mutate(ids);
  };

  const actionsFor = (a: CategoryAttributeWithUsage) => (
    <RowActions
      label={t("common.actions.more")}
      actions={[
        { label: t("categories.attributes.edit"), icon: <Pencil />, onSelect: () => openForm(a) },
        { label: t("categories.attributes.delete"), icon: <Trash2 />, onSelect: () => setDeleting({ open: true, attribute: a }), destructive: true, separator: true },
      ]}
    />
  );

  const optionsSummary = (a: CategoryAttributeWithUsage) =>
    hasOptions(a.type) ? (
      <span title={a.options.map((o) => t.text(o.label)).join(", ")}>{t("categories.attributes.optionsCount", { count: a.options.length })}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    );

  return (
    <Section
      title={t("categories.attributes.title")}
      description={t("categories.attributes.description", { name: t.text(category.name) })}
      action={
        <Button size="sm" onClick={() => openForm(null)}>
          <Plus /> <span className="hidden sm:inline">{t("categories.attributes.add")}</span>
          <span className="sr-only sm:hidden">{t("categories.attributes.add")}</span>
        </Button>
      }
      contentClassName="p-0"
    >
      {isParentWithChildren && (
        <p className="border-b bg-info/5 px-4 py-2.5 text-xs text-muted-foreground">{t("categories.attributes.parentHint")}</p>
      )}
      {query.isPending ? (
        <div className="p-4">
          <ListSkeleton rows={4} />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : attributes.length === 0 ? (
        <EmptyState
          icon={<SlidersHorizontal />}
          title={t("categories.attributes.empty")}
          description={t("categories.attributes.emptyHint")}
          action={
            <Button variant="outline" size="sm" onClick={() => openForm(null)}>
              <Plus /> {t("categories.attributes.add")}
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className={cn("hidden md:block", reorder.isPending && "opacity-80")}>
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 w-14 text-xs">
                    <span className="sr-only">{t("categories.attributes.columns.order")}</span>
                  </TableHead>
                  <TableHead className="h-10 text-xs">{t("categories.attributes.columns.name")}</TableHead>
                  <TableHead className="h-10 text-xs">{t("categories.attributes.columns.type")}</TableHead>
                  <TableHead className="h-10 px-1 text-center text-xs">{t("categories.attributes.columns.required")}</TableHead>
                  <TableHead className="h-10 px-1 text-center text-xs">{t("categories.attributes.columns.filterable")}</TableHead>
                  <TableHead className="h-10 px-1 text-center text-xs">{t("categories.attributes.columns.searchable")}</TableHead>
                  <TableHead className="h-10 text-xs">{t("categories.attributes.columns.options")}</TableHead>
                  <TableHead className="h-10 text-right text-xs">{t("categories.attributes.columns.usage")}</TableHead>
                  <TableHead className="h-10 w-10 text-xs">
                    <span className="sr-only">{t("common.table.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributes.map((a, i) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <ReorderButtons index={i} total={attributes.length} name={t.text(a.name)} disabled={reorder.isPending} onMove={move} />
                    </TableCell>
                    <TableCell>
                      <div className="min-w-32">
                        <p className="font-medium">{t.text(a.name)}</p>
                        <p className="font-mono text-xs text-muted-foreground">{a.key}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Pill tone="neutral">{t(`enums.attributeType.${a.type}`)}</Pill>
                        {a.unit && (
                          <span className="text-xs text-muted-foreground">
                            {t("categories.attributes.columns.unit")}: {a.unit}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-1">
                      <div className="flex justify-center">
                        <Flag value={a.required} label={t("categories.attributes.columns.required")} />
                      </div>
                    </TableCell>
                    <TableCell className="px-1">
                      <div className="flex justify-center">
                        <Flag value={a.filterable} label={t("categories.attributes.columns.filterable")} />
                      </div>
                    </TableCell>
                    <TableCell className="px-1">
                      <div className="flex justify-center">
                        <Flag value={a.searchable} label={t("categories.attributes.columns.searchable")} />
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{optionsSummary(a)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(a.usageCount, locale)}</TableCell>
                    <TableCell>{actionsFor(a)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y md:hidden">
            {attributes.map((a, i) => (
              <li key={a.id} className="flex items-start gap-2 p-4">
                <div className="flex flex-col">
                  <ReorderButtons index={i} total={attributes.length} name={t.text(a.name)} disabled={reorder.isPending} onMove={move} />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{t.text(a.name)}</p>
                    <Pill tone="neutral">{t(`enums.attributeType.${a.type}`)}</Pill>
                    {a.required && <Pill tone="warning">{t("categories.attributes.columns.required")}</Pill>}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{a.key}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {a.filterable && <span>{t("categories.attributes.columns.filterable")}</span>}
                    {a.searchable && <span>{t("categories.attributes.columns.searchable")}</span>}
                    {hasOptions(a.type) && <span>{t("categories.attributes.optionsCount", { count: a.options.length })}</span>}
                    {a.unit && <span>{a.unit}</span>}
                    <span>{t("categories.attributes.usedBy", { count: formatNumber(a.usageCount, locale) })}</span>
                  </div>
                </div>
                {actionsFor(a)}
              </li>
            ))}
          </ul>
        </>
      )}

      <AttributeFormDialog
        category={category}
        attribute={editing.attribute}
        open={editing.open}
        onOpenChange={(open) => setEditing((s) => ({ ...s, open }))}
      />

      <ConfirmDialog
        open={deleting.open}
        onOpenChange={(open) => setDeleting((s) => ({ ...s, open }))}
        variant="destructive"
        title={t("categories.attributeDialogs.deleteTitle", { name: t.text(deleting.attribute?.name) })}
        description={
          deleting.attribute && deleting.attribute.usageCount > 0
            ? `${t("categories.attributeDialogs.deleteDescription")} ${t("categories.attributeDialogs.deleteUsed", { count: formatNumber(deleting.attribute.usageCount, locale) })}`
            : t("categories.attributeDialogs.deleteDescription")
        }
        confirmLabel={t("common.actions.delete")}
        onConfirm={() => (deleting.attribute ? remove.mutateAsync({ id: deleting.attribute.id }) : undefined)}
      />
    </Section>
  );
}
