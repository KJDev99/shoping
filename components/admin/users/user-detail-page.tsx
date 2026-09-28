"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeftRight, ChevronLeft, ChevronRight, EyeOff, Flag, Handshake, Package, RotateCcw, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AdminNotes } from "@/components/admin/shared/admin-notes";
import { ModerationHistory } from "@/components/admin/shared/moderation-history";
import { DateCell, ListingCell, Rating, RatingStars, UserAvatar, UserCell } from "@/components/common/cells";
import { InfoList, Section } from "@/components/common/info-list";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { DetailSkeleton, EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { RowActions } from "@/components/tables/row-actions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLookupNames } from "@/hooks/use-lookups";
import { useCan } from "@/hooks/use-session";
import { useReviewActions, userKeys, useUser } from "@/hooks/use-users";
import { formatDate, formatDateTime } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { usersService } from "@/services/users.service";
import type { ListParams, PaginatedResponse, Review, User } from "@/types";
import { useUserActionDialogs } from "./user-action-dialogs";
import { useUserActionItems } from "./user-row-actions";

export function UserDetailPage({ id }: { id: string }) {
  const t = useT();
  const [locale] = useLocale();
  const names = useLookupNames();
  const query = useUser(id);
  const { open, dialogs } = useUserActionDialogs();

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} backHref="/admin/users" />;
  const user = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/admin/users"
        backLabel={t("users.detail.back")}
        title={
          <span className="flex items-center gap-3">
            <UserAvatar name={user.fullName} src={user.avatar} className="size-11" />
            <span className="min-w-0">
              <span className="block truncate">{user.fullName}</span>
              <span className="block text-sm font-normal text-muted-foreground">
                @{user.username} · {user.id}
              </span>
            </span>
          </span>
        }
        meta={
          <>
            <StatusBadge kind="userStatus" value={user.status} />
            {user.riskLevel !== "LOW" && <StatusBadge kind="riskLevel" value={user.riskLevel} />}
            <span className="text-xs text-muted-foreground">{t("users.detail.memberSince", { date: formatDate(user.createdAt, locale) })}</span>
          </>
        }
        actions={<HeaderActions user={user} open={open} />}
      />

      {user.riskLevel !== "LOW" && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>{t("users.detail.riskHint")}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t("users.detail.stats.listings")} value={user.listingsCount} icon={<Package />} />
        <StatCard label={t("users.detail.stats.exchanges")} value={user.completedExchanges} icon={<Handshake />} />
        <StatCard label={t("users.detail.stats.rating")} value={user.rating?.toFixed(1) ?? "—"} icon={<Star />} />
        <StatCard label={t("users.detail.stats.reviews")} value={user.reviewsCount} icon={<Star />} />
        <StatCard label={t("users.detail.stats.reportsAgainst")} value={user.reportsCount} icon={<Flag />} className={cn(user.reportsCount >= 3 && "border-destructive/40")} />
        <StatCard label={t("users.detail.stats.reportsSubmitted")} value={user.reportsSubmittedCount} icon={<Flag />} />
      </div>

      <Tabs defaultValue="overview" className="gap-4">
        <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            <TabsTrigger value="overview">{t("users.detail.tabs.overview")}</TabsTrigger>
            <TabsTrigger value="listings">{t("users.detail.tabs.listings")}</TabsTrigger>
            <TabsTrigger value="barter">{t("users.detail.tabs.barter")}</TabsTrigger>
            <TabsTrigger value="exchanges">{t("users.detail.tabs.exchanges")}</TabsTrigger>
            <TabsTrigger value="reviews">{t("users.detail.tabs.reviews")}</TabsTrigger>
            <TabsTrigger value="reports">{t("users.detail.tabs.reports")}</TabsTrigger>
            <TabsTrigger value="moderation">{t("users.detail.tabs.moderation")}</TabsTrigger>
            <TabsTrigger value="activity">{t("users.detail.tabs.activity")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Section title={t("users.detail.profile")}>
                <InfoList
                  columns={2}
                  items={[
                    { label: t("common.fields.fullName"), value: user.fullName },
                    { label: t("users.detail.username"), value: `@${user.username}` },
                    { label: t("common.fields.region"), value: names.region(user.regionId) },
                    { label: t("common.fields.district"), value: names.district(user.districtId) },
                    { label: t("users.detail.bio"), value: user.bio ?? "—" },
                    { label: t("users.detail.appLanguage"), value: t(`enums.locale.${user.language}`) },
                  ]}
                />
              </Section>
              <Section title={t("users.detail.contact")}>
                <InfoList
                  columns={2}
                  items={[
                    { label: t("common.fields.phone"), value: <span className="tabular-nums">{user.phone}</span> },
                    { label: t("users.detail.phoneVerified"), value: user.phoneVerified ? t("common.misc.yes") : t("common.misc.no") },
                    { label: t("common.fields.email"), value: user.email ?? "—" },
                    { label: t("users.detail.emailVerified"), value: user.emailVerified ? t("common.misc.yes") : t("common.misc.no") },
                  ]}
                />
              </Section>
              <Section title={t("users.detail.registration")}>
                <InfoList
                  columns={2}
                  items={[
                    { label: t("users.columns.registeredAt"), value: formatDateTime(user.createdAt, locale) },
                    { label: t("users.detail.registeredVia"), value: t(`enums.registeredVia.${user.registeredVia}`) },
                    { label: t("users.columns.lastActive"), value: <DateCell value={user.lastActiveAt} /> },
                    { label: t("common.fields.updatedAt"), value: formatDateTime(user.updatedAt, locale) },
                  ]}
                />
              </Section>
            </div>
            <div className="space-y-6">
              <Section title={t("users.detail.account")}>
                <InfoList
                  items={[
                    { label: t("common.fields.status"), value: <StatusBadge kind="userStatus" value={user.status} /> },
                    { label: t("users.detail.statusReason"), value: user.statusReason, hidden: !user.statusReason },
                    { label: t("users.detail.suspendedUntil"), value: formatDateTime(user.suspendedUntil, locale), hidden: !user.suspendedUntil },
                    { label: t("users.detail.deletedAt"), value: formatDateTime(user.deletedAt, locale), hidden: !user.deletedAt },
                    { label: t("users.columns.risk"), value: <StatusBadge kind="riskLevel" value={user.riskLevel} /> },
                    { label: t("users.columns.rating"), value: <Rating value={user.rating} count={user.reviewsCount} /> },
                  ]}
                />
              </Section>
              <AdminNotes entityType="USER" entityId={user.id} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="listings">
          <ListingsTab userId={user.id} />
        </TabsContent>
        <TabsContent value="barter">
          <BarterTab userId={user.id} />
        </TabsContent>
        <TabsContent value="exchanges">
          <ExchangesTab userId={user.id} />
        </TabsContent>
        <TabsContent value="reviews">
          <ReviewsTab userId={user.id} />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab userId={user.id} />
        </TabsContent>
        <TabsContent value="moderation">
          <div className="grid gap-6 lg:grid-cols-2">
            <ModerationHistory targetType="USER" targetId={user.id} />
            <AdminNotes entityType="USER" entityId={user.id} />
          </div>
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab userId={user.id} />
        </TabsContent>
      </Tabs>
      {dialogs}
    </div>
  );
}

function HeaderActions({ user, open }: { user: User; open: ReturnType<typeof useUserActionDialogs>["open"] }) {
  const t = useT();
  const items = useUserActionItems(user, open, { includeView: false });
  const canBlock = useCan("users.block");
  return (
    <>
      {canBlock && user.status === "ACTIVE" && (
        <Button variant="destructive" onClick={() => open("block", user)}>
          {t("users.actions.block")}
        </Button>
      )}
      <RowActions actions={items} trigger={<span className="inline-flex h-8 items-center rounded-lg border px-2.5 text-sm font-medium hover:bg-muted">{t("common.actions.more")}</span>} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Related lists (server-paginated)
// ---------------------------------------------------------------------------

function usePaged<T>(key: readonly unknown[], fetcher: (p: ListParams) => Promise<PaginatedResponse<T>>, limit = 10) {
  const [page, setPage] = useState(1);
  const params: ListParams = { page, limit };
  const query = useQuery({ queryKey: [...key, params], queryFn: () => fetcher(params), placeholderData: keepPreviousData });
  return { query, page, setPage };
}

function PagedList<T>({
  paged,
  empty,
  render,
}: {
  paged: ReturnType<typeof usePaged<T>>;
  empty: { title: string; icon?: ReactNode };
  render: (items: T[]) => ReactNode;
}) {
  const t = useT();
  const { query, page, setPage } = paged;
  if (query.isPending) return <ListSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data.data.length) return <EmptyState title={empty.title} icon={empty.icon} />;
  const { totalPages, total } = query.data.meta;
  return (
    <div className={cn("space-y-3 transition-opacity", query.isFetching && "opacity-70")}>
      {render(query.data.data)}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("common.table.totalRows", { total })}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label={t("common.table.previousPage")}>
              <ChevronLeft />
            </Button>
            <span className="tabular-nums">{t("common.table.pageOf", { page, total: totalPages })}</span>
            <Button variant="outline" size="icon-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label={t("common.table.nextPage")}>
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return <ul className="divide-y rounded-xl border bg-card">{children}</ul>;
}

function ListingsTab({ userId }: { userId: string }) {
  const t = useT();
  const names = useLookupNames();
  const paged = usePaged(userKeys.related(userId, "listings", null), (p) => usersService.listings(userId, p));
  return (
    <PagedList
      paged={paged}
      empty={{ title: t("users.detail.noListings"), icon: <Package /> }}
      render={(items) => (
        <Rows>
          {items.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 p-3">
              <ListingCell listing={{ id: l.id, title: l.title, image: l.images[0]?.url ?? null }} secondary={`${l.code} · ${names.category(l.subcategoryId ?? l.categoryId)}`} className="min-w-0 flex-1" />
              <StatusBadge kind="itemCondition" value={l.condition} dot={false} />
              <span className="text-xs text-muted-foreground">{t("common.misc.offers", { count: l.offersCount })}</span>
              <StatusBadge kind="listingStatus" value={l.status} />
              <DateCell value={l.createdAt} className="text-xs text-muted-foreground" />
            </li>
          ))}
        </Rows>
      )}
    />
  );
}

function BarterTab({ userId }: { userId: string }) {
  const t = useT();
  const paged = usePaged(userKeys.related(userId, "barter", null), (p) => usersService.barterRequests(userId, p));
  return (
    <PagedList
      paged={paged}
      empty={{ title: t("users.detail.noBarter"), icon: <ArrowLeftRight /> }}
      render={(items) => (
        <Rows>
          {items.map((b) => {
            const sent = b.senderId === userId;
            const offered = b.items.filter((i) => i.side === "OFFERED");
            const requested = b.items.filter((i) => i.side === "REQUESTED");
            return (
              <li key={b.id}>
                <Link href={`/admin/barter-requests/${b.id}`} className="flex flex-col gap-2 p-3 hover:bg-muted/40 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2 sm:w-40">
                    <span className="font-mono text-xs">{b.code}</span>
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", sent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                      {sent ? t("users.detail.sent") : t("users.detail.received")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="line-clamp-1">
                      {offered.map((i) => i.listing.title).join(" + ")} <span className="text-muted-foreground">↔</span> {requested.map((i) => i.listing.title).join(" + ")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {b.sender.fullName} → {b.receiver.fullName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge kind="barterStatus" value={b.status} />
                    <DateCell value={b.createdAt} className="text-xs text-muted-foreground" />
                  </div>
                </Link>
              </li>
            );
          })}
        </Rows>
      )}
    />
  );
}

function ExchangesTab({ userId }: { userId: string }) {
  const t = useT();
  const paged = usePaged(userKeys.related(userId, "exchanges", null), (p) => usersService.exchanges(userId, p));
  return (
    <PagedList
      paged={paged}
      empty={{ title: t("users.detail.noExchanges"), icon: <Handshake /> }}
      render={(items) => (
        <Rows>
          {items.map((e) => {
            const other = e.participants.find((p) => p.userId !== userId) ?? e.participants[1];
            const mine = e.participants.find((p) => p.userId === userId) ?? e.participants[0];
            return (
              <li key={e.id}>
                <Link href={`/admin/exchanges/${e.id}`} className="flex flex-col gap-2 p-3 hover:bg-muted/40 sm:flex-row sm:items-center">
                  <span className="font-mono text-xs sm:w-24">{e.code}</span>
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="line-clamp-1">
                      {mine.items.map((i) => i.title).join(" + ")} <span className="text-muted-foreground">↔</span> {other.items.map((i) => i.title).join(" + ")}
                    </span>
                    <span className="text-xs text-muted-foreground">↔ {other.user.fullName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge kind="exchangeStatus" value={e.status} />
                    <DateCell value={e.completedAt ?? e.createdAt} className="text-xs text-muted-foreground" />
                  </div>
                </Link>
              </li>
            );
          })}
        </Rows>
      )}
    />
  );
}

function ReviewsTab({ userId }: { userId: string }) {
  const t = useT();
  const [direction, setDirection] = useState<"received" | "written">("received");
  const paged = usePaged(userKeys.related(userId, `reviews-${direction}`, null), (p) => usersService.reviews(userId, direction, p));
  return (
    <div className="space-y-3">
      <Tabs value={direction} onValueChange={(v) => setDirection(v as "received" | "written")}>
        <TabsList>
          <TabsTrigger value="received">{t("users.detail.reviewsReceived")}</TabsTrigger>
          <TabsTrigger value="written">{t("users.detail.reviewsWritten")}</TabsTrigger>
        </TabsList>
      </Tabs>
      <PagedList
        paged={paged}
        empty={{ title: t("users.detail.noReviews"), icon: <Star /> }}
        render={(items) => (
          <Rows>
            {items.map((r) => (
              <ReviewRow key={r.id} review={r} showAuthor={direction === "received"} />
            ))}
          </Rows>
        )}
      />
    </div>
  );
}

/** Review with hide / delete / restore moderation. Exported for reuse on exchange pages. */
export function ReviewRow({ review, showAuthor = true }: { review: Review; showAuthor?: boolean }) {
  const t = useT();
  const canModerate = useCan("reviews.moderate");
  const actions = useReviewActions();
  const [dialog, setDialog] = useState<"hide" | "delete" | "restore" | null>(null);
  const person = showAuthor ? review.author : review.targetUser;
  return (
    <li className={cn("flex flex-col gap-2 p-3 sm:flex-row sm:items-start", review.status !== "VISIBLE" && "bg-muted/30")}>
      <UserCell user={person} secondary={<DateCell value={review.createdAt} />} className="sm:w-56" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <RatingStars value={review.rating} />
          {review.status !== "VISIBLE" && <StatusBadge kind="reviewStatus" value={review.status} />}
          <Link href={`/admin/exchanges/${review.exchangeId}`} className="text-xs text-muted-foreground hover:underline">
            {t("users.detail.review.forExchange", { code: review.exchangeCode })}
          </Link>
        </div>
        {review.comment && <p className={cn("text-sm", review.status !== "VISIBLE" && "text-muted-foreground line-through decoration-muted-foreground/40")}>{review.comment}</p>}
      </div>
      {canModerate && (
        <RowActions
          actions={[
            { label: t("users.detail.review.hide"), icon: <EyeOff />, onSelect: () => setDialog("hide"), hidden: review.status !== "VISIBLE" },
            { label: t("users.detail.review.restore"), icon: <RotateCcw />, onSelect: () => setDialog("restore"), hidden: review.status === "VISIBLE" },
            { label: t("users.detail.review.delete"), icon: <Trash2 />, onSelect: () => setDialog("delete"), hidden: review.status === "DELETED", destructive: true },
          ]}
        />
      )}
      <ConfirmDialog
        open={dialog === "hide"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("users.detail.review.hideTitle")}
        description={t("users.detail.review.hideDescription")}
        confirmLabel={t("users.detail.review.hide")}
        reason={{ required: true }}
        onConfirm={({ reason }) => actions.hide.mutateAsync({ id: review.id, reason })}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("users.detail.review.deleteTitle")}
        description={t("users.detail.review.deleteDescription")}
        confirmLabel={t("users.detail.review.delete")}
        variant="destructive"
        reason={{ required: true }}
        onConfirm={({ reason }) => actions.remove.mutateAsync({ id: review.id, reason })}
      />
      <ConfirmDialog
        open={dialog === "restore"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("users.detail.review.restoreTitle")}
        confirmLabel={t("users.detail.review.restore")}
        onConfirm={() => actions.restore.mutateAsync({ id: review.id })}
      />
    </li>
  );
}

function ReportsTab({ userId }: { userId: string }) {
  const t = useT();
  const [direction, setDirection] = useState<"against" | "submitted">("against");
  const paged = usePaged(userKeys.related(userId, `reports-${direction}`, null), (p) => usersService.reports(userId, direction, p));
  return (
    <div className="space-y-3">
      <Tabs value={direction} onValueChange={(v) => setDirection(v as "against" | "submitted")}>
        <TabsList>
          <TabsTrigger value="against">{t("users.detail.reportsAgainst")}</TabsTrigger>
          <TabsTrigger value="submitted">{t("users.detail.reportsSubmitted")}</TabsTrigger>
        </TabsList>
      </Tabs>
      <PagedList
        paged={paged}
        empty={{ title: t("users.detail.noReports"), icon: <Flag /> }}
        render={(items) => (
          <Rows>
            {items.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/reports/${r.id}`} className="flex flex-col gap-2 p-3 hover:bg-muted/40 sm:flex-row sm:items-center">
                  <span className="font-mono text-xs sm:w-24">{r.code}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge kind="reportTarget" value={r.targetType} dot={false} />
                      <StatusBadge kind="reportReason" value={r.reason} dot={false} />
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm">{r.target.label}</p>
                    {r.description && <p className="line-clamp-1 text-xs text-muted-foreground">{r.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge kind="reportStatus" value={r.status} />
                    <DateCell value={r.createdAt} className="text-xs text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </Rows>
        )}
      />
    </div>
  );
}

function ActivityTab({ userId }: { userId: string }) {
  const t = useT();
  const [locale] = useLocale();
  const paged = usePaged(userKeys.related(userId, "activity", null), (p) => usersService.activity(userId, p), 15);
  return (
    <PagedList
      paged={paged}
      empty={{ title: t("users.detail.noActivity") }}
      render={(items) => (
        <Section title={t("users.detail.tabs.activity")}>
          <ol className="relative space-y-4 border-l pl-5">
            {items.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-background bg-muted-foreground/60" />
                <p className="text-sm">
                  <span className="font-medium">{t(`enums.userActivity.${a.type}`)}</span>
                  {a.description && <span className="text-muted-foreground"> — {a.description}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(a.createdAt, locale)}
                  {a.ipAddress && <span className="font-mono"> · {a.ipAddress}</span>}
                </p>
              </li>
            ))}
          </ol>
        </Section>
      )}
    />
  );
}
