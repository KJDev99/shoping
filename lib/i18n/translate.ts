import type { Locale, TranslatedText } from "@/types";
import { dictionaries, type MessageKey } from "./messages";

export type TranslateVars = Record<string, string | number>;

function lookup(locale: Locale, key: string): string | undefined {
  let node: unknown = dictionaries[locale];
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(template: string, vars?: TranslateVars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/**
 * Creates a translator. `t` accepts only known keys (type-checked);
 * `t.dynamic` accepts runtime strings (e.g. validation keys from Zod) and
 * falls back to English, then to the key itself.
 */
export function createTranslator(locale: Locale) {
  const t = (key: MessageKey, vars?: TranslateVars) =>
    interpolate(lookup(locale, key) ?? lookup("en", key) ?? key, vars);
  t.dynamic = (key: string, vars?: TranslateVars) =>
    interpolate(lookup(locale, key) ?? lookup("en", key) ?? key, vars);
  /** Picks the right language from a multilingual value (categories, regions…). */
  t.text = (value: TranslatedText | null | undefined) => (value ? value[locale] || value.uz || value.en : "");
  return t;
}

export type Translator = ReturnType<typeof createTranslator>;
