"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Check, CheckCircle2, Clock, Loader2, PackagePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ButtonLink } from "@/components/common/button-link";
import { ItemImage } from "@/components/common/cells";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useApiErrorMessage } from "@/hooks/use-api-error";
import { siteKeys, useMyListings, useSiteUser } from "@/hooks/use-site";
import { isApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { siteService } from "@/services/site.service";
import type { BarterRequestStatus } from "@/types";

const gradientButton = "h-12 w-full rounded-full bg-linear-to-r from-primary to-violet-600 text-base shadow-lg shadow-primary/30 hover:opacity-95";

/** The main call to action on someone else's listing: offer one of my items in exchange. */
export function OfferAction({ listingId, title, myOffer }: { listingId: string; title: string; myOffer: { id: string; status: BarterRequestStatus } | null }) {
  const t = useT();
  const { data: user, isPending } = useSiteUser();
  const [open, setOpen] = useState(false);

  if (isPending) return <div className="h-12 animate-pulse rounded-full bg-muted" />;
  if (!user) {
    return (
      <ButtonLink href={`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`} className={gradientButton}>
        <ArrowLeftRight /> {t("site.offer.loginToOffer")}
      </ButtonLink>
    );
  }
  if (myOffer) {
    return (
      <div className="space-y-2 rounded-2xl bg-success/10 p-4 text-sm">
        <p className="flex items-center gap-2 font-medium text-success">
          <CheckCircle2 className="size-4" />
          {myOffer.status === "ACCEPTED" ? t("site.offer.accepted") : t("site.offer.alreadySent")}
        </p>
        <ButtonLink href="/my/offers" variant="outline" className="h-9 w-full rounded-full bg-white">
          {t("site.offer.viewOffers")}
        </ButtonLink>
      </div>
    );
  }
  return (
    <>
      <Button className={gradientButton} onClick={() => setOpen(true)}>
        <ArrowLeftRight /> {t("site.offer.button")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          {open && <OfferForm listingId={listingId} title={title} onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function OfferForm({ listingId, title, onDone }: { listingId: string; title: string; onDone: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const mine = useMyListings({ page: 1, limit: 100 });
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const active = (mine.data?.data ?? []).filter((l) => l.status === "ACTIVE");
  const pendingCount = (mine.data?.data ?? []).filter((l) => l.status === "PENDING").length;

  const send = useMutation({
    mutationFn: () => siteService.sendOffer({ listingId, offeredListingIds: selected, message: message.trim() || null }),
    onSuccess: async () => {
      toast.success(t("site.offer.sent"));
      await qc.invalidateQueries({ queryKey: siteKeys.listing(listingId) });
      await qc.invalidateQueries({ queryKey: ["site", "my", "offers"] });
      onDone();
    },
    onError: (e) => {
      if (isApiError(e) && e.code === "OFFER_EXISTS") return setError(t("site.offer.exists"));
      const field = isApiError(e) ? Object.values(e.fieldErrors ?? {})[0]?.[0] : undefined;
      setError(field ? t.dynamic(field) : toMessage(e));
    },
  });

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 5 ? [...s, id] : s));

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("site.offer.title")}</DialogTitle>
        <DialogDescription>{t("site.offer.subtitle", { title })}</DialogDescription>
      </DialogHeader>

      {mine.isPending ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : active.length === 0 ? (
        <div className="space-y-3 rounded-2xl bg-muted/50 p-5 text-center">
          <p className="font-medium">{t("site.offer.noItemsTitle")}</p>
          <p className="text-sm text-muted-foreground">{pendingCount ? t("site.offer.pendingItemsText") : t("site.offer.noItemsText")}</p>
          {!pendingCount && (
            <ButtonLink href="/listings/new" className="rounded-full">
              <PackagePlus /> {t("site.offer.postFirst")}
            </ButtonLink>
          )}
          {pendingCount > 0 && <Clock className="mx-auto size-5 text-muted-foreground" />}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2" role="group" aria-label={t("site.offer.subtitle", { title })}>
            {active.map((l) => {
              const on = selected.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(l.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-2 pr-3 text-left ring-1 transition-all",
                    on ? "bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary" : "ring-border hover:bg-accent",
                  )}
                >
                  <ItemImage src={l.image} alt="" className="size-14 shrink-0 rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 font-medium">{l.title}</span>
                  </span>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
                    )}
                  >
                    {on && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="offer-message" className="text-sm font-medium">
              {t("site.offer.message")}
            </label>
            <Textarea
              id="offer-message"
              rows={3}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("site.offer.messagePlaceholder")}
              className="text-base sm:text-sm"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            className={gradientButton}
            disabled={send.isPending}
            onClick={() => (selected.length ? send.mutate() : setError(t("site.offer.pickOne")))}
          >
            {send.isPending && <Loader2 className="animate-spin" />}
            {t("site.offer.send")}
          </Button>
        </div>
      )}
    </>
  );
}
