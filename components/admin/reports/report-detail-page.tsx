"use client";

import { Ban, CheckCircle2, Flag, Info, Timer, UserCheck, XCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNotes } from "@/components/admin/shared/admin-notes";
import { ModerationHistory } from "@/components/admin/shared/moderation-history";
import { ButtonLink } from "@/components/common/button-link";
import { DateCell, ItemImage, ListingCell, UserAvatar, UserCell } from "@/components/common/cells";
import { InfoList, Section } from "@/components/common/info-list";
import { PageHeader } from "@/components/common/page-header";
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { useLookupNames } from "@/hooks/use-lookups";
import { useReport } from "@/hooks/use-reports";
import { useCan, useSession } from "@/hooks/use-session";
import { formatDateTime } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { ReportDetail, ReportedUserSummary } from "@/schemas/report.schema";
import type { ListingRef, Report } from "@/types";
import { useReportActionDialogs, type ReportAction, type ReportActionTarget } from "./report-action-dialogs";
import { reportTargetHref } from "./report-target";

type OpenFn = (action: ReportAction, target: ReportActionTarget) => void;

export function ReportDetailPage({ id }: { id: string }) {
  const t = useT();
  const [locale] = useLocale();
  const query = useReport(id);
  const { open, dialogs } = useReportActionDialogs();

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} backHref="/admin/reports" />;
  const detail = query.data;
  const { report } = detail;

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/admin/reports"
        backLabel={t("reports.detail.back")}
        title={t("reports.detail.title", { code: report.code })}
        meta={
          <>
            <StatusBadge kind="reportStatus" value={report.status} />
            <StatusBadge kind="reportReason" value={report.reason} dot={false} />
            <StatusBadge kind="reportTarget" value={report.targetType} dot={false} />
            <span className="text-xs text-muted-foreground">{formatDateTime(report.createdAt, locale)}</span>
          </>
        }
        actions={<HeaderActions detail={detail} open={open} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <ReportInfo report={report} />
          <TargetSection detail={detail} />
          <OtherReports detail={detail} />
          <ModerationHistory targetType="REPORT" targetId={report.id} />
        </div>
        <div className="min-w-0 space-y-6">
          <ActionPanel detail={detail} open={open} />
          <ReporterCard detail={detail} />
          {detail.responsibleUser && <ResponsibleUserCard user={detail.responsibleUser} />}
          <AdminNotes entityType="REPORT" entityId={report.id} />
        </div>
      </div>
      {dialogs}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function useAvailableActions(detail: ReportDetail) {
  const session = useSession();
  const canResolve = useCan("reports.resolve");
  const canBlockListing = useCan(["reports.resolve", "listings.block"]);
  const canBlockUser = useCan(["reports.resolve", "users.block"]);
  const { report, target, responsibleUser } = detail;
  const isOpen = report.status === "NEW" || report.status === "REVIEWING";
  const mine = !!report.assignedTo && report.assignedTo.id === session.data?.admin.id;
  const listing = target.type === "LISTING" ? target.listing : null;
  const userState = responsibleUser?.status;
  return {
    canResolve,
    isOpen,
    review: canResolve && isOpen && !(report.status === "REVIEWING" && mine),
    takeOver: report.status === "REVIEWING" && !mine,
    resolve: canResolve && isOpen,
    reject: canResolve && isOpen,
    blockListing: canBlockListing && !!listing && listing.status !== "BLOCKED",
    listingBlocked: listing?.status === "BLOCKED",
    blockUser: canBlockUser && !!responsibleUser && userState !== "BLOCKED" && userState !== "DELETED",
    suspendUser: canBlockUser && userState === "ACTIVE",
    userBlocked: userState === "BLOCKED",
    anyEnforcement: canBlockListing || canBlockUser,
  };
}

function actionTarget(detail: ReportDetail): ReportActionTarget {
  return {
    report: detail.report,
    userName: detail.responsibleUser?.fullName,
    listingTitle: detail.target.type === "LISTING" ? detail.target.listing?.title : undefined,
  };
}

function HeaderActions({ detail, open }: { detail: ReportDetail; open: OpenFn }) {
  const t = useT();
  const a = useAvailableActions(detail);
  const target = actionTarget(detail);
  const href = reportTargetHref(detail.report.target);
  return (
    <>
      {href && (
        <ButtonLink href={href} variant="outline">
          {t("reports.detail.openTarget")} · {detail.report.targetType === "MESSAGE" ? t("reports.detail.sender") : t(`enums.reportTarget.${detail.report.targetType}`)}
        </ButtonLink>
      )}
      {a.review ? (
        <Button onClick={() => open("review", target)}>
          <UserCheck /> {a.takeOver ? t("reports.actions.takeOver") : t("reports.actions.review")}
        </Button>
      ) : (
        a.resolve && (
          <Button onClick={() => open("resolve", target)}>
            <CheckCircle2 /> {t("reports.actions.resolve")}
          </Button>
        )
      )}
    </>
  );
}

function ActionButton({ icon, label, onClick, destructive }: { icon: ReactNode; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <Button variant={destructive ? "destructive" : "outline"} className="w-full justify-start" onClick={onClick}>
      {icon}
      {label}
    </Button>
  );
}

function ActionPanel({ detail, open }: { detail: ReportDetail; open: OpenFn }) {
  const t = useT();
  const a = useAvailableActions(detail);
  const target = actionTarget(detail);
  const hasWorkflow = a.review || a.resolve || a.reject;
  const hasEnforcement = a.blockListing || a.blockUser || a.suspendUser;

  if (!a.canResolve) {
    return (
      <Section title={t("reports.detail.actions")}>
        <p className="text-sm text-muted-foreground">{t("reports.detail.readOnly")}</p>
      </Section>
    );
  }

  return (
    <Section title={t("reports.detail.actions")} description={t("reports.detail.actionsHint")}>
      <div className="space-y-4">
        {!a.isOpen && (
          <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" /> {t("reports.detail.closedHint")}
          </p>
        )}
        {hasWorkflow && (
          <div className="grid gap-2">
            {a.review && <ActionButton icon={<UserCheck />} label={a.takeOver ? t("reports.actions.takeOver") : t("reports.actions.review")} onClick={() => open("review", target)} />}
            {a.resolve && <ActionButton icon={<CheckCircle2 />} label={t("reports.actions.resolve")} onClick={() => open("resolve", target)} />}
            {a.reject && <ActionButton icon={<XCircle />} label={t("reports.actions.reject")} onClick={() => open("reject", target)} />}
          </div>
        )}
        {hasEnforcement && (
          <div className={cn("grid gap-2", hasWorkflow && "border-t pt-4")}>
            {a.blockListing && <ActionButton icon={<Ban />} label={t("reports.actions.blockListing")} onClick={() => open("blockListing", target)} destructive />}
            {a.suspendUser && <ActionButton icon={<Timer />} label={t("reports.actions.suspendUser")} onClick={() => open("suspendUser", target)} destructive />}
            {a.blockUser && <ActionButton icon={<Ban />} label={t("reports.actions.blockUser")} onClick={() => open("blockUser", target)} destructive />}
          </div>
        )}
        {(a.listingBlocked || a.userBlocked) && (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {a.listingBlocked && <li>{t("reports.detail.listingAlreadyBlocked")}</li>}
            {a.userBlocked && <li>{t("reports.detail.userAlreadyBlocked")}</li>}
          </ul>
        )}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Report info
// ---------------------------------------------------------------------------

function ReportInfo({ report }: { report: Report }) {
  const t = useT();
  const [locale] = useLocale();
  const closed = report.status === "RESOLVED" || report.status === "REJECTED";
  return (
    <Section title={t("reports.detail.info")}>
      <div className="space-y-5">
        <InfoList
          columns={2}
          items={[
            { label: t("reports.columns.reason"), value: <StatusBadge kind="reportReason" value={report.reason} dot={false} /> },
            { label: t("reports.columns.status"), value: <StatusBadge kind="reportStatus" value={report.status} /> },
            { label: t("reports.detail.createdAt"), value: formatDateTime(report.createdAt, locale) },
            { label: t("reports.detail.updatedAt"), value: <DateCell value={report.updatedAt} /> },
            {
              label: t("reports.detail.assignedTo"),
              value: report.assignedTo ? (
                <span className="inline-flex items-center gap-2">
                  <UserAvatar name={report.assignedTo.fullName} src={report.assignedTo.avatar} className="size-6" />
                  {report.assignedTo.fullName}
                  <StatusBadge kind="adminRole" value={report.assignedTo.role} dot={false} />
                </span>
              ) : (
                <span className="text-muted-foreground">{t("reports.unassigned")}</span>
              ),
            },
            { label: t("reports.detail.resolvedAt"), value: formatDateTime(report.resolvedAt, locale), hidden: !report.resolvedAt },
          ]}
        />
        <div className="space-y-1.5">
          <h3 className="text-xs text-muted-foreground">{t("reports.detail.description")}</h3>
          {report.description ? (
            <p className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{report.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("reports.detail.noDescription")}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <h3 className="text-xs text-muted-foreground">{t("reports.detail.attachments")}</h3>
          {report.attachments.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {report.attachments.map((src, i) => (
                <a
                  key={src}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-lg border focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <ItemImage src={src} alt={t("reports.detail.attachmentAlt", { n: i + 1 })} className="aspect-square w-full transition-opacity hover:opacity-90" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("reports.detail.noAttachments")}</p>
          )}
        </div>
        {closed && report.resolutionNote && (
          <div className={cn("rounded-lg border p-3 text-sm", report.status === "RESOLVED" ? "border-success/30 bg-success/5" : "bg-muted/40")}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{t("reports.detail.resolutionNote")}</p>
            <p className="whitespace-pre-wrap">{report.resolutionNote}</p>
          </div>
        )}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Target
// ---------------------------------------------------------------------------

function ListingRefRow({ listing }: { listing: ListingRef }) {
  const names = useLookupNames();
  return (
    <li className="flex items-center gap-3 py-2">
      <ListingCell listing={listing} secondary={names.category(listing.categoryId)} className="min-w-0 flex-1" />
      <StatusBadge kind="listingStatus" value={listing.status} />
    </li>
  );
}

function TargetSection({ detail }: { detail: ReportDetail }) {
  const t = useT();
  const names = useLookupNames();
  const { target, report } = detail;
  const href = reportTargetHref(report.target);
  const title = t("reports.detail.target", { type: t(`enums.reportTarget.${report.targetType}`).toLowerCase() });
  const action = href ? (
    <ButtonLink href={href} variant="outline" size="sm">
      {report.targetType === "MESSAGE" ? `${t("reports.detail.openTarget")} · ${t("reports.detail.sender")}` : t("reports.detail.openTarget")}
    </ButtonLink>
  ) : undefined;

  let body: ReactNode;
  switch (target.type) {
    case "LISTING": {
      const l = target.listing;
      body = l ? (
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href={`/admin/listings/${l.id}`} className="shrink-0">
            <ItemImage src={l.image} alt={l.title} className="aspect-square w-full rounded-lg sm:size-28" />
          </Link>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <Link href={`/admin/listings/${l.id}`} className="font-medium hover:underline">
                {l.title}
              </Link>
              <p className="text-xs text-muted-foreground">
                {l.code} · {names.category(l.categoryId)}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge kind="listingStatus" value={l.status} />
              <StatusBadge kind="itemCondition" value={l.condition} dot={false} />
            </div>
            <InfoList
              columns={2}
              items={[
                { label: t("reports.detail.listingReports"), value: <span className={cn("tabular-nums", l.reportsCount >= 3 && "font-medium text-destructive")}>{l.reportsCount}</span> },
                { label: t("reports.detail.rejections"), value: <span className="tabular-nums">{l.rejectionCount}</span> },
                { label: t("common.fields.createdAt"), value: <DateCell value={l.createdAt} /> },
                {
                  label: t("common.fields.owner"),
                  value: detail.responsibleUser ? <UserCell user={detail.responsibleUser} /> : "—",
                },
              ]}
            />
          </div>
        </div>
      ) : (
        <EmptyState title={t("reports.detail.targetMissing")} className="py-6" />
      );
      break;
    }
    case "USER": {
      const u = target.user;
      body = u ? <UserSummaryBlock user={u} /> : <EmptyState title={t("reports.detail.targetMissing")} className="py-6" />;
      break;
    }
    case "BARTER_REQUEST": {
      const b = target.request;
      body = b ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/barter-requests/${b.id}`} className="font-mono text-sm hover:underline">
              {b.code}
            </Link>
            <StatusBadge kind="barterStatus" value={b.status} />
            <DateCell value={b.createdAt} className="text-xs text-muted-foreground" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("reports.detail.sender")}</p>
              <UserCell user={b.sender} />
              <p className="pt-1 text-xs text-muted-foreground">{t("reports.detail.offered")}</p>
              <ul className="divide-y">
                {b.offered.map((l) => (
                  <ListingRefRow key={l.id} listing={l} />
                ))}
              </ul>
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("reports.detail.receiver")}</p>
              <UserCell user={b.receiver} />
              <p className="pt-1 text-xs text-muted-foreground">{t("reports.detail.requested")}</p>
              <ul className="divide-y">
                {b.requested.map((l) => (
                  <ListingRefRow key={l.id} listing={l} />
                ))}
              </ul>
            </div>
          </div>
          {b.message && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">{t("reports.detail.offerMessage")}</p>
              <p className="rounded-lg border bg-muted/30 p-3 text-sm">{b.message}</p>
            </div>
          )}
        </div>
      ) : (
        <EmptyState title={t("reports.detail.targetMissing")} className="py-6" />
      );
      break;
    }
    case "MESSAGE":
      body = (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{t("reports.detail.message")}</p>
          <blockquote className="rounded-lg border-l-4 border-destructive/50 bg-muted/40 p-3 text-sm italic">{target.message.text}</blockquote>
          {target.message.sender && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("reports.detail.sender")}</p>
              <UserCell user={target.message.sender} />
            </div>
          )}
        </div>
      );
      break;
  }

  return (
    <Section title={title} action={action}>
      {body}
    </Section>
  );
}

function UserSummaryBlock({ user }: { user: ReportedUserSummary }) {
  const t = useT();
  const [locale] = useLocale();
  return (
    <div className="space-y-3">
      <UserCell user={user} />
      <div className="flex flex-wrap gap-1.5">
        <StatusBadge kind="userStatus" value={user.status} />
        <StatusBadge kind="riskLevel" value={user.riskLevel} />
      </div>
      <InfoList
        columns={2}
        items={[
          { label: t("reports.detail.userReports"), value: <span className={cn("tabular-nums", user.reportsCount >= 3 && "font-medium text-destructive")}>{user.reportsCount}</span> },
          { label: t("reports.detail.listings"), value: <span className="tabular-nums">{user.listingsCount}</span> },
          { label: t("reports.detail.suspendedUntil"), value: formatDateTime(user.suspendedUntil, locale), hidden: !user.suspendedUntil },
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side cards
// ---------------------------------------------------------------------------

function ReporterCard({ detail }: { detail: ReportDetail }) {
  const t = useT();
  const { report, reporterStats } = detail;
  const rejectedShare = reporterStats.submitted ? reporterStats.rejected / reporterStats.submitted : 0;
  return (
    <Section title={t("reports.detail.reporter")}>
      <div className="space-y-3">
        <UserCell user={report.reporter} />
        <dl className="grid grid-cols-3 gap-2 text-center">
          {(
            [
              [t("reports.detail.reporterSubmitted"), reporterStats.submitted, ""],
              [t("reports.detail.reporterResolved"), reporterStats.resolved, "text-success"],
              [t("reports.detail.reporterRejected"), reporterStats.rejected, rejectedShare >= 0.5 && reporterStats.submitted >= 3 ? "text-destructive" : ""],
            ] as const
          ).map(([label, value, cls]) => (
            <div key={label} className="rounded-lg bg-muted/50 p-2">
              <dd className={cn("text-lg font-semibold tabular-nums", cls)}>{value}</dd>
              <dt className="text-[11px] leading-tight text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>
        {rejectedShare >= 0.5 && reporterStats.submitted >= 3 && <p className="text-xs text-muted-foreground">{t("reports.detail.reporterHint")}</p>}
      </div>
    </Section>
  );
}

function ResponsibleUserCard({ user }: { user: ReportedUserSummary }) {
  const t = useT();
  return (
    <Section title={t("reports.detail.responsibleUser")}>
      <UserSummaryBlock user={user} />
    </Section>
  );
}

function OtherReports({ detail }: { detail: ReportDetail }) {
  const t = useT();
  const { otherReports, otherReportsTotal } = detail;
  return (
    <Section
      title={t("reports.detail.otherReports")}
      action={otherReportsTotal > 0 ? <span className="text-xs text-muted-foreground">{t("reports.detail.otherReportsTotal", { count: otherReportsTotal })}</span> : undefined}
      contentClassName={otherReports.length ? "p-0" : undefined}
    >
      {otherReports.length === 0 ? (
        <EmptyState icon={<Flag />} title={t("reports.detail.noOtherReports")} className="py-6" />
      ) : (
        <ul className="divide-y">
          {otherReports.map((r) => (
            <li key={r.id}>
              <Link href={`/admin/reports/${r.id}`} className="flex flex-col gap-2 px-4 py-3 hover:bg-muted/40 sm:flex-row sm:items-center">
                <span className="font-mono text-xs sm:w-24">{r.code}</span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge kind="reportReason" value={r.reason} dot={false} />
                    <span className="truncate text-xs text-muted-foreground">{r.reporter.fullName}</span>
                  </div>
                  {r.description && <p className="line-clamp-1 text-xs text-muted-foreground">{r.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge kind="reportStatus" value={r.status} />
                  <DateCell value={r.createdAt} className="text-xs text-muted-foreground" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
