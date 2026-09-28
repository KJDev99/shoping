/** Standard API envelope types shared by the frontend and the (mock or real) backend. */

export interface ApiResponse<T> {
  success: true;
  message?: string;
  data: T;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

/** Field-level validation errors, keyed by field path (e.g. "exchangePreferences.keywords"). */
export type FieldErrors = Record<string, string[]>;

export interface ApiErrorBody {
  success: false;
  message: string;
  code?: string;
  errors?: FieldErrors;
}

export type SortOrder = "asc" | "desc";

/**
 * Server-side list query. Every large table sends these params; the backend
 * is responsible for pagination, sorting, filtering and search.
 */
export interface ListParams {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  order?: SortOrder;
  /** Arbitrary filter values, serialized as query-string params. */
  filters?: Record<string, string | undefined>;
}

export type DateRangePreset = "today" | "7d" | "30d" | "3m" | "6m" | "1y" | "custom";

export interface DateRange {
  from: string;
  to: string;
}
