import { ATTRIBUTE_TYPES, CATEGORY_STATUSES, type AttributeType } from "@/types";
import { z } from "./z";

/** Lowercase latin words separated by single hyphens, e.g. "mobile-phones". */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** snake_case identifier starting with a letter, e.g. "screen_size". */
export const ATTRIBUTE_KEY_REGEX = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

/** Attribute types whose values come from a predefined option list. */
export const OPTION_ATTRIBUTE_TYPES: readonly AttributeType[] = ["SELECT", "MULTI_SELECT"];
export const hasOptions = (type: AttributeType) => OPTION_ATTRIBUTE_TYPES.includes(type);
/** Attribute types where a measurement unit makes sense. */
export const hasUnit = (type: AttributeType) => type === "NUMBER" || hasOptions(type);

const text = (max = 100) =>
  z
    .string()
    .trim()
    .min(1, "validation.required")
    .max(max, max === 100 ? "validation.max100" : "validation.max50");

/** All three languages are required for catalogue data shown in the apps. */
export const translatedTextSchema = z.object({ uz: text(), ru: text(), en: text() });
export type TranslatedTextInput = z.infer<typeof translatedTextSchema>;

const imageUrl = z
  .string()
  .trim()
  .max(500, "validation.max1000")
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v) || /^\/\S*$/.test(v), "validation.url");

export const categorySchema = z.object({
  name: translatedTextSchema,
  slug: z.string().trim().min(2, "validation.min2").max(100, "validation.max100").regex(SLUG_REGEX, "validation.slug"),
  /** Lucide icon name (PascalCase), rendered through a whitelist on the client. */
  icon: z.string().trim().max(50, "validation.max50").regex(/^[A-Z][A-Za-z0-9]*$/, "validation.invalid").nullable(),
  image: imageUrl.nullable(),
  parentId: z.string().nullable(),
  status: z.enum(CATEGORY_STATUSES),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const categoryStatusSchema = z.object({ status: z.enum(CATEGORY_STATUSES) });
export type CategoryStatusInput = z.infer<typeof categoryStatusSchema>;

export const categoryReorderSchema = z.object({
  parentId: z.string().nullable(),
  orderedIds: z.array(z.string().min(1)).min(1, "validation.atLeastOne"),
});
export type CategoryReorderInput = z.infer<typeof categoryReorderSchema>;

export const attributeReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1, "validation.atLeastOne"),
});
export type AttributeReorderInput = z.infer<typeof attributeReorderSchema>;

export const attributeOptionSchema = z.object({
  value: z.string().trim().min(1, "validation.required").max(50, "validation.max50"),
  label: z.object({ uz: text(50), ru: text(50), en: text(50) }),
});
export type AttributeOptionInput = z.infer<typeof attributeOptionSchema>;

export const attributeSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(2, "validation.min2")
      .max(50, "validation.max50")
      .regex(ATTRIBUTE_KEY_REGEX, "categories.validation.attributeKey"),
    name: translatedTextSchema,
    type: z.enum(ATTRIBUTE_TYPES),
    required: z.boolean(),
    options: z.array(attributeOptionSchema).max(100, "validation.max100"),
    unit: z.string().trim().max(20, "categories.validation.unitMax"),
    filterable: z.boolean(),
    searchable: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (hasOptions(v.type)) {
      if (v.options.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "categories.validation.optionsRequired" });
      const seen = new Set<string>();
      v.options.forEach((o, i) => {
        const value = o.value.trim().toLowerCase();
        if (seen.has(value)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options", i, "value"], message: "validation.duplicate" });
        seen.add(value);
      });
    } else if (v.options.length > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "categories.validation.optionsForbidden" });
    }
    if (v.unit && !hasUnit(v.type)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["unit"], message: "categories.validation.unitForbidden" });
    }
  });
export type AttributeInput = z.infer<typeof attributeSchema>;

/** Converts free text (usually the English name) into a URL slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`ʻʼ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/** Converts free text into a snake_case attribute key. */
export function toAttributeKey(value: string): string {
  return slugify(value).replace(/-/g, "_").replace(/^[0-9_]+/, "").slice(0, 50);
}
