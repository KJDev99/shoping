"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueueCounts } from "@/hooks/use-moderation";
import { formatNumber } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { MODERATION_QUEUES, type ModerationQueue } from "@/types";
import { LOG_PARAM_PREFIX, ModerationLog } from "./moderation-log";
import { QUEUE_PARAM_PREFIX, QueuePanel } from "./queue-panel";
import { SafetyPanel } from "./safety-panel";

type TabValue = ModerationQueue | "safety" | "log";
const TABS: readonly TabValue[] = [...MODERATION_QUEUES, "safety", "log"];
const DEFAULT_TAB: TabValue = "PENDING_LISTINGS";

function isTab(value: string | null): value is TabValue {
  return !!value && (TABS as readonly string[]).includes(value);
}

function CountBadge({ value, active }: { value: number | undefined; active: boolean }) {
  const [locale] = useLocale();
  if (value === undefined) return <span className="inline-block h-4 w-5 animate-pulse rounded-full bg-muted-foreground/20" aria-hidden />;
  return (
    <span
      className={cn(
        "inline-flex h-4 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
        value === 0 ? "bg-muted text-muted-foreground" : active ? "bg-primary text-primary-foreground" : "bg-destructive/10 text-destructive",
      )}
    >
      {formatNumber(value, locale)}
    </span>
  );
}

/** Moderation workspace: one tab per queue (URL-synced), safety indicators and the moderation log. */
export function ModerationPage() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const counts = useQueueCounts();
  const rawTab = searchParams.get("tab");
  const tab: TabValue = isTab(rawTab) ? rawTab : DEFAULT_TAB;

  const changeTab = (next: TabValue) => {
    const sp = new URLSearchParams(searchParams.toString());
    // Paging/search belong to the previous tab.
    for (const key of [...sp.keys()]) if (key.startsWith(QUEUE_PARAM_PREFIX) || key.startsWith(LOG_PARAM_PREFIX)) sp.delete(key);
    if (next === DEFAULT_TAB) sp.delete("tab");
    else sp.set("tab", next);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("moderation.title")} description={t("moderation.subtitle")} />
      <Tabs value={tab} onValueChange={(v) => isTab(String(v)) && changeTab(v as TabValue)} className="gap-4">
        <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            {MODERATION_QUEUES.map((q) => (
              <TabsTrigger key={q} value={q}>
                {t(`enums.moderationQueue.${q}`)}
                <CountBadge value={counts.data?.[q]} active={tab === q} />
              </TabsTrigger>
            ))}
            <TabsTrigger value="safety">{t("moderation.tabs.safety")}</TabsTrigger>
            <TabsTrigger value="log">{t("moderation.tabs.log")}</TabsTrigger>
          </TabsList>
        </div>
        {MODERATION_QUEUES.map((q) => (
          <TabsContent key={q} value={q}>
            {tab === q && <QueuePanel queue={q} />}
          </TabsContent>
        ))}
        <TabsContent value="safety">{tab === "safety" && <SafetyPanel />}</TabsContent>
        <TabsContent value="log">{tab === "log" && <ModerationLog />}</TabsContent>
      </Tabs>
    </div>
  );
}
