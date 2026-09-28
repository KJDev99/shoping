import "server-only";

import { adminRefOf, type MockDb } from "@/lib/mock/db";
import type { AuditLog } from "@/types";
import { requireAuth, requirePermission } from "../context";
import { csv, inDateRange, matchesSearch, notFound, ok, paginate, parseListParams, sortItems } from "../http";
import { route } from "../router";

function present(db: MockDb, log: AuditLog): AuditLog {
  return { ...log, admin: adminRefOf(db, log.adminId) };
}

/**
 * Audit logs are strictly read-only: there are no update or delete routes.
 * Exception: `adminId=me` lets any authenticated admin read their own entries
 * (used by the profile page) without holding `audit.read`.
 */
export const auditRoutes = [
  route("GET", "/audit-logs", (ctx) => {
    const p = parseListParams(ctx.url, { sort: "createdAt", order: "desc" });
    const f = p.filters;
    let adminIds: string[];
    if (f.adminId === "me") {
      requireAuth(ctx);
      adminIds = [ctx.session.admin.id];
    } else {
      requirePermission(ctx, "audit.read");
      adminIds = csv(f.adminId);
    }
    const actions = csv(f.action);
    const entityTypes = csv(f.entityType);
    let items = ctx.db.auditLogs.filter(
      (l) =>
        (!adminIds.length || adminIds.includes(l.adminId)) &&
        // Prefix match: "listing." matches every listing action; "listing.reject" matches exactly (and sub-actions).
        (!actions.length || actions.some((a) => l.action === a || l.action.startsWith(a.endsWith(".") ? a : `${a}.`))) &&
        (!entityTypes.length || entityTypes.includes(l.entityType)) &&
        (!f.entityId || l.entityId === f.entityId) &&
        inDateRange(l.createdAt, f.from, f.to) &&
        matchesSearch(p.search, l.entityLabel, l.entityId, l.ipAddress, l.id),
    );
    items = sortItems(items, p.sort, p.order, {
      createdAt: (l) => l.createdAt,
      action: (l) => l.action,
    });
    return paginate(
      items.map((l) => present(ctx.db, l)),
      p,
    );
  }),

  route("GET", "/audit-logs/actions", (ctx) => {
    requirePermission(ctx, "audit.read");
    const actions = [...new Set(ctx.db.auditLogs.map((l) => l.action))].sort();
    return ok(actions);
  }),

  route("GET", "/audit-logs/:id", (ctx) => {
    requireAuth(ctx);
    const log = ctx.db.auditLogs.find((l) => l.id === ctx.params.id);
    // Own entries are readable without audit.read (profile page); everything else requires it.
    if (!log || log.adminId !== ctx.session.admin.id) requirePermission(ctx, "audit.read");
    if (!log) throw notFound("Audit log entry not found");
    return ok(present(ctx.db, log));
  }),
];
