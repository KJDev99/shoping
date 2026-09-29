"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Film, ImagePlus, KeyRound, Loader2, Plus, Star, X } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { applyFieldErrors, useApiErrorMessage } from "@/hooks/use-api-error";
import { useLookups } from "@/hooks/use-lookups";
import { siteKeys, useSiteConfig, useSiteUser } from "@/hooks/use-site";
import { isApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { phoneSchema } from "@/schemas/auth.schema";
import { attributesFor, listingUpdateSchema, type ExchangePreferenceInput, type ListingUpdateInput } from "@/schemas/listing.schema";
import { UPLOAD_RULES, VIDEO_RULES } from "@/schemas/site.schema";
import { siteService } from "@/services/site.service";
import { ITEM_CONDITIONS, type SiteUser } from "@/types";
import { HashtagInput } from "./hashtag-input";

/** A picked file. Guests keep files locally; they are uploaded right after the phone is confirmed. */
interface Photo {
  key: string;
  file: File;
  id: string | null;
  preview: string;
  uploading: boolean;
}

interface Video extends Photo {
  durationSec: number;
}

type WantsMode = "specific" | "any";

function toPreferences(mode: WantsMode, tags: string[]): ExchangePreferenceInput {
  return { openToOffers: mode === "any", categories: [], subcategories: [], keywords: tags, conditions: [], regionIds: [], note: null, cashDifference: null };
}

/** Reads a video's duration in the browser (the server does not parse media). */
function readDuration(url: string) {
  return new Promise<number>((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? v.duration : 0);
    v.onerror = () => resolve(0);
    v.src = url;
  });
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="surface space-y-5 rounded-3xl p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-violet-600 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/30">
          {n}
        </span>
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
  const user = useSiteUser();
  if (user.isPending) return <DetailSkeleton />;
  // Guests can fill the form too: they confirm their phone by SMS when publishing.
  return <PostListingForm user={user.data ?? null} />;
}

function PostListingForm({ user }: { user: SiteUser | null }) {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const fileInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const { data: lookups } = useLookups();
  const { data: config } = useSiteConfig();
  const maxImages = config?.maxImages ?? 10;
  const allowAny = config?.allowOpenOffers !== false;
  const isGuest = !user;
  const suspended = user?.status === "SUSPENDED";

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [video, setVideo] = useState<Video | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(suspended ? t("site.errors.suspended") : null);
  const [dragging, setDragging] = useState(false);
  const [wantsMode, setWantsMode] = useState<WantsMode>("specific");
  const [tags, setTags] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [busy, setBusy] = useState(false);

  // Guest contact + SMS confirmation.
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [contactErrors, setContactErrors] = useState<{ name?: string; phone?: string }>({});
  const [sms, setSms] = useState<{ values: ListingUpdateInput; anyCode: boolean } | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  const form = useForm<ListingUpdateInput>({
    resolver: zodResolver(listingUpdateSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      subcategoryId: null,
      condition: "GOOD",
      regionId: user?.regionId ?? "",
      districtId: null,
      location: null,
      attributes: {},
      exchangePreferences: toPreferences("specific", []),
    },
  });
  const { errors } = form.formState;
  const [categoryId, subcategoryId, regionId] = useWatch({ control: form.control, name: ["categoryId", "subcategoryId", "regionId"] });

  const setWants = (mode: WantsMode, next: string[]) => {
    setWantsMode(mode);
    setTags(next);
    form.setValue("exchangePreferences", toPreferences(mode, next), { shouldValidate: form.formState.isSubmitted });
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
  const tagSuggestions = useMemo(
    () => (lookups?.categories ?? []).filter((c) => c.parentId).map((c) => t.text(c.name)),
    [lookups, t],
  );
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
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);
  const preview = (file: File) => {
    const url = URL.createObjectURL(file);
    previews.current.push(url);
    return url;
  };

  const uploadError = (e: unknown, fileName: string) => {
    const fieldMsg = isApiError(e) ? e.fieldErrors?.file?.[0] : undefined;
    return fieldMsg ? t.dynamic(fieldMsg) : t("site.post.uploadFailed", { name: fileName });
  };

  /** Uploads one photo now (signed-in users) so publishing is instant later. */
  const uploadPhoto = async (key: string, file: File) => {
    setPhotos((ps) => ps.map((p) => (p.key === key ? { ...p, uploading: true } : p)));
    try {
      const { id } = await siteService.upload(file);
      setPhotos((ps) => ps.map((p) => (p.key === key ? { ...p, id, uploading: false } : p)));
      return id;
    } catch (e) {
      setPhotos((ps) => ps.filter((p) => p.key !== key));
      setPhotoError(uploadError(e, file.name));
      throw e;
    }
  };

  const addFiles = (files: FileList | null) => {
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
      setPhotos((ps) => [...ps, { key, file, id: null, preview: preview(file), uploading: false }]);
      if (!isGuest) void uploadPhoto(key, file).catch(() => undefined);
    }
  };

  const addVideo = async (file: File | undefined) => {
    if (!file) return;
    setVideoError(null);
    if (!(VIDEO_RULES.types as readonly string[]).includes(file.type)) return setVideoError(t("site.validation.videoType"));
    if (file.size > VIDEO_RULES.maxBytes) return setVideoError(t("site.validation.videoTooLarge"));
    const url = preview(file);
    const next: Video = { key: crypto.randomUUID(), file, id: null, preview: url, uploading: !isGuest, durationSec: await readDuration(url) };
    setVideo(next);
    if (!isGuest) {
      try {
        const { id } = await siteService.upload(file);
        setVideo((v) => (v?.key === next.key ? { ...v, id, uploading: false } : v));
      } catch (e) {
        setVideo(null);
        setVideoError(uploadError(e, file.name));
      }
    }
  };

  const removePhoto = (key: string) => setPhotos((ps) => ps.filter((x) => x.key !== key));
  const makeCover = (key: string) => setPhotos((ps) => [...ps.filter((p) => p.key === key), ...ps.filter((p) => p.key !== key)]);

  const create = useMutation({ mutationFn: siteService.createListing });

  const showServerError = (e: unknown) => {
    if (isApiError(e) && e.fieldErrors?.imageIds) setPhotoError(t.dynamic(e.fieldErrors.imageIds[0]));
    if (isApiError(e) && e.fieldErrors?.video) setVideoError(t.dynamic(e.fieldErrors.video[0]));
    if (applyFieldErrors(e, form.setError)) {
      // Errors on hidden optional details: open that section so the message is visible.
      if (isApiError(e) && Object.keys(e.fieldErrors ?? {}).some((k) => k.startsWith("attributes."))) setShowMore(true);
      setFormError(t("common.toast.validation"));
      return;
    }
    if (isApiError(e) && e.code === "ACCOUNT_SUSPENDED") return setFormError(t("site.errors.suspended"));
    if (isApiError(e) && e.code === "ACCOUNT_BLOCKED") return setFormError(t("site.login.blocked"));
    if (isApiError(e) && e.isRateLimited) return setFormError(t("site.errors.dailyLimit"));
    setFormError(toMessage(e));
  };

  /** Uploads whatever is still local, then creates the listing (requires a session). */
  const publish = async (values: ListingUpdateInput) => {
    setBusy(true);
    setFormError(null);
    try {
      const imageIds: string[] = [];
      for (const p of photos) imageIds.push(p.id ?? (await uploadPhoto(p.key, p.file)));
      let videoId = video?.id ?? null;
      if (video && !videoId) {
        setVideo((v) => (v ? { ...v, uploading: true } : v));
        videoId = (await siteService.upload(video.file)).id;
        setVideo((v) => (v ? { ...v, id: videoId, uploading: false } : v));
      }
      const listing = await create.mutateAsync({ ...values, imageIds, video: video && videoId ? { id: videoId, durationSec: video.durationSec } : null });
      await qc.invalidateQueries({ queryKey: ["site"] });
      toast.success(listing.status === "ACTIVE" ? t("site.post.published") : t("site.post.sentToModeration"));
      router.push(`/listings/${listing.id}`);
    } catch (e) {
      showServerError(e);
      setBusy(false);
    }
  };

  const validateContact = () => {
    const next: typeof contactErrors = {};
    if (name.trim().length < 2) next.name = t("validation.min2");
    if (!phoneSchema.safeParse(phone).success) next.phone = t("validation.phone");
    setContactErrors(next);
    return !next.name && !next.phone;
  };

  const onSubmit = form.handleSubmit(
    async (values) => {
      const contactOk = !isGuest || validateContact();
      if (!photos.length) setPhotoError(t("site.validation.imagesRequired"));
      if (!photos.length || !contactOk) {
        setFormError(t("common.toast.validation"));
        return;
      }
      if (!isGuest) return publish(values);
      // Guest: send an SMS code to the given number, then publish after it is confirmed.
      setBusy(true);
      try {
        const res = await siteService.requestCode({ phone });
        setCode("");
        setCodeError(null);
        setSms({ values, anyCode: res.acceptsAnyCode });
      } catch (e) {
        if (isApiError(e) && e.fieldErrors?.phone) setContactErrors({ phone: t.dynamic(e.fieldErrors.phone[0]) });
        else showServerError(e);
      } finally {
        setBusy(false);
      }
    },
    () => {
      if (isGuest) validateContact();
      if (!photos.length) setPhotoError(t("site.validation.imagesRequired"));
      setFormError(t("common.toast.validation"));
    },
  );

  const confirmSms = async () => {
    if (!sms) return;
    if (!/^\d{6}$/.test(code)) return setCodeError(t("site.validation.code"));
    setBusy(true);
    try {
      const [firstName, ...rest] = name.trim().split(/\s+/);
      const res = await siteService.verify({ phone, code, profile: { firstName, lastName: rest.join(" "), regionId: sms.values.regionId } });
      qc.setQueryData(siteKeys.me, res.user);
      const values = sms.values;
      setSms(null);
      await publish(values);
    } catch (e) {
      setBusy(false);
      const msg = isApiError(e) ? e.fieldErrors?.code?.[0] : undefined;
      if (msg) setCodeError(t.dynamic(msg));
      else {
        setSms(null);
        showServerError(e);
      }
    }
  };

  const wantsError = errors.exchangePreferences
    ? errors.exchangePreferences.openToOffers?.message
      ? t.dynamic(errors.exchangePreferences.openToOffers.message)
      : errors.exchangePreferences.keywords
        ? t("site.post.tagsHint")
        : t("site.post.wantsRequired")
    : null;
  const uploading = photos.some((p) => p.uploading) || !!video?.uploading;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mx-auto max-w-2xl space-y-5 **:data-[slot=input]:h-11! **:data-[slot=input]:text-base **:data-[slot=select-trigger]:h-11! **:data-[slot=select-trigger]:w-full sm:**:data-[slot=input]:text-sm"
    >
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
            addFiles(e.dataTransfer.files);
          }}
        >
          {photos.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/25 bg-primary/3 py-10 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary",
                dragging && "border-primary bg-primary/5 text-primary",
                photoError && "border-destructive/60",
              )}
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-linear-to-br from-primary to-violet-600 text-white shadow-lg shadow-primary/30">
                <ImagePlus className="size-6" />
              </span>
              <span className="font-medium text-foreground">{t("site.post.addPhoto")}</span>
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {photos.map((p, i) => (
                <div key={p.key} className="group relative aspect-square overflow-hidden rounded-2xl bg-muted shadow-sm">
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
                  className="flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-primary/25 text-primary/70 transition-colors hover:border-primary hover:text-primary"
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
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {photoError && (
          <p className="text-sm text-destructive" role="alert">
            {photoError}
          </p>
        )}

        {/* Optional short video */}
        <div className="space-y-2 border-t pt-5">
          <p className="text-sm font-medium">{t("site.post.video")}</p>
          {video ? (
            <div className="relative overflow-hidden rounded-2xl bg-black shadow-sm">
              <video src={video.preview} controls playsInline preload="metadata" className="aspect-video w-full" />
              {video.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setVideo(null)}
                className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white"
                aria-label={t("site.post.removeVideo")}
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => videoInput.current?.click()}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-violet-300/60 bg-violet-50/50 p-4 text-left transition-colors hover:border-violet-500 hover:bg-violet-50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                <Film className="size-5" />
              </span>
              <span>
                <span className="block font-medium">{t("site.post.addVideo")}</span>
                <span className="block text-xs text-muted-foreground">{t("site.post.videoHint")}</span>
              </span>
            </button>
          )}
          <input
            ref={videoInput}
            type="file"
            accept={VIDEO_RULES.types.join(",")}
            className="hidden"
            onChange={(e) => {
              void addVideo(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {videoError && (
            <p className="text-sm text-destructive" role="alert">
              {videoError}
            </p>
          )}
        </div>
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
                      "h-10 rounded-full px-4 text-sm font-medium ring-1 transition-all",
                      field.value === c ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-primary" : "bg-white ring-border hover:bg-accent",
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
        {requiredDefs.length > 0 && <AttributeInputs defs={requiredDefs} control={form.control} errorFor={(id) => errors.attributes?.[id] as never} />}
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
                  onClick={() => setWants(mode, tags)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl p-4 text-left ring-1 transition-all",
                    active ? "bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary" : "bg-white ring-border hover:bg-accent",
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
              {t("site.post.tagsLabel")}
            </label>
            <HashtagInput
              id="wants"
              value={tags}
              onChange={(next) => setWants("specific", next)}
              suggestions={tagSuggestions}
              placeholder={t("site.post.tagsPlaceholder")}
              invalid={!!wantsError}
            />
            {wantsError ? (
              <p className="text-sm text-destructive" role="alert">
                {wantsError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("site.post.tagsHint")}</p>
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

      {isGuest && (
        <Step n={5} title={t("site.post.stepContact")} hint={t("site.post.contactHint")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("site.post.yourName")} htmlFor="guest-name" error={contactErrors.name ? { type: "custom", message: contactErrors.name } : undefined}>
              <Input
                id="guest-name"
                autoComplete="name"
                maxLength={50}
                placeholder={t("site.post.yourNamePlaceholder")}
                value={name}
                aria-invalid={!!contactErrors.name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label={t("site.post.phone")} htmlFor="guest-phone" error={contactErrors.phone ? { type: "custom", message: contactErrors.phone } : undefined}>
              <Input
                id="guest-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+998 90 123 45 67"
                value={phone}
                aria-invalid={!!contactErrors.phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
          </div>
        </Step>
      )}

      <div className="space-y-3 pt-1">
        <Button
          type="submit"
          className="h-12 w-full rounded-full bg-linear-to-r from-primary to-violet-600 text-base shadow-xl shadow-primary/30 hover:opacity-95"
          disabled={busy || uploading || suspended}
        >
          {(busy || uploading) && <Loader2 className="animate-spin" />}
          {busy ? t("site.post.submitting") : t("site.post.submit")}
        </Button>
        {config?.requireModeration !== false && <p className="text-center text-sm text-muted-foreground">{t("site.post.moderationNote")}</p>}
      </div>

      <Dialog open={!!sms} onOpenChange={(open) => !open && !busy && setSms(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("site.post.smsTitle")}</DialogTitle>
            <DialogDescription>{t("site.post.smsText", { phone })}</DialogDescription>
          </DialogHeader>
          {sms?.anyCode && (
            <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">
              {t("site.login.anyCode")}{" "}
              <button type="button" className="font-mono font-semibold tracking-widest underline-offset-2 hover:underline" onClick={() => setCode("123456")}>
                123456
              </button>
            </p>
          )}
          <div className="space-y-1.5">
            <div className="relative">
              <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void confirmSms();
                  }
                }}
                aria-label={t("site.login.code")}
                aria-invalid={!!codeError}
                className="h-12 pl-10 font-mono text-lg tracking-[0.4em]"
              />
            </div>
            {codeError && (
              <p className="text-sm text-destructive" role="alert">
                {codeError}
              </p>
            )}
          </div>
          <Button type="button" className="h-11 w-full rounded-full" disabled={busy} onClick={() => void confirmSms()}>
            {busy && <Loader2 className="animate-spin" />}
            {t("site.post.smsConfirm")}
          </Button>
        </DialogContent>
      </Dialog>
    </form>
  );
}
