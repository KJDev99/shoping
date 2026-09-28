"use client";

import { AlertTriangle, ArrowLeftRight, Ban, Check, CopyX, FilePen, Flag, Loader2, MessageSquareWarning, ShieldCheck, Timer, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ItemImage, UserAvatar, UserCell } from "@/components/common/cells";
import { Pill, StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { useLookupNames } from "@/hooks/use-lookups";
import { useCan } from "@/hooks/use-session";
import { formatDate, formatRelative } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { ListingQueueItem, ReasonCount, UserQueueItem } from "@/schemas/moderation.schema";
import type { ModerationQueue } from "@/types";
import type { OpenListingDialog, OpenUserDialog } from "./moderation-dialogs";

function CardShell({ children, actions, className }: { children: ReactNode; actions: ReactNode; className?: string }) {
  return (
    <li className={cn("flex flex-col gap-4 rounded-xl border bg-card p-3 sm:p-4 xl:flex-row xl:items-start", className)}>
      <div className="min-w-0 flex-1">{children}</div>
      {actions && <div className="flex flex-wrap gap-2 xl:w-56 xl:shrink-0 xl:flex-col xl:items-stretch">{actions}</div>}
    </li>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  variant = "outline",
  pending,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive";
  pending?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button size="sm" variant={variant} onClick={onClick} disabled={disabled || pending} className="xl:justify-start">
      {pending ? <Loader2 className="animate-spin" /> : icon}
      {label}
    </Button>
  );
}

export function ReasonPills({ reasons }: { reasons: ReasonCount[] }) {
  const t = useT();
  if (!reasons.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{t("moderation.card.reasons")}:</span>
      {reasons.map((r) => (
        <Pill key={r.reason} tone={r.reason === "SCAM" || r.reason === "PROHIBITED_ITEM" || r.reason === "HARASSMENT" || r.reason === "FAKE_ITEM" ? "danger" : "warning"}>
          {t(`enums.reportReason.${r.reason}`)}
          {r.count > 1 && <span className="tabular-nums opacity-80">×{r.count}</span>}
        </Pill>
      ))}
    </div>
  );
}

function Signal({ icon, children, tone = "neutral" }: { icon: ReactNode; children: ReactNode; tone?: "neutral" | "danger" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs [&_svg]:size-3.5",
        tone === "danger" ? "font-medium text-destructive" : tone === "warning" ? "text-[color-mix(in_oklch,var(--warning),var(--foreground)_35%)]" : "text-muted-foreground",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Listing card
// ---------------------------------------------------------------------------

export function ListingQueueCard({
  item,
  queue,
  openDialog,
  onApprove,
  approving,
}: {
  item: ListingQueueItem;
  queue: ModerationQueue;
  openDialog: OpenListingDialog;
  onApprove: () => void;
  approving: boolean;
}) {
  const t = useT();
  const [locale] = useLocale();
  const names = useLookupNames();
  const { listing, duplicateOf } = item;
  const canApprove = useCan(["moderation.act", "listings.approve"]);
  const canReject = useCan(["moderation.act", "listings.reject"]);
  const canBlock = useCan(["moderation.act", "listings.block"]);
  const canDismiss = useCan(["moderation.act", "reports.resolve"]);
  const canAct = useCan("moderation.act");
  const ref = { id: listing.id, title: listing.title };
  const cover = listing.images.find((i) => i.isCover)?.url ?? listing.images[0]?.url ?? null;

  const actions = (
    <>
      {canApprove && listing.status === "PENDING" && (
        <ActionBtn icon={<Check />} label={t("moderation.actions.approve")} variant="default" onClick={onApprove} pending={approving} />
      )}
      {canReject && <ActionBtn icon={<X />} label={t("moderation.actions.reject")} onClick={() => openDialog("reject", ref, queue)} disabled={approving} />}
      {canReject && <ActionBtn icon={<FilePen />} label={t("moderation.actions.requestCorrection")} onClick={() => openDialog("requestCorrection", ref, queue)} disabled={approving} />}
      {queue === "REPORTED_LISTINGS" && canDismiss && (
        <ActionBtn icon={<ShieldCheck />} label={t("moderation.actions.dismissReports")} onClick={() => openDialog("dismissReports", ref, queue)} disabled={approving} />
      )}
      {queue === "DUPLICATE_LISTINGS" && canAct && (
        <ActionBtn icon={<CopyX />} label={t("moderation.actions.notDuplicate")} onClick={() => openDialog("notDuplicate", ref, queue)} disabled={approving} />
      )}
      {canBlock && <ActionBtn icon={<Ban />} label={t("moderation.actions.block")} variant="destructive" onClick={() => openDialog("block", ref, queue)} disabled={approving} />}
    </>
  );

  const main = (
    <div className="flex gap-3">
      <Link href={`/admin/listings/${listing.id}`} className="shrink-0">
        <ItemImage src={cover} alt={listing.title} className="size-20 rounded-lg sm:size-24" />
      </Link>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Link href={`/admin/listings/${listing.id}`} className="line-clamp-2 font-medium hover:underline">
          {listing.title}
        </Link>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono">{listing.code}</span>
          <span>·</span>
          <span className="truncate">{names.category(listing.subcategoryId ?? listing.categoryId)}</span>
          <StatusBadge kind="itemCondition" value={listing.condition} dot={false} />
          {listing.status !== "PENDING" && <StatusBadge kind="listingStatus" value={listing.status} />}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <UserCell user={listing.owner} secondary={names.region(listing.regionId)} className="max-w-60" />
          <span className="text-xs text-muted-foreground" title={formatDate(listing.createdAt, locale)}>
            {t("moderation.card.created", { date: formatRelative(listing.createdAt, locale) })}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{listing.description}</p>
      </div>
    </div>
  );

  const signals = (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {item.openReports > 0 && (
        <Signal icon={<Flag />} tone="danger">
          {t("moderation.card.openReports", { count: item.openReports })}
        </Signal>
      )}
      {listing.reportsCount > 0 && <Signal icon={<Flag />}>{t("moderation.card.totalReports", { count: listing.reportsCount })}</Signal>}
      {listing.rejectionCount > 0 && (
        <Signal icon={<AlertTriangle />} tone={listing.rejectionCount >= 2 ? "warning" : "neutral"}>
          {t("moderation.card.rejections", { count: listing.rejectionCount })}
        </Signal>
      )}
      <ReasonPills reasons={item.reasons} />
    </div>
  );

  return (
    <CardShell actions={actions}>
      {duplicateOf ? (
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("moderation.card.candidate")}</p>
              {main}
            </div>
            <div className="flex items-center justify-center">
              <span className="flex size-8 items-center justify-center rounded-full border bg-background">
                <ArrowLeftRight className="size-4 rotate-90 lg:rotate-0" />
              </span>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("moderation.card.original")}</p>
              <div className="flex gap-3">
                <Link href={`/admin/listings/${duplicateOf.id}`} className="shrink-0">
                  <ItemImage src={duplicateOf.image} alt={duplicateOf.title} className="size-20 rounded-lg sm:size-24" />
                </Link>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Link href={`/admin/listings/${duplicateOf.id}`} className="line-clamp-2 font-medium hover:underline">
                    {duplicateOf.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-mono">{duplicateOf.code}</span>
                    <span>·</span>
                    <span className="truncate">{names.category(duplicateOf.categoryId)}</span>
                    <StatusBadge kind="itemCondition" value={duplicateOf.condition} dot={false} />
                    <StatusBadge kind="listingStatus" value={duplicateOf.status} />
                  </div>
                  <UserCell user={duplicateOf.owner} secondary={formatDate(duplicateOf.createdAt, locale)} className="max-w-60" />
                  <p className="line-clamp-2 text-sm text-muted-foreground">{duplicateOf.description}</p>
                </div>
              </div>
            </div>
          </div>
          {signals}
        </div>
      ) : (
        <>
          {main}
          {signals}
        </>
      )}
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// User card
// ---------------------------------------------------------------------------

export function UserQueueCard({ item, queue, openDialog }: { item: UserQueueItem; queue: ModerationQueue; openDialog: OpenUserDialog }) {
  const t = useT();
  const [locale] = useLocale();
  const names = useLookupNames();
  const { user } = item;
  const canAct = useCan("moderation.act");
  const canBlock = useCan(["moderation.act", "users.block"]);
  const canDismiss = useCan(["moderation.act", "reports.resolve"]);

  const actions = (
    <>
      {canAct && user.status !== "BLOCKED" && <ActionBtn icon={<MessageSquareWarning />} label={t("moderation.actions.warn")} onClick={() => openDialog("warn", user, queue)} />}
      {queue === "REPORTED_USERS" && canDismiss && item.openReports > 0 && (
        <ActionBtn icon={<ShieldCheck />} label={t("moderation.actions.dismissReports")} onClick={() => openDialog("dismissUserReports", user, queue)} />
      )}
      {canBlock && user.status === "ACTIVE" && <ActionBtn icon={<Timer />} label={t("moderation.actions.suspend")} variant="destructive" onClick={() => openDialog("suspend", user, queue)} />}
      {canBlock && user.status !== "BLOCKED" && <ActionBtn icon={<Ban />} label={t("moderation.actions.blockUser")} variant="destructive" onClick={() => openDialog("blockUser", user, queue)} />}
    </>
  );

  return (
    <CardShell actions={actions}>
      <div className="flex gap-3">
        <Link href={`/admin/users/${user.id}`} className="shrink-0">
          <UserAvatar name={user.fullName} src={user.avatar} className="size-12" />
        </Link>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/users/${user.id}`} className="font-medium hover:underline">
              {user.fullName}
            </Link>
            <StatusBadge kind="userStatus" value={user.status} />
            <StatusBadge kind="riskLevel" value={user.riskLevel} />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="tabular-nums">{user.phone}</span>
            <span>·</span>
            <span>{names.region(user.regionId)}</span>
            <span>·</span>
            <span>{t("moderation.card.memberSince", { date: formatDate(user.createdAt, locale) })}</span>
            <span>·</span>
            <span>{t("moderation.card.listings", { count: user.listingsCount })}</span>
            {user.suspendedUntil && user.status === "SUSPENDED" && (
              <>
                <span>·</span>
                <span>{t("moderation.card.suspendedUntil", { date: formatDate(user.suspendedUntil, locale) })}</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1">
            {item.openReports > 0 && (
              <Signal icon={<Flag />} tone="danger">
                {t("moderation.card.openReports", { count: item.openReports })}
              </Signal>
            )}
            {user.reportsCount > 0 && <Signal icon={<Flag />}>{t("moderation.card.totalReports", { count: user.reportsCount })}</Signal>}
            {item.rejectedListings > 0 && (
              <Signal icon={<AlertTriangle />} tone={item.rejectedListings >= 3 ? "warning" : "neutral"}>
                {t("moderation.card.rejectedListings", { count: item.rejectedListings })}
              </Signal>
            )}
            {item.newListings24h > 0 && <Signal icon={<AlertTriangle />}>{t("moderation.card.newListings24h", { count: item.newListings24h })}</Signal>}
          </div>
          {item.signals.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.signals.map((s) => (
                <Pill key={s} tone="warning" dot>
                  {t(`moderation.signals.${s}`)}
                </Pill>
              ))}
            </div>
          )}
          <ReasonPills reasons={item.reasons} />
          <Link href={`/admin/users/${user.id}`} className="inline-block text-xs text-primary hover:underline">
            {t("moderation.card.openUser")}
          </Link>
        </div>
      </div>
    </CardShell>
  );
}
