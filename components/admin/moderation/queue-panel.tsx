"use client";

import { ChevronLeft, ChevronRight, PartyPopper, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useListParams } from "@/hooks/use-list-params";
import { useModerationQueue } from "@/hooks/use-moderation";
import { formatNumber } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { ModerationQueue } from "@/types";
import { useModerationDialogs } from "./moderation-dialogs";
import { ListingQueueCard, UserQueueCard } from "./queue-cards";

/** URL prefix for queue paging/search params (keeps them apart from the log's params). */
export const QUEUE_PARAM_PREFIX = "q_";

function QueueSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="flex gap-3 rounded-xl border bg-card p-4">
          <Skeleton className="size-20 shrink-0 rounded-lg sm:size-24" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="hidden w-40 space-y-2 sm:block">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function QueueSearch({ value, onChange }: { value: string | undefined; onChange: (v: string | undefined) => void }) {
  const t = useT();
  const [text, setText] = useState(value ?? "");
  const debounced = useDebouncedValue(text);
  useEffect(() => {
    if ((debounced || undefined) !== value) onChange(debounced || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced text
  }, [debounced]);
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("moderation.searchPlaceholder")} className="h-8 pl-8" aria-label={t("moderation.searchPlaceholder")} />
    </div>
  );
}

/** Fast review list for one moderation queue. Rows disappear optimistically after an action. */
export function QueuePanel({ queue }: { queue: ModerationQueue }) {
  const t = useT();
  const [locale] = useLocale();
  const { params, setParams } = useListParams({ limit: 20 }, [], QUEUE_PARAM_PREFIX);
  const query = useModerationQueue(queue, params);
  const { openListing, openUser, dialogs, approve } = useModerationDialogs();

  const meta = query.data?.meta;
  const items = query.data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t(`moderation.queueHints.${queue}`)}</p>
        <QueueSearch value={params.search} onChange={(search) => setParams({ search })} />
      </div>

      {query.isPending ? (
        <QueueSkeleton />
      ) : query.isError && !query.data ? (
        <div className="rounded-xl border bg-card">
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState icon={<PartyPopper />} title={t("moderation.empty.title")} description={t("moderation.empty.description")} />
        </div>
      ) : (
        <ul className={cn("space-y-3 transition-opacity", query.isFetching && "opacity-80")}>
          {items.map((item) =>
            item.kind === "LISTING" ? (
              <ListingQueueCard
                key={item.id}
                item={item}
                queue={queue}
                openDialog={openListing}
                approving={approve.isPending && approve.variables?.id === item.id}
                onApprove={() => {
                  if (!approve.isPending) approve.mutate({ id: item.id, queue });
                }}
              />
            ) : (
              <UserQueueCard key={item.id} item={item} queue={queue} openDialog={openUser} />
            ),
          )}
        </ul>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("common.table.totalRows", { total: formatNumber(meta.total, locale) })}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" disabled={meta.page <= 1} onClick={() => setParams({ page: meta.page - 1 })} aria-label={t("common.table.previousPage")}>
              <ChevronLeft />
            </Button>
            <span className="tabular-nums">{t("common.table.pageOf", { page: meta.page, total: meta.totalPages })}</span>
            <Button variant="outline" size="icon-sm" disabled={meta.page >= meta.totalPages} onClick={() => setParams({ page: meta.page + 1 })} aria-label={t("common.table.nextPage")}>
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
      {dialogs}
    </div>
  );
}
