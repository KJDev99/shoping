"use client";

import { AlertTriangle, ArrowRight, Ban, CheckCircle2, FileText, Gavel, Lock, MessagesSquare, PauseCircle, ShieldAlert, UserCheck } from "lucide-react";
import { useState } from "react";
import { Timeline, type TimelineEntry } from "@/components/admin/barter/barter-shared";
import { AdminNotes } from "@/components/admin/shared/admin-notes";
import { ButtonLink } from "@/components/common/button-link";
import { CopyId, ItemImage, Rating, UserAvatar, UserCell } from "@/components/common/cells";
import { InfoList, Section } from "@/components/common/info-list";
import { PageHeader } from "@/components/common/page-header";
import { SimpleSelect } from "@/components/common/simple-select";
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/common/states";
import { Pill, StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDispute, useDisputeActions } from "@/hooks/use-exchanges";
import { useSession } from "@/hooks/use-session";
import { formatDateTime } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { DisputeDetail } from "@/services/exchanges.service";
import { DISPUTE_RESOLUTIONS, type DisputeEvent, type DisputeResolution, type UserRef } from "@/types";

const EVENT_TONE: Record<DisputeEvent["type"], TimelineEntry["tone"]> = {
  OPENED: "danger",
  EVIDENCE_ADDED: "muted",
  NOTE_ADDED: "muted",
  STATUS_CHANGED: "primary",
  USER_WARNED: "warning",
  USER_SUSPENDED: "warning",
  USER_BLOCKED: "danger",
  CLOSED: "success",
};

export function DisputePage({ exchangeId }: { exchangeId: string }) {
  const query = useDispute(exchangeId);
  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} backHref={`/admin/exchanges/${exchangeId}`} />;
  return <DisputeView d={query.data} exchangeId={exchangeId} />;
}

const isClosed = (d: DisputeDetail) => d.status === "RESOLVED" || d.status === "CLOSED";

function PartyCard({ d, user, role }: { d: DisputeDetail; user: UserRef; role: "openedBy" | "against" }) {
  const t = useT();
  const info = d.parties[user.id];
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-3 rounded-xl border p-3 sm:p-4", role === "openedBy" ? "bg-primary/3" : "bg-chart-3/4")}>
      <span className={cn("text-xs font-semibold tracking-wide uppercase", role === "openedBy" ? "text-primary" : "text-chart-3")}>
        {role === "openedBy" ? t("exchanges.dispute.openedBy") : t("exchanges.dispute.against")}
      </span>
      <UserCell user={user} />
      {info && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <StatusBadge kind="userStatus" value={info.status} />
          {info.riskLevel !== "LOW" && <StatusBadge kind="riskLevel" value={info.riskLevel} />}
          <Rating value={info.rating} count={info.reviewsCount} />
          <span className={info.reportsCount >= 3 ? "text-destructive" : undefined}>{t("exchanges.dispute.reportsCount", { count: info.reportsCount })}</span>
          <span>{t("exchanges.dispute.exchangesCount", { count: info.completedExchanges })}</span>
        </div>
      )}
    </div>
  );
}

function DisputeView({ d, exchangeId }: { d: DisputeDetail; exchangeId: string }) {
  const t = useT();
  const [locale] = useLocale();
  const closed = isClosed(d);
  const nameOf = (userId: string) => (userId === d.openedBy.id ? d.openedBy.fullName : userId === d.against.id ? d.against.fullName : userId);

  return (
    <div className="space-y-6">
      <PageHeader
        backHref={`/admin/exchanges/${exchangeId}`}
        backLabel={t("exchanges.dispute.back")}
        title={t("exchanges.dispute.title", { code: d.exchange.code })}
        meta={
          <>
            <StatusBadge kind="disputeStatus" value={d.status} />
            <Pill tone="neutral">{t(`enums.disputeCategory.${d.category}`)}</Pill>
            <CopyId value={d.id} />
            <span className="text-xs text-muted-foreground">
              {t("exchanges.dispute.assignee")}: {d.assignedTo?.fullName ?? t("exchanges.dispute.unassigned")}
            </span>
          </>
        }
        actions={
          <ButtonLink href={`/admin/exchanges/${exchangeId}`} variant="outline">
            {t("exchanges.dispute.exchange")} {d.exchange.code} <ArrowRight />
          </ButtonLink>
        }
      />

      {closed && (
        <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{t("exchanges.dispute.closedBanner")}</p>
            {d.resolution && (
              <p>
                <span className="text-muted-foreground">{t("exchanges.dispute.resolution")}:</span> {t(`enums.disputeResolution.${d.resolution}`)}
              </p>
            )}
            {d.resolutionNote && <p className="whitespace-pre-wrap wrap-break-word text-muted-foreground">{d.resolutionNote}</p>}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Section title={t("exchanges.dispute.parties")} description={t("exchanges.dispute.riskHint")}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <PartyCard d={d} user={d.openedBy} role="openedBy" />
              <PartyCard d={d} user={d.against} role="against" />
            </div>
          </Section>

          <Section title={t("exchanges.dispute.description")}>
            <p className="text-sm whitespace-pre-wrap wrap-break-word">{d.description}</p>
          </Section>

          <Section title={t("exchanges.dispute.evidence")}>
            {d.evidence.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {d.evidence.map((ev) => (
                  <li key={ev.id} className="overflow-hidden rounded-lg border bg-background">
                    <a href={ev.url} target="_blank" rel="noreferrer noopener" className="block">
                      {ev.kind === "IMAGE" ? (
                        <ItemImage src={ev.url} alt={ev.caption ?? ev.id} className="aspect-4/3 w-full" />
                      ) : (
                        <div className="flex aspect-4/3 w-full flex-col items-center justify-center gap-1 bg-muted text-muted-foreground">
                          <FileText className="size-6" />
                          <span className="text-xs">{t("exchanges.dispute.document")}</span>
                        </div>
                      )}
                    </a>
                    <div className="space-y-0.5 p-2 text-xs">
                      {ev.caption && <p className="line-clamp-2 font-medium">{ev.caption}</p>}
                      <p className="truncate text-muted-foreground">{t("exchanges.dispute.uploadedBy", { name: nameOf(ev.uploadedBy) })}</p>
                      <p className="text-muted-foreground">{formatDateTime(ev.createdAt, locale)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={t("exchanges.dispute.noEvidence")} className="py-6" />
            )}
          </Section>

          <Section
            title={
              <span className="inline-flex items-center gap-1.5">
                <MessagesSquare className="size-3.5 text-muted-foreground" /> {t("exchanges.dispute.messages")}
              </span>
            }
            description={
              <span className="inline-flex items-center gap-1">
                <Lock className="size-3" /> {t("exchanges.dispute.messagesHint")}
              </span>
            }
          >
            {d.messages.length ? (
              <ol className="max-h-112 space-y-3 overflow-y-auto pr-1">
                {d.messages.map((m) => {
                  const mine = m.senderId === d.openedBy.id;
                  return (
                    <li key={m.id} className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
                      <UserAvatar name={m.senderName} src={mine ? d.openedBy.avatar : d.against.avatar} className="size-7 shrink-0" />
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                          mine ? "rounded-br-sm bg-primary/10" : "rounded-bl-sm bg-muted",
                        )}
                      >
                        <p className={cn("text-xs font-medium", mine ? "text-primary" : "text-muted-foreground")}>{m.senderName}</p>
                        <p className="whitespace-pre-wrap wrap-break-word">{m.body}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">{formatDateTime(m.createdAt, locale)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState title={t("exchanges.dispute.noMessages")} className="py-6" />
            )}
          </Section>

          <Section title={t("exchanges.dispute.history")}>
            <Timeline
              entries={d.history.map((h) => ({
                id: h.id,
                tone: EVENT_TONE[h.type],
                title: (
                  <>
                    <span className="font-medium">{t(`exchanges.dispute.events.${h.type}`)}</span>
                    <span className="text-xs text-muted-foreground">
                      {t(`exchanges.actor.${h.actor.type}`)} · {h.actor.name}
                    </span>
                  </>
                ),
                note: h.description === t(`exchanges.dispute.events.${h.type}`) ? null : h.description,
                meta: formatDateTime(h.createdAt, locale),
              }))}
            />
          </Section>
        </div>

        <div className="space-y-6">
          <DisputeActions d={d} exchangeId={exchangeId} />
          <Section title={d.id}>
            <InfoList
              items={[
                { label: t("exchanges.dispute.category"), value: t(`enums.disputeCategory.${d.category}`) },
                { label: t("exchanges.dispute.status"), value: <StatusBadge kind="disputeStatus" value={d.status} /> },
                { label: t("exchanges.dispute.assignee"), value: d.assignedTo?.fullName ?? t("exchanges.dispute.unassigned") },
                { label: t("exchanges.dispute.exchange"), value: <span className="inline-flex items-center gap-2">{d.exchange.code} <StatusBadge kind="exchangeStatus" value={d.exchange.status} /></span> },
                { label: t("exchanges.dispute.openedAt"), value: formatDateTime(d.createdAt, locale) },
                { label: t("exchanges.dispute.closedAt"), value: formatDateTime(d.closedAt, locale), hidden: !d.closedAt },
                { label: t("exchanges.dispute.resolution"), value: d.resolution ? t(`enums.disputeResolution.${d.resolution}`) : "—", hidden: !d.resolution },
              ]}
            />
          </Section>
          <AdminNotes entityType="DISPUTE" entityId={d.id} />
        </div>
      </div>
    </div>
  );
}

type DialogKind = "assign" | "warn" | "suspend" | "block" | "close";

function DisputeActions({ d, exchangeId }: { d: DisputeDetail; exchangeId: string }) {
  const t = useT();
  const session = useSession();
  const actions = useDisputeActions(exchangeId);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [party, setParty] = useState<string | null>(null);
  const [days, setDays] = useState("7");
  const [resolution, setResolution] = useState<DisputeResolution | null>(null);
  const closed = isClosed(d);
  const meId = session.data?.admin.id;
  const assignedToMe = !!meId && d.assignedTo?.id === meId && d.status === "UNDER_REVIEW";

  const openDialog = (kind: DialogKind) => {
    setParty(null);
    setDays("7");
    setResolution(null);
    setDialog(kind);
  };
  const onOpenChange = (o: boolean) => !o && setDialog(null);

  /** Mirrors the API's 409 rules: blocked or deleted users can't be suspended/blocked again. */
  const unavailable = (userId: string) => {
    const status = d.parties[userId]?.status;
    return status === "DELETED" || status === "BLOCKED";
  };
  const partyField = (kind: "warn" | "suspend" | "block") => (
    <div className="space-y-1.5">
      <Label htmlFor="dispute-party">{t("exchanges.dispute.dialogs.party")}</Label>
      <SimpleSelect
        id="dispute-party"
        value={party}
        onChange={setParty}
        placeholder={t("exchanges.dispute.dialogs.partyPlaceholder")}
        options={[
          { user: d.openedBy, role: t("exchanges.dispute.openedBy") },
          { user: d.against, role: t("exchanges.dispute.against") },
        ].map(({ user, role }) => ({
          value: user.id,
          label: `${user.fullName} · ${role}`,
          disabled: kind !== "warn" && unavailable(user.id),
        }))}
      />
    </div>
  );
  const daysNum = Number(days);
  const daysValid = Number.isInteger(daysNum) && daysNum >= 1 && daysNum <= 365;

  return (
    <Section title={t("exchanges.dispute.actions.title")} description={closed ? t("exchanges.dispute.actions.readOnly") : t("exchanges.dispute.actions.hint")}>
      {closed ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="size-4" /> {t("exchanges.dispute.actions.readOnly")}
        </div>
      ) : (
        <div className="grid gap-2">
          <Button variant="outline" className="justify-start" disabled={assignedToMe || actions.assign.isPending} onClick={() => openDialog("assign")}>
            {assignedToMe ? <CheckCircle2 className="text-success" /> : <UserCheck />}
            {assignedToMe ? t("exchanges.dispute.actions.assigned") : t("exchanges.dispute.actions.assign")}
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => openDialog("warn")}>
            <AlertTriangle /> {t("exchanges.dispute.actions.warn")}
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => openDialog("suspend")}>
            <PauseCircle /> {t("exchanges.dispute.actions.suspend")}
          </Button>
          <Button variant="outline" className="justify-start text-destructive hover:text-destructive" onClick={() => openDialog("block")}>
            <Ban /> {t("exchanges.dispute.actions.block")}
          </Button>
          <Button className="justify-start" onClick={() => openDialog("close")}>
            <Gavel /> {t("exchanges.dispute.actions.close")}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={dialog === "assign"}
        onOpenChange={onOpenChange}
        title={t("exchanges.dispute.dialogs.assignTitle")}
        description={t("exchanges.dispute.dialogs.assignDescription")}
        confirmLabel={t("exchanges.dispute.actions.assign")}
        onConfirm={() => actions.assign.mutateAsync()}
      />
      <ConfirmDialog
        open={dialog === "warn"}
        onOpenChange={onOpenChange}
        title={t("exchanges.dispute.dialogs.warnTitle")}
        description={t("exchanges.dispute.dialogs.warnDescription")}
        confirmLabel={t("exchanges.dispute.actions.warn")}
        reason={{ required: true }}
        canConfirm={!!party}
        onConfirm={({ reason }) => (party ? actions.warn.mutateAsync({ userId: party, reason }) : undefined)}
      >
        {partyField("warn")}
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "suspend"}
        onOpenChange={onOpenChange}
        title={t("exchanges.dispute.dialogs.suspendTitle")}
        description={t("exchanges.dispute.dialogs.suspendDescription")}
        confirmLabel={t("exchanges.dispute.actions.suspend")}
        variant="destructive"
        reason={{ required: true }}
        canConfirm={!!party && daysValid}
        onConfirm={({ reason }) => (party ? actions.suspend.mutateAsync({ userId: party, reason, days: daysNum }) : undefined)}
      >
        {partyField("suspend")}
        <div className="space-y-1.5">
          <Label htmlFor="dispute-days">{t("exchanges.dispute.dialogs.days")}</Label>
          <Input id="dispute-days" type="number" inputMode="numeric" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} aria-invalid={!daysValid} />
          {!daysValid && <p className="text-xs text-destructive">{t("validation.max365")}</p>}
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "block"}
        onOpenChange={onOpenChange}
        title={t("exchanges.dispute.dialogs.blockTitle")}
        description={t("exchanges.dispute.dialogs.blockDescription")}
        confirmLabel={t("exchanges.dispute.actions.block")}
        variant="destructive"
        reason={{ required: true }}
        canConfirm={!!party}
        onConfirm={({ reason }) => (party ? actions.block.mutateAsync({ userId: party, reason }) : undefined)}
      >
        {partyField("block")}
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "close"}
        onOpenChange={onOpenChange}
        title={t("exchanges.dispute.dialogs.closeTitle")}
        description={t("exchanges.dispute.dialogs.closeDescription")}
        confirmLabel={t("exchanges.dispute.actions.close")}
        reason={{ required: true, label: t("exchanges.dispute.dialogs.note") }}
        canConfirm={!!resolution}
        onConfirm={({ reason }) => (resolution ? actions.close.mutateAsync({ resolution, note: reason }) : undefined)}
      >
        <div className="space-y-1.5">
          <Label htmlFor="dispute-resolution">
            <ShieldAlert className="size-3.5" /> {t("exchanges.dispute.dialogs.resolution")}
          </Label>
          <SimpleSelect
            id="dispute-resolution"
            value={resolution}
            onChange={setResolution}
            placeholder={t("exchanges.dispute.dialogs.resolutionPlaceholder")}
            options={DISPUTE_RESOLUTIONS.map((r) => ({ value: r, label: t(`enums.disputeResolution.${r}`) }))}
          />
        </div>
      </ConfirmDialog>
    </Section>
  );
}
