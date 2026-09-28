import { api } from "@/lib/api/client";
import type { AuditLog, ListParams } from "@/types";

/** Read-only by design: the audit log cannot be edited or deleted through the API. */
export const auditService = {
  list: (params: ListParams) => api.list<AuditLog>("/audit-logs", params),
  get: (id: string) => api.get<AuditLog>(`/audit-logs/${id}`),
  actions: () => api.get<string[]>("/audit-logs/actions"),
};
