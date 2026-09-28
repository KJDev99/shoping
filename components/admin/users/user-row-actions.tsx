"use client";

import { Ban, Eye, Pencil, RotateCcw, ShieldCheck, Timer, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { RowActions, type RowAction } from "@/components/tables/row-actions";
import { useT } from "@/lib/i18n/provider";
import type { User } from "@/types";
import type { UserAction } from "./user-action-dialogs";

/** Status-aware action list for a user (only valid transitions are offered). */
export function useUserActionItems(user: User, open: (action: UserAction, user: User) => void, { includeView = true } = {}): RowAction[] {
  const t = useT();
  const router = useRouter();
  const deleted = user.status === "DELETED";
  const restricted = user.status === "BLOCKED" || user.status === "SUSPENDED";
  return [
    { label: t("common.actions.view"), icon: <Eye />, onSelect: () => router.push(`/admin/users/${user.id}`), hidden: !includeView },
    { label: t("users.actions.edit"), icon: <Pencil />, onSelect: () => open("edit", user), permission: "users.update", hidden: deleted },
    { label: t("users.actions.suspend"), icon: <Timer />, onSelect: () => open("suspend", user), permission: "users.block", hidden: deleted || user.status === "SUSPENDED", separator: true },
    { label: t("users.actions.block"), icon: <Ban />, onSelect: () => open("block", user), permission: "users.block", hidden: deleted || user.status === "BLOCKED", destructive: true },
    { label: t("users.actions.unblock"), icon: <ShieldCheck />, onSelect: () => open("unblock", user), permission: "users.block", hidden: !restricted },
    { label: t("users.actions.restore"), icon: <RotateCcw />, onSelect: () => open("restore", user), permission: "users.delete", hidden: !deleted },
    { label: t("users.actions.delete"), icon: <Trash2 />, onSelect: () => open("delete", user), permission: "users.delete", hidden: deleted, destructive: true, separator: true },
  ];
}

export function UserRowActions({ user, open }: { user: User; open: (action: UserAction, user: User) => void }) {
  return <RowActions actions={useUserActionItems(user, open)} />;
}
