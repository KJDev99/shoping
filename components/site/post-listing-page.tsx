"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ImagePlus, Loader2, Plus, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { AttributeInputs } from "@/components/admin/listings/attribute-inputs";
import { ItemImage } from "@/components/common/cells";
import { SimpleSelect, type SelectOption } from "@/components/common/simple-select";
import { DetailSkeleton } from "@/components/common/states";
import { Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { applyFieldErrors, useApiErrorMessage } from "@/hooks/use-api-error";
import { useLookups } from "@/hooks/use-lookups";
import { useSiteConfig, useSiteUser } from "@/hooks/use-site";
import { isApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { attributesFor, listingUpdateSchema, type ExchangePreferenceInput, type ListingUpdateInput } from "@/schemas/listing.schema";
import { UPLOAD_RULES } from "@/schemas/site.schema";
import { siteService } from "@/services/site.service";
import { ITEM_CONDITIONS } from "@/types";

interface Photo {
  key: string;
  id: string | null;
  preview: string;
  uploading: boolean;
}

type WantsMode = "specific" | "any";

/**
 * Turns the single "what do you want" text box into exchange preferences:
 * a short comma-separated list becomes keywords (used for matching), anything else is kept as a note.
 */
function toPreferences(mode: WantsMode, text: string): ExchangePreferenceInput {
  const base = { openToOffers: mode === "any", categories: [], subcategories: [], conditions: [], regionIds: [], cashDifference: null };
  const clean = text.trim();
  if (!clean) return { ...base, keywords: [], note: null };
  const seen = new Set<string>();
  const parts = clean
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2 && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()));
  if (parts.length > 0 && parts.length <= 20 && parts.every((p) => p.length <= 50)) return { ...base, keywords: parts, note: null };
  return { ...base, keywords: [], note: clean.slice(0, 300) };
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-5 rounded-3xl bg-card p-5 ring-1 ring-border/60 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{n}</span>
        <div className="space-y-0.5 pt-1">
          <h2 className="text-lg leading-tight font-semibold">{title}</h2>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function PostListingPage() {
  const router = useRouter();
  const user = useSiteUser();

  // Client-side guard (the proxy already redirects guests without a session cookie).
  useEffect(() => {
    if (user.isSuccess && !user.data) router.replace("/login?next=/listings/new");
  }, [user.isSuccess, user.data, router]);

  if (user.isPending || !user.data) return <DetailSkeleton />;
  return <PostListingForm defaultRegionId={user.data.regionId} suspended={user.data.status === "SUSPENDED"} />;
}

function PostListingForm({ defaultRegionId, suspended }: { defaultRegionId: string; suspended: boolean }) {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const fileInput = useRef<HTMLInputElement>(null);
  const { data: lookups } = useLookups();
  const { data: config } = useSiteConfig();
  const maxImages = config?.maxImages ?? 10;
  const allowAny = config?.allowOpenOffers !== false;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(suspended ? t("site.errors.suspended") : null);
  const [dragging, setDragging] = useState(false);
  const [wantsMode, setWantsMode] = useState<WantsMode>("specific");
  const [wantsText, setWantsText] = useState("");
  const [showMore, setShowMore] = useState(false);

  const form = useForm<ListingUpdateInput>({
    resolver: zodResolver(listingUpdateSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      subcategoryId: null,
      condition: "GOOD",
      regionId: defaultRegionId,
      districtId: null,
      location: null,
      attributes: {},
      exchangePreferences: toPreferences("specific", ""),
    },
  });
  const { errors } = form.formState;
  const [categoryId, subcategoryId, regionId] = useWatch({ control: form.control, name: ["categoryId", "subcategoryId", "regionId"] });

  const setWants = (mode: WantsMode, text: string) => {
    setWantsMode(mode);
    setWantsText(text);
    form.setValue("exchangePreferences", toPreferences(mode, text), { shouldValidate: form.formState.isSubmitted });
  };

  // One category picker: leaf categories ("Phones"), with the parent shown for context.
  const categoryOptions = useMemo(() => {
    const cats = lookups?.categories ?? [];
    return cats
      .filter((c) => !c.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .flatMap((p): SelectOption[] => {
        const children = cats.filter((c) => c.parentId === p.id).sort((a, b) => a.sortOrder - b.sortOrder);
        if (!children.length) return [{ value: p.id, label: t.text(p.name) }];
        return children.map((c) => ({
          value: c.id,
          label: (
            <span>
              {t.text(c.name)} <span className="text-muted-foreground">· {t.text(p.name)}</span>
            </span>
          ),
        }));
      });
  }, [lookups, t]);
  const pickCategory = (id: string | null) => {
    const cat = lookups?.categories.find((c) => c.id === id);
    form.setValue("categoryId", cat ? (cat.parentId ?? cat.id) : "", { shouldValidate: form.formState.isSubmitted });
    form.setValue("subcategoryId", cat?.parentId ? cat.id : null);
    form.setValue("attributes", {});
  };

  const attributeDefs = useMemo(() => attributesFor(lookups?.attributes ?? [], categoryId, subcategoryId), [lookups, categoryId, subcategoryId]);
  const requiredDefs = attributeDefs.filter((a) => a.required);
  const optionalDefs = attributeDefs.filter((a) => !a.required);
  const districts = (lookups?.districts ?? []).filter((d) => d.regionId === regionId);

  // Release object URLs used for local previews.
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setPhotoError(null);
    const room = maxImages - photos.length;
    const chosen = [...files].slice(0, Math.max(0, room));
    if (files.length > room) setPhotoError(t("site.validation.tooManyImages"));
    for (const file of chosen) {
      // Quick client-side checks; the server re-validates the real file content.
      if (!(UPLOAD_RULES.types as readonly string[]).includes(file.type)) {
        setPhotoError(t("site.validation.fileType"));
        continue;
      }
      if (file.size > UPLOAD_RULES.maxBytes) {
        setPhotoError(t("site.validation.fileTooLarge"));
        continue;
      }
      const key = crypto.randomUUID();
      const preview = URL.createObjectURL(file);
      setPhotos((ps) => [...ps, { key, id: null, preview, uploading: true }]);
      try {
        const { id } = await siteService.upload(file);
        setPhotos((ps) => ps.map((p) => (p.key === key ? { ...p, id, uploading: false } : p)));
      } catch (e) {
        URL.revokeObjectURL(preview);
        setPhotos((ps) => ps.filter((p) => p.key !== key));
        const fieldMsg = isApiError(e) ? e.fieldErrors?.file?.[0] : undefined;
        setPhotoError(fieldMsg ? t.dynamic(fieldMsg) : t("site.post.uploadFailed", { name: file.name }));
      }
    }
  };

  const removePhoto = (key: string) =>
    setPhotos((ps) => {
      const p = ps.find((x) => x.key === key);
      if (p) URL.revokeObjectURL(p.preview);
      return ps.filter((x) => x.key !== key);
    });
  const makeCover = (key: string) => setPhotos((ps) => [...ps.filter((p) => p.key === key), ...ps.filter((p) => p.key !== key)]);

  const create = useMutation({
    mutationFn: siteService.createListing,
    onSuccess: async (listing) => {
      await qc.invalidateQueries({ queryKey: ["site"] });
      toast.success(listing.status === "ACTIVE" ? t("site.post.published") : t("site.post.sentToModeration"));
      router.push(`/listings/${listing.id}`);
    },
    onError: (e) => {
      if (isApiError(e) && e.fieldErrors?.imageIds) setPhotoError(t.dynamic(e.fieldErrors.imageIds[0]));
      if (applyFieldErrors(e, form.setError)) {
        // Errors on hidden optional details: open that section so the message is visible.
        if (isApiError(e) && Object.keys(e.fieldErrors ?? {}).some((k) => k.startsWith("attributes."))) setShowMore(true);
        setFormError(t("common.toast.validation"));
        return;
      }
      if (isApiError(e) && e.code === "ACCOUNT_SUSPENDED") return setFormError(t("site.errors.suspended"));
      if (isApiError(e) && e.isRateLimited) return setFormError(t("site.errors.dailyLimit"));
      setFormError(toMessage(e));
    },
  });

  const uploading = photos.some((p) => p.uploading);
  const onSubmit = form.handleSubmit(
    (values) => {
      setFormError(null);
      const imageIds = photos.map((p) => p.id).filter((id): id is string => !!id);
      if (!imageIds.length) {
        setPhotoError(t("site.validation.imagesRequired"));
        return;
      }
      create.mutate({ ...values, imageIds });
    },
    () => {
      if (!photos.length) setPhotoError(t("site.validation.imagesRequired"));
      setFormError(t("common.toast.validation"));
    },
  );

  const wantsError = errors.exchangePreferences
    ? errors.exchangePreferences.openToOffers?.message
      ? t.dynamic(errors.exchangePreferences.openToOffers.message)
      : t("site.post.wantsRequired")
    : null;

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-2xl space-y-5 [&_[data-slot=input]]:h-11! [&_[data-slot=input]]:text-base [&_[data-slot=select-trigger]]:h-11! [&_[data-slot=select-trigger]]:w-full sm:[&_[data-slot=input]]:text-sm">
      <div className="space-y-1 px-1">
        <h1 className="text-3xl font-bold tracking-tight">{t("site.post.title")}</h1>
        <p className="text-muted-foreground">{t("site.post.subtitle")}</p>
      </div>

      <FormError message={formError} />

      <Step n={1} title={t("site.post.stepPhotos")} hint={t("site.post.photosShort", { max: maxImages })}>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void addFiles(e.dataTransfer.files);
          }}
        >
          {photos.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary",
                dragging && "border-primary bg-primary/5 text-primary",
                photoError && "border-destructive/60",
              )}
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ImagePlus className="size-6" />
              </span>
              <span className="font-medium text-foreground">{t("site.post.addPhoto")}</span>
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {photos.map((p, i) => (
                <div key={p.key} className="group relative aspect-square overflow-hidden rounded-2xl bg-muted">
                  <ItemImage src={p.preview} alt="" className="size-full" />
                  {p.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                      <Loader2 className="size-5 animate-spin" />
                      <span className="sr-only">{t("site.post.uploading")}</span>
                    </div>
                  )}
                  {i === 0 ? (
                    <span className="absolute bottom-2 left-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">{t("site.post.cover")}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => makeCover(p.key)}
                      className="absolute bottom-2 left-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label={t("site.post.cover")}
                      title={t("site.post.cover")}
                    >
                      <Star className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(p.key)}
                    className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white"
                    aria-label={t("site.post.removePhoto")}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < maxImages && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  aria-label={t("site.post.addPhoto")}
                >
                  <Plus className="size-6" />
                </button>
              )}
            </div>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept={UPLOAD_RULES.types.join(",")}
          multiple
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {photoError && (
          <p className="text-sm text-destructive" role="alert">
            {photoError}
          </p>
        )}
      </Step>

      <Step n={2} title={t("site.post.stepAbout")}>
        <Field label={t("site.post.titleLabel")} htmlFor="title" error={errors.title}>
          <Input id="title" placeholder={t("site.post.titlePlaceholder")} maxLength={120} aria-invalid={!!errors.title} {...form.register("title")} />
        </Field>
        <Field label={t("site.post.category")} error={errors.categoryId}>
          <SimpleSelect
            value={subcategoryId ?? (categoryId || null)}
            onChange={pickCategory}
            options={categoryOptions}
            placeholder={t("site.post.choose")}
            invalid={!!errors.categoryId}
          />
        </Field>
        <Controller
          control={form.control}
          name="condition"
          render={({ field }) => (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">{t("site.post.condition")}</legend>
              <div className="flex flex-wrap gap-2">
                {ITEM_CONDITIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={field.value === c}
                    onClick={() => field.onChange(c)}
                    className={cn(
                      "h-10 rounded-full px-4 text-sm font-medium ring-1 transition-colors",
                      field.value === c ? "bg-primary text-primary-foreground ring-primary" : "ring-border hover:bg-accent",
                    )}
                  >
                    {t(`enums.itemCondition.${c}`)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        />
        <Field label={t("site.post.description")} htmlFor="description" error={errors.description}>
          <Textarea
            id="description"
            rows={4}
            maxLength={5000}
            className="text-base sm:text-sm"
            placeholder={t("site.post.descriptionPlaceholder")}
            aria-invalid={!!errors.description}
            {...form.register("description")}
          />
        </Field>
        {requiredDefs.length > 0 && (
          <AttributeInputs defs={requiredDefs} control={form.control} errorFor={(id) => errors.attributes?.[id] as never} />
        )}
        {optionalDefs.length > 0 && (
          <div className="rounded-2xl bg-muted/50">
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium"
            >
              {t("site.post.moreDetails")}
              <ChevronDown className={cn("size-4 transition-transform", showMore && "rotate-180")} />
            </button>
            {showMore && (
              <div className="px-4 pb-4">
                <AttributeInputs defs={optionalDefs} control={form.control} errorFor={(id) => errors.attributes?.[id] as never} />
              </div>
            )}
          </div>
        )}
      </Step>

      <Step n={3} title={t("site.post.stepWants")}>
        {allowAny && (
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("site.post.stepWants")}>
            {(
              [
                ["specific", t("site.post.wantSpecific"), t("site.post.wantSpecificHint")],
                ["any", t("site.post.wantAny"), t("site.post.wantAnyHint")],
              ] as const
            ).map(([mode, label, hint]) => {
              const active = wantsMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setWants(mode, wantsText)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl p-4 text-left ring-1 transition-colors",
                    active ? "bg-primary/10 ring-2 ring-primary" : "ring-border hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                    )}
                  >
                    {active && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span>
                    <span className="block font-medium">{label}</span>
                    <span className="block text-sm text-muted-foreground">{hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {wantsMode === "specific" && (
          <div className="space-y-2">
            <label htmlFor="wants" className="text-sm font-medium">
              {t("site.post.wantsInput")}
            </label>
            <Input
              id="wants"
              value={wantsText}
              maxLength={300}
              onChange={(e) => setWants("specific", e.target.value)}
              placeholder={t("site.post.wantsInputPlaceholder")}
              aria-invalid={!!wantsError}
            />
            {wantsError ? (
              <p className="text-sm text-destructive" role="alert">
                {wantsError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("site.post.wantsInputHint")}</p>
            )}
          </div>
        )}
        {wantsMode === "any" && wantsError && (
          <p className="text-sm text-destructive" role="alert">
            {wantsError}
          </p>
        )}
      </Step>

      <Step n={4} title={t("site.post.stepWhere")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="regionId"
            render={({ field }) => (
              <Field label={t("site.post.region")} error={errors.regionId}>
                <SimpleSelect
                        value={field.value || null}
                  onChange={(v) => {
                    field.onChange(v ?? "");
                    form.setValue("districtId", null);
                  }}
                  options={(lookups?.regions ?? []).map((r) => ({ value: r.id, label: t.text(r.name) }))}
                  placeholder={t("site.post.choose")}
                  invalid={!!errors.regionId}
                />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="districtId"
            render={({ field }) => (
              <Field label={t("site.post.district")} error={errors.districtId}>
                <SimpleSelect
                        value={field.value ?? null}
                  onChange={field.onChange}
                  options={districts.map((d) => ({ value: d.id, label: t.text(d.name) }))}
                  placeholder={t("site.post.choose")}
                  disabled={!districts.length}
                />
              </Field>
            )}
          />
        </div>
      </Step>

      <div className="space-y-3 pt-1">
        <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={create.isPending || uploading || suspended}>
          {create.isPending && <Loader2 className="animate-spin" />}
          {create.isPending ? t("site.post.submitting") : t("site.post.submit")}
        </Button>
        {config?.requireModeration !== false && <p className="text-center text-sm text-muted-foreground">{t("site.post.moderationNote")}</p>}
      </div>
    </form>
  );
}
