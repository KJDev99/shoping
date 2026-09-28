"use client";

/* eslint-disable @next/next/no-img-element -- listing media comes from arbitrary upload/CDN URLs */
import { Check, Copy, ImageOff, Star } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate, formatDateTime, formatNumber, formatRelative, initials } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { ListingRef, UserRef } from "@/types";

export function UserAvatar({ name, src, className }: { name: string; src: string | null | undefined; className?: string }) {
  return (
    <Avatar className={className}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

/** Avatar + name (+ secondary line), linking to the user detail page. */
export function UserCell({ user, secondary, link = true, className }: { user: Pick<UserRef, "id" | "fullName" | "avatar"> & { phone?: string }; secondary?: ReactNode; link?: boolean; className?: string }) {
  const content = (
    <>
      <UserAvatar name={user.fullName} src={user.avatar} className="size-8" />
      <span className="min-w-0">
        <span className="block truncate font-medium group-hover/cell:underline">{user.fullName}</span>
        {(secondary ?? user.phone) && <span className="block truncate text-xs text-muted-foreground">{secondary ?? user.phone}</span>}
      </span>
    </>
  );
  const cls = cn("group/cell flex min-w-0 items-center gap-2.5", className);
  return link ? (
    <Link href={`/admin/users/${user.id}`} className={cls} onClick={(e) => e.stopPropagation()}>
      {content}
    </Link>
  ) : (
    <div className={cls}>{content}</div>
  );
}

export function ItemImage({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)} aria-label={alt}>
        <ImageOff className="size-1/3 max-h-6 max-w-6" />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn("bg-muted object-cover", className)} />;
}

/** Thumbnail + title (+ code), linking to the listing detail page. */
export function ListingCell({ listing, secondary, link = true, className }: { listing: Pick<ListingRef, "id" | "title" | "image">; secondary?: ReactNode; link?: boolean; className?: string }) {
  const content = (
    <>
      <ItemImage src={listing.image} alt={listing.title} className="size-10 shrink-0 rounded-md" />
      <span className="min-w-0">
        <span className="line-clamp-1 font-medium group-hover/cell:underline">{listing.title}</span>
        {secondary && <span className="block truncate text-xs text-muted-foreground">{secondary}</span>}
      </span>
    </>
  );
  const cls = cn("group/cell flex min-w-0 items-center gap-2.5", className);
  return link ? (
    <Link href={`/admin/listings/${listing.id}`} className={cls} onClick={(e) => e.stopPropagation()}>
      {content}
    </Link>
  ) : (
    <div className={cls}>{content}</div>
  );
}

/** Relative time ("3 days ago") with the exact timestamp in a tooltip. */
export function DateCell({ value, mode = "relative", className }: { value: string | null | undefined; mode?: "relative" | "date" | "datetime"; className?: string }) {
  const [locale] = useLocale();
  const t = useT();
  if (!value) return <span className="text-muted-foreground">{t("common.misc.never")}</span>;
  const text = mode === "relative" ? formatRelative(value, locale) : mode === "date" ? formatDate(value, locale) : formatDateTime(value, locale);
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cn("whitespace-nowrap tabular-nums", className)} />}>{text}</TooltipTrigger>
      <TooltipContent>{formatDateTime(value, locale)}</TooltipContent>
    </Tooltip>
  );
}

export function NumberCell({ value, className }: { value: number | null | undefined; className?: string }) {
  const [locale] = useLocale();
  return <span className={cn("tabular-nums", className)}>{formatNumber(value, locale)}</span>;
}

export function Rating({ value, count, className }: { value: number | null | undefined; count?: number; className?: string }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", className)}>
      <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
      {value.toFixed(1)}
      {count !== undefined && <span className="text-xs text-muted-foreground">({count})</span>}
    </span>
  );
}

export function RatingStars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex", className)} aria-label={`${value}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("size-3.5", i < value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} aria-hidden />
      ))}
    </span>
  );
}

/** Monospace id/code with copy-to-clipboard. */
export function CopyId({ value, display, className }: { value: string; display?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const t = useT();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className={cn("inline-flex items-center gap-1 rounded font-mono text-xs text-muted-foreground hover:text-foreground", className)}
      aria-label={t("common.actions.copy")}
      title={t("common.actions.copy")}
    >
      {display ?? value}
      {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3 opacity-60" />}
    </button>
  );
}
