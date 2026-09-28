import { PERMISSIONS, type AdminRole, type Permission } from "@/types";

/**
 * Default role → permission mapping. The backend is the source of truth and
 * returns the effective permission set with the session; this table is used by
 * the mock backend and as documentation. Frontend checks are UX only — the API
 * must enforce every permission independently.
 */
export const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  ADMIN: PERMISSIONS.filter((p) => p !== "admins.manage"),
  MODERATOR: [
    "dashboard.read",
    "users.read",
    "users.block",
    "users.notes",
    "listings.read",
    "listings.update",
    "listings.approve",
    "listings.reject",
    "listings.block",
    "barter.read",
    "exchanges.read",
    "disputes.manage",
    "matches.read",
    "reviews.moderate",
    "reports.read",
    "reports.resolve",
    "moderation.read",
    "moderation.act",
    "notifications.read",
  ],
  SUPPORT: [
    "dashboard.read",
    "users.read",
    "users.notes",
    "listings.read",
    "barter.read",
    "exchanges.read",
    "matches.read",
    "reports.read",
    "moderation.read",
    "notifications.read",
  ],
};

export function permissionsForRole(role: AdminRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function hasPermission(granted: readonly Permission[], required: Permission | Permission[]): boolean {
  const list = Array.isArray(required) ? required : [required];
  return list.every((p) => granted.includes(p));
}

/** Groups permissions by resource prefix for the RBAC matrix UI. */
export function groupPermissions(): Record<string, Permission[]> {
  return PERMISSIONS.reduce<Record<string, Permission[]>>((acc, p) => {
    const group = p.split(".")[0];
    (acc[group] ??= []).push(p);
    return acc;
  }, {});
}
