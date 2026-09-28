"use client";

import { Archive, Ban, CheckCircle2, Eye, MessageSquareWarning, Pencil, RotateCcw, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { RowActions, type RowAction } from "@/components/tables/row-actions";
import { useT } from "@/lib/i18n/provider";
import type { Listing, ListingStatus } from "@/types";
import type { useListingActionDialogs } from "./listing-action-dialogs";

type Dialogs = Pick<ReturnType<typeof useListingActionDialogs>, "open" | "approveNow">;

const REJECTABLE: ListingStatus[] = ["PENDING", "ACTIVE", "PAUSED"];
const ARCHIVABLE: ListingStatus[] = ["DRAFT", "PENDING", "ACTIVE", "REJECTED", "PAUSED", "EXCHANGED"];

/** Which moderation actions are valid for a listing right now (mirrors the API's transition rules). */
export function listingCapabilities(l: Listing) {
  const deleted = !!l.deletedAt;
  return {
    approve: !deleted && l.status === "PENDING",
    reject: !deleted && REJECTABLE.includes(l.status),
    requestCorrection: !deleted && REJECTABLE.includes(l.status),
    edit: !deleted,
    block: !deleted && l.status !== "BLOCKED",
    unblock: !deleted && l.status === "BLOCKED",
    archive: !deleted && ARCHIVABLE.includes(l.status),
    delete: !deleted,
    restore: deleted,
  };
}

/** Status-aware action list for a listing (only valid transitions are offered). */
export function useListingActionItems(listing: Listing, { open, approveNow }: Dialogs, { includeView = true } = {}): RowAction[] {
  const t = useT();
  const router = useRouter();
  const can = listingCapabilities(listing);
  return [
    { label: t("common.actions.view"), icon: <Eye />, onSelect: () => router.push(`/admin/listings/${listing.id}`), hidden: !includeView },
    { label: t("listings.actions.approve"), icon: <CheckCircle2 />, onSelect: () => approveNow(listing), permission: "listings.approve", hidden: !can.approve },
    { label: t("listings.actions.reject"), icon: <XCircle />, onSelect: () => open("reject", listing), permission: "listings.reject", hidden: !can.reject },
    {
      label: t("listings.actions.requestCorrection"),
      icon: <MessageSquareWarning />,
      onSelect: () => open("requestCorrection", listing),
      permission: "listings.reject",
      hidden: !can.requestCorrection,
    },
    { label: t("listings.actions.edit"), icon: <Pencil />, onSelect: () => open("edit", listing), permission: "listings.update", hidden: !can.edit, separator: true },
    { label: t("listings.actions.unblock"), icon: <ShieldCheck />, onSelect: () => open("unblock", listing), permission: "listings.block", hidden: !can.unblock },
    { label: t("listings.actions.archive"), icon: <Archive />, onSelect: () => open("archive", listing), permission: "listings.update", hidden: !can.archive },
    { label: t("listings.actions.block"), icon: <Ban />, onSelect: () => open("block", listing), permission: "listings.block", hidden: !can.block, destructive: true, separator: true },
    { label: t("listings.actions.restore"), icon: <RotateCcw />, onSelect: () => open("restore", listing), permission: "listings.delete", hidden: !can.restore },
    { label: t("listings.actions.delete"), icon: <Trash2 />, onSelect: () => open("delete", listing), permission: "listings.delete", hidden: !can.delete, destructive: true },
  ];
}

export function ListingRowActions({ listing, dialogs }: { listing: Listing; dialogs: Dialogs }) {
  return <RowActions actions={useListingActionItems(listing, dialogs)} />;
}
