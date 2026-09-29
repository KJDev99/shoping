"use client";

import { Eye, PlayCircle } from "lucide-react";
import { useRef, useState } from "react";
import { formatNumber } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { siteService } from "@/services/site.service";
import type { ListingVideo as Video } from "@/types";

function duration(sec: number) {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Listing video with a play counter (the first play in a visit is reported to the API). */
export function ListingVideo({ listingId, video }: { listingId: string; video: Video }) {
  const t = useT();
  const [locale] = useLocale();
  const [views, setViews] = useState(video.views);
  const counted = useRef(false);

  const onPlay = () => {
    if (counted.current) return;
    counted.current = true;
    siteService
      .videoView(listingId)
      .then((r) => setViews(r.views))
      .catch(() => undefined);
  };

  return (
    <section className="surface space-y-3 rounded-3xl p-3">
      <div className="overflow-hidden rounded-2xl bg-black">
        <video src={video.url} controls playsInline preload="metadata" onPlay={onPlay} className="aspect-video w-full" />
      </div>
      <div className="flex items-center justify-between gap-3 px-2 pb-1 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <PlayCircle className="size-4 text-violet-600" /> {t("site.detail.video")}
          {video.durationSec > 0 && <span className="text-muted-foreground">· {duration(video.durationSec)}</span>}
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Eye className="size-4" /> {t("site.detail.videoViews", { count: formatNumber(views, locale) })}
        </span>
      </div>
    </section>
  );
}
