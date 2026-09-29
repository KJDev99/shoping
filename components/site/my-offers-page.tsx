"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Check, Inbox, Phone, Send, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ButtonLink } from "@/components/common/button-link";
import { ItemImage, UserAvatar } from "@/components/common/cells";
import { EmptyState, ErrorState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useApiErrorMessage } from "@/hooks/use-api-error";
import { useMyOffers } from "@/hooks/use-site";
import { formatRelative } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { siteService } from "@/services/site.service";
import type { PublicListingCard, SiteOffer } from "@/types";

type Box = "incoming" | "outgoing";

export function MyOffersPage() {
  const t = useT();
  const [box, setBox] = useState<Box>("incoming");
  const query = useMyOffers(box);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t("site.offers.title")}</h1>
        <p className="text-muted-foreground">{t("site.offers.subtitle")}</p>
      </div>

      <div className="surface inline-flex rounded-full p-1" role="tablist">
        {(
          [
            ["incoming", t("site.offers.incoming"), Inbox],
            ["outgoing", t("site.offers.outgoing"), Send],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={box === key}
            onClick={() => setBox(key)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium transition-all",
              box === key ? "bg-linear-to-r from-primary to-violet-600 text-white shadow-md shadow-primary/25" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {query.isPending ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="surface h-44 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          icon={box === "incoming" ? <Inbox /> : <Send />}
          title={box === "incoming" ? t("site.offers.emptyIncoming") : t("site.offers.emptyOutgoing")}
          description={box === "outgoing" ? t("site.offers.emptyOutgoingHint") : undefined}
          action={<ButtonLink href="/" className="rounded-full">{t("site.offers.browse")}</ButtonLink>}
          className="surface rounded-3xl"
        />
      ) : (
        <div className="space-y-4">
          {query.data.data.map((o) => (
            <OfferCard key={o.id} offer={o} />
          ))}
        </div>
      )}
    </div>
  );
}

function Items({ label, items }: { label: string; items: PublicListingCard[] }) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      {items.map((l) => (
        <Link key={l.id} href={`/listings/${l.id}`} className="flex items-center gap-3 rounded-2xl bg-muted/40 p-2 transition-colors hover:bg-muted">
          <ItemImage src={l.image} alt="" className="size-14 shrink-0 rounded-xl" />
          <span className="line-clamp-2 text-sm font-medium">{l.title}</span>
        </Link>
      ))}
    </div>
  );
}

function OfferCard({ offer: o }: { offer: SiteOffer }) {
  const t = useT();
  const [locale] = useLocale();
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const [confirm, setConfirm] = useState<"decline" | "cancel" | null>(null);
  const incoming = o.direction === "incoming";

  const act = useMutation({
    mutationFn: (action: "accept" | "decline" | "cancel") => siteService.respondOffer(o.id, action),
    onSuccess: async (_d, action) => {
      toast.success(t(action === "accept" ? "site.offers.acceptedToast" : action === "decline" ? "site.offers.declinedToast" : "site.offers.cancelledToast"));
      await qc.invalidateQueries({ queryKey: ["site", "my", "offers"] });
    },
    onError: (e) => toast.error(toMessage(e)),
  });

  // Incoming: they give `offered` for my `requested`. Outgoing: I give `offered` for their `requested`.
  const left = incoming ? { label: t("site.offers.theyGive"), items: o.offered } : { label: t("site.offers.youGive"), items: o.offered };
  const right = incoming ? { label: t("site.offers.youGet"), items: o.requested } : { label: t("site.offers.forTheir"), items: o.requested };

  return (
    <article className="surface space-y-4 rounded-3xl p-4 sm:p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={o.counterpart.fullName} src={o.counterpart.avatar} className="size-10" />
          <div className="min-w-0">
            <p className="truncate font-medium">{incoming ? t("site.offers.from", { name: o.counterpart.fullName }) : t("site.offers.to", { name: o.counterpart.fullName })}</p>
            <p className="text-xs text-muted-foreground">{formatRelative(o.createdAt, locale)}</p>
          </div>
        </div>
        <StatusBadge kind="barterStatus" value={o.status} />
      </header>

      <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <Items {...left} />
        <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-linear-to-br from-primary to-violet-600 text-white shadow-md shadow-primary/30">
          <ArrowLeftRight className="size-4" />
        </span>
        <Items {...right} />
      </div>

      {o.message && <p className="rounded-2xl bg-primary/5 px-4 py-3 text-sm">“{o.message}”</p>}

      {o.counterpart.phone && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-success/10 px-4 py-3">
          <p className="text-sm">
            {t("site.offers.contact")} <span className="font-semibold">{o.counterpart.phone}</span>
          </p>
          <ButtonLink href={`tel:${o.counterpart.phone.replace(/\s/g, "")}`} size="sm" className="rounded-full">
            <Phone /> {t("site.offers.call")}
          </ButtonLink>
        </div>
      )}

      {o.status === "PENDING" && (
        <div className="flex flex-wrap justify-end gap-2">
          {incoming ? (
            <>
              <Button variant="outline" className="rounded-full" disabled={act.isPending} onClick={() => setConfirm("decline")}>
                <X /> {t("site.offers.decline")}
              </Button>
              <Button className="rounded-full bg-success text-white shadow-md shadow-success/25 hover:bg-success/90" disabled={act.isPending} onClick={() => act.mutate("accept")}>
                <Check /> {t("site.offers.accept")}
              </Button>
            </>
          ) : (
            <Button variant="outline" className="rounded-full" disabled={act.isPending} onClick={() => setConfirm("cancel")}>
              <X /> {t("site.offers.cancel")}
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === "decline" ? t("site.offers.declineTitle") : t("site.offers.cancelTitle")}
        confirmLabel={confirm === "decline" ? t("site.offers.decline") : t("site.offers.cancel")}
        variant="destructive"
        onConfirm={() => (confirm ? act.mutateAsync(confirm) : undefined)}
      />
    </article>
  );
}
