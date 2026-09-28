"use client";

import { Check, Info, Minus } from "lucide-react";
import { Fragment, useMemo } from "react";
import { StatusBadge } from "@/components/common/status-badge";
import { ErrorState } from "@/components/common/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoles } from "@/hooks/use-admins";
import { useT } from "@/lib/i18n/provider";
import { groupPermissions } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import type { Permission, Role } from "@/types";

/** Read-only role × permission matrix. Documentation for admins — enforcement happens on the server. */
export function PermissionMatrix() {
  const t = useT();
  const query = useRoles();
  const groups = useMemo(() => Object.entries(groupPermissions()), []);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/10 p-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <p>{t("admins.roles.note")}</p>
      </div>

      {query.isPending ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <MatrixTable roles={query.data} groups={groups} />
      )}
    </div>
  );
}

function MatrixTable({ roles, groups }: { roles: Role[]; groups: [string, Permission[]][] }) {
  const t = useT();
  const granted = useMemo(() => new Map(roles.map((r) => [r.id, new Set(r.permissions)])), [roles]);

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">{t("admins.roles.title")}</caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="sticky left-0 z-10 bg-card px-4 py-3 text-left align-bottom font-medium text-muted-foreground">
              {t("admins.roles.permission")}
            </th>
            {roles.map((r) => (
              <th key={r.id} scope="col" className="w-40 px-3 py-3 text-center align-bottom font-normal">
                <div className="flex flex-col items-center gap-1">
                  <StatusBadge kind="adminRole" value={r.id} dot={false} />
                  <span className="text-xs text-muted-foreground">{t("admins.roles.count", { count: r.permissions.length })}</span>
                  <span className="hidden text-[11px] leading-snug text-muted-foreground lg:block">{t(`admins.roleDescriptions.${r.id}`)}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(([group, perms]) => (
            <Fragment key={group}>
              <tr className="bg-muted/40">
                <th scope="colgroup" colSpan={roles.length + 1} className="sticky left-0 px-4 py-1.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t.dynamic(`admins.permissionGroups.${group}`)}
                </th>
              </tr>
              {perms.map((p) => (
                <tr key={p} className="border-b last:border-b-0 hover:bg-muted/20">
                  <th scope="row" className="sticky left-0 z-10 bg-card px-4 py-2 text-left font-normal">
                    <span className="block">{t(`admins.permissions.${p}`)}</span>
                    <code className="font-mono text-[11px] text-muted-foreground">{p}</code>
                  </th>
                  {roles.map((r) => {
                    const ok = granted.get(r.id)?.has(p) ?? false;
                    return (
                      <td key={r.id} className="px-3 py-2 text-center">
                        <span
                          className={cn(
                            "inline-flex size-6 items-center justify-center rounded-full",
                            ok ? "bg-success/10 text-success" : "text-muted-foreground/40",
                          )}
                          aria-label={ok ? t("admins.roles.allowed") : t("admins.roles.denied")}
                          title={ok ? t("admins.roles.allowed") : t("admins.roles.denied")}
                        >
                          {ok ? <Check className="size-4" /> : <Minus className="size-3.5" />}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
