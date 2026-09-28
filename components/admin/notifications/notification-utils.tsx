"use client";

import { useCallback } from "react";
import { Pill } from "@/components/common/status-badge";
import { useLookupNames } from "@/hooks/use-lookups";
import { formatPercent } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { Notification, NotificationChannel, NotificationTarget } from "@/types";

/** Short human description of a notification audience. */
export function useTargetSummary() {
  const t = useT();
  const { region } = useLookupNames();
  return useCallback(
    (target: NotificationTarget): string => {
      switch (target.kind) {
        case "ALL":
          return t("notifications.target.ALL");
        case "USERS":
          return t("notifications.target.usersCount", { count: target.userIds.length });
        case "REGION":
          return target.regionIds.length <= 2
            ? target.regionIds.map((id) => region(id)).join(", ")
            : t("notifications.target.regionsCount", { count: target.regionIds.length });
        case "SEGMENT":
          return t(`enums.userSegment.${target.segment}`);
      }
    },
    [t, region],
  );
}

export function ChannelPills({ channels }: { channels: NotificationChannel[] }) {
  const t = useT();
  return (
    <span className="flex flex-wrap gap-1">
      {channels.map((c) => (
        <Pill key={c} tone={c === "IN_APP" ? "neutral" : "muted"}>
          {t(`enums.notificationChannel.${c}`)}
        </Pill>
      ))}
    </span>
  );
}

/** Read-rate bar; "—" until the notification has been delivered. */
export function ReadRate({ notification, className }: { notification: Pick<Notification, "readCount" | "recipientsCount" | "status">; className?: string }) {
  const [locale] = useLocale();
  if (notification.status !== "SENT" || notification.recipientsCount === 0) return <span className="text-muted-foreground">—</span>;
  const rate = notification.readCount / notification.recipientsCount;
  return (
    <span className={cn("flex min-w-24 items-center gap-2", className)}>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className="block h-full rounded-full bg-chart-2" style={{ width: `${Math.round(rate * 100)}%` }} />
      </span>
      <span className="text-xs tabular-nums">{formatPercent(rate, locale, 0)}</span>
    </span>
  );
}
