"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ItemImage } from "@/components/common/cells";
import { SimpleSelect } from "@/components/common/simple-select";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { applyFieldErrors } from "@/hooks/use-api-error";
import { useCategoryActions } from "@/hooks/use-categories";
import { isApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { categorySchema, slugify, type CategoryInput } from "@/schemas/category.schema";
import { CATEGORY_STATUSES, type Category, type CategoryNode } from "@/types";
import { CATEGORY_ICON_NAMES, CATEGORY_ICONS } from "./category-icon";

export type CategoryFormMode = { kind: "create"; parentId: string | null } | { kind: "edit"; category: Category; hasChildren: boolean };

const LANGS = ["uz", "ru", "en"] as const;

function toForm(mode: CategoryFormMode): CategoryInput {
  if (mode.kind === "edit") {
    const c = mode.category;
    return { name: { ...c.name }, slug: c.slug, icon: c.icon, image: c.image ?? "", parentId: c.parentId, status: c.status };
  }
  return { name: { uz: "", ru: "", en: "" }, slug: "", icon: mode.parentId ? null : "Package", image: "", parentId: mode.parentId, status: "ACTIVE" };
}

export function CategoryFormSheet({
  mode,
  open,
  onOpenChange,
  tree,
  onSaved,
}: {
  mode: CategoryFormMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tree: CategoryNode[];
  onSaved?: (category: Category) => void;
}) {
  const t = useT();
  const { create, update } = useCategoryActions();
  const mutation = mode.kind === "create" ? create : update;
  const form = useForm<CategoryInput>({ resolver: zodResolver(categorySchema), defaultValues: toForm(mode) });
  const enName = useWatch({ control: form.control, name: "name.en" });
  const image = useWatch({ control: form.control, name: "image" });
  const parentId = useWatch({ control: form.control, name: "parentId" });

  useEffect(() => {
    if (!open) return;
    form.reset(toForm(mode));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the sheet opens
  }, [open]);

  // In create mode the slug follows the English name until the admin edits it by hand
  // (programmatic setValue calls don't mark the field dirty).
  const followName = mode.kind === "create" && !form.formState.dirtyFields.slug;
  useEffect(() => {
    if (open && followName) form.setValue("slug", slugify(enName ?? ""), { shouldValidate: form.formState.isSubmitted });
  }, [enName, open, followName, form]);

  const onSubmit = form.handleSubmit((input) => {
    const payload: CategoryInput = { ...input, image: input.image || null, icon: input.icon || null };
    const options = {
      onSuccess: (category: Category) => {
        onOpenChange(false);
        onSaved?.(category);
      },
      onError: (e: unknown) => {
        if (isApiError(e) && e.code === "SLUG_TAKEN") form.setError("slug", { message: "categories.validation.slugTaken" });
        else applyFieldErrors(e, form.setError);
      },
    };
    if (mode.kind === "create") create.mutate(payload, options);
    else update.mutate({ id: mode.category.id, input: payload }, options);
  });

  const { errors } = form.formState;
  const selfId = mode.kind === "edit" ? mode.category.id : null;
  const parentLocked = mode.kind === "edit" && mode.hasChildren;
  const parentOptions = tree.filter((n) => n.id !== selfId).map((n) => ({ value: n.id, label: t.text(n.name) }));
  const parentName = parentId ? t.text(tree.find((n) => n.id === parentId)?.name) : null;
  const title =
    mode.kind === "edit"
      ? t("categories.form.editTitle")
      : mode.parentId && parentName
        ? t("categories.form.createSubTitle", { parent: parentName })
        : t("categories.form.createTitle");
  const imagePreview = image && (/^https?:\/\//i.test(image) || image.startsWith("/")) ? image : null;

  return (
    <Sheet open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{t("categories.form.description")}</SheetDescription>
        </SheetHeader>
        <form id="category-form" onSubmit={onSubmit} className="space-y-5 px-4" noValidate>
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium">{t("categories.form.names")}</legend>
            {LANGS.map((lang) => (
              <Field key={lang} label={t(`categories.form.name.${lang}`)} htmlFor={`cat-name-${lang}`} error={errors.name?.[lang]} required>
                <Input
                  id={`cat-name-${lang}`}
                  lang={lang}
                  maxLength={100}
                  aria-invalid={!!errors.name?.[lang]}
                  {...form.register(`name.${lang}`)}
                />
              </Field>
            ))}
          </fieldset>

          <Field label={t("categories.form.slug")} htmlFor="cat-slug" error={errors.slug} hint={t("categories.form.slugHint")} required>
            <div className="flex gap-2">
              <Input
                id="cat-slug"
                className="font-mono"
                maxLength={100}
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!!errors.slug}
                {...form.register("slug")}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t("categories.form.regenerateSlug")}
                title={t("categories.form.regenerateSlug")}
                onClick={() => form.setValue("slug", slugify(form.getValues("name.en")), { shouldValidate: true })}
              >
                <RefreshCw />
              </Button>
            </div>
          </Field>

          <Controller
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <Field label={t("categories.form.parent")} error={errors.parentId} hint={parentLocked ? t("categories.form.parentLocked") : t("categories.form.parentHint")}>
                <SimpleSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={parentOptions}
                  clearLabel={t("categories.form.noParent")}
                  disabled={parentLocked}
                  invalid={!!errors.parentId}
                  aria-label={t("categories.form.parent")}
                />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="icon"
            render={({ field }) => (
              <Field label={t("categories.form.icon")} error={errors.icon} hint={t("categories.form.iconHint")}>
                <div role="radiogroup" aria-label={t("categories.form.icon")} className="grid grid-cols-7 gap-1.5 sm:grid-cols-9">
                  {CATEGORY_ICON_NAMES.map((name) => {
                    const Icon = CATEGORY_ICONS[name];
                    const selected = field.value === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={name}
                        title={name}
                        onClick={() => field.onChange(selected ? null : name)}
                        className={cn(
                          "flex aspect-square items-center justify-center rounded-lg border text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                          selected && "border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                        )}
                      >
                        <Icon className="size-4" />
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
          />

          <Field label={t("categories.form.image")} htmlFor="cat-image" error={errors.image} hint={t("categories.form.imageHint")}>
            <div className="flex items-center gap-3">
              <ItemImage src={imagePreview} alt="" className="size-10 shrink-0 rounded-lg" />
              <Input
                id="cat-image"
                type="url"
                inputMode="url"
                placeholder="https://"
                aria-invalid={!!errors.image}
                {...form.register("image", { setValueAs: (v: string | null) => v ?? "" })}
              />
            </div>
          </Field>

          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Field label={t("common.fields.status")} error={errors.status} hint={t("categories.form.statusHint")}>
                <SimpleSelect
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? "ACTIVE")}
                  options={CATEGORY_STATUSES.map((s) => ({ value: s, label: t(`enums.categoryStatus.${s}`) }))}
                  aria-label={t("common.fields.status")}
                />
              </Field>
            )}
          />
        </form>
        <SheetFooter className="flex-row justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" form="category-form" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="animate-spin" />}
            {mode.kind === "create" ? t("common.actions.create") : t("common.actions.saveChanges")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
