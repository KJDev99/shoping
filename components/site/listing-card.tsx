"use client";

import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ItemImage } from "@/components/common/cells";
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
    <div className="group flex flex-col overflow-hidden rounded-2xl surface transition-all hover:-translate-y-0.5 hover:shadow-xl">
      <Link href={`/listings/${listing.id}`} className="flex flex-1 flex-col focus-visible:outline-none">
        <div className="aspect-[4/3] overflow-hidden">
          <ItemImage src={listing.image} alt={listing.title} className="size-full transition-transform duration-300 group-hover:scale-[1.03]" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
          <h3 className="line-clamp-2 leading-snug font-semibold">{listing.title}</h3>
          <p className="line-clamp-2 text-sm">
            <ArrowLeftRight className="mr-1 inline size-3.5 align-[-2px] text-primary" aria-hidden />
            <span className="text-muted-foreground">{t("site.card.wants")} </span>
            <span className="font-medium text-primary">{wants(listing.wants)}</span>
          </p>
          <p className="mt-auto truncate pt-1 text-xs text-muted-foreground">
            {region(listing.regionId)} · {formatRelative(listing.publishedAt ?? listing.createdAt, locale)}
          </p>
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
        <div key={i} className="overflow-hidden rounded-2xl surface">
          <div className="aspect-[4/3] animate-pulse bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
