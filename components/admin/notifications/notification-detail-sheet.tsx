"use client";

import { Ban } from "lucide-react";
import { UserAvatar } from "@/components/common/cells";
import { InfoList } from "@/components/common/info-list";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationUsersByIds } from "@/hooks/use-notifications";
import { useCan } from "@/hooks/use-session";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import type { Notification } from "@/types";
import { ChannelPills, ReadRate, useTargetSummary } from "./notification-utils";

export function NotificationDetailSheet({
  notification,
  onOpenChange,
  onCancel,
}: {
  notification: Notification | null;
  onOpenChange: (open: boolean) => void;
  onCancel: (n: Notification) => void;
}) {
  const t = useT();
  const [locale] = useLocale();
  const canSend = useCan("notifications.send");
  const summary = useTargetSummary();
  const userIds = notification?.target.kind === "USERS" ? notification.target.userIds : [];
  const users = useNotificationUsersByIds(userIds, canSend && !!notification);
  const cancellable = !!notification && (notification.status === "SCHEDULED" || notification.status === "DRAFT");

  return (
    <Sheet open={!!notification} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {notification && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-6 break-words">{notification.title}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                <StatusBadge kind="notificationStatus" value={notification.status} />
                <StatusBadge kind="notificationType" value={notification.type} dot={false} />
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-4">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-1 text-xs text-muted-foreground">{t("notifications.detail.message")}</p>
                <p className="text-sm break-words whitespace-pre-line">{notification.message}</p>
              </div>
              <InfoList
                columns={2}
                items={[
                  { label: t("notifications.detail.audience"), value: summary(notification.target) },
                  { label: t("notifications.detail.recipients"), value: <span className="tabular-nums">{formatNumber(notification.recipientsCount, locale)}</span> },
                  { label: t("notifications.detail.channels"), value: <ChannelPills channels={notification.channels} /> },
                  {
                    label: t("notifications.detail.readRate"),
                    value:
                      notification.status === "SENT" ? (
                        <span className="space-y-1">
                          <ReadRate notification={notification} />
                          <span className="block text-xs text-muted-foreground">
                            {t("notifications.detail.reads", {
                              read: formatNumber(notification.readCount, locale),
                              total: formatNumber(notification.recipientsCount, locale),
                            })}
                          </span>
                        </span>
                      ) : (
                        t("notifications.detail.notSent")
                      ),
                  },
                  {
                    label: t("notifications.detail.createdBy"),
                    value: (
                      <span className="flex items-center gap-2">
                        <UserAvatar name={notification.createdBy.fullName} src={notification.createdBy.avatar} className="size-6" />
                        {notification.createdBy.fullName}
                      </span>
                    ),
                  },
                  { label: t("notifications.detail.createdAt"), value: formatDateTime(notification.createdAt, locale) },
                  { label: t("notifications.detail.scheduledAt"), value: formatDateTime(notification.scheduledAt, locale), hidden: !notification.scheduledAt },
                  { label: t("notifications.detail.sentAt"), value: formatDateTime(notification.sentAt, locale), hidden: !notification.sentAt },
                ]}
              />
              {notification.target.kind === "USERS" && canSend && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t("notifications.detail.selectedUsers")}</p>
                  {users.isPending ? (
                    <Skeleton className="h-16 rounded-lg" />
                  ) : (
                    <ul className="divide-y rounded-lg border">
                      {(users.data ?? []).map((u) => (
                        <li key={u.id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                          <UserAvatar name={u.fullName} src={u.avatar} className="size-6" />
                          <span className="min-w-0 flex-1 truncate">{u.fullName}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{u.phone}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            {cancellable && canSend && (
              <SheetFooter className="flex-row justify-end">
                <Button variant="destructive" onClick={() => onCancel(notification)}>
                  <Ban /> {t("notifications.actions.cancel")}
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
