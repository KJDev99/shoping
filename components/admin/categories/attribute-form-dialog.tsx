"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { SimpleSelect } from "@/components/common/simple-select";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { applyFieldErrors } from "@/hooks/use-api-error";
import { useAttributeActions } from "@/hooks/use-categories";
import { isApiError } from "@/lib/api/client";
import type { MessageKey } from "@/lib/i18n/messages";
import { useT } from "@/lib/i18n/provider";
import { attributeSchema, hasOptions, hasUnit, toAttributeKey, type AttributeInput } from "@/schemas/category.schema";
import type { CategoryAttributeWithUsage } from "@/services/categories.service";
import { ATTRIBUTE_TYPES, type Category } from "@/types";

const LANGS = ["uz", "ru", "en"] as const;
const EMPTY_OPTION = { value: "", label: { uz: "", ru: "", en: "" } };

function toForm(attribute: CategoryAttributeWithUsage | null): AttributeInput {
  if (!attribute) {
    return { key: "", name: { uz: "", ru: "", en: "" }, type: "TEXT", required: false, options: [], unit: "", filterable: false, searchable: false };
  }
  return {
    key: attribute.key,
    name: { ...attribute.name },
    type: attribute.type,
    required: attribute.required,
    options: attribute.options.map((o) => ({ value: o.value, label: { ...o.label } })),
    unit: attribute.unit ?? "",
    filterable: attribute.filterable,
    searchable: attribute.searchable,
  };
}

function SwitchField({ control, name, label, hint }: { control: Control<AttributeInput>; name: "required" | "filterable" | "searchable"; label: string; hint: string }) {
  const id = `attr-${name}`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <div className="space-y-1">
            <Label htmlFor={id}>{label}</Label>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
          <Switch id={id} checked={field.value} onCheckedChange={(v) => field.onChange(v)} />
        </div>
      )}
    />
  );
}

export function AttributeFormDialog({
  category,
  attribute,
  open,
  onOpenChange,
}: {
  category: Category;
  /** null → create */
  attribute: CategoryAttributeWithUsage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const { create, update } = useAttributeActions(category.id);
  const mutation = attribute ? update : create;
  const form = useForm<AttributeInput>({ resolver: zodResolver(attributeSchema), defaultValues: toForm(attribute) });
  const options = useFieldArray({ control: form.control, name: "options" });
  const type = useWatch({ control: form.control, name: "type" });
  const enName = useWatch({ control: form.control, name: "name.en" });
  const typeLocked = !!attribute && attribute.usageCount > 0;

  useEffect(() => {
    if (!open) return;
    form.reset(toForm(attribute));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open]);

  // New attributes: the key follows the English name until the admin edits it by hand.
  const followName = !attribute && !form.formState.dirtyFields.key;
  useEffect(() => {
    if (open && followName) form.setValue("key", toAttributeKey(enName ?? ""), { shouldValidate: form.formState.isSubmitted });
  }, [enName, open, followName, form]);

  const onTypeChange = (next: AttributeInput["type"]) => {
    form.setValue("type", next, { shouldDirty: true });
    const currentOptions = form.getValues("options");
    if (!hasOptions(next) && currentOptions.length) options.replace([]);
    if (hasOptions(next) && !currentOptions.length) options.append({ ...EMPTY_OPTION, label: { ...EMPTY_OPTION.label } }, { shouldFocus: false });
    if (!hasUnit(next)) form.setValue("unit", "");
    form.clearErrors(["options", "unit"]);
  };

  /** Convenience: labels default to the option value (brand names, sizes…). */
  const fillLabels = (index: number) => {
    const value = form.getValues(`options.${index}.value`).trim();
    if (!value) return;
    for (const lang of LANGS) {
      if (!form.getValues(`options.${index}.label.${lang}`).trim()) form.setValue(`options.${index}.label.${lang}`, value);
    }
  };

  const onSubmit = form.handleSubmit((input) => {
    const handlers = {
      onSuccess: () => onOpenChange(false),
      onError: (e: unknown) => {
        if (isApiError(e) && e.code === "ATTRIBUTE_KEY_TAKEN") form.setError("key", { message: "categories.validation.keyTaken" });
        else applyFieldErrors(e, form.setError);
      },
    };
    if (attribute) update.mutate({ id: attribute.id, input }, handlers);
    else create.mutate(input, handlers);
  });

  const { errors } = form.formState;
  const optionsError = errors.options?.message ?? errors.options?.root?.message;

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" showCloseButton={!mutation.isPending}>
        <DialogHeader>
          <DialogTitle>{attribute ? t("categories.attributeForm.editTitle") : t("categories.attributeForm.createTitle")}</DialogTitle>
          <DialogDescription>{t("categories.attributeForm.description", { category: t.text(category.name) })}</DialogDescription>
        </DialogHeader>

        <form id="attribute-form" onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid gap-3 sm:grid-cols-3">
            {LANGS.map((lang) => (
              <Field key={lang} label={t(`categories.form.name.${lang}`)} htmlFor={`attr-name-${lang}`} error={errors.name?.[lang]} required>
                <Input id={`attr-name-${lang}`} lang={lang} maxLength={100} aria-invalid={!!errors.name?.[lang]} {...form.register(`name.${lang}`)} />
              </Field>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("categories.attributeForm.key")} htmlFor="attr-key" error={errors.key} hint={t("categories.attributeForm.keyHint")} required>
              <Input
                id="attr-key"
                className="font-mono"
                maxLength={50}
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!!errors.key}
                {...form.register("key")}
              />
            </Field>
            <Field
              label={t("common.fields.type")}
              error={errors.type}
              hint={typeLocked ? t("categories.attributeForm.typeLocked", { count: attribute?.usageCount ?? 0 }) : t(`categories.attributeForm.typeHints.${type}` as MessageKey)}
              required
            >
              <SimpleSelect
                value={type}
                onChange={(v) => v && onTypeChange(v)}
                options={ATTRIBUTE_TYPES.map((v) => ({ value: v, label: t(`enums.attributeType.${v}`) }))}
                disabled={typeLocked}
                aria-label={t("common.fields.type")}
              />
            </Field>
          </div>

          {hasUnit(type) && (
            <Field label={t("categories.attributeForm.unit")} htmlFor="attr-unit" error={errors.unit} hint={t("categories.attributeForm.unitHint")} className="sm:max-w-[calc(50%-0.375rem)]">
              <Input id="attr-unit" maxLength={20} aria-invalid={!!errors.unit} {...form.register("unit")} />
            </Field>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <SwitchField control={form.control} name="required" label={t("categories.attributes.columns.required")} hint={t("categories.attributeForm.requiredHint")} />
            <SwitchField control={form.control} name="filterable" label={t("categories.attributes.columns.filterable")} hint={t("categories.attributeForm.filterableHint")} />
            <SwitchField control={form.control} name="searchable" label={t("categories.attributes.columns.searchable")} hint={t("categories.attributeForm.searchableHint")} />
          </div>

          {hasOptions(type) && (
            <fieldset className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <legend className="text-sm font-medium">
                    {t("categories.attributeForm.options")}
                    <span className="text-destructive">*</span>
                  </legend>
                  <p className="text-xs text-muted-foreground">{t("categories.attributeForm.optionsHint")}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => options.append({ ...EMPTY_OPTION, label: { ...EMPTY_OPTION.label } })}>
                  <Plus /> {t("categories.attributeForm.addOption")}
                </Button>
              </div>
              {optionsError && (
                <p className="text-xs text-destructive" role="alert">
                  {t.dynamic(optionsError)}
                </p>
              )}
              <ol className="space-y-2">
                {options.fields.map((f, index) => {
                  const e = errors.options?.[index];
                  return (
                    <li key={f.id} className="rounded-lg border bg-muted/30 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t("categories.attributeForm.moveOptionUp", { n: index + 1 })}
                            disabled={index === 0}
                            onClick={() => options.move(index, index - 1)}
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t("categories.attributeForm.moveOptionDown", { n: index + 1 })}
                            disabled={index === options.fields.length - 1}
                            onClick={() => options.move(index, index + 1)}
                          >
                            <ArrowDown />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={t("categories.attributeForm.removeOption", { n: index + 1 })}
                            onClick={() => options.remove(index)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-4">
                        <Field label={t("categories.attributeForm.optionValue")} htmlFor={`opt-${f.id}-value`} error={e?.value} required>
                          <Input
                            id={`opt-${f.id}-value`}
                            maxLength={50}
                            aria-invalid={!!e?.value}
                            {...form.register(`options.${index}.value`, { onBlur: () => fillLabels(index) })}
                          />
                        </Field>
                        {LANGS.map((lang) => (
                          <Field key={lang} label={t(`categories.attributeForm.optionLabel.${lang}`)} htmlFor={`opt-${f.id}-${lang}`} error={e?.label?.[lang]} required>
                            <Input id={`opt-${f.id}-${lang}`} lang={lang} maxLength={50} aria-invalid={!!e?.label?.[lang]} {...form.register(`options.${index}.label.${lang}`)} />
                          </Field>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ol>
              {options.fields.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{t("categories.attributeForm.noOptions")}</p>}
            </fieldset>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" form="attribute-form" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="animate-spin" />}
            {attribute ? t("common.actions.saveChanges") : t("common.actions.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
