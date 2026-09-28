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
  /** JSON body, or FormData for file uploads. */
  body?: unknown;
  signal?: AbortSignal;
}

interface ClientConfig {
  baseUrl: string;
  /** Readable cookie whose value is echoed in X-CSRF-Token on mutations (double-submit). */
  csrfCookie: string;
  /** Called on a 401 outside the auth endpoints (e.g. redirect to a login page). */
  onUnauthorized?: () => void;
}

/** Creates a typed REST client. Single-resource calls unwrap `data`; list calls keep `meta`. */
export function createApiClient(config: ClientConfig) {
  let redirecting = false;

  async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
    if (opts.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
    if (method !== "GET") {
      const csrf = readCookie(config.csrfCookie);
      if (csrf) headers[CSRF_HEADER] = csrf;
    }

    let res: Response;
    try {
      res = await fetch(`${config.baseUrl}${path}${toQueryString(opts.params)}`, {
        method,
        headers,
        body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
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
      if (error.isUnauthorized && !path.startsWith("/auth/") && typeof window !== "undefined" && !redirecting && config.onUnauthorized) {
        redirecting = true;
        config.onUnauthorized();
      }
      throw error;
    }
    return json as T;
  }

  return {
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
}

export type ApiClient = ReturnType<typeof createApiClient>;

function hardRedirect(path: string) {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- runs outside React (fetch layer); hard reload drops stale state
  window.location.assign(`${path}?next=${next}`);
}

/** Admin panel API (session expiry → admin login). */
export const api = createApiClient({ baseUrl: API_BASE_URL, csrfCookie: CSRF_COOKIE, onUnauthorized: () => hardRedirect("/admin/login") });

/** Public marketplace API (separate session). */
export const SITE_API_BASE_URL = process.env.NEXT_PUBLIC_SITE_API_URL ?? "/api/app";
export const siteApi = createApiClient({ baseUrl: SITE_API_BASE_URL, csrfCookie: "barter_user_csrf", onUnauthorized: () => hardRedirect("/login") });
