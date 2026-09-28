"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyFieldErrors } from "@/hooks/use-api-error";
import { sessionQueryKey } from "@/hooks/use-session";
import { isApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/provider";
import { loginSchema, type LoginInput } from "@/schemas/auth.schema";
import { authService } from "@/services/auth.service";

const DEMO_ACCOUNTS = [
  { email: "superadmin@barter.uz", role: "SUPER_ADMIN" },
  { email: "admin@barter.uz", role: "ADMIN" },
  { email: "moderator@barter.uz", role: "MODERATOR" },
  { email: "support@barter.uz", role: "SUPPORT" },
] as const;
const DEMO_PASSWORD = "Barter2026!";

/** Only allow same-origin admin paths as post-login redirect targets (open-redirect guard). */
function safeNext(next: string | null) {
  return next && next.startsWith("/admin/") && !next.startsWith("//") ? next : "/admin/dashboard";
}

export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "", remember: false } });

  const login = useMutation({
    mutationFn: authService.login,
    onSuccess: (session) => {
      qc.setQueryData(sessionQueryKey, session);
      router.replace(safeNext(searchParams.get("next")));
    },
    onError: (error) => {
      if (applyFieldErrors(error, form.setError)) return;
      if (isApiError(error)) {
        if (error.isRateLimited) return setFormError(t("auth.login.rateLimited"));
        if (error.code === "ACCOUNT_BLOCKED") return setFormError(t("auth.login.blocked"));
        if (error.isUnauthorized) return setFormError(t("auth.login.invalid"));
      }
      setFormError(t("common.states.errorHint"));
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    login.mutate(values);
  });
  const { errors } = form.formState;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground lg:hidden">
          <ArrowLeftRight className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.login.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />
        <Field label={t("auth.login.email")} htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="username" autoFocus aria-invalid={!!errors.email} {...form.register("email")} />
        </Field>
        <Field
          label={
            <span className="flex w-full items-center justify-between">
              {t("auth.login.password")}
              <Link href="/admin/forgot-password" className="text-xs font-normal text-muted-foreground hover:text-foreground">
                {t("auth.login.forgot")}
              </Link>
            </span>
          }
          htmlFor="password"
          error={errors.password}
        >
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" aria-invalid={!!errors.password} className="pr-9" {...form.register("password")} />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <Controller
          control={form.control}
          name="remember"
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
              <Label htmlFor="remember" className="font-normal">
                {t("auth.login.remember")}
              </Label>
            </div>
          )}
        />
        <Button type="submit" className="h-9 w-full" disabled={login.isPending}>
          {login.isPending && <Loader2 className="animate-spin" />}
          {t("auth.login.submit")}
        </Button>
      </form>

      {process.env.NODE_ENV !== "production" && (
        <div className="space-y-2 rounded-xl border border-dashed p-3 text-sm">
          <p className="font-medium">{t("auth.login.demoTitle")}</p>
          <div className="grid gap-1">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                className="flex items-center justify-between rounded-md px-2 py-1 text-left hover:bg-muted"
                onClick={() => {
                  form.setValue("email", a.email, { shouldValidate: true });
                  form.setValue("password", DEMO_PASSWORD, { shouldValidate: true });
                }}
              >
                <span className="font-mono text-xs">{a.email}</span>
                <span className="text-xs text-muted-foreground">{t(`enums.adminRole.${a.role}`)}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("auth.login.demoHint")} <code className="font-mono">{DEMO_PASSWORD}</code>
          </p>
        </div>
      )}
    </div>
  );
}
