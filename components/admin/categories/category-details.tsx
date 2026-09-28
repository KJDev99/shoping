"use client";

import { Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { DateCell, ItemImage } from "@/components/common/cells";
import { InfoList, Section } from "@/components/common/info-list";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/lib/i18n/provider";
import { formatNumber } from "@/lib/format";
import type { Category, CategoryNode, Locale } from "@/types";
import { CategoryIcon, isCategoryIconName } from "./category-icon";

const LANGS: Locale[] = ["uz", "ru", "en"];

export function CategoryDetails({
  category,
  node,
  parent,
  onEdit,
  actions,
}: {
  category: Category;
  /** Present for top-level categories. */
  node: CategoryNode | null;
  parent: CategoryNode | null;
  onEdit: () => void;
  actions: ReactNode;
}) {
  const t = useT();
  const [locale] = useLocale();
  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <CategoryIcon name={category.icon} />
          </span>
          <span className="truncate">{t.text(category.name)}</span>
          <StatusBadge kind="categoryStatus" value={category.status} />
        </span>
      }
      description={parent ? t("categories.details.subcategoryOf", { parent: t.text(parent.name) }) : t("categories.details.topLevel")}
      action={
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil /> <span className="hidden sm:inline">{t("common.actions.edit")}</span>
            <span className="sr-only sm:hidden">{t("common.actions.edit")}</span>
          </Button>
          {actions}
        </div>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        {category.image && <ItemImage key={category.image} src={category.image} alt={t.text(category.name)} className="h-24 w-full shrink-0 rounded-lg sm:w-32" />}
        <InfoList
          columns={2}
          className="flex-1"
          items={[
            ...LANGS.map((lang) => ({
              label: t(`categories.form.name.${lang}`),
              value: <span lang={lang}>{category.name[lang]}</span>,
            })),
            { label: t("categories.form.slug"), value: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{category.slug}</code> },
            {
              label: t("categories.form.icon"),
              value: isCategoryIconName(category.icon) ? category.icon : <span className="text-muted-foreground">{t("common.misc.notSet")}</span>,
            },
            { label: t("categories.details.listings"), value: <span className="tabular-nums">{formatNumber(category.listingsCount, locale)}</span> },
            { label: t("categories.details.subcategories"), value: <span className="tabular-nums">{node?.children.length ?? 0}</span>, hidden: !node },
            { label: t("common.fields.updatedAt"), value: <DateCell value={category.updatedAt} mode="datetime" /> },
          ]}
        />
      </div>
    </Section>
  );
}
