"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, Loader2, RefreshCw, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SimpleSelect } from "@/components/common/simple-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiErrorMessage } from "@/hooks/use-api-error";
import { useLookups } from "@/hooks/use-lookups";
import { siteKeys } from "@/hooks/use-site";
import { isApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { siteService, type TelegramLoginStatus, type TelegramVerifyResult } from "@/services/site.service";
import type { SiteUser } from "@/types";

const TERMINAL: TelegramLoginStatus[] = ["USED", "EXPIRED"];

/**
 * Telegram sign-in: open the bot (deep link bound to this browser) → share the phone number in the bot →
 * type the 6-digit code here. New numbers are asked for a name and region once
 * (skipped when `profileDefaults.regionId` is known, e.g. from the listing form).
 */
export function TelegramLogin({
  onSuccess,
  profileDefaults,
}: {
  onSuccess: (user: SiteUser) => void;
  profileDefaults?: { firstName?: string; regionId?: string };
}) {
  const t = useT();
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const { data: lookups } = useLookups();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ firstName: string; lastName: string; regionId: string } | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [tooMany, setTooMany] = useState(false);

  const start = useMutation({ mutationFn: siteService.telegramStart });
  const startLogin = start.mutate;
  const session = start.data;
  useEffect(() => startLogin(), [startLogin]);

  const status = useQuery({
    queryKey: ["site", "telegram-status", session?.loginToken],
    queryFn: () => siteService.telegramStatus(session!.loginToken),
    enabled: !!session && !tooMany,
    refetchInterval: (q) => (q.state.data && TERMINAL.includes(q.state.data.status) ? false : (session?.pollAfterSec ?? 3) * 1000),
  });
  const state: TelegramLoginStatus = tooMany ? "EXPIRED" : (status.data?.status ?? "PENDING");

  const restart = () => {
    setCode("");
    setError(null);
    setProfile(null);
    setTooMany(false);
    startLogin();
  };

  const finish = async (result: TelegramVerifyResult) => {
    if (!result.user) return;
    qc.setQueryData(siteKeys.me, result.user);
    await qc.invalidateQueries({ queryKey: ["site", "my"] });
    onSuccess(result.user);
  };

  const verify = useMutation({
    mutationFn: siteService.telegramVerify,
    onSuccess: async (result, input) => {
      if (!result.needsProfile) return finish(result);
      const firstName = result.suggestedProfile?.firstName || profileDefaults?.firstName || "";
      const lastName = result.suggestedProfile?.lastName ?? "";
      // The listing form already knows the region: create the account without another step.
      if (profileDefaults?.regionId && firstName.trim().length >= 2 && !input.profile) {
        verify.mutate({ ...input, profile: { firstName, lastName, regionId: profileDefaults.regionId } });
        return;
      }
      setProfile({ firstName, lastName, regionId: profileDefaults?.regionId ?? "" });
    },
    onError: (e) => {
      if (isApiError(e) && e.isRateLimited) {
        setTooMany(true);
        return setError(t("site.tg.tooMany"));
      }
      if (isApiError(e) && e.code === "ACCOUNT_BLOCKED") return setError(t("site.login.blocked"));
      const fields = isApiError(e) ? e.fieldErrors : undefined;
      const profileMsg = fields && Object.entries(fields).find(([k]) => k.startsWith("profile."))?.[1]?.[0];
      if (profileMsg) return setProfileError(t.dynamic(profileMsg));
      if (fields?.code?.[0]) {
        setCode("");
        return setError(t.dynamic(fields.code[0]));
      }
      setError(toMessage(e));
    },
  });

  const submitCode = (value: string) => {
    if (!session || !/^\d{6}$/.test(value) || verify.isPending) return;
    setError(null);
    verify.mutate({ loginToken: session.loginToken, code: value });
  };

  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state === "CODE_SENT") codeRef.current?.focus();
  }, [state]);

  if (start.isPending || (!session && !start.isError)) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (start.isError || !session) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-destructive">{toMessage(start.error)}</p>
        <Button variant="outline" className="rounded-full" onClick={restart}>
          <RefreshCw /> {t("site.tg.restart")}
        </Button>
      </div>
    );
  }

  if (profile) {
    return (
      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setProfileError(null);
          verify.mutate({ loginToken: session.loginToken, code, profile });
        }}
      >
        <div>
          <p className="font-semibold">{t("site.tg.profileTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("site.tg.profileHint")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            aria-label={t("common.fields.firstName")}
            placeholder={t("common.fields.firstName")}
            autoComplete="given-name"
            value={profile.firstName}
            onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
            className="h-11"
          />
          <Input
            aria-label={t("common.fields.lastName")}
            placeholder={t("common.fields.lastName")}
            autoComplete="family-name"
            value={profile.lastName}
            onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
            className="h-11"
          />
        </div>
        <SimpleSelect
          className="data-[size=default]:h-11"
          value={profile.regionId || null}
          onChange={(v) => setProfile({ ...profile, regionId: v ?? "" })}
          options={(lookups?.regions ?? []).map((r) => ({ value: r.id, label: t.text(r.name) }))}
          placeholder={t("common.fields.region")}
          aria-label={t("common.fields.region")}
        />
        {profileError && (
          <p className="text-sm text-destructive" role="alert">
            {profileError}
          </p>
        )}
        <Button
          type="submit"
          className="h-12 w-full rounded-full text-base"
          disabled={verify.isPending || profile.firstName.trim().length < 2 || !profile.regionId}
        >
          {verify.isPending && <Loader2 className="animate-spin" />}
          {t("site.tg.finish")}
        </Button>
      </form>
    );
  }

  if (state === "EXPIRED" || state === "USED") {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-muted-foreground">{error ?? t("site.tg.expired")}</p>
        <Button variant="outline" className="rounded-full" onClick={restart}>
          <RefreshCw /> {t("site.tg.restart")}
        </Button>
      </div>
    );
  }

  const steps = [
    { text: t("site.tg.step1"), done: state !== "PENDING" },
    { text: t("site.tg.step2"), done: state === "CODE_SENT" },
    { text: t("site.tg.step3"), done: false },
  ];

  return (
    <div className="space-y-5">
      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                s.done ? "bg-success text-white" : "bg-primary/10 text-primary",
              )}
            >
              {s.done ? <CheckCircle2 className="size-4" /> : i + 1}
            </span>
            <span className={cn("pt-0.5", s.done && "text-muted-foreground line-through decoration-1")}>{s.text}</span>
          </li>
        ))}
      </ol>

      <a
        href={session.botUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#229ED9] text-base font-medium text-white shadow-lg shadow-[#229ED9]/30 transition-opacity hover:opacity-90"
      >
        <Send className="size-5" /> {t("site.tg.openBot")}
      </a>
      <p className="-mt-2 text-center text-xs text-muted-foreground">{t("site.tg.botName", { bot: session.botUsername })}</p>

      <p className="flex items-center justify-center gap-2 rounded-2xl bg-muted/60 px-3 py-2 text-center text-sm" aria-live="polite">
        {state === "CODE_SENT" ? (
          <>
            <CheckCircle2 className="size-4 shrink-0 text-success" />
            {t("site.tg.codeSent", { phone: status.data?.phoneMasked ?? "" })}
          </>
        ) : (
          <>
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            {state === "CONTACT_REQUESTED" ? t("site.tg.contactRequested") : t("site.tg.waiting")}
          </>
        )}
      </p>

      <div className="space-y-1.5">
        <label htmlFor="tg-code" className="text-sm font-medium">
          {t("site.tg.code")}
        </label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="tg-code"
            ref={codeRef}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            aria-invalid={!!error}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(v);
              if (v.length === 6) submitCode(v);
            }}
            className="h-12 pl-10 font-mono text-lg tracking-[0.4em]"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button className="h-12 w-full rounded-full text-base" disabled={code.length !== 6 || verify.isPending} onClick={() => submitCode(code)}>
        {verify.isPending && <Loader2 className="animate-spin" />}
        {t("site.tg.verify")}
      </Button>
    </div>
  );
}
