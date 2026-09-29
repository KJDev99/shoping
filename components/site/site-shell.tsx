"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, LogOut, Package, Plus, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { LocaleSwitcher, ThemeToggle } from "@/components/admin/layout/header-menus";
import { ButtonLink } from "@/components/common/button-link";
import { UserAvatar } from "@/components/common/cells";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { LookupsSourceProvider } from "@/hooks/use-lookups";
import { siteKeys, useSiteUser } from "@/hooks/use-site";
import { useT } from "@/lib/i18n/provider";
import { siteService } from "@/services/site.service";

const SITE_LOOKUPS = { queryKey: siteKeys.lookups, queryFn: siteService.lookups };

/** Public marketplace chrome. Reference data comes from the public API (not the admin one). */
export function SiteShell({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <LookupsSourceProvider value={SITE_LOOKUPS}>
      <div className="flex min-h-svh flex-col bg-muted/40">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        <footer className="border-t bg-background">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 text-sm text-muted-foreground sm:px-6">
            <span>{t("site.footer")}</span>
            <ThemeToggle />
          </div>
        </footer>
      </div>
    </LookupsSourceProvider>
  );
}

function HeaderSearch({ className }: { className?: string }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(pathname === "/" ? (searchParams.get("search") ?? "") : "");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams(pathname === "/" ? searchParams.toString() : "");
    if (q.trim()) sp.set("search", q.trim());
    else sp.delete("search");
    router.push(`/?${sp.toString()}`);
  };
  return (
    <form onSubmit={submit} className={className} role="search">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("site.home.searchPlaceholder")} className="h-10 rounded-full bg-muted/60 pl-10 text-base sm:text-sm" aria-label={t("common.actions.search")} />
      </div>
    </form>
  );
}

function SiteHeader() {
  const t = useT();
  return (
    <header className="sticky top-0 z-30 border-b bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ArrowLeftRight className="size-4" />
          </span>
          <span className="hidden text-lg sm:inline">Barter.uz</span>
        </Link>
        <HeaderSearch className="hidden min-w-0 flex-1 md:block md:max-w-xl" />
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <LocaleSwitcher />
          <AccountMenu />
          <ButtonLink href="/listings/new" className="h-10 rounded-full px-4">
            <Plus />
            {t("site.nav.post")}
          </ButtonLink>
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <HeaderSearch />
      </div>
    </header>
  );
}

function AccountMenu() {
  const t = useT();
  const qc = useQueryClient();
  const router = useRouter();
  const { data: user, isPending } = useSiteUser();
  const logout = useMutation({
    mutationFn: siteService.logout,
    onSettled: async () => {
      qc.removeQueries({ queryKey: ["site", "my"] });
      await qc.invalidateQueries({ queryKey: siteKeys.me });
      router.push("/");
    },
  });
  if (isPending) return <span className="size-8" />;
  if (!user) {
    return (
      <ButtonLink href="/login" variant="ghost" className="h-10 rounded-full">
        <User />
        <span className="hidden sm:inline">{t("site.nav.login")}</span>
      </ButtonLink>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" aria-label={t("site.nav.account")} />}>
        <UserAvatar name={user.fullName} src={user.avatar} className="size-8" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate text-sm text-foreground">{user.fullName}</span>
            <span className="block text-xs font-normal text-muted-foreground">{user.phone}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/my/listings" />}>
          <Package /> {t("site.nav.myListings")}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/listings/new" />}>
          <Plus /> {t("site.nav.post")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => logout.mutate()} disabled={logout.isPending}>
          <LogOut /> {t("site.nav.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
