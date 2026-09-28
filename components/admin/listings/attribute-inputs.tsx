"use client";

import { Controller, type Control, type FieldError } from "react-hook-form";
import { SimpleSelect } from "@/components/common/simple-select";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n/provider";
import type { ListingUpdateInput } from "@/schemas/listing.schema";
import type { CategoryAttribute } from "@/types";
import { MultiSelect } from "./multi-select";

/**
 * Renders one input per dynamic category attribute (TEXT / NUMBER / SELECT /
 * MULTI_SELECT / BOOLEAN), bound to `attributes.<attributeId>` in the listing form.
 */
export function AttributeInputs({
  defs,
  control,
  errorFor,
}: {
  defs: CategoryAttribute[];
  control: Control<ListingUpdateInput>;
  errorFor: (attributeId: string) => FieldError | undefined;
}) {
  const t = useT();
  if (!defs.length) return <p className="text-sm text-muted-foreground">{t("listings.edit.noAttributes")}</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {defs.map((def) => {
        const id = `attr-${def.id}`;
        const error = errorFor(def.id);
        const label = (
          <>
            {t.text(def.name)}
            {def.unit && <span className="font-normal text-muted-foreground"> ({def.unit})</span>}
          </>
        );
        return (
          <Controller
            key={def.id}
            control={control}
            name={`attributes.${def.id}`}
            render={({ field }) => {
              const value = field.value;
              switch (def.type) {
                case "TEXT":
                  return (
                    <Field label={label} htmlFor={id} error={error} required={def.required}>
                      <Input id={id} value={typeof value === "string" || typeof value === "number" ? String(value) : ""} onChange={(e) => field.onChange(e.target.value)} onBlur={field.onBlur} maxLength={120} aria-invalid={!!error} />
                    </Field>
                  );
                case "NUMBER":
                  return (
                    <Field label={label} htmlFor={id} error={error} required={def.required}>
                      <Input
                        id={id}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={typeof value === "number" || typeof value === "string" ? String(value) : ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        aria-invalid={!!error}
                      />
                    </Field>
                  );
                case "SELECT":
                  return (
                    <Field label={label} htmlFor={id} error={error} required={def.required}>
                      <SimpleSelect
                        id={id}
                        value={typeof value === "string" || typeof value === "number" ? String(value) : null}
                        onChange={(v) => field.onChange(v ?? "")}
                        placeholder={t("listings.edit.selectOption")}
                        clearLabel={def.required ? undefined : t("common.misc.notSet")}
                        options={def.options.map((o) => ({ value: o.value, label: t.text(o.label) || o.value }))}
                        invalid={!!error}
                      />
                    </Field>
                  );
                case "MULTI_SELECT":
                  return (
                    <Field label={label} htmlFor={id} error={error} required={def.required}>
                      <MultiSelect
                        id={id}
                        value={Array.isArray(value) ? value : []}
                        onChange={field.onChange}
                        options={def.options.map((o) => ({ value: o.value, label: t.text(o.label) || o.value }))}
                        placeholder={t("listings.edit.selectOption")}
                        invalid={!!error}
                        searchable={def.options.length > 8}
                      />
                    </Field>
                  );
                case "BOOLEAN":
                  return (
                    <Field error={error} className="flex flex-col justify-end">
                      <label htmlFor={id} className="flex h-9 items-center justify-between gap-3 rounded-lg border px-3 text-sm">
                        <span>{label}</span>
                        <Switch id={id} checked={value === true} onCheckedChange={(checked) => field.onChange(checked)} />
                      </label>
                    </Field>
                  );
              }
            }}
          />
        );
      })}
    </div>
  );
}
