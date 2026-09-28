"use client";

import { Handshake, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Section } from "@/components/common/info-list";
import { Pill, StatusBadge } from "@/components/common/status-badge";
import { useLookupNames } from "@/hooks/use-lookups";
import { useT } from "@/lib/i18n/provider";
import type { ExchangePreference } from "@/types";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[11rem_1fr] sm:gap-3">
      <dt className="text-xs text-muted-foreground sm:pt-0.5">{label}</dt>
      <dd className="flex min-w-0 flex-wrap gap-1.5 text-sm">{children}</dd>
    </div>
  );
}

/** Read-only view of what a listing's owner wants in return. Reusable on barter/match pages. */
export function ExchangePreferencesCard({ preferences: p, className, action }: { preferences: ExchangePreference; className?: string; action?: ReactNode }) {
  const t = useT();
  const names = useLookupNames();
  const none = <span className="text-muted-foreground">{t("listings.preferences.none")}</span>;
  const chips = (ids: string[], label: (id: string) => string) => (ids.length ? ids.map((id) => <Pill key={id}>{label(id)}</Pill>) : none);

  return (
    <Section title={t("listings.preferences.title")} description={t("listings.preferences.description")} action={action} className={className}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {p.openToOffers ? (
            <Pill tone="success" dot>
              <Sparkles className="size-3" aria-hidden />
              {t("listings.preferences.openToOffers")}
            </Pill>
          ) : (
            <Pill tone="info" dot>
              {t("listings.preferences.specific")}
            </Pill>
          )}
        </div>
        <dl className="space-y-3">
          <Row label={t("listings.preferences.categories")}>{chips(p.categories, names.category)}</Row>
          <Row label={t("listings.preferences.subcategories")}>{chips(p.subcategories, names.category)}</Row>
          <Row label={t("listings.preferences.keywords")}>
            {p.keywords.length
              ? p.keywords.map((k) => (
                  <Pill key={k} tone="primary">
                    {k}
                  </Pill>
                ))
              : none}
          </Row>
          <Row label={t("listings.preferences.conditions")}>
            {p.conditions.length ? (
              p.conditions.map((c) => <StatusBadge key={c} kind="itemCondition" value={c} dot={false} />)
            ) : (
              <span className="text-muted-foreground">{t("listings.preferences.anyCondition")}</span>
            )}
          </Row>
          <Row label={t("listings.preferences.regions")}>
            {p.regionIds.length ? chips(p.regionIds, names.region) : <span className="text-muted-foreground">{t("listings.preferences.anyRegion")}</span>}
          </Row>
          <Row label={t("listings.preferences.note")}>
            {p.note ? <p className="border-l-2 pl-3 whitespace-pre-line text-foreground italic">{p.note}</p> : none}
          </Row>
        </dl>
        {p.cashDifference && (
          <div className="flex items-start gap-3 rounded-lg border border-dashed p-3">
            <Handshake className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 space-y-0.5 text-sm">
              <p className="text-xs font-medium text-muted-foreground">{t("listings.preferences.cashDifference")}</p>
              <p>{t(`listings.preferences.cashDirection.${p.cashDifference.direction}`)}</p>
              {p.cashDifference.note && <p className="text-muted-foreground">“{p.cashDifference.note}”</p>}
              <p className="text-xs text-muted-foreground">{t("listings.preferences.cashHint")}</p>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
