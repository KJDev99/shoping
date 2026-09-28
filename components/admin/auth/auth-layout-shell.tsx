"use client";

import { ArrowLeftRight, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { LocaleSwitcher, ThemeToggle } from "@/components/admin/layout/header-menus";
import { useT } from "@/lib/i18n/provider";

export function AuthLayoutShell({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15">
            <ArrowLeftRight className="size-5" />
          </span>
          Barter.uz
        </div>
        <div className="space-y-6">
          <p className="text-3xl leading-tight font-semibold text-balance">{t("auth.brand.tagline")}</p>
          <ul className="space-y-3 text-primary-foreground/85">
            {(["one", "two", "three"] as const).map((k) => (
              <li key={k} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                {t(`auth.brand.points.${k}`)}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-primary-foreground/70">{t("common.misc.barterOnly")}</p>
      </aside>
      <main className="flex flex-col">
        <div className="flex justify-end gap-1 p-4">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
