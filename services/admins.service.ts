import { api } from "@/lib/api/client";
import type { AdminCreateInput, AdminRoleInput, AdminUpdateInput } from "@/schemas/admin.schema";
import type { Admin, ListParams, Role } from "@/types";

export const adminsService = {
  list: (params: ListParams) => api.list<Admin>("/admins", params),
  get: (id: string) => api.get<Admin>(`/admins/${id}`),
  create: (input: AdminCreateInput) => api.post<Admin>("/admins", input),
  update: (id: string, input: AdminUpdateInput) => api.patch<Admin>(`/admins/${id}`, input),
  changeRole: (id: string, input: AdminRoleInput) => api.post<Admin>(`/admins/${id}/role`, input),
  block: (id: string, reason?: string) => api.post<Admin>(`/admins/${id}/block`, { reason }),
  activate: (id: string, reason?: string) => api.post<Admin>(`/admins/${id}/activate`, { reason }),
  roles: () => api.get<Role[]>("/roles"),
};
