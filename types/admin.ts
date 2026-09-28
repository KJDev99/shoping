import type { ID, ISODate, Timestamps } from "./common";

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR", "SUPPORT"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_STATUSES = ["ACTIVE", "BLOCKED"] as const;
export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export const PERMISSIONS = [
  "dashboard.read",
  "users.read",
  "users.update",
  "users.block",
  "users.delete",
  "users.notes",
  "listings.read",
  "listings.update",
  "listings.approve",
  "listings.reject",
  "listings.block",
  "listings.delete",
  "barter.read",
  "exchanges.read",
  "exchanges.manage",
  "disputes.manage",
  "matches.read",
  "reviews.moderate",
  "reports.read",
  "reports.resolve",
  "moderation.read",
  "moderation.act",
  "categories.manage",
  "locations.manage",
  "notifications.read",
  "notifications.send",
  "admins.read",
  "admins.manage",
  "audit.read",
  "settings.read",
  "settings.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export interface Role {
  id: AdminRole;
  permissions: Permission[];
}

export interface Admin extends Timestamps {
  id: ID;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string | null;
  role: AdminRole;
  status: AdminStatus;
  lastLoginAt: ISODate | null;
}

/** The authenticated admin plus the effective permission set resolved by the backend. */
export interface AdminSession {
  admin: Admin;
  permissions: Permission[];
}
