import "server-only";

import type { NextRequest } from "next/server";
import { getDb } from "@/lib/mock/db";
import { CSRF_HEADER, resolveSession, type RequestContext } from "./context";
import { badRequest, errorResponse, forbidden, HttpError, sleep } from "./http";

export type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface Route {
  method: Method;
  /** Path relative to /api/admin, with `:param` segments, e.g. "/users/:id/block". */
  path: string;
  /** Public routes skip session + CSRF checks (login, password reset). */
  public?: boolean;
  handler: (ctx: RequestContext) => Response | Promise<Response>;
}

export function route(method: Method, path: string, handler: Route["handler"], opts: { public?: boolean } = {}): Route {
  return { method, path, handler, public: opts.public };
}

export function match(pattern: string, segments: string[]): Record<string, string> | null {
  const parts = pattern.split("/").filter(Boolean);
  if (parts.length !== segments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith(":")) params[parts[i].slice(1)] = decodeURIComponent(segments[i]);
    else if (parts[i] !== segments[i]) return null;
  }
  return params;
}

/** Simulated network latency so loading states are visible in development. */
const LATENCY_MS = Number(process.env.MOCK_API_LATENCY_MS ?? 250);

export async function dispatch(routes: Route[], req: NextRequest, segments: string[]): Promise<Response> {
  try {
    const method = req.method as Method;
    // Static segments win over params ("/users/export" before "/users/:id").
    const candidates = routes
      .filter((r) => r.method === method)
      .map((r) => ({ r, params: match(r.path, segments) }))
      .filter((c): c is { r: Route; params: Record<string, string> } => c.params !== null)
      .sort((a, b) => Object.keys(a.params).length - Object.keys(b.params).length);
    const found = candidates[0];
    if (!found) throw new HttpError(404, `No route for ${method} /${segments.join("/")}`, "NOT_FOUND");

    const db = getDb();
    const session = found.r.public ? null : resolveSession(req, db);

    // CSRF: double-submit token required on state-changing, authenticated requests.
    if (!found.r.public && method !== "GET" && session) {
      const header = req.headers.get(CSRF_HEADER);
      if (!header || header !== session.csrfToken) throw forbidden("Invalid CSRF token");
    }

    let body: unknown;
    if (method !== "GET" && method !== "DELETE") {
      const text = await req.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          throw badRequest("Malformed JSON body");
        }
      }
    }

    if (LATENCY_MS > 0) await sleep(LATENCY_MS + Math.floor(Math.random() * 150));

    return await found.r.handler({ req, url: new URL(req.url), db, params: found.params, session, body });
  } catch (err) {
    return errorResponse(err);
  }
}
