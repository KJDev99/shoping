import type { ApiErrorBody, ApiResponse, FieldErrors, ListParams, PaginatedResponse } from "@/types";

/**
 * Base URL of the admin REST API. Defaults to the bundled mock backend
 * (app/api/admin/[...path]); point it at the real API in production.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/admin";

const CSRF_COOKIE = "barter_csrf";
const CSRF_HEADER = "X-CSRF-Token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isValidation() {
    return this.status === 422;
  }
  get isRateLimited() {
    return this.status === 429;
  }
  get isServerError() {
    return this.status >= 500;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

type QueryValue = string | number | boolean | null | undefined;

export function toQueryString(params?: Record<string, QueryValue>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Flattens ListParams (incl. filters) into query params. */
export function listParamsToQuery(params: ListParams): Record<string, QueryValue> {
  const { filters, ...rest } = params;
  return { ...rest, ...(filters ?? {}) };
}

interface RequestOptions {
  params?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
}

let redirectingToLogin = false;

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers[CSRF_HEADER] = csrf;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}${toQueryString(opts.params)}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: "include",
      signal: opts.signal,
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "Network error", "NETWORK");
  }

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response (proxy error page etc.)
  }

  if (!res.ok) {
    const body = (json ?? {}) as Partial<ApiErrorBody>;
    const error = new ApiError(res.status, body.message ?? res.statusText, body.code, body.errors);
    if (error.isUnauthorized && !path.startsWith("/auth/") && typeof window !== "undefined" && !redirectingToLogin) {
      redirectingToLogin = true;
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- runs outside React (fetch layer); hard reload drops stale state
      window.location.assign(`/admin/login?next=${next}`);
    }
    throw error;
  }
  return json as T;
}

/** Thin typed wrapper. Single-resource calls unwrap `data`; list calls keep `meta`. */
export const api = {
  async get<T>(path: string, params?: Record<string, QueryValue>, signal?: AbortSignal): Promise<T> {
    return (await request<ApiResponse<T>>("GET", path, { params, signal })).data;
  },
  list<T>(path: string, params: ListParams, signal?: AbortSignal): Promise<PaginatedResponse<T>> {
    return request<PaginatedResponse<T>>("GET", path, { params: listParamsToQuery(params), signal });
  },
  async post<T>(path: string, body?: unknown): Promise<T> {
    return (await request<ApiResponse<T>>("POST", path, { body: body ?? {} })).data;
  },
  async patch<T>(path: string, body: unknown): Promise<T> {
    return (await request<ApiResponse<T>>("PATCH", path, { body })).data;
  },
  async put<T>(path: string, body: unknown): Promise<T> {
    return (await request<ApiResponse<T>>("PUT", path, { body })).data;
  },
  async delete<T>(path: string, params?: Record<string, QueryValue>): Promise<T> {
    return (await request<ApiResponse<T>>("DELETE", path, { params })).data;
  },
};
