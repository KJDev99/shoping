"use client";

import { AlertTriangle, ArrowLeftRight, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Copy, Eye, Flag, Heart, Loader2, Pencil, Sparkles, Trash2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AdminNotes } from "@/components/admin/shared/admin-notes";
import { ModerationHistory } from "@/components/admin/shared/moderation-history";
import { ButtonLink } from "@/components/common/button-link";
import { CopyId, DateCell, ItemImage, Rating, UserCell } from "@/components/common/cells";
import { InfoList, Section } from "@/components/common/info-list";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { DetailSkeleton, EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { Pill, StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/tables/row-actions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListing, useListingOffers, useListingReports } from "@/hooks/use-listings";
import { useLookupNames } from "@/hooks/use-lookups";
import { useCan } from "@/hooks/use-session";
import { userKeys } from "@/hooks/use-users";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { usersService } from "@/services/users.service";
import type { BarterRequest, Listing, ListingAttributeValue, PaginatedResponse } from "@/types";
import { ExchangePreferencesCard } from "./exchange-preferences-card";
import { useListingActionDialogs } from "./listing-action-dialogs";
import { ListingGallery } from "./listing-gallery";
import { listingCapabilities, useListingActionItems } from "./listing-row-actions";

type Dialogs = ReturnType<typeof useListingActionDialogs>;

export function ListingDetailPage({ id }: { id: string }) {
  const t = useT();
  const [locale] = useLocale();
  const names = useLookupNames();
  const query = useListing(id);
  const dialogs = useListingActionDialogs();
  const canReadReports = useCan("reports.read");
  const canReadBarter = useCan("barter.read");

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} backHref="/admin/listings" />;
  const listing = query.data;
  const correction = listing.status === "REJECTED" && !listing.rejectionReason && !!listing.rejectionNote;

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/admin/listings"
        backLabel={t("listings.detail.back")}
        title={<span className="line-clamp-2">{listing.title}</span>}
        meta={
          <>
            <CopyId value={listing.code} />
            <StatusBadge kind="listingStatus" value={listing.status} />
            {listing.deletedAt && (
              <Pill tone="muted">
                <Trash2 className="size-3" aria-hidden />
                {t("listings.flags.deleted")}
              </Pill>
            )}
            <StatusBadge kind="itemCondition" value={listing.condition} dot={false} />
            <span className="text-xs text-muted-foreground">
              {t("common.fields.createdAt")}: <DateCell value={listing.createdAt} mode="datetime" />
            </span>
          </>
        }
        actions={<HeaderActions listing={listing} dialogs={dialogs} />}
      />

      {listing.deletedAt && (
        <Banner tone="muted" icon={<Trash2 />}>
          {t("listings.detail.deletedBanner", { date: formatDateTime(listing.deletedAt, locale) })}
        </Banner>
      )}
      {listing.status === "REJECTED" && (
        <Banner tone={correction ? "warning" : "danger"} icon={<XCircle />}>
          <p className="font-medium">{correction ? t("listings.detail.rejection.correctionTitle") : t("listings.detail.rejection.title")}</p>
          <InfoList
            className="mt-2"
            columns={2}
            items={[
              { label: t("listings.detail.rejection.reason"), value: listing.rejectionReason && t(`enums.rejectionReason.${listing.rejectionReason}`), hidden: !listing.rejectionReason },
              { label: t("listings.detail.rejection.count"), value: <span className="tabular-nums">{listing.rejectionCount}</span> },
              { label: t("listings.detail.rejection.note"), value: listing.rejectionNote, hidden: !listing.rejectionNote },
            ]}
          />
        </Banner>
      )}
      {listing.possibleDuplicateOf && (
        <Banner tone="warning" icon={<Copy />}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{t("listings.detail.duplicate.title")}</p>
              <p className="text-muted-foreground">{t("listings.detail.duplicate.description")}</p>
            </div>
            <ButtonLink href={`/admin/listings/${listing.possibleDuplicateOf}`} variant="outline" size="sm" className="shrink-0">
              {t("listings.detail.duplicate.open")}
              <ArrowRight />
            </ButtonLink>
          </div>
        </Banner>
      )}
      {listing.reportsCount > 0 && (
        <Banner tone="warning" icon={<AlertTriangle />}>
          {t("listings.detail.reportsHint", { count: listing.reportsCount })}
        </Banner>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("listings.detail.stats.views")} value={formatNumber(listing.views, locale)} icon={<Eye />} />
        <StatCard label={t("listings.detail.stats.favorites")} value={formatNumber(listing.favoritesCount, locale)} icon={<Heart />} />
        <StatCard label={t("listings.detail.stats.offers")} value={formatNumber(listing.offersCount, locale)} icon={<ArrowLeftRight />} />
        <StatCard
          label={t("listings.detail.stats.reports")}
          value={formatNumber(listing.reportsCount, locale)}
          icon={<Flag />}
          className={cn(listing.reportsCount > 0 && "border-destructive/40")}
        />
      </div>

      <Tabs defaultValue="overview" className="gap-4">
        <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            <TabsTrigger value="overview">{t("listings.detail.tabs.overview")}</TabsTrigger>
            {canReadBarter && <TabsTrigger value="offers">{t("listings.detail.tabs.offers")}</TabsTrigger>}
            {canReadReports && <TabsTrigger value="reports">{t("listings.detail.tabs.reports")}</TabsTrigger>}
            <TabsTrigger value="history">{t("listings.detail.tabs.history")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <Section title={t("listings.detail.gallery.label")}>
                <ListingGallery images={listing.images} video={listing.video} title={listing.title} />
              </Section>
              <Section title={t("listings.detail.description")}>
                <p className="text-sm leading-relaxed whitespace-pre-line">{listing.description}</p>
              </Section>
              <Section title={t("listings.detail.details")}>
                <div className="space-y-5">
                  <InfoList
                    columns={2}
                    items={[
                      { label: t("common.fields.category"), value: names.category(listing.categoryId) },
                      { label: t("common.fields.subcategory"), value: names.category(listing.subcategoryId) },
                      { label: t("common.fields.condition"), value: <StatusBadge kind="itemCondition" value={listing.condition} dot={false} /> },
                    ]}
                  />
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("listings.detail.attributes")}</h3>
                    <AttributesList listing={listing} />
                  </div>
                </div>
              </Section>
              <ExchangePreferencesCard preferences={listing.exchangePreferences} />
            </div>

            <div className="min-w-0 space-y-6">
              <OwnerCard listing={listing} />
              <Section title={t("listings.detail.location")}>
                <InfoList
                  items={[
                    { label: t("common.fields.region"), value: names.region(listing.regionId) },
                    { label: t("common.fields.district"), value: names.district(listing.districtId) },
                    { label: t("listings.detail.address"), value: listing.location, hidden: !listing.location },
                  ]}
                />
              </Section>
              <Section title={t("listings.detail.dates")}>
                <InfoList
                  items={[
                    { label: t("common.fields.createdAt"), value: formatDateTime(listing.createdAt, locale) },
                    { label: t("common.fields.updatedAt"), value: formatDateTime(listing.updatedAt, locale) },
                    { label: t("listings.detail.publishedAt"), value: formatDateTime(listing.publishedAt, locale), hidden: !listing.publishedAt },
                    { label: t("listings.detail.expiresAt"), value: formatDateTime(listing.expiresAt, locale), hidden: !listing.expiresAt },
                    { label: t("listings.detail.deletedAt"), value: formatDateTime(listing.deletedAt, locale), hidden: !listing.deletedAt },
                    { label: t("listings.detail.rejection.count"), value: <span className="tabular-nums">{listing.rejectionCount}</span>, hidden: !listing.rejectionCount },
                  ]}
                />
              </Section>
              <AdminNotes entityType="LISTING" entityId={listing.id} />
            </div>
          </div>
        </TabsContent>

        {canReadBarter && (
          <TabsContent value="offers">
            <OffersTab listing={listing} />
          </TabsContent>
        )}
        {canReadReports && (
          <TabsContent value="reports">
            <ReportsTab listingId={listing.id} />
          </TabsContent>
        )}
        <TabsContent value="history">
          <ModerationHistory targetType="LISTING" targetId={listing.id} />
        </TabsContent>
      </Tabs>
      {dialogs.dialogs}
    </div>
  );
}

function Banner({ tone, icon, children }: { tone: "warning" | "danger" | "muted"; icon: ReactNode; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
        tone === "warning" && "border-warning/40 bg-warning/10 [&>svg]:text-warning",
        tone === "danger" && "border-destructive/30 bg-destructive/5 [&>svg]:text-destructive",
        tone === "muted" && "bg-muted/50 [&>svg]:text-muted-foreground",
      )}
    >
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Primary moderation buttons on the page + the full status-aware menu. */
function HeaderActions({ listing, dialogs }: { listing: Listing; dialogs: Dialogs }) {
  const t = useT();
  const items = useListingActionItems(listing, dialogs, { includeView: false });
  const can = listingCapabilities(listing);
  const canApprove = useCan("listings.approve");
  const canReject = useCan("listings.reject");
  const canBlock = useCan("listings.block");
  const canUpdate = useCan("listings.update");
  const canDelete = useCan("listings.delete");
  const canMatches = useCan("matches.read");
  return (
    <>
      {canMatches && listing.status === "ACTIVE" && (
        <ButtonLink href={`/admin/matches?listingId=${listing.id}`} variant="outline">
          <Sparkles />
          {t("listings.actions.findMatches")}
        </ButtonLink>
      )}
      {canApprove && can.approve && (
        <Button onClick={() => dialogs.approveNow(listing)} disabled={dialogs.isApproving}>
          {dialogs.isApproving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
          {t("listings.actions.approve")}
        </Button>
      )}
      {canReject && can.reject && (
        <Button variant="outline" onClick={() => dialogs.open("reject", listing)}>
          <XCircle />
          {t("listings.actions.reject")}
        </Button>
      )}
      {canBlock && can.block && listing.status !== "PENDING" && (
        <Button variant="destructive" onClick={() => dialogs.open("block", listing)}>
          {t("listings.actions.block")}
        </Button>
      )}
      {canBlock && can.unblock && <Button onClick={() => dialogs.open("unblock", listing)}>{t("listings.actions.unblock")}</Button>}
      {canDelete && can.restore && <Button onClick={() => dialogs.open("restore", listing)}>{t("listings.actions.restore")}</Button>}
      {canUpdate && can.edit && (
        <Button variant="outline" onClick={() => dialogs.open("edit", listing)}>
          <Pencil />
          {t("common.actions.edit")}
        </Button>
      )}
      <RowActions
        actions={items}
        trigger={<span className="inline-flex h-8 items-center rounded-lg border px-2.5 text-sm font-medium hover:bg-muted">{t("common.actions.more")}</span>}
      />
    </>
  );
}

function formatAttr(value: ListingAttributeValue, resolve: (v: string) => string, yes: string, no: string, locale: Parameters<typeof formatNumber>[1]) {
  if (typeof value === "boolean") return value ? yes : no;
  if (typeof value === "number") return formatNumber(value, locale);
  if (Array.isArray(value)) return value.map(resolve).join(", ");
  return resolve(value);
}

function AttributesList({ listing }: { listing: Listing }) {
  const t = useT();
  const [locale] = useLocale();
  const names = useLookupNames();
  const entries = Object.entries(listing.attributes);
  if (!entries.length) return <p className="text-sm text-muted-foreground">{t("listings.detail.noAttributes")}</p>;
  const rows = entries
    .map(([attrId, value]) => {
      const def = names.attributes.get(attrId);
      const resolve = (v: string) => (def ? t.text(def.options.find((o) => o.value === String(v))?.label) || String(v) : String(v));
      const text = formatAttr(value, resolve, t("common.misc.yes"), t("common.misc.no"), locale);
      return { id: attrId, order: def?.sortOrder ?? 999, label: def ? t.text(def.name) : attrId, value: def?.unit && text ? `${text} ${def.unit}` : text };
    })
    .sort((a, b) => a.order - b.order);
  return <InfoList columns={2} items={rows.map((r) => ({ label: r.label, value: r.value || "—" }))} />;
}

function OwnerCard({ listing }: { listing: Listing }) {
  const t = useT();
  const names = useLookupNames();
  const canReadUsers = useCan("users.read");
  const { data: user } = useQuery({ queryKey: userKeys.detail(listing.userId), queryFn: () => usersService.get(listing.userId), enabled: canReadUsers });
  return (
    <Section
      title={t("listings.detail.owner")}
      action={
        <ButtonLink href={`/admin/users/${listing.userId}`} variant="ghost" size="sm">
          {t("listings.detail.ownerProfile")}
        </ButtonLink>
      }
    >
      <div className="space-y-3">
        <UserCell user={listing.owner} secondary={user?.username ? `@${user.username}` : listing.owner.phone} />
        {user && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge kind="userStatus" value={user.status} />
            {user.riskLevel !== "LOW" && <StatusBadge kind="riskLevel" value={user.riskLevel} />}
            <Rating value={user.rating} count={user.reviewsCount} />
          </div>
        )}
        <InfoList
          items={[
            { label: t("common.fields.phone"), value: <span className="tabular-nums">{listing.owner.phone || "—"}</span> },
            { label: t("common.fields.region"), value: names.region(user?.regionId ?? listing.regionId) },
            {
              label: t("users.detail.stats.listings"),
              value: user ? t("listings.detail.ownerStats", { listings: user.listingsCount, exchanges: user.completedExchanges }) : "—",
              hidden: !user,
            },
          ]}
        />
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Related lists (server-paginated)
// ---------------------------------------------------------------------------

function Pager({ page, data, onPage, isFetching }: { page: number; data: PaginatedResponse<unknown>; onPage: (p: number) => void; isFetching: boolean }) {
  const t = useT();
  const { totalPages, total } = data.meta;
  if (totalPages <= 1) return null;
  return (
    <div className={cn("flex items-center justify-between text-sm text-muted-foreground", isFetching && "opacity-70")}>
      <span>{t("common.table.totalRows", { total })}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t("common.table.previousPage")}>
          <ChevronLeft />
        </Button>
        <span className="tabular-nums">{t("common.table.pageOf", { page, total: totalPages })}</span>
        <Button variant="outline" size="icon-sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label={t("common.table.nextPage")}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

function OfferItems({ offer, side, listingId }: { offer: BarterRequest; side: "OFFERED" | "REQUESTED"; listingId: string }) {
  const t = useT();
  return (
    <div className="flex min-w-0 flex-1 flex-wrap gap-2">
      {offer.items
        .filter((i) => i.side === side)
        .map((i) => {
          const self = i.listingId === listingId;
          return (
            <span
              key={i.id}
              className={cn("inline-flex max-w-full items-center gap-2 rounded-lg border bg-background p-1 pr-2 text-xs", self && "border-primary/50 bg-primary/5")}
              title={self ? t("listings.detail.offer.thisListing") : undefined}
            >
              <ItemImage src={i.listing.image} alt={i.listing.title} className="size-8 shrink-0 rounded-md" />
              <span className="line-clamp-1 min-w-0">{i.listing.title}</span>
            </span>
          );
        })}
    </div>
  );
}

function OffersTab({ listing }: { listing: Listing }) {
  const t = useT();
  const [page, setPage] = useState(1);
  const query = useListingOffers(listing.id, { page, limit: 10 });
  if (query.isPending) return <ListSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data.data.length) return <EmptyState title={t("listings.detail.noOffers")} icon={<ArrowLeftRight />} />;
  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-xl border bg-card">
        {query.data.data.map((b) => {
          const offered = b.offeredListingIds.includes(listing.id);
          return (
            <li key={b.id}>
              <Link href={`/admin/barter-requests/${b.id}`} className="block space-y-3 p-3 hover:bg-muted/40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">{b.code}</span>
                  <Pill tone={offered ? "primary" : "info"}>{offered ? t("listings.detail.offer.roleOffered") : t("listings.detail.offer.roleRequested")}</Pill>
                  <StatusBadge kind="barterStatus" value={b.status} />
                  <DateCell value={b.createdAt} className="ml-auto text-xs text-muted-foreground" />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <UserCell user={b.sender} link={false} secondary={t("listings.detail.offer.offered")} className="min-w-0" />
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <UserCell user={b.receiver} link={false} secondary={t("listings.detail.offer.requested")} className="min-w-0" />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <OfferItems offer={b} side="OFFERED" listingId={listing.id} />
                  <ArrowLeftRight className="size-4 shrink-0 self-center text-muted-foreground" aria-label={t("common.misc.exchangeArrow")} />
                  <OfferItems offer={b} side="REQUESTED" listingId={listing.id} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <Pager page={page} data={query.data} onPage={setPage} isFetching={query.isFetching} />
    </div>
  );
}

function ReportsTab({ listingId }: { listingId: string }) {
  const t = useT();
  const [page, setPage] = useState(1);
  const query = useListingReports(listingId, { page, limit: 10 });
  if (query.isPending) return <ListSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data.data.length) return <EmptyState title={t("listings.detail.noReports")} icon={<Flag />} />;
  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-xl border bg-card">
        {query.data.data.map((r) => (
          <li key={r.id}>
            <Link href={`/admin/reports/${r.id}`} className="flex flex-col gap-2 p-3 hover:bg-muted/40 sm:flex-row sm:items-center">
              <span className="font-mono text-xs sm:w-24">{r.code}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge kind="reportReason" value={r.reason} dot={false} />
                  <span className="text-xs text-muted-foreground">{t("listings.detail.reporter", { name: r.reporter.fullName })}</span>
                </div>
                {r.description && <p className="mt-1 line-clamp-2 text-sm">{r.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge kind="reportStatus" value={r.status} />
                <DateCell value={r.createdAt} className="text-xs text-muted-foreground" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Pager page={page} data={query.data} onPage={setPage} isFetching={query.isFetching} />
    </div>
  );
}
