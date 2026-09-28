"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Handshake, Loader2, Package, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ItemImage, UserAvatar } from "@/components/common/cells";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useT } from "@/lib/i18n/provider";
import { commonService } from "@/services/common.service";
import type { BarterRequestStatus, ExchangeStatus } from "@/types";

/**
 * Global search across users, listings, barter requests and exchanges
 * (phone, email, title, BAR-1234…). Results come grouped from the API.
 */
export function GlobalSearch() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q.trim(), 300);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const query = useQuery({
    queryKey: ["search", debounced],
    queryFn: ({ signal }) => commonService.search(debounced, signal),
    enabled: open && debounced.length >= 2,
    staleTime: 15_000,
  });

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  const r = query.data;
  const total = r ? r.users.length + r.listings.length + r.barterRequests.length + r.exchanges.length : 0;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-8 w-full max-w-sm justify-start gap-2 bg-muted/40 px-2.5 text-muted-foreground sm:w-64 lg:w-80"
        aria-label={t("header.searchTitle")}
      >
        <Search className="size-4" />
        <span className="hidden truncate text-sm font-normal sm:inline">{t("header.searchPlaceholder")}</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 font-mono text-[10px] lg:inline">{t("header.searchShortcut")}</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title={t("header.searchTitle")} description={t("header.searchPlaceholder")} className="sm:max-w-xl">
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={setQ} placeholder={t("header.searchPlaceholder")} />
          <CommandList className="max-h-[60vh]">
            {debounced.length < 2 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("header.searchHint")}</p>
            ) : query.isFetching && !r ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {total === 0 && <CommandEmpty>{t("header.searchEmpty", { q: debounced })}</CommandEmpty>}
                {!!r?.users.length && (
                  <CommandGroup heading={t("header.searchGroups.users")}>
                    {r.users.map((u) => (
                      <CommandItem key={u.id} value={`u-${u.id}`} onSelect={() => go(`/admin/users/${u.id}`)}>
                        <UserAvatar name={u.fullName} src={u.avatar} className="size-6" />
                        <span className="truncate">{u.fullName}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{u.phone}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {!!r?.listings.length && (
                  <CommandGroup heading={t("header.searchGroups.listings")}>
                    {r.listings.map((l) => (
                      <CommandItem key={l.id} value={`l-${l.id}`} onSelect={() => go(`/admin/listings/${l.id}`)}>
                        <ItemImage src={l.image} alt={l.title} className="size-6 rounded" />
                        <span className="truncate">{l.title}</span>
                        <span className="ml-auto font-mono text-xs text-muted-foreground">{l.code}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {!!r?.barterRequests.length && (
                  <CommandGroup heading={t("header.searchGroups.barterRequests")}>
                    {r.barterRequests.map((b) => (
                      <CommandItem key={b.id} value={`b-${b.id}`} onSelect={() => go(`/admin/barter-requests/${b.id}`)}>
                        <ArrowLeftRight className="text-muted-foreground" />
                        <span className="font-mono text-xs">{b.code}</span>
                        <span className="truncate text-muted-foreground">
                          {b.senderName} → {b.receiverName}
                        </span>
                        <StatusBadge kind="barterStatus" value={b.status as BarterRequestStatus} className="ml-auto" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {!!r?.exchanges.length && (
                  <CommandGroup heading={t("header.searchGroups.exchanges")}>
                    {r.exchanges.map((e) => (
                      <CommandItem key={e.id} value={`e-${e.id}`} onSelect={() => go(`/admin/exchanges/${e.id}`)}>
                        <Handshake className="text-muted-foreground" />
                        <span className="font-mono text-xs">{e.code}</span>
                        <span className="truncate text-muted-foreground">
                          {e.participantNames[0]} ↔ {e.participantNames[1]}
                        </span>
                        <StatusBadge kind="exchangeStatus" value={e.status as ExchangeStatus} className="ml-auto" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
          <div className="flex items-center gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
            <Users className="size-3.5" /> <Package className="size-3.5" /> <ArrowLeftRight className="size-3.5" /> <Handshake className="size-3.5" />
            <span className="ml-auto">+998…, iPhone 12, user@mail.uz, BAR-1000</span>
          </div>
        </Command>
      </CommandDialog>
    </>
  );
}
