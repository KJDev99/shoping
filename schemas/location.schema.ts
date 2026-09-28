import { translatedTextSchema } from "./category.schema";
import { z } from "./z";

export const DISTRICT_TYPES = ["DISTRICT", "CITY"] as const;

export const regionSchema = z.object({
  name: translatedTextSchema,
  enabled: z.boolean(),
});
export type RegionInput = z.infer<typeof regionSchema>;

/** PATCH accepts any subset (e.g. only `enabled` from the table switch). */
export const regionUpdateSchema = regionSchema.partial().refine((v) => v.name !== undefined || v.enabled !== undefined, "validation.required");
export type RegionUpdateInput = z.infer<typeof regionUpdateSchema>;

export const districtSchema = z.object({
  name: translatedTextSchema,
  type: z.enum(DISTRICT_TYPES),
  enabled: z.boolean(),
});
export type DistrictInput = z.infer<typeof districtSchema>;

export const districtUpdateSchema = districtSchema
  .partial()
  .refine((v) => v.name !== undefined || v.type !== undefined || v.enabled !== undefined, "validation.required");
export type DistrictUpdateInput = z.infer<typeof districtUpdateSchema>;
