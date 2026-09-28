import "server-only";

import { NextResponse } from "next/server";
import { changePasswordSchema, forgotPasswordSchema, loginSchema, profileSchema, resetPasswordSchema } from "@/schemas/auth.schema";
import { presentAdmin } from "@/lib/mock/db";
import { permissionsForRole } from "@/lib/rbac";
import type { AdminSession } from "@/types";
import { audit, CSRF_COOKIE, requireAuth, SESSION_COOKIE } from "../context";
import { HttpError, ok, tooManyRequests, unauthorized, unprocessable, validate } from "../http";
import { route } from "../router";

const lockouts = new Map<string, number>();
const LOCKOUT_MS = 15 * 60_000;

function randomToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export const authRoutes = [
  route(
    "POST",
    "/auth/login",
    (ctx) => {
      const input = validate(loginSchema, ctx.body);
      const email = input.email.toLowerCase();
      const lockedUntil = lockouts.get(email);
      if (lockedUntil && lockedUntil > Date.now()) throw tooManyRequests();

      const admin = ctx.db.admins.find((a) => a.email.toLowerCase() === email);
      if (!admin || admin.password !== input.password) {
        if (admin) {
          admin.failedLogins += 1;
          if (admin.failedLogins >= ctx.db.settings.security.maxLoginAttempts) {
            lockouts.set(email, Date.now() + LOCKOUT_MS);
            admin.failedLogins = 0;
          }
        }
        // Same message for unknown email and wrong password — no account enumeration.
        throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
      }
      if (admin.status !== "ACTIVE") throw new HttpError(403, "This admin account is blocked", "ACCOUNT_BLOCKED");

      admin.failedLogins = 0;
      admin.lastLoginAt = new Date().toISOString();
      const token = randomToken();
      const csrfToken = randomToken();
      const ttlMinutes = input.remember ? 60 * 24 * 7 : ctx.db.settings.security.sessionTimeoutMinutes;
      ctx.db.sessions.set(token, { token, adminId: admin.id, csrfToken, expiresAt: Date.now() + ttlMinutes * 60_000 });

      const session: AdminSession = { admin: presentAdmin(admin), permissions: permissionsForRole(admin.role) };
      audit({ ...ctx, session: { admin, permissions: session.permissions, csrfToken, token } }, {
        action: "auth.login",
        entityType: "AUTH",
        entityId: admin.id,
        entityLabel: admin.email,
      });

      const res = NextResponse.json({ success: true, message: "Signed in", data: session });
      const secure = process.env.NODE_ENV === "production";
      res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: input.remember ? ttlMinutes * 60 : undefined,
      });
      // Readable by JS so the client can echo it in the X-CSRF-Token header (double-submit).
      res.cookies.set(CSRF_COOKIE, csrfToken, { httpOnly: false, sameSite: "lax", secure, path: "/" });
      return res;
    },
    { public: true },
  ),

  route("POST", "/auth/logout", (ctx) => {
    if (ctx.session) {
      ctx.db.sessions.delete(ctx.session.token);
    }
    const res = NextResponse.json({ success: true, message: "Signed out", data: null });
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(CSRF_COOKIE);
    return res;
  }),

  route("GET", "/auth/me", (ctx) => {
    if (!ctx.session) throw unauthorized();
    const data: AdminSession = { admin: presentAdmin(ctx.session.admin), permissions: ctx.session.permissions };
    return ok(data);
  }),

  route(
    "POST",
    "/auth/forgot-password",
    (ctx) => {
      const { email } = validate(forgotPasswordSchema, ctx.body);
      const admin = ctx.db.admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
      let devResetToken: string | undefined;
      if (admin && admin.status === "ACTIVE") {
        const token = randomToken();
        ctx.db.passwordResets.set(token, { token, adminId: admin.id, expiresAt: Date.now() + 30 * 60_000 });
        // A real backend emails this link. The mock returns it so the flow can be tried locally.
        if (process.env.NODE_ENV !== "production") devResetToken = token;
      }
      // Always succeed to avoid revealing which emails exist.
      return ok({ devResetToken: devResetToken ?? null }, "If the account exists, a reset link has been sent");
    },
    { public: true },
  ),

  route(
    "POST",
    "/auth/reset-password",
    (ctx) => {
      const input = validate(resetPasswordSchema, ctx.body);
      const record = ctx.db.passwordResets.get(input.token);
      if (!record || record.expiresAt < Date.now()) {
        throw unprocessable({ token: ["validation.resetTokenInvalid"] }, "Reset link is invalid or expired");
      }
      const admin = ctx.db.admins.find((a) => a.id === record.adminId);
      if (admin) admin.password = input.password;
      ctx.db.passwordResets.delete(input.token);
      // Invalidate all existing sessions for this admin.
      for (const [token, s] of ctx.db.sessions) if (s.adminId === record.adminId) ctx.db.sessions.delete(token);
      return ok(null, "Password updated");
    },
    { public: true },
  ),

  route("PATCH", "/auth/profile", (ctx) => {
    requireAuth(ctx);
    const input = validate(profileSchema, ctx.body);
    const admin = ctx.session.admin;
    const old = { firstName: admin.firstName, lastName: admin.lastName, phone: admin.phone };
    Object.assign(admin, input, { updatedAt: new Date().toISOString() });
    audit(ctx, { action: "admin.profile_update", entityType: "ADMIN", entityId: admin.id, entityLabel: admin.email, oldValue: old, newValue: input });
    return ok(presentAdmin(admin), "Profile updated");
  }),

  route("POST", "/auth/change-password", (ctx) => {
    requireAuth(ctx);
    const input = validate(changePasswordSchema, ctx.body);
    if (ctx.session.admin.password !== input.currentPassword) {
      throw unprocessable({ currentPassword: ["validation.currentPasswordWrong"] });
    }
    ctx.session.admin.password = input.password;
    audit(ctx, { action: "admin.password_change", entityType: "ADMIN", entityId: ctx.session.admin.id, entityLabel: ctx.session.admin.email });
    return ok(null, "Password changed");
  }),
];
