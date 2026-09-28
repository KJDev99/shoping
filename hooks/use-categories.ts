"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/provider";
import type { AttributeInput, CategoryInput } from "@/schemas/category.schema";
import { categoriesService, type CategoryAttributeWithUsage } from "@/services/categories.service";
import type { CategoryNode, CategoryStatus } from "@/types";
import { useActionMutation } from "./use-action-mutation";
import { useApiErrorMessage } from "./use-api-error";
import { lookupsQueryKey } from "./use-lookups";

/** Query keys: invalidate ["categories"] to refresh the tree and every attribute list. */
export const categoryKeys = {
  all: ["categories"] as const,
  tree: ["categories", "tree"] as const,
  attributes: (categoryId: string) => ["categories", "attributes", categoryId] as const,
};

/** Every catalogue change also refreshes lookups (dropdowns elsewhere) and the audit log. */
const invalidate = [categoryKeys.all, lookupsQueryKey, ["audit"]];

export function useCategoryTree() {
  return useQuery({ queryKey: categoryKeys.tree, queryFn: categoriesService.tree });
}

export function useCategoryAttributes(categoryId: string | null) {
  return useQuery({
    queryKey: categoryKeys.attributes(categoryId ?? ""),
    queryFn: () => categoriesService.attributes(categoryId!),
    enabled: !!categoryId,
  });
}

export function useCategoryActions() {
  const t = useT();
  return {
    create: useActionMutation({
      mutationFn: (input: CategoryInput) => categoriesService.create(input),
      successMessage: t("categories.toasts.created"),
      invalidate,
    }),
    update: useActionMutation({
      mutationFn: ({ id, input }: { id: string; input: CategoryInput }) => categoriesService.update(id, input),
      successMessage: t("categories.toasts.updated"),
      invalidate,
    }),
    setStatus: useActionMutation({
      mutationFn: ({ id, status }: { id: string; status: CategoryStatus }) => categoriesService.setStatus(id, status),
      successMessage: (_, v) => (v.status === "ACTIVE" ? t("categories.toasts.enabled") : t("categories.toasts.disabled")),
      invalidate,
    }),
    remove: useActionMutation({
      mutationFn: ({ id }: { id: string }) => categoriesService.remove(id),
      successMessage: t("categories.toasts.deleted"),
      invalidate,
    }),
  };
}

export function useAttributeActions(categoryId: string) {
  const t = useT();
  return {
    create: useActionMutation({
      mutationFn: (input: AttributeInput) => categoriesService.createAttribute(categoryId, input),
      successMessage: t("categories.toasts.attributeCreated"),
      invalidate,
    }),
    update: useActionMutation({
      mutationFn: ({ id, input }: { id: string; input: AttributeInput }) => categoriesService.updateAttribute(id, input),
      successMessage: t("categories.toasts.attributeUpdated"),
      invalidate,
    }),
    remove: useActionMutation({
      mutationFn: ({ id }: { id: string }) => categoriesService.removeAttribute(id),
      successMessage: t("categories.toasts.attributeDeleted"),
      invalidate,
    }),
  };
}

function reorderById<T extends { id: string; sortOrder: number }>(items: T[], orderedIds: string[]): T[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return orderedIds.flatMap((id, index) => {
    const item = byId.get(id);
    return item ? [{ ...item, sortOrder: index }] : [];
  });
}

/** Optimistic sibling reorder: the tree updates instantly and rolls back if the API rejects it. */
export function useReorderCategories() {
  const qc = useQueryClient();
  const t = useT();
  const toMessage = useApiErrorMessage();
  return useMutation({
    mutationFn: ({ parentId, orderedIds }: { parentId: string | null; orderedIds: string[] }) => categoriesService.reorder(parentId, orderedIds),
    onMutate: async ({ parentId, orderedIds }) => {
      await qc.cancelQueries({ queryKey: categoryKeys.tree });
      const previous = qc.getQueryData<CategoryNode[]>(categoryKeys.tree);
      if (previous) {
        qc.setQueryData<CategoryNode[]>(
          categoryKeys.tree,
          parentId === null
            ? reorderById(previous, orderedIds)
            : previous.map((n) => (n.id === parentId ? { ...n, children: reorderById(n.children, orderedIds) } : n)),
        );
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) qc.setQueryData(categoryKeys.tree, context.previous);
      toast.error(toMessage(error));
    },
    onSuccess: () => toast.success(t("categories.toasts.orderSaved"), { id: "category-order" }),
    onSettled: () => Promise.all(invalidate.map((key) => qc.invalidateQueries({ queryKey: key }))),
  });
}

export function useReorderAttributes(categoryId: string) {
  const qc = useQueryClient();
  const t = useT();
  const toMessage = useApiErrorMessage();
  const key = categoryKeys.attributes(categoryId);
  return useMutation({
    mutationFn: (orderedIds: string[]) => categoriesService.reorderAttributes(categoryId, orderedIds),
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<CategoryAttributeWithUsage[]>(key);
      if (previous) qc.setQueryData(key, reorderById(previous, orderedIds));
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
      toast.error(toMessage(error));
    },
    onSuccess: () => toast.success(t("categories.toasts.orderSaved"), { id: "attribute-order" }),
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: key }), qc.invalidateQueries({ queryKey: lookupsQueryKey }), qc.invalidateQueries({ queryKey: ["audit"] })]),
  });
}
