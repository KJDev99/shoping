import {
  ArrowLeftRight,
  FileClock,
  Flag,
  FolderTree,
  Handshake,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Package,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { MessageKey } from "@/lib/i18n/messages";
import type { Permission } from "@/types";

export interface NavItem {
  key: MessageKey;
  href: string;
  icon: LucideIcon;
  /** Required permission to see the item (UX only — pages and API enforce too). */
  permission: Permission;
}

export interface NavGroup {
  key: MessageKey;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "nav.groups.overview",
    items: [{ key: "nav.dashboard", href: "/admin/dashboard", icon: LayoutDashboard, permission: "dashboard.read" }],
  },
  {
    key: "nav.groups.management",
    items: [
      { key: "nav.users", href: "/admin/users", icon: Users, permission: "users.read" },
      { key: "nav.listings", href: "/admin/listings", icon: Package, permission: "listings.read" },
      { key: "nav.barterRequests", href: "/admin/barter-requests", icon: ArrowLeftRight, permission: "barter.read" },
      { key: "nav.exchanges", href: "/admin/exchanges", icon: Handshake, permission: "exchanges.read" },
      { key: "nav.matches", href: "/admin/matches", icon: Sparkles, permission: "matches.read" },
    ],
  },
  {
    key: "nav.groups.content",
    items: [
      { key: "nav.categories", href: "/admin/categories", icon: FolderTree, permission: "categories.manage" },
      { key: "nav.locations", href: "/admin/locations", icon: MapPin, permission: "locations.manage" },
    ],
  },
  {
    key: "nav.groups.safety",
    items: [
      { key: "nav.reports", href: "/admin/reports", icon: Flag, permission: "reports.read" },
      { key: "nav.moderation", href: "/admin/moderation", icon: ShieldCheck, permission: "moderation.read" },
    ],
  },
  {
    key: "nav.groups.system",
    items: [
      { key: "nav.notifications", href: "/admin/notifications", icon: Megaphone, permission: "notifications.read" },
      { key: "nav.admins", href: "/admin/admins", icon: UserCog, permission: "admins.read" },
      { key: "nav.auditLogs", href: "/admin/audit-logs", icon: FileClock, permission: "audit.read" },
      { key: "nav.settings", href: "/admin/settings", icon: Settings, permission: "settings.read" },
    ],
  },
];

/** Segment → label for breadcrumbs. Dynamic ids fall back to the raw segment. */
export const SEGMENT_LABELS: Record<string, MessageKey> = {
  dashboard: "nav.dashboard",
  users: "nav.users",
  listings: "nav.listings",
  "barter-requests": "nav.barterRequests",
  exchanges: "nav.exchanges",
  matches: "nav.matches",
  categories: "nav.categories",
  locations: "nav.locations",
  reports: "nav.reports",
  moderation: "nav.moderation",
  notifications: "nav.notifications",
  admins: "nav.admins",
  "audit-logs": "nav.auditLogs",
  settings: "nav.settings",
  profile: "nav.profile",
  dispute: "nav.dispute",
};
