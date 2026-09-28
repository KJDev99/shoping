"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Info, Loader2, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { AttributeInputs } from "@/components/admin/listings/attribute-inputs";
import { ExchangePreferencesEditor } from "@/components/admin/listings/exchange-preferences-editor";
import { ItemImage } from "@/components/common/cells";
import { SimpleSelect } from "@/components/common/simple-select";
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
import { attributesFor, listingUpdateSchema, type ListingUpdateInput } from "@/schemas/listing.schema";
import { UPLOAD_RULES } from "@/schemas/site.schema";
import { siteService } from "@/services/site.service";
import { ITEM_CONDITIONS } from "@/types";

interface Photo {
  key: string;
  id: string | null;
  preview: string;
  uploading: boolean;
}

function Card({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
      <div className="space-y-1">
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
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
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const { data: lookups } = useLookups();
  const { data: config } = useSiteConfig();
  const maxImages = config?.maxImages ?? 10;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(suspended ? t("site.errors.suspended") : null);

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
      exchangePreferences: { openToOffers: false, categories: [], subcategories: [], keywords: [], conditions: [], regionIds: [], note: null, cashDifference: null },
    },
  });
  const { errors } = form.formState;
  const [categoryId, subcategoryId, regionId] = useWatch({ control: form.control, name: ["categoryId", "subcategoryId", "regionId"] });

  const parents = useMemo(() => (lookups?.categories ?? []).filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder), [lookups]);
  const subs = useMemo(
    () => (lookups?.categories ?? []).filter((c) => c.parentId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder),
    [lookups, categoryId],
  );
  const attributeDefs = useMemo(() => attributesFor(lookups?.attributes ?? [], categoryId, subcategoryId), [lookups, categoryId, subcategoryId]);
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

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("site.post.title")}</h1>
        <p className="text-muted-foreground">{t("site.post.subtitle")}</p>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-dashed bg-card p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        {t("site.post.barterOnly")}
      </p>

      <FormError message={formError} />

      <Card title={t("site.post.photos")} hint={t("site.post.photosHint", { max: maxImages })}>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {photos.map((p, i) => (
            <div key={p.key} className="group relative aspect-square overflow-hidden rounded-xl border">
              <ItemImage src={p.preview} alt="" className="size-full" />
              {p.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="size-5 animate-spin" />
                  <span className="sr-only">{t("site.post.uploading")}</span>
                </div>
              )}
              {i === 0 ? (
                <span className="absolute bottom-1.5 left-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">{t("site.post.cover")}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(p.key)}
                  className="absolute bottom-1.5 left-1.5 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={t("site.post.cover")}
                  title={t("site.post.cover")}
                >
                  <Star className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => removePhoto(p.key)}
                className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white"
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
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary",
                photoError && "border-destructive/60",
              )}
            >
              <ImagePlus className="size-6" />
              <span className="px-1 text-center text-xs">{t("site.post.addPhoto")}</span>
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          id={`${inputId}-files`}
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
          <p className="text-xs text-destructive" role="alert">
            {photoError}
          </p>
        )}
      </Card>

      <Card title={t("site.post.about")}>
        <Field label={t("site.post.titleLabel")} htmlFor="title" error={errors.title} required>
          <Input id="title" placeholder={t("site.post.titlePlaceholder")} maxLength={120} aria-invalid={!!errors.title} {...form.register("title")} />
        </Field>
        <Field label={t("site.post.description")} htmlFor="description" error={errors.description} required>
          <Textarea id="description" rows={5} maxLength={5000} placeholder={t("site.post.descriptionPlaceholder")} aria-invalid={!!errors.description} {...form.register("description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <Field label={t("site.post.category")} error={errors.categoryId} required>
                <SimpleSelect
                  value={field.value || null}
                  onChange={(v) => {
                    field.onChange(v ?? "");
                    form.setValue("subcategoryId", null);
                    form.setValue("attributes", {});
                  }}
                  options={parents.map((c) => ({ value: c.id, label: t.text(c.name) }))}
                  placeholder={t("site.post.choose")}
                  invalid={!!errors.categoryId}
                />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="subcategoryId"
            render={({ field }) => (
              <Field label={t("site.post.subcategory")} error={errors.subcategoryId}>
                <SimpleSelect
                  value={field.value ?? null}
                  onChange={(v) => {
                    field.onChange(v);
                    form.setValue("attributes", {});
                  }}
                  options={subs.map((c) => ({ value: c.id, label: t.text(c.name) }))}
                  placeholder={t("site.post.choose")}
                  disabled={!subs.length}
                />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="condition"
            render={({ field }) => (
              <Field label={t("site.post.condition")} error={errors.condition} required>
                <SimpleSelect value={field.value} onChange={(v) => v && field.onChange(v)} options={ITEM_CONDITIONS.map((c) => ({ value: c, label: t(`enums.itemCondition.${c}`) }))} />
              </Field>
            )}
          />
        </div>
      </Card>

      {attributeDefs.length > 0 && (
        <Card title={t("site.post.attributes")}>
          <AttributeInputs defs={attributeDefs} control={form.control} errorFor={(id) => errors.attributes?.[id] as never} />
        </Card>
      )}

      <Card title={t("site.post.wants")} hint={t("site.post.wantsHint")}>
        <ExchangePreferencesEditor form={form} />
      </Card>

      <Card title={t("site.post.location")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="regionId"
            render={({ field }) => (
              <Field label={t("site.post.region")} error={errors.regionId} required>
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
        <Field label={t("site.post.place")} htmlFor="location" error={errors.location}>
          <Input
            id="location"
            maxLength={120}
            placeholder={t("site.post.placePlaceholder")}
            {...form.register("location", { setValueAs: (v: string) => (v?.trim() ? v : null) })}
          />
        </Field>
      </Card>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        {config?.requireModeration !== false && <p className="text-sm text-muted-foreground">{t("site.post.moderationNote")}</p>}
        <Button type="submit" className="h-11 px-6 text-base" disabled={create.isPending || uploading || suspended}>
          {create.isPending && <Loader2 className="animate-spin" />}
          {create.isPending ? t("site.post.submitting") : t("site.post.submit")}
        </Button>
      </div>
    </form>
  );
}
