import "server-only";

import type { NextRequest } from "next/server";
import { getDb, type MockDb } from "@/lib/mock/db";
import type { User } from "@/types";
import { badRequest, errorResponse, forbidden, HttpError, sleep, unauthorized } from "../http";
import { match, type Method } from "../router";

/**
 * Marketplace (end-user) API core. Deliberately separate from the admin API:
 * different cookies, different session store, and no admin permissions.
 */
export const USER_SESSION_COOKIE = "barter_session";
export const USER_CSRF_COOKIE = "barter_user_csrf";
const CSRF_HEADER = "x-csrf-token";
const SESSION_DAYS = 30;
export const SESSION_TTL_MS = SESSION_DAYS * 86_400_000;

export interface AppContext {
  req: NextRequest;
  url: URL;
  db: MockDb;
  params: Record<string, string>;
  user: User | null;
  sessionToken: string | null;
  /** Parsed JSON body; undefined for GET and multipart requests. */
  body: unknown;
}

export interface AuthedAppContext extends AppContext {
  user: User;
}

export interface AppRoute {
  method: Method;
  path: string;
  /** Public routes need no session and no CSRF token (login flow, catalog). */
  public?: boolean;
  handler: (ctx: AppContext) => Response | Promise<Response>;
}

export function appRoute(method: Method, path: string, handler: AppRoute["handler"], opts: { public?: boolean } = {}): AppRoute {
  return { method, path, handler, public: opts.public };
}

function resolveUser(req: NextRequest, db: MockDb): { user: User; token: string; csrf: string } | null {
  const token = req.cookies.get(USER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const record = db.userSessions.get(token);
  if (!record || record.expiresAt < Date.now()) return null;
  const user = db.users.find((u) => u.id === record.userId);
  // Blocked/deleted accounts lose their sessions immediately.
  if (!user || user.status === "BLOCKED" || user.status === "DELETED") return null;
  return { user, token, csrf: record.csrfToken };
}

export function requireUser(ctx: AppContext): asserts ctx is AuthedAppContext {
  if (!ctx.user) throw unauthorized();
}

/** Suspended users can browse but not publish. */
export function requireActiveUser(ctx: AppContext): asserts ctx is AuthedAppContext {
  requireUser(ctx);
  if (ctx.user.status === "SUSPENDED") throw new HttpError(403, "Your account is temporarily suspended", "ACCOUNT_SUSPENDED");
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

/** "+998901234567" → "+998 90 123 45 67" (the format stored on users). */
export function formatPhone(phone: string) {
  const d = normalizePhone(phone);
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
}

const LATENCY_MS = Number(process.env.MOCK_API_LATENCY_MS ?? 250);

export async function dispatchApp(routes: AppRoute[], req: NextRequest, segments: string[]): Promise<Response> {
  try {
    const method = req.method as Method;
    const found = routes
      .filter((r) => r.method === method)
      .map((r) => ({ r, params: match(r.path, segments) }))
      .filter((c): c is { r: AppRoute; params: Record<string, string> } => c.params !== null)
      .sort((a, b) => Object.keys(a.params).length - Object.keys(b.params).length)[0];
    if (!found) throw new HttpError(404, `No route for ${method} /${segments.join("/")}`, "NOT_FOUND");

    const db = getDb();
    const resolved = resolveUser(req, db);

    // Double-submit CSRF on every state-changing request made with a session.
    if (method !== "GET" && resolved && !found.r.public) {
      if (req.headers.get(CSRF_HEADER) !== resolved.csrf) throw forbidden("Invalid CSRF token");
    }

    let body: unknown;
    const isMultipart = req.headers.get("content-type")?.startsWith("multipart/form-data");
    if (method !== "GET" && method !== "DELETE" && !isMultipart) {
      const text = await req.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          throw badRequest("Malformed JSON body");
        }
      }
    }
    if (LATENCY_MS > 0 && !segments[0]?.startsWith("uploads")) await sleep(LATENCY_MS);

    return await found.r.handler({
      req,
      url: new URL(req.url),
      db,
      params: found.params,
      user: resolved?.user ?? null,
      sessionToken: resolved?.token ?? null,
      body,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
