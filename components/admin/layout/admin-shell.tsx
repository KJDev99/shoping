"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { ErrorState } from "@/components/common/states";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/lib/i18n/provider";
import { AppSidebar } from "./app-sidebar";
import { Breadcrumbs } from "./breadcrumbs";
import { GlobalSearch } from "./global-search";
import { AlertsMenu, LocaleSwitcher, ProfileMenu } from "./header-menus";

/** Authenticated admin chrome: collapsible sidebar (drawer on mobile), header, content. */
export function AdminShell({ defaultSidebarOpen, children }: { defaultSidebarOpen: boolean; children: ReactNode }) {
  const t = useT();
  const session = useSession();

  if (session.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (session.isError) {
    // 401 redirects to login from the API client; anything else gets a retry.
    return <ErrorState error={session.error} onRetry={() => session.refetch()} className="min-h-svh" />;
  }

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-backdrop-filter:bg-background/70 sm:px-4">
          <SidebarTrigger className="-ml-1" aria-label={t("header.toggleSidebar")} />
          <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />
          <div className="hidden min-w-0 flex-1 md:block">
            <Breadcrumbs />
          </div>
          <div className="flex flex-1 items-center justify-end gap-1 md:flex-none">
            <GlobalSearch />
            <AlertsMenu />
            <LocaleSwitcher />
            <ProfileMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
