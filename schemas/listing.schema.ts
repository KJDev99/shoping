import { ITEM_CONDITIONS, REJECTION_REASONS, type CategoryAttribute, type FieldErrors, type ListingAttributeValue } from "@/types";
import { z } from "./z";

/** Validation message keys owned by the listings namespace (resolved by `Field` via `t.dynamic`). */
export const LISTING_VALIDATION = {
  preferencesRequired: "listings.validation.preferencesRequired",
  subcategoryMismatch: "listings.validation.subcategoryMismatch",
  districtMismatch: "listings.validation.districtMismatch",
  cashDifferenceDisabled: "listings.validation.cashDifferenceDisabled",
  unknownOption: "listings.validation.unknownOption",
  noteRequiredForOther: "listings.validation.noteRequiredForOther",
} as const;

const attributeValueSchema = z.union([z.string().max(300, "validation.max300"), z.number(), z.boolean(), z.array(z.string())]);

export const cashDifferenceSchema = z.object({
  direction: z.enum(["WILL_ADD", "EXPECTS"]),
  note: z.string().trim().min(3, "validation.min3").max(300, "validation.max300"),
});

export const exchangePreferenceSchema = z
  .object({
    openToOffers: z.boolean(),
    categories: z.array(z.string().min(1)).max(20),
    subcategories: z.array(z.string().min(1)).max(40),
    keywords: z.array(z.string().trim().min(2, "validation.min2").max(50, "validation.max50")).max(20),
    conditions: z.array(z.enum(ITEM_CONDITIONS)),
    regionIds: z.array(z.string().min(1)),
    note: z.string().trim().max(300, "validation.max300").nullable(),
    /** Negotiation metadata only — never a price or a payment. */
    cashDifference: cashDifferenceSchema.nullable(),
  })
  .superRefine((p, ctx) => {
    // A listing that isn't "open to any offer" must say what the owner wants.
    if (!p.openToOffers && !p.categories.length && !p.subcategories.length && !p.keywords.length && !p.note?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["categories"], message: LISTING_VALIDATION.preferencesRequired });
    }
  });
export type ExchangePreferenceInput = z.infer<typeof exchangePreferenceSchema>;

export const listingUpdateSchema = z.object({
  title: z.string().trim().min(3, "validation.min3").max(120, "validation.max120"),
  description: z.string().trim().min(3, "validation.min3").max(5000, "validation.max5000"),
  categoryId: z.string().min(1, "validation.required"),
  subcategoryId: z.string().nullable(),
  condition: z.enum(ITEM_CONDITIONS),
  regionId: z.string().min(1, "validation.required"),
  districtId: z.string().nullable(),
  location: z.string().trim().max(120, "validation.max120").nullable(),
  attributes: z.record(attributeValueSchema),
  exchangePreferences: exchangePreferenceSchema,
});
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;

export const rejectListingSchema = z
  .object({
    reason: z.enum(REJECTION_REASONS),
    note: z.string().trim().max(1000, "validation.max1000").optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.reason === "OTHER" && (v.note?.trim().length ?? 0) < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["note"], message: LISTING_VALIDATION.noteRequiredForOther });
    }
  });
export type RejectListingInput = z.infer<typeof rejectListingSchema>;

export const requestCorrectionSchema = z.object({
  note: z.string().trim().min(3, "validation.reasonRequired").max(1000, "validation.max1000"),
});
export type RequestCorrectionInput = z.infer<typeof requestCorrectionSchema>;

/** Attribute definitions that apply to a listing: those of its category and of its subcategory. */
export function attributesFor(all: CategoryAttribute[], categoryId: string | null | undefined, subcategoryId: string | null | undefined) {
  return all
    .filter((a) => (!!categoryId && a.categoryId === categoryId) || (!!subcategoryId && a.categoryId === subcategoryId))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function isEmpty(v: ListingAttributeValue | undefined) {
  return v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
}

/**
 * Validates dynamic attribute values against their `CategoryAttribute`
 * definitions (required, type, options). Shared by the edit form and the API.
 * Returns the normalized values (unknown keys dropped, SELECT values as strings)
 * and field errors keyed `attributes.<attributeId>`.
 */
export function validateListingAttributes(
  defs: CategoryAttribute[],
  values: Record<string, ListingAttributeValue>,
): { values: Record<string, ListingAttributeValue>; errors: FieldErrors } {
  const out: Record<string, ListingAttributeValue> = {};
  const errors: FieldErrors = {};
  const fail = (id: string, key: string) => (errors[`attributes.${id}`] ??= []).push(key);

  for (const def of defs) {
    const raw = values[def.id];
    if (isEmpty(raw)) {
      if (def.required && def.type !== "BOOLEAN") fail(def.id, "validation.required");
      if (def.type === "BOOLEAN" && def.required) out[def.id] = false;
      continue;
    }
    const allowed = new Set(def.options.map((o) => o.value));
    switch (def.type) {
      case "TEXT":
        if (typeof raw !== "string" && typeof raw !== "number") fail(def.id, "validation.invalid");
        else if (String(raw).trim().length > 120) fail(def.id, "validation.max120");
        else out[def.id] = String(raw).trim();
        break;
      case "NUMBER": {
        const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
        if (!Number.isFinite(n)) fail(def.id, "validation.invalid");
        else if (n < 0) fail(def.id, "validation.positive");
        else out[def.id] = n;
        break;
      }
      case "SELECT":
        if (typeof raw !== "string" && typeof raw !== "number") fail(def.id, "validation.invalid");
        else if (!allowed.has(String(raw))) fail(def.id, LISTING_VALIDATION.unknownOption);
        else out[def.id] = String(raw);
        break;
      case "MULTI_SELECT":
        if (!Array.isArray(raw)) fail(def.id, "validation.invalid");
        else if (raw.some((v) => !allowed.has(v))) fail(def.id, LISTING_VALIDATION.unknownOption);
        else out[def.id] = [...new Set(raw)];
        break;
      case "BOOLEAN":
        if (typeof raw !== "boolean") fail(def.id, "validation.invalid");
        else out[def.id] = raw;
        break;
    }
  }
  return { values: out, errors };
}
