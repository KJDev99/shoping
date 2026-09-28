import "server-only";

import { adminRefOf } from "@/lib/mock/db";
import { isSettingsSection, settingsSectionSchemas } from "@/schemas/settings.schema";
import type { PlatformSettings } from "@/types";
import { audit, clientIp, requirePermission } from "../context";
import { notFound, ok, unprocessable, validate } from "../http";
import { route } from "../router";

const SECTION_LABELS: Record<string, string> = {
  general: "General settings",
  listings: "Listing settings",
  barter: "Barter settings",
  moderation: "Moderation settings",
  security: "Security settings",
  notifications: "Notification settings",
};

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const settingsRoutes = [
  route("GET", "/settings", (ctx) => {
    requirePermission(ctx, "settings.read");
    const s = ctx.db.settings;
    return ok<PlatformSettings>({ ...s, updatedBy: s.updatedBy ? adminRefOf(ctx.db, s.updatedBy.id) : null });
  }),

  route("PATCH", "/settings/:section", (ctx) => {
    requirePermission(ctx, "settings.manage");
    const section = ctx.params.section;
    if (!isSettingsSection(section)) throw notFound("Unknown settings section");
    const input = validate<Record<string, unknown>>(settingsSectionSchemas[section], ctx.body);
    if (section === "general") {
      // Empty URL fields are stored as null.
      for (const key of ["logoUrl", "faviconUrl"]) if (input[key] === "") input[key] = null;
    }
    if (section === "security" && Array.isArray(input.allowedAdminIps) && input.allowedAdminIps.length) {
      // Prevent an admin from locking themselves out with an allow-list that excludes their own IP.
      const ip = clientIp(ctx.req);
      if (!(input.allowedAdminIps as string[]).includes(ip)) {
        throw unprocessable({ allowedAdminIps: ["settings.validation.ipLockout"] }, `Your current IP (${ip}) must be in the allow-list`);
      }
    }

    const current = ctx.db.settings[section] as Record<string, unknown>;
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (!same(current[key], value)) {
        oldValue[key] = current[key];
        newValue[key] = value;
      }
    }

    if (Object.keys(newValue).length) {
      Object.assign(current, newValue);
      ctx.db.settings.updatedAt = new Date().toISOString();
      ctx.db.settings.updatedBy = adminRefOf(ctx.db, ctx.session.admin.id);
      audit(ctx, {
        action: "settings.update",
        entityType: "SETTINGS",
        entityId: section,
        entityLabel: SECTION_LABELS[section],
        oldValue,
        newValue,
      });
    }
    return ok(ctx.db.settings, Object.keys(newValue).length ? "Settings updated" : "No changes");
  }),
];
