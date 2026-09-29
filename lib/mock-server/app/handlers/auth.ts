import "server-only";

import { NextResponse } from "next/server";
import { nextId, recomputeAggregates, type MockDb } from "@/lib/mock/db";
import { requestCodeSchema, verifyCodeSchema } from "@/schemas/site.schema";
import type { SiteUser, User } from "@/types";
import { HttpError, ok, tooManyRequests, unprocessable, validate } from "../../http";
import {
  appRoute,
  formatPhone,
  normalizePhone,
  SESSION_TTL_MS,
  USER_CSRF_COOKIE,
  USER_SESSION_COOKIE,
} from "../core";

const CODE_TTL_MS = 5 * 60_000;
const RESEND_AFTER_MS = 60_000;
const MAX_ATTEMPTS = 5;
/**
 * The mock has no SMS provider, so by default ANY 6-digit code is accepted (demo convenience).
 * Set MOCK_STRICT_OTP=true to check the generated code instead. A real backend must always verify it.
 */
const ACCEPT_ANY_CODE = process.env.MOCK_STRICT_OTP !== "true";

export function toSiteUser(u: User): SiteUser {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: u.fullName,
    phone: u.phone,
    avatar: u.avatar,
    regionId: u.regionId,
    status: u.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
    suspendedUntil: u.suspendedUntil,
    listingsCount: u.listingsCount,
  };
}

function findByPhone(db: MockDb, phone: string) {
  const digits = normalizePhone(phone);
  return db.users.find((u) => normalizePhone(u.phone) === digits);
}

function token() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

function createUser(db: MockDb, phone: string, profile: { firstName: string; lastName?: string; regionId: string }): User {
  const now = new Date().toISOString();
  const fullName = `${profile.firstName} ${profile.lastName ?? ""}`.trim();
  const user: User = {
    id: nextId(db, "usr"),
    firstName: profile.firstName,
    lastName: profile.lastName ?? "",
    fullName,
    username: `${fullName.toLowerCase().replace(/[^a-z]/g, "")}${Math.floor(Math.random() * 90 + 10)}`,
    phone: formatPhone(phone),
    email: null,
    avatar: null,
    bio: null,
    regionId: profile.regionId,
    districtId: null,
    status: "ACTIVE",
    statusReason: null,
    suspendedUntil: null,
    phoneVerified: true,
    emailVerified: false,
    language: "uz",
    listingsCount: 0,
    completedExchanges: 0,
    reportsCount: 0,
    reportsSubmittedCount: 0,
    rating: null,
    reviewsCount: 0,
    riskLevel: "LOW",
    registeredVia: "PHONE",
    lastActiveAt: now,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  db.users.push(user);
  recomputeAggregates(db);
  return user;
}

export const authRoutes = [
  /** Sends a one-time SMS code. The mock returns it outside production so the flow can be tried locally. */
  appRoute(
    "POST",
    "/auth/request-code",
    (ctx) => {
      const { phone } = validate(requestCodeSchema, ctx.body);
      const key = normalizePhone(phone);
      const existing = ctx.db.otps.get(key);
      if (!ACCEPT_ANY_CODE && existing && Date.now() - existing.sentAt < RESEND_AFTER_MS) throw tooManyRequests("Please wait before requesting a new code");
      const user = findByPhone(ctx.db, phone);
      if (user && (user.status === "BLOCKED" || user.status === "DELETED")) {
        throw new HttpError(403, "This account is blocked", "ACCOUNT_BLOCKED");
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      ctx.db.otps.set(key, { phone: key, code, expiresAt: Date.now() + CODE_TTL_MS, attempts: 0, sentAt: Date.now() });
      // A real backend sends this through an SMS provider (Eskiz, Play Mobile…).
      return ok({
        isNewUser: !user,
        resendAfterSec: RESEND_AFTER_MS / 1000,
        // Never expose codes in production unless explicitly enabled for a demo deployment of the mock.
        devCode: process.env.NODE_ENV !== "production" || process.env.MOCK_EXPOSE_OTP === "true" ? code : null,
        acceptsAnyCode: ACCEPT_ANY_CODE,
      });
    },
    { public: true },
  ),

  appRoute(
    "POST",
    "/auth/verify",
    (ctx) => {
      const input = validate(verifyCodeSchema, ctx.body);
      const key = normalizePhone(input.phone);
      const otp = ctx.db.otps.get(key);
      if (!ACCEPT_ANY_CODE) {
        if (!otp || otp.expiresAt < Date.now()) throw unprocessable({ code: ["site.validation.codeExpired"] });
        if (otp.attempts >= MAX_ATTEMPTS) {
          ctx.db.otps.delete(key);
          throw tooManyRequests("Too many wrong codes. Request a new one.");
        }
        if (otp.code !== input.code) {
          otp.attempts += 1;
          throw unprocessable({ code: ["site.validation.codeWrong"] });
        }
      }

      let user = findByPhone(ctx.db, input.phone);
      if (user && (user.status === "BLOCKED" || user.status === "DELETED")) {
        throw new HttpError(403, "This account is blocked", "ACCOUNT_BLOCKED");
      }
      if (!user) {
        // New number: keep the code valid and ask for a profile first.
        if (!input.profile) return ok({ needsProfile: true, user: null });
        if (!ctx.db.regions.some((r) => r.id === input.profile!.regionId && r.enabled)) {
          throw unprocessable({ "profile.regionId": ["validation.invalid"] });
        }
        user = createUser(ctx.db, input.phone, input.profile);
      }
      ctx.db.otps.delete(key);
      user.lastActiveAt = new Date().toISOString();

      const sessionToken = token();
      const csrf = token();
      ctx.db.userSessions.set(sessionToken, { token: sessionToken, userId: user.id, csrfToken: csrf, expiresAt: Date.now() + SESSION_TTL_MS });
      const res = NextResponse.json({ success: true, message: "Signed in", data: { needsProfile: false, user: toSiteUser(user) } });
      const secure = process.env.NODE_ENV === "production";
      res.cookies.set(USER_SESSION_COOKIE, sessionToken, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: SESSION_TTL_MS / 1000 });
      res.cookies.set(USER_CSRF_COOKIE, csrf, { httpOnly: false, sameSite: "lax", secure, path: "/", maxAge: SESSION_TTL_MS / 1000 });
      return res;
    },
    { public: true },
  ),

  appRoute("POST", "/auth/logout", (ctx) => {
    if (ctx.sessionToken) ctx.db.userSessions.delete(ctx.sessionToken);
    const res = NextResponse.json({ success: true, message: "Signed out", data: null });
    res.cookies.delete(USER_SESSION_COOKIE);
    res.cookies.delete(USER_CSRF_COOKIE);
    return res;
  }),

  /** The current user, or null for guests (browsing needs no account). */
  appRoute(
    "GET",
    "/auth/me",
    (ctx) => ok(ctx.user ? toSiteUser(ctx.user) : null),
    { public: true },
  ),
];
