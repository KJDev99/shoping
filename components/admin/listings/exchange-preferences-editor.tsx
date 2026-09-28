"use client";

import { Info } from "lucide-react";
import { Controller, useWatch, type FieldError, type UseFormReturn } from "react-hook-form";
import { SimpleSelect } from "@/components/common/simple-select";
import { Field } from "@/components/forms/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLookups } from "@/hooks/use-lookups";
import { useT } from "@/lib/i18n/provider";
import type { ListingUpdateInput } from "@/schemas/listing.schema";
import { ITEM_CONDITIONS, type ItemCondition } from "@/types";
import { ChipInput } from "./chip-input";
import { MultiSelect } from "./multi-select";
import { useCategoryOptions } from "./use-category-options";

type ErrorLike = { message?: string } | (ErrorLike | undefined)[] | undefined;

/** First message of a field error, including array item errors (e.g. `keywords.2`). */
function firstError(e: unknown): FieldError | undefined {
  const err = e as ErrorLike;
  if (!err) return undefined;
  if (!Array.isArray(err) && err.message) return err as FieldError;
  const items = Array.isArray(err) ? err : Object.values(err as Record<string, unknown>);
  for (const item of items) {
    if (item && typeof item === "object" && "message" in item && typeof item.message === "string") return item as FieldError;
  }
  return undefined;
}

/**
 * Editor for a listing's exchange preferences: what the owner wants in return.
 * Cash difference is negotiation metadata only and can only be edited when the
 * platform setting allows it; otherwise any existing value is preserved as is.
 */
export function ExchangePreferencesEditor({ form }: { form: UseFormReturn<ListingUpdateInput> }) {
  const t = useT();
  const { data: lookups } = useLookups();
  const cats = useCategoryOptions();
  const { control, register } = form;
  const errors = form.formState.errors.exchangePreferences;
  const openToOffers = useWatch({ control, name: "exchangePreferences.openToOffers" });
  const cash = useWatch({ control, name: "exchangePreferences.cashDifference" });
  const allowCash = lookups?.settings.allowCashDifference ?? false;
  const regionOptions = (lookups?.regions ?? []).map((r) => ({ value: r.id, label: t.text(r.name) }));

  return (
    <div className="space-y-4">
      <Controller
        control={control}
        name="exchangePreferences.openToOffers"
        render={({ field }) => (
          <label htmlFor="pref-open" className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">{t("listings.preferences.openToOffers")}</span>
              <span className="block text-xs text-muted-foreground">{t("listings.preferences.openToOffersHint")}</span>
            </span>
            <Switch id="pref-open" checked={field.value} onCheckedChange={(checked) => field.onChange(checked)} />
          </label>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="exchangePreferences.categories"
          render={({ field }) => (
            <Field label={t("listings.preferences.categories")} htmlFor="pref-categories" error={firstError(errors?.categories)}>
              <MultiSelect
                id="pref-categories"
                value={field.value}
                onChange={field.onChange}
                options={cats.parentOptions}
                placeholder={t("listings.edit.categoriesPlaceholder")}
                invalid={!!errors?.categories}
              />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="exchangePreferences.subcategories"
          render={({ field }) => (
            <Field label={t("listings.preferences.subcategories")} htmlFor="pref-subcategories" error={firstError(errors?.subcategories)}>
              <MultiSelect
                id="pref-subcategories"
                value={field.value}
                onChange={field.onChange}
                options={cats.subcategoryOptions}
                placeholder={t("listings.edit.subcategoriesPlaceholder")}
                invalid={!!errors?.subcategories}
              />
            </Field>
          )}
        />
      </div>

      <Controller
        control={control}
        name="exchangePreferences.keywords"
        render={({ field }) => (
          <Field label={t("listings.preferences.keywords")} htmlFor="pref-keywords" error={firstError(errors?.keywords)} hint={t("listings.edit.keywordsHint")}>
            <ChipInput
              id="pref-keywords"
              value={field.value}
              onChange={field.onChange}
              placeholder={t("listings.edit.keywordsPlaceholder")}
              invalid={!!errors?.keywords}
            />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="exchangePreferences.conditions"
        render={({ field }) => (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("listings.preferences.conditions")}</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {ITEM_CONDITIONS.map((c) => {
                const checked = field.value.includes(c);
                return (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(on) =>
                        field.onChange(on ? ITEM_CONDITIONS.filter((x): x is ItemCondition => x === c || field.value.includes(x)) : field.value.filter((x) => x !== c))
                      }
                    />
                    {t(`enums.itemCondition.${c}`)}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{!field.value.length && t("listings.preferences.anyCondition")}</p>
          </fieldset>
        )}
      />

      <Controller
        control={control}
        name="exchangePreferences.regionIds"
        render={({ field }) => (
          <Field label={t("listings.preferences.regions")} htmlFor="pref-regions" error={firstError(errors?.regionIds)}>
            <MultiSelect id="pref-regions" value={field.value} onChange={field.onChange} options={regionOptions} placeholder={t("listings.edit.regionsPlaceholder")} />
          </Field>
        )}
      />

      <Field label={t("listings.preferences.note")} htmlFor="pref-note" error={firstError(errors?.note)}>
        <Textarea
          id="pref-note"
          rows={2}
          maxLength={300}
          placeholder={openToOffers ? undefined : t("listings.edit.notePlaceholder")}
          {...register("exchangePreferences.note", { setValueAs: (v: string | null) => (v?.trim() ? v : null) })}
        />
      </Field>

      {allowCash ? (
        <div className="space-y-3 rounded-lg border p-3">
          <label htmlFor="pref-cash" className="flex items-center justify-between gap-3 text-sm font-medium">
            {t("listings.edit.cashEnable")}
            <Switch
              id="pref-cash"
              checked={!!cash}
              onCheckedChange={(on) => form.setValue("exchangePreferences.cashDifference", on ? { direction: "WILL_ADD", note: "" } : null, { shouldDirty: true })}
            />
          </label>
          {cash && (
            <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
              <Controller
                control={control}
                name="exchangePreferences.cashDifference.direction"
                render={({ field }) => (
                  <Field label={t("listings.edit.cashDirectionLabel")}>
                    <SimpleSelect
                      value={field.value}
                      onChange={(v) => v && field.onChange(v)}
                      options={(["WILL_ADD", "EXPECTS"] as const).map((d) => ({ value: d, label: t(`listings.preferences.cashDirection.${d}`) }))}
                    />
                  </Field>
                )}
              />
              <Field label={t("listings.edit.cashNoteLabel")} htmlFor="pref-cash-note" error={firstError(errors?.cashDifference)}>
                <Input id="pref-cash-note" maxLength={300} placeholder={t("listings.edit.cashNotePlaceholder")} {...register("exchangePreferences.cashDifference.note")} />
              </Field>
            </div>
          )}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="size-3.5 shrink-0" aria-hidden />
            {t("listings.preferences.cashHint")}
          </p>
        </div>
      ) : (
        cash && (
          <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <p>
              {t("listings.edit.cashDisabled")}
              <span className="mt-1 block text-foreground">
                {t(`listings.preferences.cashDirection.${cash.direction}`)} — {cash.note}
              </span>
            </p>
          </div>
        )
      )}
    </div>
  );
}
