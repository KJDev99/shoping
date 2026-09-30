"use client";

import { Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/provider";
import { TelegramLogin } from "./telegram-login";

/** Only same-site, non-admin paths are allowed as post-login targets (open-redirect guard). */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/admin") ? next : "/";
}

export function LoginPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-6 sm:py-10">
      <div className="space-y-2 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#229ED9] text-white shadow-lg shadow-[#229ED9]/30">
          <Send className="size-5" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{t("site.tg.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("site.tg.subtitle")}</p>
      </div>
      <div className="surface rounded-3xl p-6 sm:p-8">
        <TelegramLogin
          onSuccess={(user) => {
            toast.success(t("site.login.welcome", { name: user.firstName }));
            router.replace(next);
          }}
        />
      </div>
    </div>
  );
}
