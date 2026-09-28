import type { Locale } from "@/types";

export const DEFAULT_LOCALE: Locale = "uz";
export const LOCALE_COOKIE = "barter_admin_locale";

/** BCP-47 tags for Intl / date formatting. */
export const INTL_LOCALE: Record<Locale, string> = {
  uz: "uz-Latn-UZ",
  ru: "ru-RU",
  en: "en-GB",
};

export const LOCALE_LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return value === "uz" || value === "ru" || value === "en";
}
