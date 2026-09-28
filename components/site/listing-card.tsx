"use client";

import { ArrowLeftRight, Images, MapPin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ItemImage } from "@/components/common/cells";
import { StatusBadge } from "@/components/common/status-badge";
import { useLookupNames } from "@/hooks/use-lookups";
import { formatRelative } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import type { PublicListingCard } from "@/types";

/** "Wants" summary — the key barter information on every card. */
export function useWantsText() {
  const t = useT();
  const { category } = useLookupNames();
  return (w: PublicListingCard["wants"]) => {
    if (w.openToOffers) return t("site.card.openToOffers");
    const parts = [...w.keywords, ...w.subcategories.map(category), ...(w.subcategories.length ? [] : w.categories.map(category))].filter(
      (p) => p && p !== "—",
    );
    return parts.length ? parts.slice(0, 4).join(", ") : (w.note ?? "—");
  };
}

export function ListingCard({ listing, footer }: { listing: PublicListingCard; footer?: ReactNode }) {
  const t = useT();
  const [locale] = useLocale();
  const { region } = useLookupNames();
  const wants = useWantsText();
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <Link href={`/listings/${listing.id}`} className="flex flex-1 flex-col focus-visible:outline-none">
        <div className="relative aspect-[4/3] overflow-hidden">
          <ItemImage src={listing.image} alt={listing.title} className="size-full transition-transform duration-300 group-hover:scale-[1.02]" />
          {listing.imagesCount > 1 && (
            <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-xs text-white">
              <Images className="size-3" /> {listing.imagesCount}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 font-medium group-hover:underline">{listing.title}</h3>
            <StatusBadge kind="itemCondition" value={listing.condition} dot={false} className="shrink-0" />
          </div>
          <p className="flex items-start gap-1.5 rounded-lg bg-primary/5 px-2 py-1.5 text-sm">
            <ArrowLeftRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span className="line-clamp-2">
              <span className="text-muted-foreground">{t("site.card.wants")} </span>
              {wants(listing.wants)}
            </span>
          </p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{region(listing.regionId)}</span>
            </span>
            <span className="shrink-0">{formatRelative(listing.publishedAt ?? listing.createdAt, locale)}</span>
          </div>
        </div>
      </Link>
      {footer}
    </div>
  );
}

export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border bg-card">
          <div className="aspect-[4/3] animate-pulse bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-8 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
