"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, KeyRound, Loader2, Smartphone } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { SimpleSelect } from "@/components/common/simple-select";
import { Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyFieldErrors, useApiErrorMessage } from "@/hooks/use-api-error";
import { useLookups } from "@/hooks/use-lookups";
import { siteKeys } from "@/hooks/use-site";
import { isApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/provider";
import { requestCodeSchema, verifyCodeSchema, type RequestCodeInput, type VerifyCodeInput } from "@/schemas/site.schema";
import { siteService } from "@/services/site.service";

/** Only same-site, non-admin paths are allowed as post-login targets (open-redirect guard). */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/admin") ? next : "/";
}

export function LoginPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const needsLoginForPost = searchParams.get("next")?.startsWith("/listings/new");
  const [phone, setPhone] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-6 sm:py-10">
      <div className="space-y-2 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <ArrowLeftRight className="size-5" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{t("site.login.title")}</h1>
        <p className="text-sm text-muted-foreground">{needsLoginForPost ? t("site.login.required") : t("site.login.subtitle")}</p>
      </div>
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60 sm:p-8">
        {phone ? (
          <CodeStep
            phone={phone}
            devCode={devCode}
            resendAt={resendAt}
            onResent={(code, at) => {
              setDevCode(code);
              setResendAt(at);
            }}
            onChangePhone={() => setPhone(null)}
          />
        ) : (
          <PhoneStep
            onSent={(p, code, at) => {
              setPhone(p);
              setDevCode(code);
              setResendAt(at);
            }}
          />
        )}
      </div>
    </div>
  );
}

function useBlockedAwareError() {
  const t = useT();
  const toMessage = useApiErrorMessage();
  return (e: unknown) => (isApiError(e) && e.code === "ACCOUNT_BLOCKED" ? t("site.login.blocked") : toMessage(e));
}

function PhoneStep({ onSent }: { onSent: (phone: string, devCode: string | null, resendAt: number) => void }) {
  const t = useT();
  const errorText = useBlockedAwareError();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<RequestCodeInput>({ resolver: zodResolver(requestCodeSchema), defaultValues: { phone: "+998 " } });
  const send = useMutation({
    mutationFn: siteService.requestCode,
    onSuccess: (d, v) => onSent(v.phone, d.devCode, Date.now() + d.resendAfterSec * 1000),
    onError: (e) => {
      if (!applyFieldErrors(e, form.setError)) setFormError(errorText(e));
    },
  });
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={form.handleSubmit((v) => {
        setFormError(null);
        send.mutate(v);
      })}
    >
      <FormError message={formError} />
      <Field label={t("site.login.phone")} htmlFor="phone" error={form.formState.errors.phone}>
        <div className="relative">
          <Smartphone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" autoFocus placeholder="+998 90 123 45 67" className="h-12 pl-10 text-lg" {...form.register("phone")} />
        </div>
      </Field>
      <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={send.isPending}>
        {send.isPending && <Loader2 className="animate-spin" />}
        {t("site.login.sendCode")}
      </Button>
    </form>
  );
}

function CodeStep({
  phone,
  devCode,
  resendAt,
  onResent,
  onChangePhone,
}: {
  phone: string;
  devCode: string | null;
  resendAt: number;
  onResent: (devCode: string | null, resendAt: number) => void;
  onChangePhone: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const errorText = useBlockedAwareError();
  const { data: lookups } = useLookups();
  const [needsProfile, setNeedsProfile] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const form = useForm<VerifyCodeInput>({ resolver: zodResolver(verifyCodeSchema), defaultValues: { phone, code: "" } });
  const verify = useMutation({
    mutationFn: siteService.verify,
    onSuccess: async (d) => {
      if (d.needsProfile) {
        setNeedsProfile(true);
        form.setValue("profile", { firstName: "", lastName: "", regionId: "" });
        return;
      }
      qc.setQueryData(siteKeys.me, d.user);
      toast.success(t("site.login.welcome", { name: d.user?.firstName ?? "" }));
      router.replace(safeNext(searchParams.get("next")));
    },
    onError: (e) => {
      if (!applyFieldErrors(e, form.setError)) setFormError(errorText(e));
    },
  });
  const resend = useMutation({
    mutationFn: () => siteService.requestCode({ phone }),
    onSuccess: (d) => onResent(d.devCode, Date.now() + d.resendAfterSec * 1000),
    onError: (e) => setFormError(errorText(e)),
  });
  const { errors } = form.formState;

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={form.handleSubmit((v) => {
        setFormError(null);
        verify.mutate(needsProfile ? v : { phone: v.phone, code: v.code });
      })}
    >
      <p className="text-sm text-muted-foreground">
        {t("site.login.codeSent", { phone })}{" "}
        <button type="button" onClick={onChangePhone} className="font-medium text-foreground underline-offset-2 hover:underline">
          {t("site.login.changePhone")}
        </button>
      </p>
      {devCode && (
        <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">
          {t("site.login.devCode", { code: "" })}
          <button type="button" className="font-mono font-semibold tracking-widest" onClick={() => form.setValue("code", devCode, { shouldValidate: true })}>
            {devCode}
          </button>
        </p>
      )}
      <FormError message={formError} />
      <Field label={t("site.login.code")} htmlFor="code" error={errors.code}>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            readOnly={needsProfile}
            className="h-12 pl-10 font-mono text-lg tracking-[0.4em]"
            {...form.register("code")}
          />
        </div>
      </Field>

      {needsProfile && (
        <div className="space-y-4 rounded-2xl bg-muted/50 p-4">
          <div>
            <p className="font-medium">{t("site.login.profileTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("site.login.profileHint")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("common.fields.firstName")} htmlFor="firstName" error={errors.profile?.firstName} required>
              <Input id="firstName" autoComplete="given-name" autoFocus {...form.register("profile.firstName")} />
            </Field>
            <Field label={t("common.fields.lastName")} htmlFor="lastName" error={errors.profile?.lastName} required>
              <Input id="lastName" autoComplete="family-name" {...form.register("profile.lastName")} />
            </Field>
          </div>
          <Controller
            control={form.control}
            name="profile.regionId"
            render={({ field }) => (
              <Field label={t("common.fields.region")} error={errors.profile?.regionId} required>
                <SimpleSelect
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? "")}
                  options={(lookups?.regions ?? []).map((r) => ({ value: r.id, label: t.text(r.name) }))}
                  placeholder={t("site.post.choose")}
                  invalid={!!errors.profile?.regionId}
                />
              </Field>
            )}
          />
        </div>
      )}

      <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={verify.isPending}>
        {verify.isPending && <Loader2 className="animate-spin" />}
        {needsProfile ? t("site.login.finish") : t("site.login.verify")}
      </Button>
      {!needsProfile && (
        <Button type="button" variant="ghost" className="w-full" disabled={secondsLeft > 0 || resend.isPending} onClick={() => resend.mutate()}>
          {secondsLeft > 0 ? t("site.login.resendIn", { s: secondsLeft }) : t("site.login.resend")}
        </Button>
      )}
    </form>
  );
}
