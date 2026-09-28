"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Info, PlugZap, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch, type FieldError, type Merge } from "react-hook-form";
import { SimpleSelect } from "@/components/common/simple-select";
import { Pill } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Field } from "@/components/forms/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { applyFieldErrors } from "@/hooks/use-api-error";
import { useUpdateSettings } from "@/hooks/use-settings";
import { useT } from "@/lib/i18n/provider";
import {
  barterSettingsSchema,
  generalSettingsSchema,
  isValidIp,
  listingsSettingsSchema,
  moderationSettingsSchema,
  notificationSettingsSchema,
  securitySettingsSchema,
  type BarterSettingsInput,
  type GeneralSettingsInput,
  type ListingsSettingsInput,
  type ModerationSettingsInput,
  type NotificationSettingsInput,
  type SecuritySettingsInput,
} from "@/schemas/settings.schema";
import { LOCALES, type PlatformSettings } from "@/types";
import { ChipsInput, RangeHint, SettingsFormShell, SwitchRow, UnitInput } from "./settings-fields";

interface SectionProps<T> {
  values: T;
  canManage: boolean;
}

/** First message from an array field error (root or first invalid item). */
function arrayError(error: Merge<FieldError, (FieldError | undefined)[]> | undefined): { message?: string } | undefined {
  if (!error) return undefined;
  if (error.message) return { message: error.message };
  if (error.root?.message) return { message: error.root.message };
  if (Array.isArray(error)) {
    const first = error.find((e): e is FieldError => !!e?.message);
    if (first) return { message: first.message };
  }
  return undefined;
}

function invalidIndexes(error: Merge<FieldError, (FieldError | undefined)[]> | undefined): Set<number> {
  const set = new Set<number>();
  if (Array.isArray(error)) error.forEach((e, i) => e && set.add(i));
  return set;
}

// ---------------------------------------------------------------------------
// General
// ---------------------------------------------------------------------------

export function GeneralSettingsForm({ values, canManage }: SectionProps<PlatformSettings["general"]>) {
  const t = useT();
  const mutation = useUpdateSettings("general");
  const defaults: GeneralSettingsInput = { ...values, logoUrl: values.logoUrl ?? "", faviconUrl: values.faviconUrl ?? "" };
  const form = useForm<GeneralSettingsInput>({ resolver: zodResolver(generalSettingsSchema), defaultValues: defaults });
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);
  const maintenance = useWatch({ control: form.control, name: "maintenanceMode" });
  const { errors, isDirty } = form.formState;
  const disabled = !canManage || mutation.isPending;

  const submit = form.handleSubmit((input) => mutation.mutate(input, { onError: (e) => applyFieldErrors(e, form.setError) }));

  return (
    <SettingsFormShell
      id="settings-general"
      title={t("settings.general.title")}
      description={t("settings.general.description")}
      canManage={canManage}
      isDirty={isDirty}
      isPending={mutation.isPending}
      onSubmit={submit}
      onReset={() => form.reset(defaults)}
    >
      {maintenance && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>{t("settings.general.maintenanceOn")}</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("settings.general.platformName")} htmlFor="platformName" error={errors.platformName} required>
          <Input id="platformName" aria-invalid={!!errors.platformName} {...form.register("platformName")} />
        </Field>
        <div className="hidden sm:block" />
        <Field label={t("settings.general.logoUrl")} htmlFor="logoUrl" error={errors.logoUrl} hint={t("settings.general.urlHint")}>
          <Input id="logoUrl" placeholder="https://" aria-invalid={!!errors.logoUrl} {...form.register("logoUrl")} />
        </Field>
        <Field label={t("settings.general.faviconUrl")} htmlFor="faviconUrl" error={errors.faviconUrl} hint={t("settings.general.urlHint")}>
          <Input id="faviconUrl" placeholder="https://" aria-invalid={!!errors.faviconUrl} {...form.register("faviconUrl")} />
        </Field>
      </div>
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="defaultLanguage"
          render={({ field }) => (
            <Field label={t("settings.general.defaultLanguage")} error={errors.defaultLanguage} required>
              <SimpleSelect
                value={field.value}
                onChange={(v) => v && field.onChange(v)}
                options={LOCALES.map((l) => ({ value: l, label: t(`enums.locale.${l}`) }))}
                disabled={disabled}
                invalid={!!errors.defaultLanguage}
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="supportedLanguages"
          render={({ field }) => (
            <Field label={t("settings.general.supportedLanguages")} error={arrayError(errors.supportedLanguages)} required>
              <div className="flex flex-wrap gap-4 pt-1.5">
                {LOCALES.map((l) => (
                  <label key={l} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={field.value.includes(l)}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        field.onChange(checked ? LOCALES.filter((x) => x === l || field.value.includes(x)) : field.value.filter((x) => x !== l))
                      }
                    />
                    {t(`enums.locale.${l}`)}
                  </label>
                ))}
              </div>
            </Field>
          )}
        />
      </div>
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("settings.general.supportEmail")} htmlFor="supportEmail" error={errors.supportEmail} required>
          <Input id="supportEmail" type="email" aria-invalid={!!errors.supportEmail} {...form.register("supportEmail")} />
        </Field>
        <Field label={t("settings.general.supportPhone")} htmlFor="supportPhone" error={errors.supportPhone} required>
          <Input id="supportPhone" inputMode="tel" placeholder="+998 71 200 00 00" aria-invalid={!!errors.supportPhone} {...form.register("supportPhone")} />
        </Field>
      </div>
      <Separator />
      <Controller
        control={form.control}
        name="maintenanceMode"
        render={({ field }) => (
          <SwitchRow
            label={t("settings.general.maintenanceMode")}
            hint={t("settings.general.maintenanceHint")}
            checked={field.value}
            disabled={disabled}
            onCheckedChange={(checked) => (checked ? setConfirmMaintenance(true) : field.onChange(false))}
          />
        )}
      />
      <ConfirmDialog
        open={confirmMaintenance}
        onOpenChange={setConfirmMaintenance}
        title={t("settings.general.maintenanceConfirmTitle")}
        description={t("settings.general.maintenanceConfirmDescription")}
        confirmLabel={t("settings.general.maintenanceConfirm")}
        variant="destructive"
        onConfirm={() => form.setValue("maintenanceMode", true, { shouldDirty: true })}
      />
    </SettingsFormShell>
  );
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export function ListingsSettingsForm({ values, canManage }: SectionProps<ListingsSettingsInput>) {
  const t = useT();
  const mutation = useUpdateSettings("listings");
  const form = useForm<ListingsSettingsInput>({ resolver: zodResolver(listingsSettingsSchema), defaultValues: values });
  const autoPublish = useWatch({ control: form.control, name: "autoPublishTrustedUsers" });
  const { errors, isDirty } = form.formState;
  const disabled = !canManage || mutation.isPending;
  const submit = form.handleSubmit((input) => mutation.mutate(input, { onError: (e) => applyFieldErrors(e, form.setError) }));

  return (
    <SettingsFormShell
      id="settings-listings"
      title={t("settings.listings.title")}
      description={t("settings.listings.description")}
      canManage={canManage}
      isDirty={isDirty}
      isPending={mutation.isPending}
      onSubmit={submit}
      onReset={() => form.reset(values)}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("settings.listings.maxImages")} htmlFor="maxImages" error={errors.maxImages} hint={<RangeHint limit="maxImages" />}>
          <UnitInput id="maxImages" aria-invalid={!!errors.maxImages} {...form.register("maxImages", { valueAsNumber: true })} />
        </Field>
        <Field label={t("settings.listings.maxVideoSizeMb")} htmlFor="maxVideoSizeMb" error={errors.maxVideoSizeMb} hint={<RangeHint limit="maxVideoSizeMb" />}>
          <UnitInput id="maxVideoSizeMb" unit={t("settings.units.mb")} aria-invalid={!!errors.maxVideoSizeMb} {...form.register("maxVideoSizeMb", { valueAsNumber: true })} />
        </Field>
        <Field label={t("settings.listings.expirationDays")} htmlFor="expirationDays" error={errors.expirationDays} hint={<RangeHint limit="expirationDays" />}>
          <UnitInput id="expirationDays" unit={t("settings.units.days")} aria-invalid={!!errors.expirationDays} {...form.register("expirationDays", { valueAsNumber: true })} />
        </Field>
      </div>
      <Separator />
      <Controller
        control={form.control}
        name="requireModeration"
        render={({ field }) => (
          <SwitchRow
            label={t("settings.listings.requireModeration")}
            hint={t("settings.listings.requireModerationHint")}
            checked={field.value}
            onCheckedChange={field.onChange}
            disabled={disabled}
          />
        )}
      />
      <Controller
        control={form.control}
        name="autoPublishTrustedUsers"
        render={({ field }) => (
          <SwitchRow
            label={t("settings.listings.autoPublishTrustedUsers")}
            hint={t("settings.listings.autoPublishHint")}
            checked={field.value}
            onCheckedChange={field.onChange}
            disabled={disabled}
          />
        )}
      />
      {autoPublish && (
        <Field
          label={t("settings.listings.trustedUserMinExchanges")}
          htmlFor="trustedUserMinExchanges"
          error={errors.trustedUserMinExchanges}
          hint={<RangeHint limit="trustedUserMinExchanges" />}
          className="sm:max-w-xs"
        >
          <UnitInput id="trustedUserMinExchanges" aria-invalid={!!errors.trustedUserMinExchanges} {...form.register("trustedUserMinExchanges", { valueAsNumber: true })} />
        </Field>
      )}
    </SettingsFormShell>
  );
}

// ---------------------------------------------------------------------------
// Barter
// ---------------------------------------------------------------------------

export function BarterSettingsForm({ values, canManage }: SectionProps<BarterSettingsInput>) {
  const t = useT();
  const mutation = useUpdateSettings("barter");
  const form = useForm<BarterSettingsInput>({ resolver: zodResolver(barterSettingsSchema), defaultValues: values });
  const [confirmCash, setConfirmCash] = useState(false);
  const cash = useWatch({ control: form.control, name: "allowCashDifference" });
  const { errors, isDirty } = form.formState;
  const disabled = !canManage || mutation.isPending;
  const submit = form.handleSubmit((input) => mutation.mutate(input, { onError: (e) => applyFieldErrors(e, form.setError) }));

  return (
    <SettingsFormShell
      id="settings-barter"
      title={t("settings.barter.title")}
      description={t("settings.barter.description")}
      canManage={canManage}
      isDirty={isDirty}
      isPending={mutation.isPending}
      onSubmit={submit}
      onReset={() => form.reset(values)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("settings.barter.maxItemsPerOffer")} htmlFor="maxItemsPerOffer" error={errors.maxItemsPerOffer} hint={<RangeHint limit="maxItemsPerOffer" />}>
          <UnitInput id="maxItemsPerOffer" aria-invalid={!!errors.maxItemsPerOffer} {...form.register("maxItemsPerOffer", { valueAsNumber: true })} />
        </Field>
        <Field
          label={t("settings.barter.offerExpirationHours")}
          htmlFor="offerExpirationHours"
          error={errors.offerExpirationHours}
          hint={<RangeHint limit="offerExpirationHours" />}
        >
          <UnitInput id="offerExpirationHours" unit={t("settings.units.hours")} aria-invalid={!!errors.offerExpirationHours} {...form.register("offerExpirationHours", { valueAsNumber: true })} />
        </Field>
      </div>
      <Separator />
      <Controller
        control={form.control}
        name="allowMultiItemBarter"
        render={({ field }) => (
          <SwitchRow label={t("settings.barter.allowMultiItemBarter")} hint={t("settings.barter.allowMultiItemHint")} checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
        )}
      />
      <Controller
        control={form.control}
        name="allowOpenOffers"
        render={({ field }) => (
          <SwitchRow label={t("settings.barter.allowOpenOffers")} hint={t("settings.barter.allowOpenOffersHint")} checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
        )}
      />
      <Separator />
      <div className="space-y-3 rounded-lg border border-warning/40 bg-warning/5 p-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">{t("settings.barter.cashTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("settings.barter.cashExplanation")}</p>
          </div>
        </div>
        <Controller
          control={form.control}
          name="allowCashDifference"
          render={({ field }) => (
            <SwitchRow
              label={t("settings.barter.allowCashDifference")}
              hint={t("settings.barter.allowCashDifferenceHint")}
              checked={field.value}
              disabled={disabled}
              badge={cash ? <Pill tone="warning">{t("common.misc.yes")}</Pill> : <Pill tone="muted">{t("common.misc.no")}</Pill>}
              onCheckedChange={(checked) => (checked ? setConfirmCash(true) : field.onChange(false))}
            />
          )}
        />
      </div>
      <ConfirmDialog
        open={confirmCash}
        onOpenChange={setConfirmCash}
        title={t("settings.barter.cashConfirmTitle")}
        description={t("settings.barter.cashConfirmDescription")}
        confirmLabel={t("settings.barter.cashConfirm")}
        onConfirm={() => form.setValue("allowCashDifference", true, { shouldDirty: true })}
      />
    </SettingsFormShell>
  );
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export function ModerationSettingsForm({ values, canManage }: SectionProps<ModerationSettingsInput>) {
  const t = useT();
  const mutation = useUpdateSettings("moderation");
  const form = useForm<ModerationSettingsInput>({ resolver: zodResolver(moderationSettingsSchema), defaultValues: values });
  const { errors, isDirty } = form.formState;
  const disabled = !canManage || mutation.isPending;
  const submit = form.handleSubmit((input) => mutation.mutate(input, { onError: (e) => applyFieldErrors(e, form.setError) }));

  return (
    <SettingsFormShell
      id="settings-moderation"
      title={t("settings.moderation.title")}
      description={t("settings.moderation.description")}
      canManage={canManage}
      isDirty={isDirty}
      isPending={mutation.isPending}
      onSubmit={submit}
      onReset={() => form.reset(values)}
    >
      <Field
        label={t("settings.moderation.reportThreshold")}
        htmlFor="reportThreshold"
        error={errors.reportThreshold}
        hint={
          <>
            {t("settings.moderation.reportThresholdHint")} <RangeHint limit="reportThreshold" />
          </>
        }
        className="sm:max-w-md"
      >
        <UnitInput id="reportThreshold" aria-invalid={!!errors.reportThreshold} {...form.register("reportThreshold", { valueAsNumber: true })} />
      </Field>
      <Controller
        control={form.control}
        name="autoHideAfterThreshold"
        render={({ field }) => (
          <SwitchRow label={t("settings.moderation.autoHide")} hint={t("settings.moderation.autoHideHint")} checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
        )}
      />
      <Separator />
      <Controller
        control={form.control}
        name="blockedKeywords"
        render={({ field }) => (
          <Field
            label={
              <>
                {t("settings.moderation.blockedKeywords")}
                <span className="font-normal text-muted-foreground">· {t("settings.moderation.keywordsCount", { count: field.value.length })}</span>
              </>
            }
            htmlFor="blockedKeywords"
            error={arrayError(errors.blockedKeywords)}
            hint={t("settings.moderation.keywordsHint")}
          >
            {disabled && field.value.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("settings.moderation.noKeywords")}</p>
            ) : (
              <ChipsInput
                id="blockedKeywords"
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                placeholder={t("settings.moderation.keywordPlaceholder")}
                removeLabel={(keyword) => t("settings.moderation.removeKeyword", { keyword })}
                normalize={(v) => v.trim().toLowerCase()}
                invalidIndexes={invalidIndexes(errors.blockedKeywords)}
              />
            )}
          </Field>
        )}
      />
    </SettingsFormShell>
  );
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

export function SecuritySettingsForm({ values, canManage }: SectionProps<SecuritySettingsInput>) {
  const t = useT();
  const mutation = useUpdateSettings("security");
  const form = useForm<SecuritySettingsInput>({ resolver: zodResolver(securitySettingsSchema), defaultValues: values });
  const ips = useWatch({ control: form.control, name: "allowedAdminIps" });
  const { errors, isDirty } = form.formState;
  const disabled = !canManage || mutation.isPending;
  const submit = form.handleSubmit((input) => mutation.mutate(input, { onError: (e) => applyFieldErrors(e, form.setError) }));
  const badIps = new Set(ips.map((ip, i) => (isValidIp(ip) ? -1 : i)).filter((i) => i >= 0));

  return (
    <SettingsFormShell
      id="settings-security"
      title={t("settings.security.title")}
      description={t("settings.security.description")}
      canManage={canManage}
      isDirty={isDirty}
      isPending={mutation.isPending}
      onSubmit={submit}
      onReset={() => form.reset(values)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("settings.security.sessionTimeout")}
          htmlFor="sessionTimeoutMinutes"
          error={errors.sessionTimeoutMinutes}
          hint={
            <>
              {t("settings.security.sessionTimeoutHint")} <RangeHint limit="sessionTimeoutMinutes" />
            </>
          }
        >
          <UnitInput id="sessionTimeoutMinutes" unit={t("settings.units.minutes")} aria-invalid={!!errors.sessionTimeoutMinutes} {...form.register("sessionTimeoutMinutes", { valueAsNumber: true })} />
        </Field>
        <Field
          label={t("settings.security.maxLoginAttempts")}
          htmlFor="maxLoginAttempts"
          error={errors.maxLoginAttempts}
          hint={
            <>
              {t("settings.security.maxLoginAttemptsHint")} <RangeHint limit="maxLoginAttempts" />
            </>
          }
        >
          <UnitInput id="maxLoginAttempts" aria-invalid={!!errors.maxLoginAttempts} {...form.register("maxLoginAttempts", { valueAsNumber: true })} />
        </Field>
      </div>
      <Controller
        control={form.control}
        name="requireTwoFactorForAdmins"
        render={({ field }) => (
          <SwitchRow label={t("settings.security.require2fa")} hint={t("settings.security.require2faHint")} checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
        )}
      />
      <Separator />
      <Controller
        control={form.control}
        name="allowedAdminIps"
        render={({ field }) => (
          <Field label={t("settings.security.allowedIps")} htmlFor="allowedAdminIps" error={arrayError(errors.allowedAdminIps)} hint={t("settings.security.allowedIpsHint")}>
            {disabled && field.value.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("settings.security.noIps")}</p>
            ) : (
              <ChipsInput
                id="allowedAdminIps"
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                mono
                placeholder={t("settings.security.ipPlaceholder")}
                removeLabel={(ip) => t("settings.security.removeIp", { ip })}
                invalidIndexes={badIps}
              />
            )}
          </Field>
        )}
      />
      {ips.length > 0 && canManage && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>{t("settings.security.ipWarning")}</p>
        </div>
      )}
    </SettingsFormShell>
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

const PROVIDER_CHANNELS = [
  { name: "enablePush", label: "settings.notifications.push" },
  { name: "enableEmail", label: "settings.notifications.email" },
  { name: "enableSms", label: "settings.notifications.sms" },
] as const;

export function NotificationSettingsForm({ values, canManage }: SectionProps<NotificationSettingsInput>) {
  const t = useT();
  const mutation = useUpdateSettings("notifications");
  const form = useForm<NotificationSettingsInput>({ resolver: zodResolver(notificationSettingsSchema), defaultValues: values });
  const { isDirty } = form.formState;
  const disabled = !canManage || mutation.isPending;
  const submit = form.handleSubmit((input) => mutation.mutate(input, { onError: (e) => applyFieldErrors(e, form.setError) }));

  return (
    <SettingsFormShell
      id="settings-notifications"
      title={t("settings.notifications.title")}
      description={t("settings.notifications.description")}
      canManage={canManage}
      isDirty={isDirty}
      isPending={mutation.isPending}
      onSubmit={submit}
      onReset={() => form.reset(values)}
    >
      <Controller
        control={form.control}
        name="enableInApp"
        render={({ field }) => (
          <SwitchRow label={t("settings.notifications.inApp")} hint={t("settings.notifications.inAppHint")} checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
        )}
      />
      <Separator />
      <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>{t("settings.notifications.providerHint")}</p>
      </div>
      {PROVIDER_CHANNELS.map((c) => (
        <Controller
          key={c.name}
          control={form.control}
          name={c.name}
          render={({ field }) => (
            <SwitchRow
              label={t(c.label)}
              badge={
                <Pill tone="muted">
                  <PlugZap className="size-3" /> {t("settings.notifications.providerRequired")}
                </Pill>
              }
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          )}
        />
      ))}
      <Separator />
      <Controller
        control={form.control}
        name="adminDigestEmail"
        render={({ field }) => (
          <SwitchRow label={t("settings.notifications.adminDigest")} hint={t("settings.notifications.adminDigestHint")} checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
        )}
      />
    </SettingsFormShell>
  );
}
