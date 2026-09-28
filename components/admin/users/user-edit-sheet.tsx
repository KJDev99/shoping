"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { SimpleSelect } from "@/components/common/simple-select";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { applyFieldErrors } from "@/hooks/use-api-error";
import { useLookups } from "@/hooks/use-lookups";
import { useUserActions } from "@/hooks/use-users";
import { useT } from "@/lib/i18n/provider";
import { userUpdateSchema, type UserUpdateInput } from "@/schemas/user.schema";
import type { User } from "@/types";

function toForm(user: User): UserUpdateInput {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email ?? "",
    regionId: user.regionId,
    districtId: user.districtId,
    bio: user.bio ?? "",
  };
}

export function UserEditSheet({ user, open, onOpenChange }: { user: User; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const { data: lookups } = useLookups();
  const { update } = useUserActions();
  const form = useForm<UserUpdateInput>({ resolver: zodResolver(userUpdateSchema), defaultValues: toForm(user) });
  const regionId = useWatch({ control: form.control, name: "regionId" });

  useEffect(() => {
    if (open) form.reset(toForm(user));
  }, [open, user, form]);

  const onSubmit = form.handleSubmit((input) =>
    update.mutate(
      { id: user.id, input },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e) => applyFieldErrors(e, form.setError),
      },
    ),
  );
  const { errors } = form.formState;
  const districts = lookups?.districts.filter((d) => d.regionId === regionId) ?? [];

  return (
    <Sheet open={open} onOpenChange={(o) => !update.isPending && onOpenChange(o)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("users.dialogs.editTitle")}</SheetTitle>
          <SheetDescription>{t("users.dialogs.editDescription")}</SheetDescription>
        </SheetHeader>
        <form id="user-edit-form" onSubmit={onSubmit} className="space-y-4 px-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("common.fields.firstName")} htmlFor="firstName" error={errors.firstName} required>
              <Input id="firstName" aria-invalid={!!errors.firstName} {...form.register("firstName")} />
            </Field>
            <Field label={t("common.fields.lastName")} htmlFor="lastName" error={errors.lastName} required>
              <Input id="lastName" aria-invalid={!!errors.lastName} {...form.register("lastName")} />
            </Field>
          </div>
          <Field label={t("common.fields.phone")} htmlFor="phone" error={errors.phone} required>
            <Input id="phone" inputMode="tel" placeholder="+998 90 123 45 67" aria-invalid={!!errors.phone} {...form.register("phone")} />
          </Field>
          <Field label={t("common.fields.email")} htmlFor="email" error={errors.email}>
            <Input id="email" type="email" aria-invalid={!!errors.email} {...form.register("email")} />
          </Field>
          <Controller
            control={form.control}
            name="regionId"
            render={({ field }) => (
              <Field label={t("common.fields.region")} error={errors.regionId} required>
                <SimpleSelect
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v ?? "");
                    form.setValue("districtId", null);
                  }}
                  options={(lookups?.regions ?? []).map((r) => ({ value: r.id, label: t.text(r.name) }))}
                  invalid={!!errors.regionId}
                />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="districtId"
            render={({ field }) => (
              <Field label={t("common.fields.district")}>
                <SimpleSelect
                  value={field.value ?? null}
                  onChange={(v) => field.onChange(v)}
                  clearLabel={t("common.misc.notSet")}
                  options={districts.map((d) => ({ value: d.id, label: t.text(d.name) }))}
                />
              </Field>
            )}
          />
          <Field label={t("users.detail.bio")} htmlFor="bio" error={errors.bio}>
            <Textarea id="bio" rows={3} maxLength={300} {...form.register("bio")} />
          </Field>
        </form>
        <SheetFooter className="flex-row justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" form="user-edit-form" disabled={update.isPending}>
            {update.isPending && <Loader2 className="animate-spin" />}
            {t("common.actions.saveChanges")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
