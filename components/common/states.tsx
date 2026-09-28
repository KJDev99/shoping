"use client";

import { AlertTriangle, FileQuestion, Inbox, Lock, RefreshCw, Timer, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { ButtonLink } from "./button-link";

function StateShell({ icon, title, description, action, className }: { icon: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-6">{icon}</div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, description, icon, action, className }: { title?: string; description?: string; icon?: ReactNode; action?: ReactNode; className?: string }) {
  const t = useT();
  return <StateShell icon={icon ?? <Inbox />} title={title ?? t("common.states.empty")} description={description} action={action} className={className} />;
}

export function PermissionDenied({ className, showHome = false }: { className?: string; showHome?: boolean }) {
  const t = useT();
  return (
    <StateShell
      icon={<Lock />}
      title={t("common.states.forbidden")}
      description={t("common.states.forbiddenHint")}
      className={className}
      action={showHome ? <ButtonLink variant="outline" href="/admin/dashboard">{t("common.actions.goToDashboard")}</ButtonLink> : undefined}
    />
  );
}

export function NotFoundState({ className, backHref, backLabel }: { className?: string; backHref?: string; backLabel?: string }) {
  const t = useT();
  return (
    <StateShell
      icon={<FileQuestion />}
      title={t("common.states.notFound")}
      description={t("common.states.notFoundHint")}
      className={className}
      action={backHref ? <ButtonLink variant="outline" href={backHref}>{backLabel ?? t("common.actions.goBack")}</ButtonLink> : undefined}
    />
  );
}

/**
 * Renders the right state for an API error: 403 → permission denied,
 * 404 → not found, 429 → rate limited, network/500 → retry.
 * (401 is handled globally by redirecting to the login page.)
 */
export function ErrorState({ error, onRetry, className, backHref }: { error: unknown; onRetry?: () => void; className?: string; backHref?: string }) {
  const t = useT();
  if (isApiError(error)) {
    if (error.isForbidden) return <PermissionDenied className={className} />;
    if (error.isNotFound) return <NotFoundState className={className} backHref={backHref} />;
    if (error.isRateLimited)
      return <StateShell icon={<Timer />} title={t("common.states.rateLimited")} description={t("common.states.rateLimitedHint")} className={className} action={onRetry && <RetryButton onRetry={onRetry} />} />;
    if (error.status === 0)
      return <StateShell icon={<WifiOff />} title={t("common.states.network")} description={t("common.states.networkHint")} className={className} action={onRetry && <RetryButton onRetry={onRetry} />} />;
  }
  return <StateShell icon={<AlertTriangle />} title={t("common.states.error")} description={t("common.states.errorHint")} className={className} action={onRetry && <RetryButton onRetry={onRetry} />} />;
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <Button variant="outline" size="sm" onClick={onRetry}>
      <RefreshCw /> {t("common.actions.retry")}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

export function CardGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-xl border bg-card p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <CardGridSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
