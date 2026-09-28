import { Suspense } from "react";
import { SiteShell } from "@/components/site/site-shell";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense>
      <SiteShell>{children}</SiteShell>
    </Suspense>
  );
}
