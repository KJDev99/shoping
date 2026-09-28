"use client";

import type { ReactNode } from "react";
import { useCan } from "@/hooks/use-session";
import type { Permission } from "@/types";

/** Renders children only if the current admin has the permission(s). UX only — the backend enforces. */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission | Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useCan(permission) ? <>{children}</> : <>{fallback}</>;
}
