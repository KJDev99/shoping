"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertOctagon, Bell, Check, Flag, Languages, LogOut, Monitor, Moon, Package, Scale, Settings, Sun, User } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { UserAvatar } from "@/components/common/cells";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCan, useSession } from "@/hooks/use-session";
import { LOCALE_LABELS } from "@/lib/i18n/config";
import { formatRelative } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { commonService } from "@/services/common.service";
import { LOCALES, type AdminAlert, type Locale } from "@/types";
import { useLogout } from "./use-logout";

const ALERT_ICONS: Record<AdminAlert["kind"], typeof Flag> = {
  NEW_REPORT: Flag,
  PENDING_LISTING: Package,
  DISPUTE_OPENED: Scale,
  SUSPICIOUS_ACCOUNT: AlertOctagon,
};

export function AlertsMenu() {
  const t = useT();
  const [locale] = useLocale();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["alerts"], queryFn: commonService.alerts, refetchInterval: 60_000 });
  const unread = data?.filter((a) => !a.read).length ?? 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label={t("header.alerts")} />}>
        <Bell />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">{t("header.alerts")}</span>
          {unread > 0 && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={async () => {
                await commonService.markAlertsRead();
                void qc.invalidateQueries({ queryKey: ["alerts"] });
              }}
            >
              <Check className="size-3.5" /> {t("header.markAllRead")}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto p-1">
          {!data?.length ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("header.alertsEmpty")}</p>
          ) : (
            data.map((a) => {
              const Icon = ALERT_ICONS[a.kind];
              return (
                <DropdownMenuItem key={a.id} render={<Link href={a.href} />} className="items-start gap-3 py-2">
                  <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted", !a.read && "bg-primary/10 text-primary")}>
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-muted-foreground">{t(`header.alertKinds.${a.kind}`)}</span>
                    <span className={cn("block truncate text-sm", !a.read && "font-medium")}>{a.title}</span>
                    <span className="block text-xs text-muted-foreground">{formatRelative(a.createdAt, locale)}</span>
                  </span>
                  {!a.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggle() {
  const t = useT();
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t("common.theme.label")} />}>
        <Sun className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(v) => setTheme(String(v))}>
          <DropdownMenuRadioItem value="light">
            <Sun /> {t("common.theme.light")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon /> {t("common.theme.dark")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor /> {t("common.theme.system")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LocaleSwitcher() {
  const t = useT();
  const [locale, setLocale] = useLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-1.5 px-2" aria-label={t("header.language")} />}>
        <Languages />
        <span className="text-xs font-semibold uppercase">{locale}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup value={locale} onValueChange={(v) => setLocale(v as Locale)}>
          {LOCALES.map((l) => (
            <DropdownMenuRadioItem key={l} value={l}>
              {LOCALE_LABELS[l]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ProfileMenu() {
  const t = useT();
  const { data } = useSession();
  const logout = useLogout();
  const canSettings = useCan("settings.read");
  if (!data) return null;
  const name = `${data.admin.firstName} ${data.admin.lastName}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" aria-label={t("header.profile")} />}>
        <UserAvatar name={name} src={data.admin.avatar} className="size-7" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block text-xs font-normal text-muted-foreground">{t("header.signedInAs")}</span>
            <span className="block truncate text-sm text-foreground">{data.admin.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/admin/profile" />}>
          <User /> {t("header.profile")}
        </DropdownMenuItem>
        {canSettings && (
          <DropdownMenuItem render={<Link href="/admin/settings" />}>
            <Settings /> {t("header.settings")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => logout.mutate()} disabled={logout.isPending}>
          <LogOut /> {t("header.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
