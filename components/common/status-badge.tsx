"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "muted" | "primary";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground ring-border",
  muted: "bg-muted text-muted-foreground ring-border",
  info: "bg-info/10 text-info ring-info/25",
  primary: "bg-primary/10 text-primary ring-primary/25",
  success: "bg-success/10 text-success ring-success/25",
  warning: "bg-warning/15 text-[color-mix(in_oklch,var(--warning),var(--foreground)_35%)] ring-warning/30",
  danger: "bg-destructive/10 text-destructive ring-destructive/25",
};

const DOT_CLASSES: Record<Tone, string> = {
  neutral: "bg-foreground/50",
  muted: "bg-muted-foreground/60",
  info: "bg-info",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

/**
 * Tone per enum value. Kinds map 1:1 to the `enums.<kind>` translation namespace,
 * so every status badge is labeled consistently across the app.
 */
const STATUS_TONES = {
  userStatus: { ACTIVE: "success", BLOCKED: "danger", SUSPENDED: "warning", DELETED: "muted" },
  riskLevel: { LOW: "success", NEEDS_REVIEW: "warning", HIGH_REPORTS: "danger" },
  adminRole: { SUPER_ADMIN: "primary", ADMIN: "info", MODERATOR: "neutral", SUPPORT: "muted" },
  adminStatus: { ACTIVE: "success", BLOCKED: "danger" },
  listingStatus: {
    DRAFT: "muted",
    PENDING: "warning",
    ACTIVE: "success",
    REJECTED: "danger",
    PAUSED: "neutral",
    EXCHANGED: "primary",
    ARCHIVED: "muted",
    BLOCKED: "danger",
  },
  itemCondition: { NEW: "success", LIKE_NEW: "info", GOOD: "neutral", FAIR: "warning", DAMAGED: "danger" },
  barterStatus: { PENDING: "warning", ACCEPTED: "info", DECLINED: "danger", CANCELLED: "muted", EXPIRED: "muted", COMPLETED: "success" },
  exchangeStatus: { AGREED: "info", IN_PROGRESS: "primary", COMPLETED: "success", CANCELLED: "muted", DISPUTED: "danger" },
  disputeStatus: { OPEN: "danger", UNDER_REVIEW: "warning", RESOLVED: "success", CLOSED: "muted" },
  reportStatus: { NEW: "danger", REVIEWING: "warning", RESOLVED: "success", REJECTED: "muted" },
  reportReason: {
    SCAM: "danger",
    FAKE_ITEM: "danger",
    PROHIBITED_ITEM: "danger",
    SPAM: "warning",
    HARASSMENT: "danger",
    MISLEADING_INFORMATION: "warning",
    DUPLICATE: "neutral",
    OTHER: "muted",
  },
  reportTarget: { LISTING: "neutral", USER: "info", MESSAGE: "muted", BARTER_REQUEST: "primary" },
  reviewStatus: { VISIBLE: "success", HIDDEN: "warning", DELETED: "muted" },
  categoryStatus: { ACTIVE: "success", DISABLED: "muted" },
  notificationStatus: { DRAFT: "muted", SCHEDULED: "info", SENDING: "warning", SENT: "success", FAILED: "danger", CANCELLED: "muted" },
  notificationType: { SYSTEM: "neutral", MODERATION: "warning", ANNOUNCEMENT: "primary", SECURITY: "danger" },
  matchType: { ONE_WAY_MATCH: "info", MUTUAL_MATCH: "success" },
  moderationAction: {
    APPROVE: "success",
    REJECT: "danger",
    BLOCK: "danger",
    UNBLOCK: "success",
    SUSPEND: "warning",
    ARCHIVE: "muted",
    DELETE: "danger",
    RESTORE: "info",
    REQUEST_CORRECTION: "warning",
    WARN: "warning",
    HIDE: "warning",
    RESOLVE_REPORT: "success",
    REJECT_REPORT: "muted",
  },
} as const satisfies Record<string, Record<string, Tone>>;

export type StatusKind = keyof typeof STATUS_TONES;
export type StatusValue<K extends StatusKind> = keyof (typeof STATUS_TONES)[K] & string;

export function Pill({ tone = "neutral", dot = false, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", DOT_CLASSES[tone])} />}
      {children}
    </span>
  );
}

/** `<StatusBadge kind="listingStatus" value="PENDING" />` — translated label + consistent color. */
export function StatusBadge<K extends StatusKind>({ kind, value, className, dot = true }: { kind: K; value: StatusValue<K>; className?: string; dot?: boolean }) {
  const t = useT();
  const tone = (STATUS_TONES[kind] as Record<string, Tone>)[value] ?? "neutral";
  return (
    <Pill tone={tone} dot={dot} className={className}>
      {t(`enums.${kind}.${value}` as MessageKey)}
    </Pill>
  );
}
