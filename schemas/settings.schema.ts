import { LOCALES } from "@/types";
import { phoneSchema } from "./auth.schema";
import { z } from "./z";

/** Allowed ranges, shared by the forms (hints) and validation. */
export const SETTINGS_LIMITS = {
  maxImages: [1, 30],
  maxVideoSizeMb: [1, 500],
  expirationDays: [1, 365],
  trustedUserMinExchanges: [0, 1000],
  maxItemsPerOffer: [1, 20],
  offerExpirationHours: [1, 720],
  reportThreshold: [1, 100],
  sessionTimeoutMinutes: [5, 1440],
  maxLoginAttempts: [3, 20],
} as const;

type LimitKey = keyof typeof SETTINGS_LIMITS;
const RANGE = "settings.validation.outOfRange";

const int = (key: LimitKey) =>
  z
    .number({ invalid_type_error: "validation.invalid" })
    .int("validation.integer")
    .min(SETTINGS_LIMITS[key][0], RANGE)
    .max(SETTINGS_LIMITS[key][1], RANGE);

const optionalUrl = z
  .string()
  .trim()
  .max(500, "validation.invalid")
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v) || v.startsWith("/"), "validation.url")
  .nullable();

export const generalSettingsSchema = z
  .object({
    platformName: z.string().trim().min(2, "validation.min2").max(50, "validation.max50"),
    logoUrl: optionalUrl,
    faviconUrl: optionalUrl,
    defaultLanguage: z.enum(LOCALES),
    supportedLanguages: z.array(z.enum(LOCALES)).min(1, "validation.atLeastOne"),
    maintenanceMode: z.boolean(),
    supportEmail: z.string().trim().min(1, "validation.required").email("validation.email"),
    supportPhone: phoneSchema,
  })
  .refine((v) => v.supportedLanguages.includes(v.defaultLanguage), {
    path: ["defaultLanguage"],
    message: "settings.validation.defaultNotSupported",
  });

export const listingsSettingsSchema = z.object({
  maxImages: int("maxImages"),
  maxVideoSizeMb: int("maxVideoSizeMb"),
  expirationDays: int("expirationDays"),
  requireModeration: z.boolean(),
  autoPublishTrustedUsers: z.boolean(),
  trustedUserMinExchanges: int("trustedUserMinExchanges"),
});

export const barterSettingsSchema = z.object({
  maxItemsPerOffer: int("maxItemsPerOffer"),
  offerExpirationHours: int("offerExpirationHours"),
  allowMultiItemBarter: z.boolean(),
  allowOpenOffers: z.boolean(),
  /** Negotiation metadata only — the platform never processes payments. */
  allowCashDifference: z.boolean(),
});

export const moderationSettingsSchema = z.object({
  reportThreshold: int("reportThreshold"),
  autoHideAfterThreshold: z.boolean(),
  blockedKeywords: z
    .array(z.string().trim().min(2, "validation.min2").max(50, "validation.max50"))
    .max(500, "validation.invalid")
    .refine((list) => new Set(list.map((k) => k.toLowerCase())).size === list.length, "validation.duplicate"),
});

/** IPv4 address with optional CIDR suffix, or an IPv6 address/prefix. */
const IP_RE = /^((25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(25[0-5]|2[0-4]\d|1?\d?\d)(\/(3[0-2]|[12]?\d))?$|^[0-9a-f:]{2,39}(\/\d{1,3})?$/i;
export function isValidIp(value: string) {
  return IP_RE.test(value.trim());
}

export const securitySettingsSchema = z.object({
  sessionTimeoutMinutes: int("sessionTimeoutMinutes"),
  maxLoginAttempts: int("maxLoginAttempts"),
  requireTwoFactorForAdmins: z.boolean(),
  allowedAdminIps: z
    .array(z.string().trim().refine(isValidIp, "settings.validation.ip"))
    .max(100, "validation.invalid")
    .refine((list) => new Set(list).size === list.length, "validation.duplicate"),
});

export const notificationSettingsSchema = z.object({
  enableInApp: z.boolean(),
  enablePush: z.boolean(),
  enableEmail: z.boolean(),
  enableSms: z.boolean(),
  adminDigestEmail: z.boolean(),
});

export const settingsSectionSchemas = {
  general: generalSettingsSchema,
  listings: listingsSettingsSchema,
  barter: barterSettingsSchema,
  moderation: moderationSettingsSchema,
  security: securitySettingsSchema,
  notifications: notificationSettingsSchema,
} as const;

export const SETTINGS_SECTIONS = ["general", "listings", "barter", "moderation", "security", "notifications"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
export type ListingsSettingsInput = z.infer<typeof listingsSettingsSchema>;
export type BarterSettingsInput = z.infer<typeof barterSettingsSchema>;
export type ModerationSettingsInput = z.infer<typeof moderationSettingsSchema>;
export type SecuritySettingsInput = z.infer<typeof securitySettingsSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;

export type SettingsSectionInput = {
  general: GeneralSettingsInput;
  listings: ListingsSettingsInput;
  barter: BarterSettingsInput;
  moderation: ModerationSettingsInput;
  security: SecuritySettingsInput;
  notifications: NotificationSettingsInput;
};

export function isSettingsSection(value: string): value is SettingsSection {
  return (SETTINGS_SECTIONS as readonly string[]).includes(value);
}
