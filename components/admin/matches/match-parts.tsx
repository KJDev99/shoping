"use client";

import { CircleCheck, CircleSlash, MapPin, PackageCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { MatchReason } from "@/types";

/** Horizontal 0–100 score bar with the number beside it (single hue; text in text tokens). */
export function ScoreBar({ score, className }: { score: number; className?: string }) {
  return (
    <div className={cn("flex min-w-24 items-center gap-2", className)}>
      <span className="w-7 text-right text-sm font-semibold tabular-nums">{score}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
        <div className="h-full rounded-full bg-chart-1" style={{ width: `${Math.max(2, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}

function CompatIcon({ ok, icon, label }: { ok: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "relative inline-flex size-7 items-center justify-center rounded-md border [&_svg]:size-3.5",
              ok ? "border-success/30 bg-success/10 text-success" : "border-border bg-muted text-muted-foreground",
            )}
            aria-label={label}
          />
        }
      >
        {icon}
        {!ok && <CircleSlash className="absolute -right-1 -bottom-1 size-3! rounded-full bg-card text-muted-foreground" aria-hidden />}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Location + condition compatibility at a glance (icon + tooltip; never color alone). */
export function CompatibilityIcons({ reason }: { reason: MatchReason }) {
  const t = useT();
  const locationLabel = reason.locationCompatible
    ? `${t("matches.compat.locationOk")}${reason.sameRegion ? ` · ${t("matches.compat.sameRegion")}` : ""}`
    : t("matches.compat.locationNo");
  return (
    <div className="flex items-center gap-1.5">
      <CompatIcon ok={reason.locationCompatible} icon={<MapPin />} label={locationLabel} />
      <CompatIcon ok={reason.conditionCompatible} icon={<PackageCheck />} label={reason.conditionCompatible ? t("matches.compat.conditionOk") : t("matches.compat.conditionNo")} />
    </div>
  );
}

/** Yes/no line with an icon, used in the "why matched" list. */
export function CheckLine({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p className={cn("flex items-start gap-2 text-sm", !ok && "text-muted-foreground")}>
      {ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <CircleSlash className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <span>{children}</span>
    </p>
  );
}
