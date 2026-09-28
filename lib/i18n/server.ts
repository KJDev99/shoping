import "server-only";

import { cookies } from "next/headers";
import type { Locale } from "@/types";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "./config";
import { createTranslator } from "./translate";

export async function getServerLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Translator for Server Components (metadata, static headings). */
export async function getServerT() {
  return createTranslator(await getServerLocale());
}
