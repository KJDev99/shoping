"use client";

import { ArrowRight, Ban, CheckCircle2, Clock, MessageSquareText, Scale, Star, Wallet } from "lucide-react";
import { useState } from "react";
import { ReportList, Timeline, toComparisonItems, type TimelineEntry } from "@/components/admin/barter/barter-shared";
import { AdminNotes } from "@/components/admin/shared/admin-notes";
import { BarterComparison } from "@/components/admin/shared/barter-comparison";
import { ReviewRow } from "@/components/admin/users/user-detail-page";
import { ButtonLink } from "@/components/common/button-link";
import { CopyId, DateCell, Rating, UserCell } from "@/components/common/cells";
import { InfoList, Section } from "@/components/common/info-list";
import { PageHeader } from "@/components/common/page-header";
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { useExchange } from "@/hooks/use-exchanges";
import { useLookupNames } from "@/hooks/use-lookups";
import { useCan } from "@/hooks/use-session";
import { formatDate, formatDateTime } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { ExchangeDetail } from "@/services/exchanges.service";
import type { ExchangeParticipant, ExchangeStatus } from "@/types";
import { CancelExchangeDialog } from "./cancel-exchange-dialog";
import { canCancelExchange } from "./exchanges-page";

const TONE: Record<ExchangeStatus, TimelineEntry["tone"]> = {
  AGREED: "primary",
  IN_PROGRESS: "primary",
  COMPLETED: "success",
  CANCELLED: "muted",
  DISPUTED: "danger",
};

export function ExchangeDetailPage({ id }: { id: string }) {
  const query = useExchange(id);
  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} backHref="/admin/exchanges" />;
  return <ExchangeDetailView e={query.data} />;
}

function ParticipantCard({ e, p }: { e: ExchangeDetail; p: ExchangeParticipant }) {
  const t = useT();
  const [locale] = useLocale();
  const names = useLookupNames();
  const info = e.participantsInfo[p.userId];
  return (
    <Section
      title={p.side === "A" ? t("exchanges.detail.userA") : t("exchanges.detail.userB")}
      action={
        p.confirmedAt ? (
          <span className="inline-flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="size-3.5" /> {t("exchanges.detail.confirmed", { date: formatDate(p.confirmedAt, locale) })}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> {t("exchanges.detail.notConfirmed")}
          </span>
        )
      }
    >
      <div className="space-y-4">
        <UserCell user={p.user} />
        {info && (
          <InfoList
            columns={2}
            items={[
              { label: t("exchanges.detail.accountStatus"), value: <StatusBadge kind="userStatus" value={info.status} /> },
              { label: t("users.columns.risk"), value: <StatusBadge kind="riskLevel" value={info.riskLevel} /> },
              { label: t("exchanges.detail.rating"), value: <Rating value={info.rating} count={info.reviewsCount} /> },
              { label: t("exchanges.detail.completedExchanges"), value: info.completedExchanges },
              {
                label: t("exchanges.detail.reportsAgainst"),
                value: <span className={cn("tabular-nums", info.reportsCount >= 3 && "font-medium text-destructive")}>{info.reportsCount}</span>,
              },
              { label: t("exchanges.detail.region"), value: names.region(info.regionId) },
              { label: t("exchanges.detail.memberSince"), value: formatDate(info.createdAt, locale) },
            ]}
          />
        )}
      </div>
    </Section>
  );
}

function DisputeBanner({ e }: { e: ExchangeDetail }) {
  const t = useT();
  const [locale] = useLocale();
  const canManage = useCan("disputes.manage");
  const d = e.dispute;
  if (!d) return null;
  const open = d.status === "OPEN" || d.status === "UNDER_REVIEW";
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        open ? "border-destructive/40 bg-destructive/5" : "bg-muted/40",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Scale className={cn("mt-0.5 size-5 shrink-0", open ? "text-destructive" : "text-muted-foreground")} />
        <div className="min-w-0 space-y-1">
          <p className="font-medium">{open ? t("exchanges.detail.disputeTitle") : t("exchanges.detail.disputeClosedTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("exchanges.detail.disputeText", { category: t(`enums.disputeCategory.${d.category}`), date: formatDateTime(d.createdAt, locale) })}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <StatusBadge kind="disputeStatus" value={d.status} />
            {d.resolution && <span className="text-xs">{t(`enums.disputeResolution.${d.resolution}`)}</span>}
            <span className="text-xs text-muted-foreground">
              {t("exchanges.dispute.assignee")}: {d.assignedTo?.fullName ?? t("exchanges.dispute.unassigned")}
            </span>
          </div>
        </div>
      </div>
      {canManage && (
        <ButtonLink href={`/admin/exchanges/${e.id}/dispute`} variant={open ? "default" : "outline"} className="shrink-0">
          {t("exchanges.detail.openDispute")} <ArrowRight />
        </ButtonLink>
      )}
    </div>
  );
}

function ExchangeDetailView({ e }: { e: ExchangeDetail }) {
  const t = useT();
  const [locale] = useLocale();
  const names = useLookupNames();
  const canCancel = useCan("exchanges.manage") && canCancelExchange(e);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [a, b] = e.participants;
  const br = e.barterRequest;

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/admin/exchanges"
        backLabel={t("exchanges.detail.back")}
        title={t("exchanges.detail.title", { code: e.code })}
        meta={
          <>
            <StatusBadge kind="exchangeStatus" value={e.status} />
            <CopyId value={e.id} />
            <span className="text-xs text-muted-foreground">
              {t("exchanges.detail.agreedAt")}: <DateCell value={e.createdAt} />
            </span>
          </>
        }
        actions={
          canCancel && (
            <Button variant="destructive" onClick={() => setCancelOpen(true)}>
              <Ban /> {t("exchanges.actions.cancel")}
            </Button>
          )
        }
      />

      <DisputeBanner e={e} />

      <BarterComparison
        left={{
          label: t("exchanges.detail.sideA"),
          user: a.user,
          items: toComparisonItems(a.items, e.itemDetails, t),
        }}
        right={{
          label: t("exchanges.detail.sideB"),
          user: b.user,
          items: toComparisonItems(b.items, e.itemDetails, t),
        }}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <ParticipantCard e={e} p={a} />
        <ParticipantCard e={e} p={b} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section
            title={t("exchanges.detail.originalRequest")}
            action={
              br && (
                <ButtonLink href={`/admin/barter-requests/${br.id}`} variant="outline" size="sm">
                  {t("exchanges.detail.viewRequest")} <ArrowRight />
                </ButtonLink>
              )
            }
          >
            {br ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm">{br.code}</span>
                  <StatusBadge kind="barterStatus" value={br.status} />
                  <DateCell value={br.createdAt} className="text-xs text-muted-foreground" />
                </div>
                <div className="flex gap-3">
                  <MessageSquareText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <p className={cn("text-sm whitespace-pre-wrap wrap-break-word", !br.message && "text-muted-foreground")}>{br.message ?? t("exchanges.detail.noMessage")}</p>
                </div>
                {br.cashDifferenceNote && (
                  <div className="rounded-lg border border-dashed p-3">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Wallet className="size-3.5" /> {t("exchanges.detail.cashNote")}
                    </p>
                    <p className="mt-1 text-sm">{br.cashDifferenceNote}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </Section>

          <Section title={t("exchanges.detail.reviews")} contentClassName={e.reviews.length ? "p-0" : undefined}>
            {e.reviews.length ? (
              <ul className="divide-y">
                {e.reviews.map((r) => (
                  <ReviewRow key={r.id} review={r} />
                ))}
              </ul>
            ) : (
              <EmptyState icon={<Star />} title={t("exchanges.detail.noReviews")} className="py-6" />
            )}
          </Section>

          <Section title={t("exchanges.detail.reports")} description={t("exchanges.detail.reportsHint")}>
            <ReportList reports={e.reports} emptyTitle={t("exchanges.detail.noReports")} />
          </Section>
        </div>

        <div className="space-y-6">
          <Section title={t("exchanges.detail.details")}>
            <InfoList
              items={[
                { label: t("exchanges.detail.agreedAt"), value: formatDateTime(e.createdAt, locale) },
                { label: t("exchanges.detail.completedAt"), value: formatDateTime(e.completedAt, locale), hidden: !e.completedAt },
                { label: t("exchanges.detail.cancelledAt"), value: formatDateTime(e.cancelledAt, locale), hidden: !e.cancelledAt },
                { label: t("exchanges.detail.updatedAt"), value: formatDateTime(e.updatedAt, locale) },
                { label: t("exchanges.detail.meetingRegion"), value: names.region(e.meetingRegionId) },
                { label: t("exchanges.detail.meetingNote"), value: e.meetingNote ?? "—" },
              ]}
            />
          </Section>

          <Section title={t("exchanges.detail.history")}>
            <Timeline
              entries={e.statusHistory.map((h, i) => ({
                id: `${h.status}-${i}`,
                tone: TONE[h.status],
                title: (
                  <>
                    <StatusBadge kind="exchangeStatus" value={h.status} />
                    <span className="text-xs text-muted-foreground">
                      {t(`exchanges.actor.${h.actor.type}`)}
                      {h.actor.name && ` · ${h.actor.name}`}
                    </span>
                  </>
                ),
                note: h.note,
                meta: formatDateTime(h.at, locale),
              }))}
            />
          </Section>

          <AdminNotes entityType="EXCHANGE" entityId={e.id} />
        </div>
      </div>

      <CancelExchangeDialog exchange={cancelOpen ? e : null} onClose={() => setCancelOpen(false)} />
    </div>
  );
}
