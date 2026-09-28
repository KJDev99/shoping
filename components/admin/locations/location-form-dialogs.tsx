"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, type UseFormRegisterReturn } from "react-hook-form";
import { SimpleSelect } from "@/components/common/simple-select";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { applyFieldErrors } from "@/hooks/use-api-error";
import { useLocationActions } from "@/hooks/use-locations";
import { useT } from "@/lib/i18n/provider";
import { DISTRICT_TYPES, districtSchema, regionSchema, type DistrictInput, type RegionInput } from "@/schemas/location.schema";
import type { District, Region } from "@/types";

const LANGS = ["uz", "ru", "en"] as const;

type Lang = (typeof LANGS)[number];

function NameFields({
  registration,
  errors,
  idPrefix,
}: {
  registration: (lang: Lang) => UseFormRegisterReturn;
  errors: Partial<Record<Lang, { message?: string }>> | undefined;
  idPrefix: string;
}) {
  const t = useT();
  return (
    <div className="space-y-3">
      {LANGS.map((lang) => (
        <Field key={lang} label={t(`locations.form.name.${lang}`)} htmlFor={`${idPrefix}-${lang}`} error={errors?.[lang]} required>
          <Input id={`${idPrefix}-${lang}`} lang={lang} maxLength={100} aria-invalid={!!errors?.[lang]} {...registration(lang)} />
        </Field>
      ))}
    </div>
  );
}

function EnabledSwitch({ id, checked, onCheckedChange, hint }: { id: string; checked: boolean; onCheckedChange: (v: boolean) => void; hint: string }) {
  const t = useT();
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="space-y-1">
        <Label htmlFor={id}>{t("locations.form.enabled")}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(v)} />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function RegionFormDialog({ region, open, onOpenChange }: { region: Region | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const { createRegion, updateRegion } = useLocationActions();
  const mutation = region ? updateRegion : createRegion;
  const toForm = (): RegionInput => (region ? { name: { ...region.name }, enabled: region.enabled } : { name: { uz: "", ru: "", en: "" }, enabled: true });
  const form = useForm<RegionInput>({ resolver: zodResolver(regionSchema), defaultValues: toForm() });

  useEffect(() => {
    if (open) form.reset(toForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open]);

  const onSubmit = form.handleSubmit((input) => {
    const handlers = { onSuccess: () => onOpenChange(false), onError: (e: unknown) => applyFieldErrors(e, form.setError) };
    if (region) updateRegion.mutate({ id: region.id, input }, handlers);
    else createRegion.mutate(input, handlers);
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md" showCloseButton={!mutation.isPending}>
        <DialogHeader>
          <DialogTitle>{region ? t("locations.regionForm.editTitle") : t("locations.regionForm.createTitle")}</DialogTitle>
          <DialogDescription>{t("locations.form.description")}</DialogDescription>
        </DialogHeader>
        <form id="region-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <NameFields registration={(lang) => form.register(`name.${lang}`)} errors={form.formState.errors.name} idPrefix="region-name" />
          <Controller
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <EnabledSwitch id="region-enabled" checked={field.value} onCheckedChange={field.onChange} hint={t("locations.regionForm.enabledHint")} />
            )}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" form="region-form" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="animate-spin" />}
            {region ? t("common.actions.saveChanges") : t("common.actions.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

export function DistrictFormDialog({
  regionId,
  regionName,
  district,
  open,
  onOpenChange,
}: {
  regionId: string;
  regionName: string;
  district: District | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const { createDistrict, updateDistrict } = useLocationActions();
  const mutation = district ? updateDistrict : createDistrict;
  const toForm = (): DistrictInput =>
    district ? { name: { ...district.name }, type: district.type, enabled: district.enabled } : { name: { uz: "", ru: "", en: "" }, type: "DISTRICT", enabled: true };
  const form = useForm<DistrictInput>({ resolver: zodResolver(districtSchema), defaultValues: toForm() });

  useEffect(() => {
    if (open) form.reset(toForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open]);

  const onSubmit = form.handleSubmit((input) => {
    const handlers = { onSuccess: () => onOpenChange(false), onError: (e: unknown) => applyFieldErrors(e, form.setError) };
    if (district) updateDistrict.mutate({ id: district.id, input }, handlers);
    else createDistrict.mutate({ regionId, input }, handlers);
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md" showCloseButton={!mutation.isPending}>
        <DialogHeader>
          <DialogTitle>{district ? t("locations.districtForm.editTitle") : t("locations.districtForm.createTitle")}</DialogTitle>
          <DialogDescription>{t("locations.districtForm.description", { region: regionName })}</DialogDescription>
        </DialogHeader>
        <form id="district-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <NameFields registration={(lang) => form.register(`name.${lang}`)} errors={form.formState.errors.name} idPrefix="district-name" />
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Field label={t("common.fields.type")} error={form.formState.errors.type} hint={t("locations.districtForm.typeHint")} required>
                <SimpleSelect
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? "DISTRICT")}
                  options={DISTRICT_TYPES.map((v) => ({ value: v, label: t(`enums.districtType.${v}`) }))}
                  aria-label={t("common.fields.type")}
                />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <EnabledSwitch id="district-enabled" checked={field.value} onCheckedChange={field.onChange} hint={t("locations.districtForm.enabledHint")} />
            )}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" form="district-form" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="animate-spin" />}
            {district ? t("common.actions.saveChanges") : t("common.actions.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
