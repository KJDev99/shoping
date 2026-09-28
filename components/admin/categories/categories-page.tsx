"use client";

import { Ban, CheckCircle2, FolderPlus, FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { Section } from "@/components/common/info-list";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { RowActions, type RowAction } from "@/components/tables/row-actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategoryActions, useCategoryTree, useReorderCategories } from "@/hooks/use-categories";
import { useLocale, useT } from "@/lib/i18n/provider";
import { formatNumber } from "@/lib/format";
import type { Category, CategoryNode } from "@/types";
import { AttributesManager } from "./attributes-manager";
import { CategoryDetails } from "./category-details";
import { CategoryFormSheet, type CategoryFormMode } from "./category-form-sheet";
import { CategoryTree } from "./category-tree";

type Selection = { category: Category; node: CategoryNode | null; parent: CategoryNode | null };

/** Resolves the selected (sub)category; falls back to the first top-level category. */
function findSelection(tree: CategoryNode[], id: string | null): Selection | null {
  for (const node of tree) {
    if (node.id === id) return { category: node, node, parent: null };
    const child = node.children.find((c) => c.id === id);
    if (child) return { category: child, node: null, parent: node };
  }
  return tree[0] ? { category: tree[0], node: tree[0], parent: null } : null;
}

type Pending = { kind: "disable" | "delete"; category: Category; node: CategoryNode | null } | null;

export function CategoriesPage() {
  const t = useT();
  const [locale] = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useCategoryTree();
  const reorder = useReorderCategories();
  const { setStatus, remove } = useCategoryActions();
  const tree = useMemo(() => query.data ?? [], [query.data]);
  const detailsRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<{ open: boolean; mode: CategoryFormMode }>({ open: false, mode: { kind: "create", parentId: null } });
  const [pending, setPending] = useState<{ open: boolean; target: Pending }>({ open: false, target: null });
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  // ----- Selection (kept in the URL so it survives reloads and can be shared) -----
  const requestedId = searchParams.get("category");
  const selection = findSelection(tree, requestedId);

  const select = useCallback(
    (id: string | null, scroll = false) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (id) sp.set("category", id);
      else sp.delete("category");
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      // On small screens the details are below the tree — bring them into view.
      if (scroll && typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
        requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    },
    [router, pathname, searchParams],
  );

  const selectedParentId = selection?.parent?.id ?? null;
  // Explicit expand/collapse wins; otherwise the parent of the selected subcategory is open.
  const isExpanded = (id: string) => toggled[id] ?? id === selectedParentId;
  const onToggle = (id: string, expanded: boolean) => setToggled((s) => ({ ...s, [id]: expanded }));

  const onMove = (parentId: string | null, from: number, to: number) => {
    const siblings = parentId === null ? tree : (tree.find((n) => n.id === parentId)?.children ?? []);
    if (to < 0 || to >= siblings.length) return;
    const ids = siblings.map((s) => s.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    reorder.mutate({ parentId, orderedIds: ids });
  };

  const openCreate = (parentId: string | null) => {
    if (parentId) setToggled((s) => ({ ...s, [parentId]: true }));
    setForm({ open: true, mode: { kind: "create", parentId } });
  };
  const openEdit = (category: Category, node: CategoryNode | null) =>
    setForm({ open: true, mode: { kind: "edit", category, hasChildren: !!node && node.children.length > 0 } });

  const actionsFor = (category: Category, node: CategoryNode | null) => {
    const actions: RowAction[] = [
      { label: t("common.actions.edit"), icon: <Pencil />, onSelect: () => openEdit(category, node) },
      { label: t("categories.actions.addSubcategory"), icon: <FolderPlus />, onSelect: () => openCreate(category.id), hidden: category.parentId !== null },
      category.status === "ACTIVE"
        ? { label: t("categories.actions.disable"), icon: <Ban />, onSelect: () => setPending({ open: true, target: { kind: "disable", category, node } }), separator: true }
        : { label: t("categories.actions.enable"), icon: <CheckCircle2 />, onSelect: () => setStatus.mutate({ id: category.id, status: "ACTIVE" }), separator: true, disabled: setStatus.isPending },
      { label: t("common.actions.delete"), icon: <Trash2 />, destructive: true, onSelect: () => setPending({ open: true, target: { kind: "delete", category, node } }) },
    ];
    return <RowActions actions={actions} label={t("categories.actions.more", { name: t.text(category.name) })} />;
  };

  const counts = useMemo(() => ({ parents: tree.length, children: tree.reduce((n, c) => n + c.children.length, 0) }), [tree]);
  const target = pending.target;
  const targetName = target ? t.text(target.category.name) : "";
  const deleteBlockers = target?.kind === "delete" ? { children: target.node?.children.length ?? 0, listings: target.category.listingsCount } : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("categories.title")}
        description={t("categories.subtitle")}
        actions={
          <Button onClick={() => openCreate(null)}>
            <Plus /> {t("categories.create")}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <Section
          title={t("categories.tree.title")}
          description={query.data ? t("categories.tree.summary", { parents: counts.parents, children: counts.children }) : t("categories.tree.description")}
          contentClassName="p-2"
          className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto"
        >
          {query.isPending ? (
            <div className="p-2">
              <ListSkeleton rows={8} />
            </div>
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : tree.length === 0 ? (
            <EmptyState
              icon={<FolderTree />}
              title={t("categories.tree.empty")}
              description={t("categories.tree.emptyHint")}
              action={
                <Button variant="outline" size="sm" onClick={() => openCreate(null)}>
                  <Plus /> {t("categories.create")}
                </Button>
              }
            />
          ) : (
            <nav aria-label={t("categories.tree.title")}>
              <CategoryTree
                tree={tree}
                selectedId={selection?.category.id ?? null}
                onSelect={(c) => select(c.id, true)}
                isExpanded={isExpanded}
                onToggle={onToggle}
                onMove={onMove}
                reorderPending={reorder.isPending}
                renderActions={actionsFor}
              />
            </nav>
          )}
        </Section>

        <div ref={detailsRef} className="min-w-0 scroll-mt-20 space-y-6">
          {query.isPending ? (
            <>
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </>
          ) : selection ? (
            <>
              <CategoryDetails
                category={selection.category}
                node={selection.node}
                parent={selection.parent}
                onEdit={() => openEdit(selection.category, selection.node)}
                actions={actionsFor(selection.category, selection.node)}
              />
              <AttributesManager
                key={selection.category.id}
                category={selection.category}
                isParentWithChildren={!!selection.node && selection.node.children.length > 0}
              />
            </>
          ) : !query.isError ? (
            <div className="rounded-xl border bg-card">
              <EmptyState icon={<FolderTree />} title={t("categories.details.selectHint")} />
            </div>
          ) : null}
        </div>
      </div>

      <CategoryFormSheet
        mode={form.mode}
        open={form.open}
        onOpenChange={(open) => setForm((s) => ({ ...s, open }))}
        tree={tree}
        onSaved={(c) => {
          if (c.parentId) setToggled((s) => ({ ...s, [c.parentId as string]: true }));
          select(c.id);
        }}
      />

      <ConfirmDialog
        open={pending.open && target?.kind === "disable"}
        onOpenChange={(open) => setPending((s) => ({ ...s, open }))}
        title={t("categories.dialogs.disableTitle", { name: targetName })}
        description={target?.node && target.node.children.length > 0 ? t("categories.dialogs.disableParentDescription") : t("categories.dialogs.disableDescription")}
        confirmLabel={t("categories.actions.disable")}
        onConfirm={() => (target ? setStatus.mutateAsync({ id: target.category.id, status: "DISABLED" }) : undefined)}
      />

      <ConfirmDialog
        open={pending.open && target?.kind === "delete"}
        onOpenChange={(open) => setPending((s) => ({ ...s, open }))}
        variant="destructive"
        title={t("categories.dialogs.deleteTitle", { name: targetName })}
        description={t("categories.dialogs.deleteDescription")}
        confirmLabel={t("common.actions.delete")}
        onConfirm={async () => {
          if (!target) return;
          await remove.mutateAsync({ id: target.category.id });
          if (selection?.category.id === target.category.id) select(target.category.parentId);
        }}
      >
        {deleteBlockers && (deleteBlockers.children > 0 || deleteBlockers.listings > 0) && (
          <div role="note" className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            <p>
              {deleteBlockers.children > 0
                ? t("categories.dialogs.deleteBlockedChildren", { count: deleteBlockers.children })
                : t("categories.dialogs.deleteBlockedListings", { count: formatNumber(deleteBlockers.listings, locale) })}
            </p>
            {target && target.category.status === "ACTIVE" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPending({ open: true, target: { ...target, kind: "disable" } })}
              >
                <Ban /> {t("categories.dialogs.disableInstead")}
              </Button>
            )}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
