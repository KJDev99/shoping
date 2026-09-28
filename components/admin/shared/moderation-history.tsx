"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Section } from "@/components/common/info-list";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDateTime } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { commonService } from "@/services/common.service";
import { REJECTION_REASONS, REPORT_REASONS, type ModerationAction, type ModerationTargetType } from "@/types";
import type { Translator } from "@/lib/i18n/translate";

/** Reasons may be stored as enum codes ("PROHIBITED_ITEM" or "PROHIBITED_ITEM: note"); show them translated. */
export function formatModerationReason(reason: string, t: Translator): string {
  const [code, ...rest] = reason.split(":");
  const note = rest.join(":").trim();
  let label: string | null = null;
  if ((REJECTION_REASONS as readonly string[]).includes(code)) label = t(`enums.rejectionReason.${code as (typeof REJECTION_REASONS)[number]}`);
  else if ((REPORT_REASONS as readonly string[]).includes(code)) label = t(`enums.reportReason.${code as (typeof REPORT_REASONS)[number]}`);
  if (!label) return reason;
  return note ? `${label}: ${note}` : label;
}

export const moderationHistoryKey = (targetType: ModerationTargetType, targetId: string) => ["moderation-history", targetType, targetId] as const;

export function ModerationTimeline({ items }: { items: ModerationAction[] }) {
  const t = useT();
  const [locale] = useLocale();
  return (
    <ol className="relative space-y-4 border-l pl-5">
      {items.map((m) => (
        <li key={m.id} className="relative">
          <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-background bg-primary" />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge kind="moderationAction" value={m.action} />
            <span className="text-muted-foreground">{t("common.moderationHistory.by", { name: m.admin.fullName })}</span>
          </div>
          {m.reason && <p className="mt-1 text-sm">{formatModerationReason(m.reason, t)}</p>}
          <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(m.createdAt, locale)}</p>
        </li>
      ))}
    </ol>
  );
}

/** Moderation history (who did what and why) for a user, listing, report, etc. */
export function ModerationHistory({ targetType, targetId, className }: { targetType: ModerationTargetType; targetId: string; className?: string }) {
  const t = useT();
  const query = useQuery({
    queryKey: moderationHistoryKey(targetType, targetId),
    queryFn: () => commonService.moderationHistory(targetType, targetId),
  });
  return (
    <Section title={t("common.moderationHistory.title")} className={className}>
      {query.isPending ? (
        <ListSkeleton rows={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-6" />
      ) : query.data.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title={t("common.moderationHistory.empty")} className="py-6" />
      ) : (
        <ModerationTimeline items={query.data} />
      )}
    </Section>
  );
}
