"use client";

import { Cpu } from "lucide-react";
import type { ReactNode } from "react";
import { BarterComparison, type ComparisonSide } from "@/components/admin/shared/barter-comparison";
import { DateCell } from "@/components/common/cells";
import { Section } from "@/components/common/info-list";
import { Pill, StatusBadge } from "@/components/common/status-badge";
import { useLookupNames } from "@/hooks/use-lookups";
import { SCORE_MAX } from "@/lib/matching/rules-engine";
import { useT } from "@/lib/i18n/provider";
import type { BarterMatchDetail } from "@/services/matches.service";
import type { ExchangePreference, MatchScoreBreakdown } from "@/types";
import { CheckLine } from "./match-parts";

const BREAKDOWN_KEYS = ["category", "keywords", "location", "condition"] as const satisfies readonly (keyof MatchScoreBreakdown)[];

function ScoreBreakdown({ breakdown }: { breakdown: MatchScoreBreakdown }) {
  const t = useT();
  return (
    <div className="space-y-3">
      {BREAKDOWN_KEYS.map((k) => (
        <div key={k} className="space-y-1">
          <div className="flex items-baseline justify-between text-sm">
            <span>{t(`matches.detail.breakdown.${k}`)}</span>
            <span className="text-muted-foreground tabular-nums">
              <span className="font-medium text-foreground">{breakdown[k]}</span> / {SCORE_MAX[k]}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-chart-1" style={{ width: `${(breakdown[k] / SCORE_MAX[k]) * 100}%` }} />
          </div>
        </div>
      ))}
      <div className="flex items-baseline justify-between border-t pt-3 text-sm font-semibold">
        <span>{t("matches.detail.breakdown.total")}</span>
        <span className="tabular-nums">{t("matches.detail.scoreOutOf", { score: breakdown.total })}</span>
      </div>
    </div>
  );
}

function Chips({ values, empty }: { values: ReactNode[]; empty: string }) {
  if (!values.length) return <span className="text-sm text-muted-foreground">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v, i) => (
        <Pill key={i} tone="neutral">
          {v}
        </Pill>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Wishes({ title, prefs }: { title: string; prefs: ExchangePreference }) {
  const t = useT();
  const names = useLookupNames();
  const none = t("matches.detail.none");
  const cats = [...new Set([...prefs.categories, ...prefs.subcategories])];
  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      {prefs.openToOffers && <Pill tone="info">{t("matches.detail.openToAll")}</Pill>}
      <Field label={t("matches.detail.wantsCategories")}>
        <Chips values={cats.map((c) => names.category(c))} empty={none} />
      </Field>
      <Field label={t("matches.detail.wantsKeywords")}>
        <Chips values={prefs.keywords} empty={none} />
      </Field>
      <Field label={t("matches.detail.wantedConditions")}>
        <Chips values={prefs.conditions.map((c) => t(`enums.itemCondition.${c}`))} empty={t("matches.detail.anyCondition")} />
      </Field>
      <Field label={t("matches.detail.wantedRegions")}>
        <Chips values={prefs.regionIds.map((r) => names.region(r))} empty={t("matches.detail.anyRegion")} />
      </Field>
      {prefs.note && (
        <Field label={t("matches.detail.note")}>
          <p className="text-sm">{prefs.note}</p>
        </Field>
      )}
    </div>
  );
}

/** "Why matched" view shared by the side sheet and the full page. */
export function MatchDetailView({ match }: { match: BarterMatchDetail }) {
  const t = useT();
  const names = useLookupNames();
  const { reason } = match;

  const side = (label: string, l: BarterMatchDetail["listingA"], owner: BarterMatchDetail["ownerA"], code: string): ComparisonSide => ({
    label,
    user: owner,
    items: [{ id: l.id, title: l.title, image: l.image, condition: l.condition, categoryId: l.categoryId, status: l.status }],
    footer: (
      <p className="text-xs text-muted-foreground">
        <span className="font-mono">{code}</span> · {names.region(l.regionId)}
      </p>
    ),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge kind="matchType" value={match.type} />
        <Pill tone="primary">{t("matches.detail.scoreOutOf", { score: match.score })}</Pill>
        <Pill tone="muted">
          <Cpu className="size-3" aria-hidden />
          {match.engine}
        </Pill>
        <span className="text-xs text-muted-foreground">
          {t("matches.detail.computedAt")}: <DateCell value={match.computedAt} />
        </span>
      </div>

      <BarterComparison
        left={side(t("matches.detail.sideA"), match.listingA, match.ownerA, match.codeA)}
        right={side(t("matches.detail.sideB"), match.listingB, match.ownerB, match.codeB)}
        center={<span className="text-sm font-semibold tabular-nums">{match.score}</span>}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title={t("matches.detail.whyMatched")}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <CheckLine ok={reason.aSatisfiesB}>{t("matches.detail.aSatisfiesB")}</CheckLine>
              <CheckLine ok={reason.bSatisfiesA}>{t("matches.detail.bSatisfiesA")}</CheckLine>
              {reason.openToOffers && <CheckLine ok>{t("matches.detail.openToOffers")}</CheckLine>}
            </div>
            <Field label={t("matches.detail.matchingCategories")}>
              <Chips values={reason.matchingCategories.map((c) => names.category(c))} empty={t("matches.detail.none")} />
            </Field>
            <Field label={t("matches.detail.matchingKeywords")}>
              <Chips values={reason.matchingKeywords} empty={t("matches.detail.none")} />
            </Field>
            <Field label={t("matches.compat.location")}>
              <div className="space-y-1">
                <CheckLine ok={reason.locationCompatible}>{reason.locationCompatible ? t("matches.compat.locationOk") : t("matches.compat.locationNo")}</CheckLine>
                <CheckLine ok={reason.sameRegion}>
                  {t("matches.compat.sameRegion")}: {names.region(match.listingA.regionId)} · {names.region(match.listingB.regionId)}
                </CheckLine>
              </div>
            </Field>
            <Field label={t("matches.compat.condition")}>
              <div className="space-y-1">
                <CheckLine ok={reason.conditionCompatible}>{reason.conditionCompatible ? t("matches.compat.conditionOk") : t("matches.compat.conditionNo")}</CheckLine>
                <p className="flex flex-wrap items-center gap-1.5 pl-6 text-xs text-muted-foreground">
                  A: <StatusBadge kind="itemCondition" value={match.listingA.condition} dot={false} /> B:{" "}
                  <StatusBadge kind="itemCondition" value={match.listingB.condition} dot={false} />
                </p>
              </div>
            </Field>
          </div>
        </Section>

        <Section title={t("matches.detail.scoreBreakdown")}>
          <ScoreBreakdown breakdown={match.breakdown} />
        </Section>
      </div>

      <Section title={t("matches.detail.wishes")}>
        <div className="grid gap-3 md:grid-cols-2">
          <Wishes title={t("matches.detail.sideA")} prefs={match.preferencesA} />
          <Wishes title={t("matches.detail.sideB")} prefs={match.preferencesB} />
        </div>
      </Section>
    </div>
  );
}
