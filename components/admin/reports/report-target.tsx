"use client";

import { ArrowLeftRight, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import { ItemImage, UserAvatar } from "@/components/common/cells";
import { StatusBadge } from "@/components/common/status-badge";
import { cn } from "@/lib/utils";
import type { ReportTargetSummary } from "@/types";

/** Admin page for a report target. Messages link to the sender's profile (no message viewer exists). */
export function reportTargetHref(target: Pick<ReportTargetSummary, "type" | "id" | "ownerId">): string | null {
  switch (target.type) {
    case "LISTING":
      return `/admin/listings/${target.id}`;
    case "USER":
      return `/admin/users/${target.id}`;
    case "BARTER_REQUEST":
      return `/admin/barter-requests/${target.id}`;
    case "MESSAGE":
      return target.ownerId ? `/admin/users/${target.ownerId}` : null;
  }
}

export function TargetThumb({ target, className }: { target: ReportTargetSummary; className?: string }) {
  if (target.type === "LISTING") return <ItemImage src={target.image} alt={target.label} className={cn("size-9 shrink-0 rounded-md", className)} />;
  if (target.type === "USER") return <UserAvatar name={target.label} src={target.image} className={cn("size-9", className)} />;
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4", className)}>
      {target.type === "MESSAGE" ? <MessageSquareWarning /> : <ArrowLeftRight />}
    </span>
  );
}

/** Target type badge + thumbnail + label, linking to the target's admin page. */
export function ReportTargetCell({ target, className, link = true }: { target: ReportTargetSummary; className?: string; link?: boolean }) {
  const href = link ? reportTargetHref(target) : null;
  const content = (
    <>
      <TargetThumb target={target} />
      <span className="min-w-0 space-y-0.5">
        <StatusBadge kind="reportTarget" value={target.type} dot={false} />
        <span className={cn("block truncate text-sm font-medium", href && "group-hover/target:underline", target.type === "MESSAGE" && "italic")}>{target.label}</span>
      </span>
    </>
  );
  const cls = cn("group/target flex min-w-0 items-center gap-2.5", className);
  return href ? (
    <Link href={href} className={cls} onClick={(e) => e.stopPropagation()}>
      {content}
    </Link>
  ) : (
    <div className={cls}>{content}</div>
  );
}
