"use client";

import { MoreHorizontal } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/hooks/use-session";
import { hasPermission } from "@/lib/rbac";
import { useT } from "@/lib/i18n/provider";
import type { Permission } from "@/types";

export interface RowAction {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  /** Hidden when the admin lacks the permission (UX only — backend enforces). */
  permission?: Permission | Permission[];
  hidden?: boolean;
  disabled?: boolean;
  /** Render a separator before this item. */
  separator?: boolean;
}

/** "⋯" dropdown for table rows and detail headers. */
export function RowActions({ actions, label, trigger }: { actions: RowAction[]; label?: string; trigger?: ReactNode }) {
  const t = useT();
  const perms = usePermissions();
  const visible = actions.filter((a) => !a.hidden && (!a.permission || hasPermission(perms, a.permission)));
  if (!visible.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={trigger ? undefined : <Button variant="ghost" size="icon-sm" aria-label={label ?? t("common.actions.more")} />}
        onClick={(e) => e.stopPropagation()}
      >
        {trigger ?? <MoreHorizontal />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
        {visible.map((a, i) => (
          <Fragment key={a.label}>
            {a.separator && i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem variant={a.destructive ? "destructive" : "default"} disabled={a.disabled} onClick={a.onSelect}>
              {a.icon}
              {a.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
