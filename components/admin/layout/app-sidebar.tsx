"use client";

import { ArrowLeftRight, ChevronsUpDown, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserAvatar } from "@/components/common/cells";
import { StatusBadge } from "@/components/common/status-badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePermissions, useSession } from "@/hooks/use-session";
import { useT } from "@/lib/i18n/provider";
import { NAV_GROUPS } from "@/lib/navigation";
import { hasPermission } from "@/lib/rbac";
import { useLogout } from "./use-logout";

export function AppSidebar() {
  const t = useT();
  const pathname = usePathname();
  const perms = usePermissions();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin/dashboard" />} tooltip={t("common.appName")}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <ArrowLeftRight className="size-4" />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">Barter.uz</span>
                <span className="truncate text-xs text-muted-foreground">Admin panel</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((i) => hasPermission(perms, i.permission));
          if (!items.length) return null;
          return (
            <SidebarGroup key={group.key}>
              <SidebarGroupLabel>{t(group.key)}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const label = t(item.key);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={active}
                          tooltip={label}
                          render={<Link href={item.href} onClick={() => setOpenMobile(false)} aria-current={active ? "page" : undefined} />}
                        >
                          <item.icon />
                          <span>{label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarProfile />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function SidebarProfile() {
  const t = useT();
  const { data } = useSession();
  const logout = useLogout();
  const { isMobile } = useSidebar();
  if (!data) return null;
  const { admin } = data;
  const name = `${admin.firstName} ${admin.lastName}`;
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent" />}>
            <UserAvatar name={name} src={admin.avatar} className="size-8 rounded-lg" />
            <span className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">{name}</span>
              <span className="truncate text-xs text-muted-foreground">{admin.email}</span>
            </span>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? "bottom" : "right"} align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-1.5">
                <span className="text-foreground">{name}</span>
                <StatusBadge kind="adminRole" value={admin.role} dot={false} />
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/admin/profile" />}>
              <User /> {t("header.profile")}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => logout.mutate()} disabled={logout.isPending}>
              <LogOut /> {t("header.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
