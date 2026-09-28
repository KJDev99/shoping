"use client";

import { ExternalLink, Lock } from "lucide-react";
import { UserAvatar } from "@/components/common/cells";
import { ButtonLink } from "@/components/common/button-link";
import { InfoList } from "@/components/common/info-list";
import { StatusBadge } from "@/components/common/status-badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDateTime } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { AuditLog } from "@/types";
import { AuditEntityBadge, auditEntityHref, useAuditEntityLabel, useAuditSentence } from "./audit-utils";

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

/** Side-by-side comparison of old vs new values; changed keys are highlighted. */
export function AuditDiff({ oldValue, newValue }: { oldValue: AuditLog["oldValue"]; newValue: AuditLog["newValue"] }) {
  const t = useT();
  const keys = [...new Set([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})])];
  if (!keys.length) return <p className="text-sm text-muted-foreground">{t("audit.detail.noChanges")}</p>;
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="hidden grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] gap-px bg-border text-xs font-medium text-muted-foreground sm:grid">
        <div className="bg-muted/60 px-3 py-2">{t("audit.detail.field")}</div>
        <div className="bg-muted/60 px-3 py-2">{t("audit.detail.before")}</div>
        <div className="bg-muted/60 px-3 py-2">{t("audit.detail.after")}</div>
      </div>
      <div className="divide-y">
        {keys.map((key) => {
          const before = oldValue?.[key];
          const after = newValue?.[key];
          const changed = JSON.stringify(before) !== JSON.stringify(after);
          return (
            <div key={key} className={cn("grid gap-1 px-3 py-2 text-sm sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-3", changed && "bg-warning/5")}>
              <div className="flex min-w-0 items-center gap-1.5 font-mono text-xs">
                <span className="truncate" title={key}>
                  {key}
                </span>
                {changed && <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-label={t("audit.detail.changed")} />}
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-muted-foreground sm:hidden">{t("audit.detail.before")}: </span>
                <pre className={cn("inline whitespace-pre-wrap break-words font-mono text-xs", changed ? "text-destructive line-through decoration-destructive/40" : "text-muted-foreground")}>
                  {formatValue(before)}
                </pre>
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-muted-foreground sm:hidden">{t("audit.detail.after")}: </span>
                <pre className={cn("inline whitespace-pre-wrap break-words font-mono text-xs", changed ? "font-medium text-success" : "text-muted-foreground")}>
                  {formatValue(after)}
                </pre>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AuditDetailSheet({ log, onOpenChange }: { log: AuditLog | null; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const [locale] = useLocale();
  const sentence = useAuditSentence();
  const entityLabel = useAuditEntityLabel();
  const href = log ? auditEntityHref(log) : null;

  return (
    <Sheet open={!!log} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {log && (
          <>
            <SheetHeader>
              <SheetTitle>{t("audit.detail.title")}</SheetTitle>
              <SheetDescription>{sentence(log)}</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-6">
              <InfoList
                columns={2}
                items={[
                  {
                    label: t("audit.detail.admin"),
                    value: (
                      <span className="flex items-center gap-2">
                        <UserAvatar name={log.admin.fullName} src={log.admin.avatar} className="size-6" />
                        <span className="truncate">{log.admin.fullName}</span>
                        <StatusBadge kind="adminRole" value={log.admin.role} dot={false} />
                      </span>
                    ),
                  },
                  { label: t("audit.detail.date"), value: <span className="tabular-nums">{formatDateTime(log.createdAt, locale)}</span> },
                  { label: t("audit.detail.action"), value: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{log.action}</code> },
                  {
                    label: t("audit.detail.entity"),
                    value: (
                      <span className="flex flex-wrap items-center gap-2">
                        <AuditEntityBadge type={log.entityType} />
                        <span className="min-w-0 break-words">{entityLabel(log)}</span>
                        {href && (
                          <ButtonLink href={href} variant="outline" size="xs">
                            <ExternalLink /> {t("audit.detail.openEntity")}
                          </ButtonLink>
                        )}
                      </span>
                    ),
                  },
                  { label: t("audit.detail.reason"), value: log.reason, hidden: !log.reason },
                  { label: t("audit.detail.ip"), value: <span className="font-mono text-xs">{log.ipAddress}</span> },
                  { label: t("audit.detail.id"), value: <span className="font-mono text-xs">{log.id}</span> },
                  { label: t("audit.detail.userAgent"), value: <span className="break-all text-xs text-muted-foreground">{log.userAgent}</span> },
                ]}
              />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{t("audit.detail.changes")}</h3>
                <AuditDiff oldValue={log.oldValue} newValue={log.newValue} />
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="size-3.5" /> {t("audit.detail.immutable")}
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
