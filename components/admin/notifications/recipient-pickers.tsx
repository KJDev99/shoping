"use client";

import { Check, Loader2, MapPin, Search, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { UserAvatar } from "@/components/common/cells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useLookupNames } from "@/hooks/use-lookups";
import { useNotificationUserOptions } from "@/hooks/use-notifications";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { NotificationUserOption } from "@/services/notifications.service";

/** Removable chip used for selected users/regions. */
export function SelectionChip({ label, onRemove, removeLabel, disabled }: { label: string; onRemove: () => void; removeLabel: string; disabled?: boolean }) {
  return (
    <span className="inline-flex h-6 max-w-full items-center gap-1 rounded-md bg-secondary pr-1 pl-2 text-xs text-secondary-foreground">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="rounded-sm p-0.5 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-50"
        aria-label={removeLabel}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

/** Multi-select of regions from lookups. */
export function RegionMultiSelect({ value, onChange, invalid, disabled }: { value: string[]; onChange: (ids: string[]) => void; invalid?: boolean; disabled?: boolean }) {
  const t = useT();
  const names = useLookupNames();
  const [q, setQ] = useState("");
  const regions = [...(names.lookups?.regions ?? [])].filter((r) => r.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const shown = q ? regions.filter((r) => t.text(r.name).toLowerCase().includes(q.toLowerCase())) : regions;
  const selected = new Set(value);
  const toggle = (id: string) => onChange(selected.has(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger
          render={<Button type="button" variant="outline" className={cn("w-full justify-start font-normal text-muted-foreground", invalid && "border-destructive")} disabled={disabled} />}
        >
          <MapPin /> {value.length ? t("common.filters.selectedCount", { count: value.length }) : t("notifications.form.selectRegions")}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) min-w-64 p-1">
          <div className="p-1">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.actions.search")} className="h-8" />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {shown.length === 0 && <p className="px-2 py-4 text-center text-sm text-muted-foreground">{t("common.filters.noOptions")}</p>}
            {shown.map((r) => {
              const isSel = selected.has(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggle(r.id)}
                  role="menuitemcheckbox"
                  aria-checked={isSel}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-sm border", isSel ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                    {isSel && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{t.text(r.name)}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{r.usersCount}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <SelectionChip
              key={id}
              label={names.region(id)}
              disabled={disabled}
              removeLabel={t("notifications.form.removeUser", { name: names.region(id) })}
              onRemove={() => onChange(value.filter((x) => x !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Searchable multi-pick of marketplace users (server-side search). Selected
 * users are remembered locally so their names stay visible across searches.
 */
export function UserMultiPicker({
  value,
  onChange,
  invalid,
  disabled,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [known, setKnown] = useState<Map<string, NotificationUserOption>>(new Map());
  const debounced = useDebouncedValue(search.trim(), 300);
  const query = useNotificationUserOptions(debounced, open);
  const selected = new Set(value);

  const toggle = (u: NotificationUserOption) => {
    setKnown((prev) => new Map(prev).set(u.id, u));
    onChange(selected.has(u.id) ? value.filter((id) => id !== u.id) : [...value, u.id]);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={<Button type="button" variant="outline" className={cn("w-full justify-start font-normal text-muted-foreground", invalid && "border-destructive")} disabled={disabled} />}
        >
          <UserPlus /> {value.length ? t("notifications.form.selectedUsers", { count: value.length }) : t("notifications.form.searchUsers")}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) min-w-72 p-1">
          <div className="relative p-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("notifications.form.searchUsers")} className="h-8 pl-8" />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {query.isPending ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : !query.data?.length ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("notifications.form.noUsers")}</p>
            ) : (
              query.data.map((u) => {
                const isSel = selected.has(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggle(u)}
                    role="menuitemcheckbox"
                    aria-checked={isSel}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-sm border", isSel ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                      {isSel && <Check className="size-3" />}
                    </span>
                    <UserAvatar name={u.fullName} src={u.avatar} className="size-6" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{u.fullName}</span>
                      <span className="block truncate text-xs text-muted-foreground tabular-nums">{u.phone}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const name = known.get(id)?.fullName ?? id;
            return (
              <SelectionChip
                key={id}
                label={name}
                disabled={disabled}
                removeLabel={t("notifications.form.removeUser", { name })}
                onRemove={() => onChange(value.filter((x) => x !== id))}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
