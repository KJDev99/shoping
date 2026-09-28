"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, type ReactNode } from "react";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";
import { SimpleSelect } from "@/components/common/simple-select";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { applyFieldErrors } from "@/hooks/use-api-error";
import { useListingActions } from "@/hooks/use-listings";
import { useLookups } from "@/hooks/use-lookups";
import { useT } from "@/lib/i18n/provider";
import { attributesFor, listingUpdateSchema, validateListingAttributes, type ListingUpdateInput } from "@/schemas/listing.schema";
import { ITEM_CONDITIONS, type CategoryAttribute, type Listing, type ListingAttributeValue } from "@/types";
import { AttributeInputs } from "./attribute-inputs";
import { ExchangePreferencesEditor } from "./exchange-preferences-editor";
import { useCategoryOptions } from "./use-category-options";

function normalizeAttributes(defs: CategoryAttribute[], values: Record<string, ListingAttributeValue>) {
  const out: Record<string, ListingAttributeValue> = {};
  for (const def of defs) {
    const v = values[def.id];
    if (v === undefined) continue;
    out[def.id] = def.type === "SELECT" && typeof v === "number" ? String(v) : v;
  }
  return out;
}

function toForm(l: Listing, attrs: CategoryAttribute[]): ListingUpdateInput {
  const p = l.exchangePreferences;
  return {
    title: l.title,
    description: l.description,
    categoryId: l.categoryId,
    subcategoryId: l.subcategoryId,
    condition: l.condition,
    regionId: l.regionId,
    districtId: l.districtId,
    location: l.location ?? "",
    attributes: normalizeAttributes(attributesFor(attrs, l.categoryId, l.subcategoryId), l.attributes),
    exchangePreferences: {
      openToOffers: p.openToOffers,
      categories: [...p.categories],
      subcategories: [...p.subcategories],
      keywords: [...p.keywords],
      conditions: [...p.conditions],
      regionIds: [...p.regionIds],
      note: p.note ?? "",
      cashDifference: p.cashDifference ? { ...p.cashDifference } : null,
    },
  };
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="border-b pb-2 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function ListingEditSheet({ listing, open, onOpenChange }: { listing: Listing; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const { data: lookups } = useLookups();
  const cats = useCategoryOptions();
  const { update } = useListingActions();
  const allAttrs = useMemo(() => lookups?.attributes ?? [], [lookups]);
  const form = useForm<ListingUpdateInput>({ resolver: zodResolver(listingUpdateSchema), defaultValues: toForm(listing, allAttrs) });
  const [categoryId, subcategoryId, regionId] = useWatch({ control: form.control, name: ["categoryId", "subcategoryId", "regionId"] });
  const defs = useMemo(() => attributesFor(allAttrs, categoryId, subcategoryId), [allAttrs, categoryId, subcategoryId]);

  useEffect(() => {
    if (open) form.reset(toForm(listing, allAttrs));
  }, [open, listing, allAttrs, form]);

  /** Keeps only attribute values that still apply after a category change. */
  const pruneAttributes = (nextCategory: string | null, nextSub: string | null) => {
    const keep = new Set(attributesFor(allAttrs, nextCategory, nextSub).map((a) => a.id));
    const current = form.getValues("attributes");
    form.setValue("attributes", Object.fromEntries(Object.entries(current).filter(([k]) => keep.has(k))), { shouldDirty: true });
    form.clearErrors("attributes");
  };

  const onSubmit = form.handleSubmit((input) => {
    const checked = validateListingAttributes(defs, input.attributes);
    const attrErrors = Object.entries(checked.errors);
    if (attrErrors.length) {
      for (const [key, messages] of attrErrors) form.setError(key as Path<ListingUpdateInput>, { type: "validate", message: messages[0] });
      return;
    }
    update.mutate(
      {
        id: listing.id,
        input: {
          ...input,
          attributes: checked.values,
          location: input.location?.trim() || null,
          exchangePreferences: { ...input.exchangePreferences, note: input.exchangePreferences.note?.trim() || null },
        },
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e) => applyFieldErrors(e, form.setError),
      },
    );
  });

  const { errors } = form.formState;
  const districts = lookups?.districts.filter((d) => d.regionId === regionId) ?? [];
  const subcategories = cats.childrenOf(categoryId);

  return (
    <Sheet open={open} onOpenChange={(o) => !update.isPending && onOpenChange(o)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{t("listings.edit.title")}</SheetTitle>
          <SheetDescription>
            {listing.code} · {t("listings.edit.description")}
          </SheetDescription>
        </SheetHeader>
        <form id="listing-edit-form" onSubmit={onSubmit} className="space-y-8 px-4 pb-4" noValidate>
          <FormSection title={t("listings.edit.sections.basic")}>
            <Field label={t("common.fields.title")} htmlFor="title" error={errors.title} required>
              <Input id="title" maxLength={120} aria-invalid={!!errors.title} {...form.register("title")} />
            </Field>
            <Field label={t("common.fields.description")} htmlFor="description" error={errors.description} required>
              <Textarea id="description" rows={5} maxLength={5000} aria-invalid={!!errors.description} {...form.register("description")} />
            </Field>
            <Controller
              control={form.control}
              name="condition"
              render={({ field }) => (
                <Field label={t("common.fields.condition")} htmlFor="condition" error={errors.condition} required>
                  <SimpleSelect
                    id="condition"
                    value={field.value}
                    onChange={(v) => v && field.onChange(v)}
                    options={ITEM_CONDITIONS.map((c) => ({ value: c, label: t(`enums.itemCondition.${c}`) }))}
                    invalid={!!errors.condition}
                  />
                </Field>
              )}
            />
          </FormSection>

          <FormSection title={t("listings.edit.sections.category")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Field label={t("common.fields.category")} htmlFor="categoryId" error={errors.categoryId} required>
                    <SimpleSelect
                      id="categoryId"
                      value={field.value}
                      onChange={(v) => {
                        if (!v || v === field.value) return;
                        field.onChange(v);
                        form.setValue("subcategoryId", null, { shouldDirty: true });
                        pruneAttributes(v, null);
                      }}
                      placeholder={t("listings.edit.selectCategory")}
                      options={cats.parentOptions}
                      invalid={!!errors.categoryId}
                    />
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="subcategoryId"
                render={({ field }) => (
                  <Field label={t("common.fields.subcategory")} htmlFor="subcategoryId" error={errors.subcategoryId}>
                    <SimpleSelect
                      id="subcategoryId"
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v);
                        pruneAttributes(categoryId, v);
                      }}
                      clearLabel={t("listings.edit.noSubcategory")}
                      options={subcategories.map((c) => ({ value: c.id, label: t.text(c.name) }))}
                      disabled={!subcategories.length}
                      invalid={!!errors.subcategoryId}
                    />
                  </Field>
                )}
              />
            </div>
          </FormSection>

          <FormSection title={t("listings.edit.sections.attributes")}>
            <AttributeInputs defs={defs} control={form.control} errorFor={(id) => form.getFieldState(`attributes.${id}`, form.formState).error} />
          </FormSection>

          <FormSection title={t("listings.edit.sections.location")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="regionId"
                render={({ field }) => (
                  <Field label={t("common.fields.region")} htmlFor="regionId" error={errors.regionId} required>
                    <SimpleSelect
                      id="regionId"
                      value={field.value}
                      onChange={(v) => {
                        if (!v || v === field.value) return;
                        field.onChange(v);
                        form.setValue("districtId", null, { shouldDirty: true });
                      }}
                      options={(lookups?.regions ?? []).map((r) => ({ value: r.id, label: t.text(r.name) }))}
                      invalid={!!errors.regionId}
                    />
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="districtId"
                render={({ field }) => (
                  <Field label={t("common.fields.district")} htmlFor="districtId" error={errors.districtId}>
                    <SimpleSelect
                      id="districtId"
                      value={field.value}
                      onChange={(v) => field.onChange(v)}
                      clearLabel={t("common.misc.notSet")}
                      options={districts.map((d) => ({ value: d.id, label: t.text(d.name) }))}
                      invalid={!!errors.districtId}
                    />
                  </Field>
                )}
              />
            </div>
            <Field label={t("listings.detail.address")} htmlFor="location" error={errors.location}>
              <Input id="location" maxLength={120} placeholder={t("listings.edit.locationPlaceholder")} {...form.register("location")} />
            </Field>
          </FormSection>

          <FormSection title={t("listings.edit.sections.preferences")}>
            <ExchangePreferencesEditor form={form} />
          </FormSection>
        </form>
        <SheetFooter className="sticky bottom-0 flex-row justify-end border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" form="listing-edit-form" disabled={update.isPending}>
            {update.isPending && <Loader2 className="animate-spin" />}
            {t("common.actions.saveChanges")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
