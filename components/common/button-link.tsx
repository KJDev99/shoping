import Link from "next/link";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type ButtonLinkProps = Omit<ComponentProps<typeof Button>, "render" | "nativeButton"> & { href: string; prefetch?: boolean };

/** A Next.js <Link> styled as a button (Base UI needs `nativeButton={false}` for non-button elements). */
export function ButtonLink({ href, prefetch, children, ...props }: ButtonLinkProps) {
  return (
    <Button {...props} nativeButton={false} render={<Link href={href} prefetch={prefetch} />}>
      {children}
    </Button>
  );
}
