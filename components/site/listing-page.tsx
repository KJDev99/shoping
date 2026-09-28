"use client";

import { AlertTriangle, ArrowLeft, ArrowLeftRight, Clock, Eye, MapPin, ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { ListingGallery } from "@/components/admin/listings/listing-gallery";
import { Rating, UserAvatar } from "@/components/common/cells";
import { InfoList } from "@/components/common/info-list";
import { DetailSkeleton, ErrorState } from "@/components/common/states";
import { Pill, StatusBadge } from "@/components/common/status-badge";
import { useLookupNames } from "@/hooks/use-lookups";
import { usePublicListing, useSimilarListings } from "@/hooks/use-site";
import { formatDate, formatNumber } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import type { ExchangePreference, ListingAttributeValue, PublicListing } from "@/types";
import { ListingCard } from "./listing-card";

export function ListingPage({ id }: { id: string }) {
  const t = useT();
  const [locale] = useLocale();
  const names = useLookupNames();
  const query = usePublicListing(id);

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} backHref="/" />;
  const { listing: l, status, isOwner } = query.data;
  const category = [names.category(l.categoryId), l.subcategoryId ? names.category(l.subcategoryId) : null].filter(Boolean).join(" › ");

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("site.detail.back")}
      </Link>

      {isOwner && status === "PENDING" && (
        <Banner tone="warning" icon={<Clock className="size-4" />}>
          {t("site.detail.pendingBanner")}
        </Banner>
      )}
      {isOwner && status === "REJECTED" && (
        <Banner tone="danger" icon={<XCircle className="size-4" />}>
          {t("site.detail.rejectedBanner")}
        </Banner>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-6">
          <div className="rounded-xl border bg-card p-3">
            <ListingGallery images={l.images} video={null} title={l.title} />
          </div>
          <section className="space-y-2 rounded-xl border bg-card p-4">
            <h2 className="font-semibold">{t("site.detail.description")}</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{l.description}</p>
          </section>
          <Attributes listing={l} />
        </div>

        <aside className="space-y-4">
          <section className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge kind="itemCondition" value={l.condition} dot={false} />
              {isOwner && <StatusBadge kind="listingStatus" value={status} />}
              <span className="font-mono text-xs text-muted-foreground">{l.code}</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{l.title}</h1>
            <p className="text-sm text-muted-foreground">{category}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {[names.region(l.regionId), l.districtId ? names.district(l.districtId) : null].filter(Boolean).join(", ")}
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3.5" />
                {t("site.detail.views", { count: formatNumber(l.views, locale) })}
              </span>
              <span>{t("site.detail.posted", { date: formatDate(l.publishedAt ?? l.createdAt, locale) })}</span>
            </div>
            {l.location && (
              <p className="text-sm">
                <span className="text-muted-foreground">{t("site.detail.location")}: </span>
                {l.location}
              </p>
            )}
          </section>

          <WantsCard preferences={l.exchangePreferences} />

          <section className="space-y-3 rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">{t("site.detail.owner")}</h2>
            <div className="flex items-center gap-3">
              <UserAvatar name={l.owner.fullName} src={l.owner.avatar} className="size-11" />
              <div className="min-w-0">
                <p className="truncate font-medium">{l.owner.fullName}</p>
                <p className="text-xs text-muted-foreground">{t("site.detail.memberSince", { date: formatDate(l.owner.memberSince, locale) })}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {l.owner.rating !== null ? <Rating value={l.owner.rating} count={l.owner.reviewsCount} /> : <span className="text-muted-foreground">{t("site.detail.noRating")}</span>}
              <span className="text-muted-foreground">{t("site.detail.exchanges", { count: l.owner.completedExchanges })}</span>
            </div>
            {isOwner && <p className="text-xs text-muted-foreground">{t("site.detail.ownerHint")}</p>}
          </section>

          <p className="flex items-start gap-2 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
            {t("site.detail.safety")}
          </p>
        </aside>
      </div>

      {status === "ACTIVE" && <Similar id={l.id} />}
    </div>
  );
}

function Banner({ tone, icon, children }: { tone: "warning" | "danger"; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === "warning" ? "border-warning/40 bg-warning/10" : "border-destructive/30 bg-destructive/10 text-destructive";
  return (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${cls}`} role="status">
      <span className="mt-0.5">{icon}</span>
      <p>{children}</p>
    </div>
  );
}

function WantsCard({ preferences: p }: { preferences: ExchangePreference }) {
  const t = useT();
  const names = useLookupNames();
  return (
    <section className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <ArrowLeftRight className="size-4 text-primary" /> {t("site.detail.wantsTitle")}
      </h2>
      {p.openToOffers && <p className="text-sm">{t("site.detail.openToOffersText")}</p>}
      {(p.keywords.length > 0 || p.subcategories.length > 0 || p.categories.length > 0) && (
        <div className="space-y-2">
          {p.keywords.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("site.detail.keywords")}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.keywords.map((k) => (
                  <Pill key={k} tone="primary">
                    {k}
                  </Pill>
                ))}
              </div>
            </div>
          )}
          {(p.subcategories.length > 0 || p.categories.length > 0) && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("site.detail.wantedCategories")}</p>
              <div className="flex flex-wrap gap-1.5">
                {(p.subcategories.length ? p.subcategories : p.categories).map((id) => (
                  <Pill key={id}>{names.category(id)}</Pill>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {p.note && (
        <p className="text-sm">
          <span className="text-muted-foreground">{t("site.detail.note")}: </span>
          {p.note}
        </p>
      )}
      {p.conditions.length > 0 && (
        <p className="text-sm">
          <span className="text-muted-foreground">{t("site.detail.conditions")}: </span>
          {p.conditions.map((c) => t(`enums.itemCondition.${c}`)).join(", ")}
        </p>
      )}
      {p.regionIds.length > 0 && (
        <p className="text-sm">
          <span className="text-muted-foreground">{t("site.detail.regions")}: </span>
          {p.regionIds.map(names.region).join(", ")}
        </p>
      )}
      {p.cashDifference && (
        <p className="flex items-start gap-1.5 rounded-lg border border-dashed p-2 text-xs">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <span>
            <span className="text-muted-foreground">{t("site.detail.cashNote")}: </span>
            {p.cashDifference.note}
          </span>
        </p>
      )}
    </section>
  );
}

function Attributes({ listing }: { listing: PublicListing }) {
  const t = useT();
  const [locale] = useLocale();
  const { attributes } = useLookupNames();
  const items = Object.entries(listing.attributes)
    .map(([id, value]) => ({ def: attributes.get(id), value }))
    .filter((x): x is { def: NonNullable<typeof x.def>; value: ListingAttributeValue } => !!x.def)
    .sort((a, b) => a.def.sortOrder - b.def.sortOrder);
  if (!items.length) return null;
  const show = (def: (typeof items)[number]["def"], v: ListingAttributeValue) => {
    const opt = (val: string) => t.text(def.options.find((o) => o.value === val)?.label) || val;
    if (typeof v === "boolean") return v ? t("common.misc.yes") : t("common.misc.no");
    if (typeof v === "number") return `${formatNumber(v, locale)}${def.unit ? ` ${def.unit}` : ""}`;
    if (Array.isArray(v)) return v.map(opt).join(", ");
    return def.type === "SELECT" ? opt(v) : v;
  };
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">{t("site.detail.attributes")}</h2>
      <InfoList columns={2} items={items.map(({ def, value }) => ({ label: t.text(def.name), value: show(def, value) }))} />
    </section>
  );
}

function Similar({ id }: { id: string }) {
  const t = useT();
  const { data } = useSimilarListings(id);
  if (!data?.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("site.detail.similar")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {data.slice(0, 4).map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </section>
  );
}
