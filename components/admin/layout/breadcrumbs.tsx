"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useT } from "@/lib/i18n/provider";
import { SEGMENT_LABELS } from "@/lib/navigation";

/** Breadcrumbs derived from the URL: /admin/users/usr_1001 → Users / usr_1001. */
export function Breadcrumbs() {
  const t = useT();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean).slice(1); // drop "admin"
  if (!segments.length) return null;
  const crumbs = segments.map((seg, i) => {
    const href = `/admin/${segments.slice(0, i + 1).join("/")}`;
    const key = SEGMENT_LABELS[seg];
    return { href, label: key ? t(key) : decodeURIComponent(seg) };
  });
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {crumbs.map((c, i) => (
          <Fragment key={c.href}>
            {i > 0 && <BreadcrumbSeparator className="hidden sm:block" />}
            <BreadcrumbItem className={i < crumbs.length - 1 ? "hidden sm:inline-flex" : "min-w-0"}>
              {i === crumbs.length - 1 ? (
                <BreadcrumbPage className="truncate">{c.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href={c.href} />}>{c.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
