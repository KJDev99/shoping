import "server-only";

import type { NextRequest } from "next/server";
import { permissionsForRole } from "@/lib/rbac";
import type { AuditEntityType, ID, ModerationActionType, ModerationTargetType, Permission } from "@/types";
import { adminRefOf, getDb, nextId, type AdminRecord, type MockDb } from "@/lib/mock/db";
import { forbidden, unauthorized } from "./http";

export const SESSION_COOKIE = "barter_admin_session";
export const CSRF_COOKIE = "barter_csrf";
export const CSRF_HEADER = "x-csrf-token";

export interface Session {
  admin: AdminRecord;
  permissions: Permission[];
  csrfToken: string;
  token: string;
}

export interface RequestContext {
  req: NextRequest;
  url: URL;
  db: MockDb;
  params: Record<string, string>;
  session: Session | null;
  /** Parsed JSON body (undefined for GET). */
  body: unknown;
}

export interface AuthedContext extends RequestContext {
  session: Session;
}

export function resolveSession(req: NextRequest, db: MockDb): Session | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const record = db.sessions.get(token);
  if (!record || record.expiresAt < Date.now()) return null;
  const admin = db.admins.find((a) => a.id === record.adminId);
  if (!admin || admin.status !== "ACTIVE") return null;
  // Optional IP allow-list for the admin panel (Settings → Security). Empty list = no restriction.
  const allowed = db.settings.security.allowedAdminIps;
  if (allowed.length && !allowed.includes(clientIp(req))) return null;
  // Sliding expiration.
  record.expiresAt = Date.now() + db.settings.security.sessionTimeoutMinutes * 60_000;
  return { admin, permissions: permissionsForRole(admin.role), csrfToken: record.csrfToken, token };
}

export function requireAuth(ctx: RequestContext): asserts ctx is AuthedContext {
  if (!ctx.session) throw unauthorized();
}

/** Server-side permission enforcement. The UI hides controls too, but this is the real gate. */
export function requirePermission(ctx: RequestContext, ...permissions: Permission[]): asserts ctx is AuthedContext {
  requireAuth(ctx);
  const missing = permissions.filter((p) => !ctx.session!.permissions.includes(p));
  if (missing.length) throw forbidden(`Missing permission: ${missing.join(", ")}`);
}

export function getDbForRequest() {
  return getDb();
}

export function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
}

/** Appends an immutable audit log entry. */
export function audit(
  ctx: AuthedContext,
  entry: {
    action: string;
    entityType: AuditEntityType;
    entityId: ID | null;
    entityLabel?: string | null;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    reason?: string | null;
  },
) {
  ctx.db.auditLogs.unshift({
    id: nextId(ctx.db, "aud"),
    adminId: ctx.session.admin.id,
    admin: adminRefOf(ctx.db, ctx.session.admin.id),
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    entityLabel: entry.entityLabel ?? null,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    reason: entry.reason ?? null,
    ipAddress: clientIp(ctx.req),
    userAgent: ctx.req.headers.get("user-agent") ?? "unknown",
    createdAt: new Date().toISOString(),
  });
}

/** Records a moderation action (adminId, action, targetType, targetId, reason, createdAt). */
export function recordModeration(
  ctx: AuthedContext,
  action: ModerationActionType,
  targetType: ModerationTargetType,
  targetId: ID,
  targetLabel: string,
  reason: string | null,
) {
  ctx.db.moderationActions.unshift({
    id: nextId(ctx.db, "mod"),
    adminId: ctx.session.admin.id,
    admin: adminRefOf(ctx.db, ctx.session.admin.id),
    action,
    targetType,
    targetId,
    targetLabel,
    reason,
    createdAt: new Date().toISOString(),
  });
}
