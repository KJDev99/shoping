"use client";

import { Bell, Eye, Globe, Handshake, Lock, Package, ShieldCheck } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/hooks/use-session";
import { useSettings } from "@/hooks/use-settings";
import { formatDateTime } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { isSettingsSection, type SettingsSection } from "@/schemas/settings.schema";
import {
  BarterSettingsForm,
  GeneralSettingsForm,
  ListingsSettingsForm,
  ModerationSettingsForm,
  NotificationSettingsForm,
  SecuritySettingsForm,
} from "./settings-sections";

const TAB_ICONS: Record<SettingsSection, ReactNode> = {
  general: <Globe />,
  listings: <Package />,
  barter: <Handshake />,
  moderation: <ShieldCheck />,
  security: <Lock />,
  notifications: <Bell />,
};

export function SettingsPage() {
  const t = useT();
  const [locale] = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canManage = useCan("settings.manage");
  const query = useSettings();
  const rawTab = searchParams.get("tab") ?? "general";
  const tab: SettingsSection = isSettingsSection(rawTab) ? rawTab : "general";

  const setTab = (next: SettingsSection) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (next === "general") sp.delete("tab");
    else sp.set("tab", next);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const s = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.subtitle")}
        meta={
          s?.updatedBy && (
            <span className="text-xs text-muted-foreground">
              {t("settings.lastUpdated", { date: formatDateTime(s.updatedAt, locale), name: s.updatedBy.fullName })}
            </span>
          )
        }
      />

      {!canManage && (
        <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-3 text-sm">
          <Eye className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p>{t("settings.readOnly")}</p>
        </div>
      )}

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !s ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-full max-w-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as SettingsSection)}>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList>
              {(Object.keys(TAB_ICONS) as SettingsSection[]).map((key) => (
                <TabsTrigger key={key} value={key}>
                  {TAB_ICONS[key]} {t(`settings.tabs.${key}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {/* keepMounted preserves unsaved edits when switching tabs; keys remount a form when its server values change. */}
          <TabsContent value="general" keepMounted className="mt-4">
            <GeneralSettingsForm key={JSON.stringify(s.general)} values={s.general} canManage={canManage} />
          </TabsContent>
          <TabsContent value="listings" keepMounted className="mt-4">
            <ListingsSettingsForm key={JSON.stringify(s.listings)} values={s.listings} canManage={canManage} />
          </TabsContent>
          <TabsContent value="barter" keepMounted className="mt-4">
            <BarterSettingsForm key={JSON.stringify(s.barter)} values={s.barter} canManage={canManage} />
          </TabsContent>
          <TabsContent value="moderation" keepMounted className="mt-4">
            <ModerationSettingsForm key={JSON.stringify(s.moderation)} values={s.moderation} canManage={canManage} />
          </TabsContent>
          <TabsContent value="security" keepMounted className="mt-4">
            <SecuritySettingsForm key={JSON.stringify(s.security)} values={s.security} canManage={canManage} />
          </TabsContent>
          <TabsContent value="notifications" keepMounted className="mt-4">
            <NotificationSettingsForm key={JSON.stringify(s.notifications)} values={s.notifications} canManage={canManage} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
