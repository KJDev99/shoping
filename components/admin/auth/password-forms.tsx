"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ButtonLink } from "@/components/common/button-link";
import { Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyFieldErrors, useApiErrorMessage } from "@/hooks/use-api-error";
import { useT } from "@/lib/i18n/provider";
import { forgotPasswordSchema, resetPasswordSchema, type ForgotPasswordInput, type ResetPasswordInput } from "@/schemas/auth.schema";
import { authService } from "@/services/auth.service";

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function ForgotPasswordForm() {
  const t = useT();
  const toMessage = useApiErrorMessage();
  const [devToken, setDevToken] = useState<string | null>(null);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  const mutation = useMutation({ mutationFn: authService.forgotPassword, onSuccess: (d) => setDevToken(d.devResetToken) });

  if (mutation.isSuccess) {
    return (
      <div className="space-y-6">
        <MailCheck className="size-10 text-primary" />
        <Heading title={t("auth.forgot.title")} subtitle={t("auth.forgot.sent")} />
        {devToken && (
          <ButtonLink href={`/admin/reset-password?token=${devToken}`} variant="outline" className="w-full">
            {t("auth.forgot.devLink")}
          </ButtonLink>
        )}
        <ButtonLink href="/admin/login" variant="ghost" className="w-full">
          {t("auth.forgot.backToLogin")}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Heading title={t("auth.forgot.title")} subtitle={t("auth.forgot.subtitle")} />
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4" noValidate>
        <FormError message={mutation.isError ? toMessage(mutation.error) : null} />
        <Field label={t("auth.login.email")} htmlFor="email" error={form.formState.errors.email}>
          <Input id="email" type="email" autoFocus autoComplete="username" {...form.register("email")} />
        </Field>
        <Button type="submit" className="h-9 w-full" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="animate-spin" />}
          {t("auth.forgot.submit")}
        </Button>
      </form>
      <p className="text-center text-sm">
        <Link href="/admin/login" className="text-muted-foreground hover:text-foreground">
          {t("auth.forgot.backToLogin")}
        </Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm() {
  const t = useT();
  const toMessage = useApiErrorMessage();
  const token = useSearchParams().get("token") ?? "";
  const form = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token, password: "", confirmPassword: "" } });
  const mutation = useMutation({
    mutationFn: authService.resetPassword,
    onError: (e) => applyFieldErrors(e, form.setError),
  });
  const { errors } = form.formState;

  if (mutation.isSuccess) {
    return (
      <div className="space-y-6">
        <CheckCircle2 className="size-10 text-success" />
        <Heading title={t("auth.reset.title")} subtitle={t("auth.reset.success")} />
        <ButtonLink href="/admin/login" className="w-full">
          {t("auth.login.submit")}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Heading title={t("auth.reset.title")} subtitle={t("auth.reset.subtitle")} />
      {!token ? (
        <FormError message={t("auth.reset.missingToken")} />
      ) : (
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4" noValidate>
          <FormError message={errors.token?.message ? t.dynamic(errors.token.message) : mutation.isError && !errors.password ? toMessage(mutation.error) : null} />
          <Field label={t("auth.reset.password")} htmlFor="password" error={errors.password}>
            <Input id="password" type="password" autoComplete="new-password" autoFocus {...form.register("password")} />
          </Field>
          <Field label={t("auth.reset.confirmPassword")} htmlFor="confirmPassword" error={errors.confirmPassword}>
            <Input id="confirmPassword" type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
          </Field>
          <Button type="submit" className="h-9 w-full" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="animate-spin" />}
            {t("auth.reset.submit")}
          </Button>
        </form>
      )}
    </div>
  );
}
