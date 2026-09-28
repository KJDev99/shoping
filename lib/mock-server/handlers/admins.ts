import "server-only";

import { presentAdmin, type AdminRecord, type MockDb } from "@/lib/mock/db";
import { ROLE_PERMISSIONS } from "@/lib/rbac";
import { adminCreateSchema, adminRoleSchema, adminUpdateSchema } from "@/schemas/admin.schema";
import { optionalReasonSchema } from "@/schemas/common.schema";
import { ADMIN_ROLES, type Role } from "@/types";
import { audit, requirePermission } from "../context";
import { csv, HttpError, inDateRange, matchesSearch, notFound, ok, paginate, parseListParams, sortItems, validate } from "../http";
import { route } from "../router";

/** 409 with a stable code the client maps to a translated message (admins.errors.<CODE>). */
const conflictCode = (code: string, message: string) => new HttpError(409, message, code);

function findAdmin(db: MockDb, id: string): AdminRecord {
  const admin = db.admins.find((a) => a.id === id);
  if (!admin) throw notFound("Admin not found");
  return admin;
}

const fullName = (a: AdminRecord) => `${a.firstName} ${a.lastName}`;

function emailTaken(db: MockDb, email: string, exceptId?: string) {
  const e = email.trim().toLowerCase();
  return db.admins.some((a) => a.id !== exceptId && a.email.toLowerCase() === e);
}

function activeSuperAdmins(db: MockDb) {
  return db.admins.filter((a) => a.role === "SUPER_ADMIN" && a.status === "ACTIVE");
}

function isLastActiveSuperAdmin(db: MockDb, admin: AdminRecord) {
  return admin.role === "SUPER_ADMIN" && admin.status === "ACTIVE" && activeSuperAdmins(db).length <= 1;
}

function revokeSessions(db: MockDb, adminId: string) {
  for (const [token, s] of db.sessions) if (s.adminId === adminId) db.sessions.delete(token);
}

export const adminRoutes = [
  route("GET", "/admins", (ctx) => {
    requirePermission(ctx, "admins.read");
    const p = parseListParams(ctx.url, { sort: "createdAt", order: "desc" });
    const f = p.filters;
    const roles = csv(f.role);
    const statuses = csv(f.status);
    let items = ctx.db.admins.filter(
      (a) =>
        (!roles.length || roles.includes(a.role)) &&
        (!statuses.length || statuses.includes(a.status)) &&
        inDateRange(a.createdAt, f.from, f.to) &&
        matchesSearch(p.search, fullName(a), a.email, a.id),
    );
    items = sortItems(items, p.sort, p.order, {
      fullName: fullName,
      email: (a) => a.email,
      role: (a) => ADMIN_ROLES.indexOf(a.role),
      lastLoginAt: (a) => a.lastLoginAt,
      createdAt: (a) => a.createdAt,
    });
    return paginate(items.map(presentAdmin), p);
  }),

  route("GET", "/roles", (ctx) => {
    requirePermission(ctx, "admins.read");
    const roles: Role[] = ADMIN_ROLES.map((id) => ({ id, permissions: [...ROLE_PERMISSIONS[id]] }));
    return ok(roles);
  }),

  route("GET", "/admins/:id", (ctx) => {
    requirePermission(ctx, "admins.read");
    return ok(presentAdmin(findAdmin(ctx.db, ctx.params.id)));
  }),

  route("POST", "/admins", (ctx) => {
    requirePermission(ctx, "admins.manage");
    const input = validate(adminCreateSchema, ctx.body);
    if (emailTaken(ctx.db, input.email)) throw conflictCode("EMAIL_TAKEN", "An admin with this email already exists");
    const now = new Date().toISOString();
    const seq = ctx.db.admins.reduce((max, a) => Math.max(max, Number(a.id.replace(/\D/g, "")) || 0), 0) + 1;
    const admin: AdminRecord = {
      id: `adm_${seq}`,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      avatar: null,
      role: input.role,
      status: "ACTIVE",
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      // A real backend stores a hash and forces a password change on first login.
      password: input.password,
      failedLogins: 0,
    };
    ctx.db.admins.push(admin);
    audit(ctx, {
      action: "admin.create",
      entityType: "ADMIN",
      entityId: admin.id,
      entityLabel: fullName(admin),
      newValue: { email: admin.email, role: admin.role, phone: admin.phone },
    });
    return ok(presentAdmin(admin), "Admin created", { status: 201 });
  }),

  route("PATCH", "/admins/:id", (ctx) => {
    requirePermission(ctx, "admins.manage");
    const admin = findAdmin(ctx.db, ctx.params.id);
    const input = validate(adminUpdateSchema, ctx.body);
    if (emailTaken(ctx.db, input.email, admin.id)) throw conflictCode("EMAIL_TAKEN", "An admin with this email already exists");
    const old = { firstName: admin.firstName, lastName: admin.lastName, email: admin.email, phone: admin.phone };
    const next = { ...input, email: input.email.toLowerCase() };
    const changedOld: Record<string, unknown> = {};
    const changedNew: Record<string, unknown> = {};
    for (const key of Object.keys(next) as (keyof typeof next)[]) {
      if (old[key] !== next[key]) {
        changedOld[key] = old[key];
        changedNew[key] = next[key];
      }
    }
    Object.assign(admin, next, { updatedAt: new Date().toISOString() });
    if (Object.keys(changedNew).length) {
      audit(ctx, { action: "admin.update", entityType: "ADMIN", entityId: admin.id, entityLabel: fullName(admin), oldValue: changedOld, newValue: changedNew });
    }
    return ok(presentAdmin(admin), "Admin updated");
  }),

  route("POST", "/admins/:id/role", (ctx) => {
    requirePermission(ctx, "admins.manage");
    const admin = findAdmin(ctx.db, ctx.params.id);
    const { role, reason } = validate(adminRoleSchema, ctx.body);
    if (admin.id === ctx.session.admin.id) throw conflictCode("SELF_ROLE_CHANGE", "You cannot change your own role");
    if (admin.role === role) throw conflictCode("SAME_ROLE", "The admin already has this role");
    if (role !== "SUPER_ADMIN" && isLastActiveSuperAdmin(ctx.db, admin)) {
      throw conflictCode("LAST_SUPER_ADMIN", "Cannot demote the last active super admin");
    }
    const old = admin.role;
    admin.role = role;
    admin.updatedAt = new Date().toISOString();
    audit(ctx, {
      action: "admin.role_change",
      entityType: "ADMIN",
      entityId: admin.id,
      entityLabel: fullName(admin),
      oldValue: { role: old },
      newValue: { role },
      reason: reason || null,
    });
    return ok(presentAdmin(admin), "Role changed");
  }),

  route("POST", "/admins/:id/block", (ctx) => {
    requirePermission(ctx, "admins.manage");
    const admin = findAdmin(ctx.db, ctx.params.id);
    const { reason } = validate(optionalReasonSchema, ctx.body ?? {});
    if (admin.id === ctx.session.admin.id) throw conflictCode("SELF_BLOCK", "You cannot block your own account");
    if (admin.status === "BLOCKED") throw conflictCode("ALREADY_BLOCKED", "Admin is already blocked");
    if (isLastActiveSuperAdmin(ctx.db, admin)) throw conflictCode("LAST_SUPER_ADMIN", "Cannot block the last active super admin");
    admin.status = "BLOCKED";
    admin.updatedAt = new Date().toISOString();
    revokeSessions(ctx.db, admin.id);
    audit(ctx, {
      action: "admin.block",
      entityType: "ADMIN",
      entityId: admin.id,
      entityLabel: fullName(admin),
      oldValue: { status: "ACTIVE" },
      newValue: { status: "BLOCKED" },
      reason: reason || null,
    });
    return ok(presentAdmin(admin), "Admin blocked");
  }),

  route("POST", "/admins/:id/activate", (ctx) => {
    requirePermission(ctx, "admins.manage");
    const admin = findAdmin(ctx.db, ctx.params.id);
    const { reason } = validate(optionalReasonSchema, ctx.body ?? {});
    if (admin.status === "ACTIVE") throw conflictCode("ALREADY_ACTIVE", "Admin is already active");
    admin.status = "ACTIVE";
    admin.failedLogins = 0;
    admin.updatedAt = new Date().toISOString();
    audit(ctx, {
      action: "admin.activate",
      entityType: "ADMIN",
      entityId: admin.id,
      entityLabel: fullName(admin),
      oldValue: { status: "BLOCKED" },
      newValue: { status: "ACTIVE" },
      reason: reason || null,
    });
    return ok(presentAdmin(admin), "Admin activated");
  }),
];
