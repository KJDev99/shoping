"use client";

import { useMemo } from "react";
import { useLookups } from "@/hooks/use-lookups";
import { useT } from "@/lib/i18n/provider";
import type { Category } from "@/types";
import type { MultiSelectOption } from "./multi-select";

/** Category tree helpers built from lookups, localized and sorted. */
export function useCategoryOptions() {
  const t = useT();
  const { data: lookups } = useLookups();
  return useMemo(() => {
    const all = [...(lookups?.categories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const parents = all.filter((c) => !c.parentId);
    const byParent = new Map<string, Category[]>();
    for (const c of all) if (c.parentId) byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
    const childrenOf = (id: string | null | undefined) => (id ? (byParent.get(id) ?? []) : []);

    const parentOptions: MultiSelectOption[] = parents.map((c) => ({ value: c.id, label: t.text(c.name) }));
    const subcategoryOptions: MultiSelectOption[] = parents.flatMap((p) =>
      childrenOf(p.id).map((c) => ({ value: c.id, label: t.text(c.name), group: t.text(p.name) })),
    );
    /** Flat list for filters: each parent followed by its (indented) subcategories. */
    const treeOptions = parents.flatMap((p) => [
      { value: p.id, label: t.text(p.name), text: t.text(p.name), depth: 0 },
      ...childrenOf(p.id).map((c) => ({ value: c.id, label: t.text(c.name), text: `${t.text(p.name)} ${t.text(c.name)}`, depth: 1 })),
    ]);
    return { parents, childrenOf, parentOptions, subcategoryOptions, treeOptions };
  }, [lookups, t]);
}
