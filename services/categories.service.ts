import { api } from "@/lib/api/client";
import type { AttributeInput, CategoryInput } from "@/schemas/category.schema";
import type { Category, CategoryAttribute, CategoryNode, CategoryStatus } from "@/types";

/** Attribute as returned by the admin API, with how many listings store a value for it. */
export interface CategoryAttributeWithUsage extends CategoryAttribute {
  usageCount: number;
}

export const categoriesService = {
  tree: () => api.get<CategoryNode[]>("/categories/tree"),
  get: (id: string) => api.get<Category>(`/categories/${id}`),
  create: (input: CategoryInput) => api.post<Category>("/categories", input),
  update: (id: string, input: CategoryInput) => api.patch<Category>(`/categories/${id}`, input),
  setStatus: (id: string, status: CategoryStatus) => api.post<Category>(`/categories/${id}/status`, { status }),
  remove: (id: string) => api.delete<null>(`/categories/${id}`),
  reorder: (parentId: string | null, orderedIds: string[]) => api.post<Category[]>("/categories/reorder", { parentId, orderedIds }),

  attributes: (categoryId: string) => api.get<CategoryAttributeWithUsage[]>(`/categories/${categoryId}/attributes`),
  createAttribute: (categoryId: string, input: AttributeInput) =>
    api.post<CategoryAttributeWithUsage>(`/categories/${categoryId}/attributes`, input),
  updateAttribute: (id: string, input: AttributeInput) => api.patch<CategoryAttributeWithUsage>(`/attributes/${id}`, input),
  removeAttribute: (id: string) => api.delete<null>(`/attributes/${id}`),
  reorderAttributes: (categoryId: string, orderedIds: string[]) =>
    api.post<CategoryAttributeWithUsage[]>(`/categories/${categoryId}/attributes/reorder`, { orderedIds }),
};
