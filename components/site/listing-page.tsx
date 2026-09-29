"use client";

import { ArrowLeft, ArrowLeftRight, Clock, MapPin, ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { ListingGallery } from "@/components/admin/listings/listing-gallery";
import { Rating, UserAvatar } from "@/components/common/cells";
import { DetailSkeleton, ErrorState } from "@/components/common/states";
import { useLookupNames } from "@/hooks/use-lookups";
import { usePublicListing, useSimilarListings } from "@/hooks/use-site";
import { formatDate, formatNumber } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import type { ExchangePreference, ListingAttributeValue, PublicListing } from "@/types";
import { ListingCard } from "./listing-card";
import { ListingVideo } from "./listing-video";
import { OfferAction } from "./offer-action";

export function ListingPage({ id }: { id: string }) {
  const t = useT();
  const [locale] = useLocale();
  const names = useLookupNames();
  const query = usePublicListing(id);

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} backHref="/" />;
  const { listing: l, status, isOwner, myOffer } = query.data;
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

      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-6">
          <div className="rounded-3xl surface p-3">
            <ListingGallery images={l.images} video={null} title={l.title} />
          </div>
          {l.video && <ListingVideo listingId={l.id} video={l.video} />}
        </div>

        {/* On phones the title, "wants" and the offer button come right after the photos. */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <section className="space-y-4 rounded-3xl surface p-5">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-balance">{l.title}</h1>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                {[names.region(l.regionId), l.districtId ? names.district(l.districtId) : null].filter(Boolean).join(", ")} ·{" "}
                {formatDate(l.publishedAt ?? l.createdAt, locale)}
              </p>
            </div>
            <WantsCard preferences={l.exchangePreferences} />
            {!isOwner && status === "ACTIVE" && <OfferAction listingId={l.id} title={l.title} myOffer={myOffer} />}
            <div className="flex items-center gap-3 border-t pt-4">
              <UserAvatar name={l.owner.fullName} src={l.owner.avatar} className="size-11" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.owner.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {l.owner.rating !== null ? <Rating value={l.owner.rating} count={l.owner.reviewsCount} /> : t("site.detail.noRating")}
                </p>
              </div>
            </div>
            {isOwner && <p className="text-xs text-muted-foreground">{t("site.detail.ownerHint")}</p>}
          </section>

          <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
            {t("site.detail.safety")}
          </p>
        </aside>

        <div className="min-w-0 lg:col-start-1">
          <About listing={l} category={category} />
        </div>
      </div>

      {status === "ACTIVE" && <Similar id={l.id} />}
    </div>
  );
}

function Banner({ tone, icon, children }: { tone: "warning" | "danger"; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === "warning" ? "bg-warning/15" : "bg-destructive/10 text-destructive";
  return (
    <div className={`flex items-start gap-2 rounded-2xl p-4 text-sm ${cls}`} role="status">
      <span className="mt-0.5">{icon}</span>
      <p>{children}</p>
    </div>
  );
}

function WantsCard({ preferences: p }: { preferences: ExchangePreference }) {
  const t = useT();
  const names = useLookupNames();
  const wanted = [...p.keywords, ...(p.subcategories.length ? p.subcategories : p.categories).map(names.category)];
  return (
    <div className="space-y-3 rounded-2xl bg-linear-to-br from-primary/10 to-violet-500/10 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
        <ArrowLeftRight className="size-4" /> {t("site.detail.wantsTitle")}
      </h2>
      {wanted.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {wanted.map((w) => (
            <span key={w} className="rounded-full bg-white px-3 py-1 text-sm font-medium text-primary shadow-sm">
              #{w}
            </span>
          ))}
        </div>
      )}
      {p.openToOffers && <p className="text-sm">{t("site.detail.openToOffersText")}</p>}
      {p.note && <p className="text-sm text-muted-foreground">“{p.note}”</p>}
      {p.cashDifference && (
        <p className="text-xs text-muted-foreground">
          {t("site.detail.cashNote")}: {p.cashDifference.note}
        </p>
      )}
    </div>
  );
}

function About({ listing, category }: { listing: PublicListing; category: string }) {
  const t = useT();
  const [locale] = useLocale();
  const { attributes } = useLookupNames();
  const items = Object.entries(listing.attributes)
    .map(([id, value]) => ({ def: attributes.get(id), value }))
    .filter((x): x is { def: NonNullable<typeof x.def>; value: ListingAttributeValue } => !!x.def)
    .sort((a, b) => a.def.sortOrder - b.def.sortOrder);
  const show = (def: (typeof items)[number]["def"], v: ListingAttributeValue) => {
    const opt = (val: string) => t.text(def.options.find((o) => o.value === val)?.label) || val;
    if (typeof v === "boolean") return v ? t("common.misc.yes") : t("common.misc.no");
    if (typeof v === "number") return `${formatNumber(v, locale)}${def.unit ? ` ${def.unit}` : ""}`;
    if (Array.isArray(v)) return v.map(opt).join(", ");
    return def.type === "SELECT" ? opt(v) : v;
  };
  const rows = [
    { label: t("site.post.condition"), value: t(`enums.itemCondition.${listing.condition}`) },
    { label: t("site.post.category"), value: category },
    ...items.map(({ def, value }) => ({ label: t.text(def.name), value: show(def, value) })),
    ...(listing.location ? [{ label: t("site.detail.location"), value: listing.location }] : []),
  ];
  return (
    <section className="space-y-5 rounded-3xl surface p-5 sm:p-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{t("site.detail.description")}</h2>
        <p className="leading-relaxed whitespace-pre-wrap">{listing.description}</p>
      </div>
      <dl className="grid gap-x-8 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4 border-b py-2.5 text-sm">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="text-right font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Similar({ id }: { id: string }) {
  const t = useT();
  const { data } = useSimilarListings(id);
  if (!data?.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{t("site.detail.similar")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {data.slice(0, 4).map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </section>
  );
}
