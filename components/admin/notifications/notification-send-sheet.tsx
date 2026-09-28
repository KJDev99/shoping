"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Megaphone, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { SimpleSelect } from "@/components/common/simple-select";
import { Pill, StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { applyFieldErrors } from "@/hooks/use-api-error";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useNotificationActions, useNotificationChannels, useRecipientEstimate } from "@/hooks/use-notifications";
import { isApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_MESSAGE_MAX,
  NOTIFICATION_TITLE_MAX,
  notificationFormSchema,
  targetFromForm,
  toNotificationInput,
  type NotificationFormValues,
  type NotificationTargetInput,
} from "@/schemas/notification.schema";
import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES, USER_SEGMENTS, type NotificationType } from "@/types";
import { RegionMultiSelect, UserMultiPicker } from "./recipient-pickers";

const TARGET_KINDS = ["ALL", "USERS", "REGION", "SEGMENT"] as const;

const DEFAULTS: NotificationFormValues = {
  type: "ANNOUNCEMENT",
  title: "",
  message: "",
  targetKind: "ALL",
  userIds: [],
  regionIds: [],
  segment: null,
  channels: ["IN_APP"],
  schedule: false,
  scheduledAt: "",
};

/** `datetime-local` value for a Date in local time. */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CharCounter({ count, max }: { count: number; max: number }) {
  const t = useT();
  return <span className={cn("text-xs tabular-nums", count > max ? "text-destructive" : "text-muted-foreground")}>{t("notifications.form.charCount", { count, max })}</span>;
}

function NotificationPreview({ type, title, message }: { type: NotificationType; title: string; message: string }) {
  const t = useT();
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{t("notifications.form.preview")}</p>
      <div className="rounded-2xl border bg-muted/40 p-3">
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex size-5 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Megaphone className="size-3" />
            </span>
            <span className="font-medium text-foreground">{t("notifications.form.previewApp")}</span>
            <span>· {t("notifications.form.previewNow")}</span>
            <span className="ml-auto">
              <StatusBadge kind="notificationType" value={type} dot={false} />
            </span>
          </div>
          <p className={cn("text-sm font-semibold break-words", !title && "text-muted-foreground")}>{title || t("notifications.form.previewTitle")}</p>
          <p className={cn("mt-1 text-sm break-words whitespace-pre-line", message ? "text-foreground/90" : "text-muted-foreground")}>
            {message || t("notifications.form.previewMessage")}
          </p>
        </div>
      </div>
    </div>
  );
}

export function NotificationSendSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const [locale] = useLocale();
  const { create } = useNotificationActions();
  const channelsQuery = useNotificationChannels(open);
  const form = useForm<NotificationFormValues>({ resolver: zodResolver(notificationFormSchema), defaultValues: DEFAULTS });
  const [confirmAll, setConfirmAll] = useState<NotificationFormValues | null>(null);
  const values = useWatch({ control: form.control });
  const { errors } = form.formState;
  const pending = create.isPending;

  useEffect(() => {
    if (open) form.reset(DEFAULTS);
  }, [open, form]);

  // Debounce the serialized target so the estimate isn't requested on every keystroke/click.
  const targetJson = JSON.stringify(
    targetFromForm({
      targetKind: values.targetKind ?? "ALL",
      userIds: values.userIds ?? [],
      regionIds: values.regionIds ?? [],
      segment: values.segment ?? null,
    }),
  );
  const debouncedJson = useDebouncedValue(targetJson, 400);
  const debouncedTarget = useMemo(() => JSON.parse(debouncedJson) as NotificationTargetInput | null, [debouncedJson]);
  const estimate = useRecipientEstimate(open ? debouncedTarget : null);
  const estimating = estimate.isFetching || targetJson !== debouncedJson;

  const send = async (input: NotificationFormValues) => {
    try {
      await create.mutateAsync(toNotificationInput(input));
      onOpenChange(false);
    } catch (e) {
      applyFieldErrors(e, form.setError);
      const targetError = isApiError(e) ? Object.entries(e.fieldErrors ?? {}).find(([k]) => k.startsWith("target"))?.[1]?.[0] : undefined;
      if (targetError) form.setError("root.target", { type: "server", message: targetError });
      throw e;
    }
  };

  const onSubmit = form.handleSubmit((input) => {
    if (input.targetKind === "ALL") setConfirmAll(input);
    else send(input).catch(() => undefined);
  });

  const titleLen = values.title?.length ?? 0;
  const messageLen = values.message?.length ?? 0;
  const available = channelsQuery.data;
  const recipientCount = debouncedTarget ? estimate.data?.recipientsCount : undefined;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>{t("notifications.form.title")}</SheetTitle>
            <SheetDescription>{t("notifications.form.description")}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-6 px-4 pb-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <form id="notification-send-form" onSubmit={onSubmit} noValidate className="space-y-5">
              <fieldset disabled={pending} className="space-y-5">
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <Field label={t("notifications.form.type")} error={errors.type} required>
                      <SimpleSelect
                        value={field.value}
                        onChange={(v) => v && field.onChange(v)}
                        options={NOTIFICATION_TYPES.map((ty) => ({ value: ty, label: t(`enums.notificationType.${ty}`) }))}
                        disabled={pending}
                      />
                    </Field>
                  )}
                />
                <Field
                  label={
                    <span className="flex w-full items-center justify-between gap-2">
                      <span>
                        {t("notifications.form.titleLabel")}
                        <span className="text-destructive">*</span>
                      </span>
                      <CharCounter count={titleLen} max={NOTIFICATION_TITLE_MAX} />
                    </span>
                  }
                  htmlFor="ntf-title"
                  error={errors.title}
                >
                  <Input id="ntf-title" maxLength={NOTIFICATION_TITLE_MAX + 20} placeholder={t("notifications.form.titlePlaceholder")} aria-invalid={!!errors.title} {...form.register("title")} />
                </Field>
                <Field
                  label={
                    <span className="flex w-full items-center justify-between gap-2">
                      <span>
                        {t("notifications.form.message")}
                        <span className="text-destructive">*</span>
                      </span>
                      <CharCounter count={messageLen} max={NOTIFICATION_MESSAGE_MAX} />
                    </span>
                  }
                  htmlFor="ntf-message"
                  error={errors.message}
                >
                  <Textarea id="ntf-message" rows={4} placeholder={t("notifications.form.messagePlaceholder")} aria-invalid={!!errors.message} {...form.register("message")} />
                </Field>

                <Separator />

                <Controller
                  control={form.control}
                  name="targetKind"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label>{t("notifications.form.audience")}</Label>
                      <RadioGroup value={field.value} onValueChange={(v) => field.onChange(v)} className="grid gap-2 sm:grid-cols-2" disabled={pending}>
                        {TARGET_KINDS.map((k) => (
                          <label
                            key={k}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40",
                              field.value === k && "border-primary bg-primary/5",
                            )}
                          >
                            <RadioGroupItem value={k} className="mt-0.5" />
                            <span className="min-w-0 space-y-0.5">
                              <span className="block text-sm font-medium">{t(`notifications.target.${k}`)}</span>
                              <span className="block text-xs text-muted-foreground">{t(`notifications.targetHints.${k}`)}</span>
                            </span>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                />

                {values.targetKind === "USERS" && (
                  <Controller
                    control={form.control}
                    name="userIds"
                    render={({ field }) => (
                      <Field label={t("notifications.form.users")} error={errors.userIds} required>
                        <UserMultiPicker value={field.value} onChange={field.onChange} invalid={!!errors.userIds} disabled={pending} />
                      </Field>
                    )}
                  />
                )}
                {values.targetKind === "REGION" && (
                  <Controller
                    control={form.control}
                    name="regionIds"
                    render={({ field }) => (
                      <Field label={t("notifications.form.regions")} error={errors.regionIds} required>
                        <RegionMultiSelect value={field.value} onChange={field.onChange} invalid={!!errors.regionIds} disabled={pending} />
                      </Field>
                    )}
                  />
                )}
                {values.targetKind === "SEGMENT" && (
                  <Controller
                    control={form.control}
                    name="segment"
                    render={({ field }) => (
                      <Field label={t("notifications.form.segment")} error={errors.segment} required>
                        <SimpleSelect
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t("notifications.form.selectSegment")}
                          options={USER_SEGMENTS.map((s) => ({ value: s, label: t(`enums.userSegment.${s}`) }))}
                          invalid={!!errors.segment}
                          disabled={pending}
                        />
                      </Field>
                    )}
                  />
                )}

                <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5" aria-live="polite">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="size-4" /> {t("notifications.form.estimate")}
                  </span>
                  <span className="flex items-center gap-2 text-sm font-semibold tabular-nums">
                    {estimating && debouncedTarget && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                    {recipientCount !== undefined ? (
                      <span className={cn(recipientCount === 0 && "text-destructive")}>{formatNumber(recipientCount, locale)}</span>
                    ) : (
                      <span className="text-xs font-normal text-muted-foreground">{t("notifications.form.estimateUnknown")}</span>
                    )}
                  </span>
                </div>
                {errors.root?.target?.message && <p className="text-xs text-destructive">{t.dynamic(errors.root.target.message)}</p>}

                <Separator />

                <Controller
                  control={form.control}
                  name="channels"
                  render={({ field }) => (
                    <Field label={t("notifications.form.channels")} error={errors.channels?.message ? { message: errors.channels.message } : errors.channels?.root} hint={t("notifications.form.channelHint")}>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {NOTIFICATION_CHANNELS.map((c) => {
                          const enabled = available?.[c] ?? c === "IN_APP";
                          const checked = field.value.includes(c);
                          return (
                            <label
                              key={c}
                              className={cn("flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm", enabled ? "cursor-pointer" : "cursor-not-allowed opacity-60")}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={!enabled || pending}
                                onCheckedChange={(on) => field.onChange(on ? NOTIFICATION_CHANNELS.filter((x) => x === c || field.value.includes(x)) : field.value.filter((x) => x !== c))}
                              />
                              <span className="flex-1">{t(`enums.notificationChannel.${c}`)}</span>
                              {!enabled && <Pill tone="muted">{t("notifications.form.comingSoon")}</Pill>}
                            </label>
                          );
                        })}
                      </div>
                    </Field>
                  )}
                />

                <Separator />

                <Controller
                  control={form.control}
                  name="schedule"
                  render={({ field }) => (
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="ntf-schedule">{t("notifications.form.schedule")}</Label>
                        <p className="text-xs text-muted-foreground">{t("notifications.form.scheduleHint")}</p>
                      </div>
                      <Switch
                        id="ntf-schedule"
                        checked={field.value}
                        disabled={pending}
                        onCheckedChange={(on) => {
                          field.onChange(on);
                          if (on && !form.getValues("scheduledAt")) form.setValue("scheduledAt", toLocalInput(new Date(Date.now() + 60 * 60_000)));
                        }}
                      />
                    </div>
                  )}
                />
                {values.schedule && (
                  <Field label={t("notifications.form.scheduledAt")} htmlFor="ntf-scheduledAt" error={errors.scheduledAt} required className="sm:max-w-xs">
                    <Input id="ntf-scheduledAt" type="datetime-local" min={toLocalInput(new Date())} aria-invalid={!!errors.scheduledAt} {...form.register("scheduledAt")} />
                  </Field>
                )}
              </fieldset>
            </form>
            <div className="lg:sticky lg:top-4 lg:self-start">
              <NotificationPreview type={values.type ?? "ANNOUNCEMENT"} title={values.title ?? ""} message={values.message ?? ""} />
            </div>
          </div>
          <SheetFooter className="flex-row justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" form="notification-send-form" disabled={pending || recipientCount === 0}>
              {pending && <Loader2 className="animate-spin" />}
              {values.schedule ? t("notifications.form.submitSchedule") : t("notifications.form.submitNow")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={!!confirmAll}
        onOpenChange={(o) => !o && setConfirmAll(null)}
        title={t("notifications.confirmAll.title")}
        description={t("notifications.confirmAll.description", { count: formatNumber(estimate.data?.recipientsCount ?? 0, locale) })}
        confirmLabel={t("notifications.confirmAll.confirm")}
        onConfirm={() => (confirmAll ? send(confirmAll) : undefined)}
      />
    </>
  );
}
