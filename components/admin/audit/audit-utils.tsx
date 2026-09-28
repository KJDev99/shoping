"use client";

import { useCallback } from "react";
import { Pill, type Tone } from "@/components/common/status-badge";
import { useT } from "@/lib/i18n/provider";
import { isSettingsSection } from "@/schemas/settings.schema";
import type { AuditEntityType, AuditLog } from "@/types";

const SELF_ACTIONS = new Set(["auth.login", "auth.logout", "admin.profile_update", "admin.password_change"]);

const ENTITY_TONES: Record<AuditEntityType, Tone> = {
  USER: "info",
  LISTING: "primary",
  BARTER_REQUEST: "primary",
  EXCHANGE: "success",
  DISPUTE: "danger",
  CATEGORY: "neutral",
  ATTRIBUTE: "neutral",
  REPORT: "warning",
  REVIEW: "warning",
  REGION: "neutral",
  DISTRICT: "neutral",
  NOTIFICATION: "info",
  ADMIN: "danger",
  SETTINGS: "danger",
  AUTH: "muted",
};

export function AuditEntityBadge({ type }: { type: AuditEntityType }) {
  const t = useT();
  return <Pill tone={ENTITY_TONES[type]}>{t(`enums.auditEntity.${type}`)}</Pill>;
}

/** Link to the entity's admin page when one exists. */
export function auditEntityHref(log: Pick<AuditLog, "entityType" | "entityId">): string | null {
  const id = log.entityId ? encodeURIComponent(log.entityId) : null;
  switch (log.entityType) {
    case "USER":
      return id ? `/admin/users/${id}` : null;
    case "LISTING":
      return id ? `/admin/listings/${id}` : null;
    case "BARTER_REQUEST":
      return id ? `/admin/barter-requests/${id}` : null;
    case "EXCHANGE":
      return id ? `/admin/exchanges/${id}` : null;
    case "REPORT":
      return id ? `/admin/reports/${id}` : null;
    case "CATEGORY":
    case "ATTRIBUTE":
      return "/admin/categories";
    case "REGION":
    case "DISTRICT":
      return "/admin/locations";
    case "NOTIFICATION":
      return "/admin/notifications";
    case "ADMIN":
      return "/admin/admins";
    case "SETTINGS":
      return id ? `/admin/settings?tab=${id}` : "/admin/settings";
    default:
      return null;
  }
}

/** "Listing “iPhone 12”", "Listing #LST-10234" or "Listing #lst_10234". */
export function useAuditEntityLabel() {
  const t = useT();
  return useCallback(
    (log: Pick<AuditLog, "entityType" | "entityId" | "entityLabel">) => {
      const type = t(`enums.auditEntity.${log.entityType}`);
      // Settings entries are keyed by section id; show the localized section name.
      if (log.entityType === "SETTINGS" && log.entityId && isSettingsSection(log.entityId)) {
        return `${type}: ${t(`settings.tabs.${log.entityId}`)}`;
      }
      const label = log.entityLabel
        ? /^[A-Z]{2,5}-\d+$/.test(log.entityLabel)
          ? `#${log.entityLabel}`
          : `“${log.entityLabel}”`
        : log.entityId
          ? `#${log.entityId}`
          : "";
      return `${type} ${label}`.trim();
    },
    [t],
  );
}

/** Renders an audit action as a readable sentence, e.g. "Alisher Qodirov rejected Listing #LST-10234". */
export function useAuditSentence() {
  const t = useT();
  const entityLabel = useAuditEntityLabel();
  return useCallback(
    (log: AuditLog) => {
      const admin = log.admin.fullName;
      const dot = log.action.indexOf(".");
      const verbKey = dot >= 0 ? log.action.slice(dot + 1) : log.action;
      const key = `audit.verbs.${verbKey}`;
      const verb = t.dynamic(key);
      const entity = entityLabel(log);
      if (verb === key) return t("audit.sentenceGeneric", { admin, action: log.action, entity });
      if (SELF_ACTIONS.has(log.action)) return t("audit.sentenceSelf", { admin, verb });
      return t("audit.sentence", { admin, verb, entity });
    },
    [t, entityLabel],
  );
}
