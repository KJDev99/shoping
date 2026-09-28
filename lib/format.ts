import { formatDistanceToNowStrict } from "date-fns";
import { enGB, ru, uz } from "date-fns/locale";
import { INTL_LOCALE } from "@/lib/i18n/config";
import type { Locale } from "@/types";

const DATE_FNS_LOCALE = { uz, ru, en: enGB } as const;

/** Uzbek (Latin) month abbreviations — many Intl implementations fall back to "M09" for `uz`. */
const UZ_MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (locale === "uz") return `${pad(d.getDate())} ${UZ_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function formatDateTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (locale === "uz") return `${formatDate(iso, locale)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Short axis label (e.g. "28 sen" / "28 сент."), for charts. */
export function formatShortDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (locale === "uz") return `${d.getDate()} ${UZ_MONTHS[d.getMonth()]}`;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "short" }).format(d);
}

export function formatRelative(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: DATE_FNS_LOCALE[locale] });
}

export function formatNumber(value: number | null | undefined, locale: Locale, opts?: Intl.NumberFormatOptions): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(INTL_LOCALE[locale], opts).format(value);
}

export function formatCompact(value: number, locale: Locale): string {
  return formatNumber(value, locale, { notation: "compact", maximumFractionDigits: 1 });
}

export function formatPercent(fraction: number, locale: Locale, digits = 1): string {
  return formatNumber(fraction, locale, { style: "percent", maximumFractionDigits: digits });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** "YYYY-MM-DD" in local time — used for date filter params. */
export function toDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
