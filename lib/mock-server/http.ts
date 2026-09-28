import "server-only";

import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";
import type { ApiErrorBody, FieldErrors, ListParams, SortOrder } from "@/types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public errors?: FieldErrors,
  ) {
    super(message);
  }
}

export const badRequest = (message = "Bad request") => new HttpError(400, message, "BAD_REQUEST");
export const unauthorized = (message = "Authentication required") => new HttpError(401, message, "UNAUTHORIZED");
export const forbidden = (message = "You do not have permission to perform this action") =>
  new HttpError(403, message, "FORBIDDEN");
export const notFound = (message = "Resource not found") => new HttpError(404, message, "NOT_FOUND");
/** 409. Pass a stable `code` (e.g. "EMAIL_TAKEN") so clients can show a translated message. */
export const conflict = (message: string, code = "CONFLICT") => new HttpError(409, message, code);
export const unprocessable = (errors: FieldErrors, message = "Validation failed") =>
  new HttpError(422, message, "VALIDATION_ERROR", errors);
export const tooManyRequests = (message = "Too many requests. Please try again later.") =>
  new HttpError(429, message, "RATE_LIMITED");

export function ok<T>(data: T, message = "Success", init?: ResponseInit) {
  return NextResponse.json({ success: true, message, data }, init);
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    const body: ApiErrorBody = { success: false, message: err.message, code: err.code, errors: err.errors };
    return NextResponse.json(body, { status: err.status });
  }
  console.error("[mock-api] unhandled error", err);
  const body: ApiErrorBody = { success: false, message: "Internal server error", code: "INTERNAL" };
  return NextResponse.json(body, { status: 500 });
}

/** Validates a request body with Zod, throwing 422 with field-level errors on failure. */
export function validate<T>(schema: ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_root";
    (errors[key] ??= []).push(issue.message);
  }
  throw unprocessable(errors);
}

// ---------------------------------------------------------------------------
// Listing helpers — server-side pagination/sort/filter/search
// ---------------------------------------------------------------------------

export function parseListParams(url: URL, defaults: Partial<ListParams> = {}): ListParams & { filters: Record<string, string> } {
  const sp = url.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || defaults.page || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || defaults.limit || 20));
  const filters: Record<string, string> = {};
  const reserved = new Set(["page", "limit", "search", "sort", "order"]);
  sp.forEach((value, key) => {
    if (!reserved.has(key) && value !== "") filters[key] = value;
  });
  return {
    page,
    limit,
    search: sp.get("search")?.trim() || undefined,
    sort: sp.get("sort") || defaults.sort,
    order: (sp.get("order") as SortOrder) || defaults.order || "desc",
    filters,
  };
}

export function paginate<T>(items: T[], params: Pick<ListParams, "page" | "limit">) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / params.limit));
  const start = (params.page - 1) * params.limit;
  return NextResponse.json({
    success: true,
    data: items.slice(start, start + params.limit),
    meta: { page: params.page, limit: params.limit, total, totalPages },
  });
}

type Accessor<T> = (item: T) => string | number | boolean | null | undefined;

/** Sorts by a whitelisted key; unknown sort keys are ignored (never trust the client). */
export function sortItems<T>(items: T[], sort: string | undefined, order: SortOrder | undefined, accessors: Record<string, Accessor<T>>) {
  if (!sort || !accessors[sort]) return items;
  const get = accessors[sort];
  const dir = order === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });
}

/** Case- and punctuation-insensitive match against several fields (phones match without spaces). */
export function matchesSearch(search: string | undefined, ...fields: (string | null | undefined)[]) {
  if (!search) return true;
  const norm = (s: string) => s.toLowerCase().replace(/[\s\-()+]/g, "");
  const q = norm(search);
  return fields.some((f) => f && norm(f).includes(q));
}

/** Inclusive date-range filter using `from`/`to` (YYYY-MM-DD) params. */
export function inDateRange(iso: string, from?: string, to?: string) {
  const t = new Date(iso).getTime();
  if (from && t < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && t > new Date(`${to}T23:59:59.999`).getTime()) return false;
  return true;
}

export function csv(value: string | undefined): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
