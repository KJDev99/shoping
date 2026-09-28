"use client";

import { AlertTriangle, ArrowRight, Handshake, Info, MessageSquareText, Wallet } from "lucide-react";
import { BarterComparison } from "@/components/admin/shared/barter-comparison";
import { ButtonLink } from "@/components/common/button-link";
import { CopyId, DateCell, Rating } from "@/components/common/cells";
import { InfoList, Section } from "@/components/common/info-list";
import { PageHeader } from "@/components/common/page-header";
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { useBarterRequest } from "@/hooks/use-barter";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import type { BarterRequestDetail, ParticipantInfo } from "@/services/barter.service";
import type { BarterRequestStatus } from "@/types";
import { ReportList, Timeline, toComparisonItems, type TimelineEntry } from "./barter-shared";

const TONE: Record<BarterRequestStatus, TimelineEntry["tone"]> = {
  PENDING: "warning",
  ACCEPTED: "primary",
  DECLINED: "danger",
  CANCELLED: "muted",
  EXPIRED: "muted",
  COMPLETED: "success",
};

/** Small operational summary under each side (never an accusation). */
export function ParticipantFooter({ info }: { info: ParticipantInfo | undefined }) {
  const t = useT();
  if (!info) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-3 text-xs text-muted-foreground">
      {info.status !== "ACTIVE" && <StatusBadge kind="userStatus" value={info.status} />}
      {info.riskLevel !== "LOW" && <StatusBadge kind="riskLevel" value={info.riskLevel} />}
      <Rating value={info.rating} count={info.reviewsCount} />
      <span>{t("barter.detail.completedExchanges", { count: info.completedExchanges })}</span>
      <span className={info.reportsCount >= 3 ? "text-destructive" : undefined}>{t("barter.detail.reportsAgainst", { count: info.reportsCount })}</span>
    </div>
  );
}

export function BarterRequestDetailPage({ id }: { id: string }) {
  const t = useT();
  const query = useBarterRequest(id);

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} backHref="/admin/barter-requests" />;
  return <BarterRequestDetail b={query.data} t={t} />;
}

function BarterRequestDetail({ b, t }: { b: BarterRequestDetail; t: ReturnType<typeof useT> }) {
  const [locale] = useLocale();
  const offered = b.items.filter((i) => i.side === "OFFERED").map((i) => i.listing);
  const requested = b.items.filter((i) => i.side === "REQUESTED").map((i) => i.listing);
  const nameOf = (userId: string | null) =>
    userId === b.senderId ? b.sender.fullName : userId === b.receiverId ? b.receiver.fullName : null;

  const expiry =
    b.status === "EXPIRED" && b.expiresAt
      ? t("barter.detail.expiredOn", { date: formatDateTime(b.expiresAt, locale) })
      : b.status === "PENDING" && b.expiresAt
        ? t("barter.detail.expiresIn", { relative: formatRelative(b.expiresAt, locale) })
        : formatDateTime(b.expiresAt, locale);

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/admin/barter-requests"
        backLabel={t("barter.detail.back")}
        title={t("barter.detail.title", { code: b.code })}
        meta={
          <>
            <StatusBadge kind="barterStatus" value={b.status} />
            <CopyId value={b.id} />
            <span className="text-xs text-muted-foreground">{t("barter.detail.sentBy", { name: b.sender.fullName })} · <DateCell value={b.createdAt} /></span>
          </>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border bg-info/5 p-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <p>
          <span className="font-medium">{t("barter.readOnlyTitle")}.</span> <span className="text-muted-foreground">{t("barter.readOnlyHint")}</span>
        </p>
      </div>

      <BarterComparison
        left={{
          label: t("barter.detail.sideA"),
          user: b.sender,
          items: toComparisonItems(offered, b.itemDetails, t),
          footer: <ParticipantFooter info={b.participants[b.senderId]} />,
        }}
        right={{
          label: t("barter.detail.sideB"),
          user: b.receiver,
          items: toComparisonItems(requested, b.itemDetails, t),
          footer: <ParticipantFooter info={b.participants[b.receiverId]} />,
        }}
        center={
          <span className="text-xs font-medium whitespace-nowrap text-muted-foreground tabular-nums">
            {t("barter.detail.shapeValue", { offered: offered.length, requested: requested.length })}
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title={t("barter.detail.message")}>
            {b.message ? (
              <div className="flex gap-3">
                <MessageSquareText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-sm whitespace-pre-wrap wrap-break-word">{b.message}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("barter.detail.noMessage")}</p>
            )}
            {b.cashDifferenceNote && (
              <div className="mt-4 rounded-lg border border-dashed p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Wallet className="size-3.5" /> {t("barter.detail.cashNote")}
                </p>
                <p className="mt-1 text-sm">{b.cashDifferenceNote}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("barter.detail.cashNoteHint")}</p>
              </div>
            )}
          </Section>

          <Section title={t("barter.detail.reports")}>
            <ReportList reports={b.reports} emptyTitle={t("barter.detail.noReports")} />
          </Section>
        </div>

        <div className="space-y-6">
          <Section title={t("barter.detail.details")}>
            <InfoList
              items={[
                { label: t("barter.detail.createdAt"), value: formatDateTime(b.createdAt, locale) },
                { label: t("barter.detail.respondedAt"), value: b.respondedAt ? formatDateTime(b.respondedAt, locale) : t("barter.detail.notResponded") },
                { label: t("barter.detail.expiresAt"), value: expiry, hidden: !b.expiresAt || b.status === "COMPLETED" || b.status === "ACCEPTED" },
                { label: t("barter.detail.updatedAt"), value: formatDateTime(b.updatedAt, locale) },
                {
                  label: t("barter.detail.shape"),
                  value: `${t("barter.detail.shapeValue", { offered: offered.length, requested: requested.length })} · ${
                    offered.length > 1 || requested.length > 1 ? t("barter.filters.shapeMulti") : t("barter.filters.shapeOneToOne")
                  }`,
                },
              ]}
            />
          </Section>

          <Section title={t("barter.detail.exchange")}>
            {b.exchange ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm">{b.exchange.code}</span>
                  <StatusBadge kind="exchangeStatus" value={b.exchange.status} />
                </div>
                {b.exchange.disputeId && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="size-3.5" /> {t("barter.detail.disputed")}
                  </p>
                )}
                <ButtonLink href={`/admin/exchanges/${b.exchange.id}`} variant="outline" size="sm">
                  {t("barter.detail.viewExchange")} <ArrowRight />
                </ButtonLink>
              </div>
            ) : (
              <EmptyState icon={<Handshake />} title={t("barter.detail.noExchange")} className="py-4" />
            )}
          </Section>

          <Section title={t("barter.detail.timeline")}>
            <Timeline
              entries={b.statusHistory.map((h, i) => {
                const name = nameOf(h.byUserId);
                return {
                  id: `${h.status}-${i}`,
                  tone: TONE[h.status],
                  title: <StatusBadge kind="barterStatus" value={h.status} />,
                  meta: `${formatDateTime(h.at, locale)} · ${name ? t("barter.detail.byUser", { name }) : t("barter.detail.bySystem")}`,
                };
              })}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
