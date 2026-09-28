"use client";

import { ChevronLeft, ChevronRight, ImageOff, PlayCircle } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { ItemImage } from "@/components/common/cells";
import { Pill } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { ListingImage, ListingVideo } from "@/types";

/**
 * Main image + thumbnail strip. Keyboard: ←/→ (and Home/End) on the main image
 * or a thumbnail move between images; thumbnails are regular buttons.
 */
export function ListingGallery({ images, video, title }: { images: ListingImage[]; video: ListingVideo | null; title: string }) {
  const t = useT();
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const [index, setIndex] = useState(0);
  const total = sorted.length;
  const current = sorted[Math.min(index, total - 1)];
  const go = (i: number) => total && setIndex((i + total) % total);

  const onKeyDown = (e: KeyboardEvent) => {
    const map: Record<string, () => void> = {
      ArrowLeft: () => go(index - 1),
      ArrowRight: () => go(index + 1),
      Home: () => go(0),
      End: () => go(total - 1),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  const videoBadge = video && (
    <a href={video.url} target="_blank" rel="noreferrer" aria-label={t("listings.detail.gallery.openVideo")} className="inline-flex">
      <Pill tone="primary">
        <PlayCircle className="size-3.5" aria-hidden />
        {t("listings.detail.gallery.video", { duration: video.durationSec, size: video.sizeMb })}
      </Pill>
    </a>
  );

  if (!total) {
    return (
      <div className="space-y-2">
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border bg-muted text-sm text-muted-foreground">
          <ImageOff className="size-8" aria-hidden />
          {t("listings.detail.gallery.noImages")}
        </div>
        {videoBadge}
      </div>
    );
  }

  return (
    <div className="space-y-3" role="region" aria-roledescription="carousel" aria-label={t("listings.detail.gallery.label")}>
      <div
        className="group relative overflow-hidden rounded-xl border bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label={t("listings.detail.gallery.imageOf", { index: index + 1, total })}
      >
        <ItemImage key={current.id} src={current.url} alt={`${title} — ${index + 1}/${total}`} className="aspect-[4/3] w-full object-contain" />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          {current.isCover && <Pill tone="neutral">{t("listings.detail.gallery.cover")}</Pill>}
        </div>
        <span className="absolute right-2 bottom-2 rounded-md bg-background/85 px-1.5 py-0.5 text-xs font-medium tabular-nums">
          {index + 1} / {total}
        </span>
        {total > 1 && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className="absolute top-1/2 left-2 -translate-y-1/2 opacity-90 shadow-sm"
              onClick={() => go(index - 1)}
              aria-label={t("listings.detail.gallery.previous")}
              tabIndex={-1}
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className="absolute top-1/2 right-2 -translate-y-1/2 opacity-90 shadow-sm"
              onClick={() => go(index + 1)}
              aria-label={t("listings.detail.gallery.next")}
              tabIndex={-1}
            >
              <ChevronRight />
            </Button>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" onKeyDown={onKeyDown}>
          {sorted.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={t("listings.detail.gallery.showImage", { index: i + 1 })}
              aria-current={i === index}
              className={cn(
                "shrink-0 overflow-hidden rounded-lg border-2 transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                i === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <ItemImage src={img.url} alt="" className="size-16" />
            </button>
          ))}
        </div>
      )}
      {videoBadge}
    </div>
  );
}
