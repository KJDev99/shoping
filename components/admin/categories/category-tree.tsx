"use client";

import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/lib/i18n/provider";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category, CategoryNode } from "@/types";
import { CategoryIcon } from "./category-icon";

interface CategoryTreeProps {
  tree: CategoryNode[];
  selectedId: string | null;
  onSelect: (category: Category) => void;
  isExpanded: (id: string) => boolean;
  onToggle: (id: string, expanded: boolean) => void;
  /** Swap a node with its neighbour among siblings. */
  onMove: (parentId: string | null, from: number, to: number) => void;
  reorderPending: boolean;
  renderActions: (category: Category, node: CategoryNode | null) => ReactNode;
}

function TreeRow({
  category,
  node,
  index,
  total,
  depth,
  props,
}: {
  category: Category;
  node: CategoryNode | null;
  index: number;
  total: number;
  depth: 0 | 1;
  props: CategoryTreeProps;
}) {
  const t = useT();
  const [locale] = useLocale();
  const name = t.text(category.name);
  const selected = props.selectedId === category.id;
  const hasChildren = !!node && node.children.length > 0;
  const expanded = hasChildren && props.isExpanded(category.id);
  const disabled = category.status === "DISABLED";

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-muted/60",
        selected && "bg-primary/10 hover:bg-primary/10",
        depth === 1 && "ml-2",
      )}
    >
      {depth === 0 ? (
        <Button
          variant="ghost"
          size="icon-xs"
          className={cn("shrink-0 text-muted-foreground", !hasChildren && "invisible")}
          aria-label={expanded ? t("categories.tree.collapse", { name }) : t("categories.tree.expand", { name })}
          aria-expanded={hasChildren ? expanded : undefined}
          tabIndex={hasChildren ? 0 : -1}
          onClick={() => props.onToggle(category.id, !expanded)}
        >
          <ChevronRight className={cn("transition-transform", expanded && "rotate-90")} />
        </Button>
      ) : null}
      <button
        type="button"
        onClick={() => props.onSelect(category)}
        aria-current={selected ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-2 pl-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
            selected && "bg-primary/15 text-primary",
            disabled && "opacity-60",
          )}
        >
          <CategoryIcon name={category.icon} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm font-medium", disabled && "text-muted-foreground")}>{name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {t("categories.tree.listings", { count: formatNumber(category.listingsCount, locale) })}
            {node ? ` · ${t("categories.tree.subcategories", { count: node.children.length })}` : null}
          </span>
        </span>
        {disabled && <StatusBadge kind="categoryStatus" value="DISABLED" className="hidden sm:inline-flex" />}
      </button>
      <div className="flex shrink-0 items-center">
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          aria-label={t("categories.tree.moveUp", { name })}
          disabled={props.reorderPending || index === 0}
          onClick={() => props.onMove(category.parentId, index, index - 1)}
        >
          <ArrowUp />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          aria-label={t("categories.tree.moveDown", { name })}
          disabled={props.reorderPending || index === total - 1}
          onClick={() => props.onMove(category.parentId, index, index + 1)}
        >
          <ArrowDown />
        </Button>
        {props.renderActions(category, node)}
      </div>
    </div>
  );
}

/** Two-level category tree with expand/collapse, selection and accessible up/down reordering. */
export function CategoryTree(props: CategoryTreeProps) {
  const { tree, isExpanded } = props;
  return (
    <ul className="space-y-0.5">
      {tree.map((node, i) => (
        <li key={node.id}>
          <TreeRow category={node} node={node} index={i} total={tree.length} depth={0} props={props} />
          {node.children.length > 0 && isExpanded(node.id) && (
            <ul className="mt-0.5 space-y-0.5 ml-3 border-l border-border/70">
              {node.children.map((child, j) => (
                <li key={child.id}>
                  <TreeRow category={child} node={null} index={j} total={node.children.length} depth={1} props={props} />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
