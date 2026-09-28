import { phoneSchema } from "./auth.schema";
import { listingUpdateSchema } from "./listing.schema";
import { z } from "./z";

/** Step 1 of phone login: request an SMS code. */
export const requestCodeSchema = z.object({ phone: phoneSchema });
export type RequestCodeInput = z.infer<typeof requestCodeSchema>;

/**
 * Step 2: verify the code. New phone numbers must also send a profile
 * (the API answers `needsProfile` first so the form can ask for it).
 */
export const verifyCodeSchema = z.object({
  phone: phoneSchema,
  code: z.string().trim().regex(/^\d{6}$/, "site.validation.code"),
  profile: z
    .object({
      firstName: z.string().trim().min(2, "validation.min2").max(50, "validation.max50"),
      lastName: z.string().trim().min(2, "validation.min2").max(50, "validation.max50"),
      regionId: z.string().min(1, "validation.required"),
    })
    .optional(),
});
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;

/** A user's new barter listing: the admin edit shape + uploaded images (ids from /uploads). */
export const createListingSchema = listingUpdateSchema.extend({
  imageIds: z.array(z.string().min(1)).min(1, "site.validation.imagesRequired").max(20),
});
export type CreateListingInput = z.infer<typeof createListingSchema>;

/** Upload rules shared by the file picker and the API. */
export const UPLOAD_RULES = {
  maxBytes: 5 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "image/webp"] as const,
};
