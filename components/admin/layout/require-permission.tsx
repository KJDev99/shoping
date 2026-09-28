"use client";

import type { ReactNode } from "react";
import { PermissionDenied } from "@/components/common/states";
import { useCan } from "@/hooks/use-session";
import type { Permission } from "@/types";

/**
 * Page-level guard: renders the 403 state when the admin lacks the permission.
 * UX only — the API independently rejects unauthorized requests with 403.
 */
export function RequirePermission({ permission, children }: { permission: Permission | Permission[]; children: ReactNode }) {
  const allowed = useCan(permission);
  return allowed ? <>{children}</> : <PermissionDenied showHome className="min-h-[60vh]" />;
}
