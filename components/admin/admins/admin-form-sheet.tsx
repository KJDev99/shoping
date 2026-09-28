"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm, type FieldErrors, type UseFormRegister, type UseFormSetError } from "react-hook-form";
import { SimpleSelect } from "@/components/common/simple-select";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAdminActions } from "@/hooks/use-admins";
import { applyFieldErrors } from "@/hooks/use-api-error";
import { isApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/provider";
import { adminCreateSchema, adminUpdateSchema, type AdminCreateInput, type AdminUpdateInput } from "@/schemas/admin.schema";
import { ADMIN_ROLES, type Admin } from "@/types";

/** Random temporary password satisfying the password rules (upper, lower, digit, symbol, 14 chars). */
export function generatePassword(length = 14): string {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%*?-"];
  const all = sets.join("");
  const rand = (max: number) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  };
  const chars = sets.map((s) => s[rand(s.length)]);
  while (chars.length < length) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

type ProfileFields = Pick<AdminUpdateInput, "firstName" | "lastName" | "email" | "phone">;

/** 422 field errors plus the duplicate-email conflict shown on the email field. */
function applyServerErrors<T extends ProfileFields>(error: unknown, setError: UseFormSetError<T>) {
  applyFieldErrors(error, setError);
  if (isApiError(error) && error.code === "EMAIL_TAKEN") {
    (setError as unknown as UseFormSetError<ProfileFields>)("email", { type: "server", message: "admins.errors.EMAIL_TAKEN" });
  }
}

function ProfileFieldsBlock<T extends ProfileFields>({ register, errors }: { register: UseFormRegister<T>; errors: FieldErrors<ProfileFields> }) {
  const t = useT();
  const reg = register as unknown as UseFormRegister<ProfileFields>;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.fields.firstName")} htmlFor="admin-firstName" error={errors.firstName} required>
          <Input id="admin-firstName" autoComplete="off" aria-invalid={!!errors.firstName} {...reg("firstName")} />
        </Field>
        <Field label={t("common.fields.lastName")} htmlFor="admin-lastName" error={errors.lastName} required>
          <Input id="admin-lastName" autoComplete="off" aria-invalid={!!errors.lastName} {...reg("lastName")} />
        </Field>
      </div>
      <Field label={t("common.fields.email")} htmlFor="admin-email" error={errors.email} required>
        <Input id="admin-email" type="email" autoComplete="off" aria-invalid={!!errors.email} {...reg("email")} />
      </Field>
      <Field label={t("common.fields.phone")} htmlFor="admin-phone" error={errors.phone} required>
        <Input id="admin-phone" inputMode="tel" placeholder="+998 90 123 45 67" aria-invalid={!!errors.phone} {...reg("phone")} />
      </Field>
    </>
  );
}

const EMPTY_CREATE: AdminCreateInput = { firstName: "", lastName: "", email: "", phone: "", role: "MODERATOR", password: "" };

export function AdminCreateSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const { create } = useAdminActions();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<AdminCreateInput>({ resolver: zodResolver(adminCreateSchema), defaultValues: EMPTY_CREATE });

  useEffect(() => {
    if (open) form.reset(EMPTY_CREATE);
  }, [open, form]);

  const onSubmit = form.handleSubmit((input) =>
    create.mutate(input, {
      onSuccess: () => onOpenChange(false),
      onError: (e) => applyServerErrors(e, form.setError),
    }),
  );
  const { errors } = form.formState;

  return (
    <Sheet open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("admins.form.createTitle")}</SheetTitle>
          <SheetDescription>{t("admins.form.createDescription")}</SheetDescription>
        </SheetHeader>
        <form id="admin-create-form" onSubmit={onSubmit} className="space-y-4 px-4" noValidate>
          <ProfileFieldsBlock register={form.register} errors={errors} />
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Field label={t("admins.form.role")} error={errors.role} required>
                <SimpleSelect
                  value={field.value}
                  onChange={(v) => v && field.onChange(v)}
                  options={ADMIN_ROLES.map((r) => ({ value: r, label: t(`enums.adminRole.${r}`) }))}
                  invalid={!!errors.role}
                />
                <p className="text-xs text-muted-foreground">{t(`admins.roleDescriptions.${field.value}`)}</p>
              </Field>
            )}
          />
          <Field label={t("admins.form.tempPassword")} htmlFor="admin-password" error={errors.password} hint={t("admins.form.tempPasswordHint")} required>
            <InputGroup>
              <InputGroupInput
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="font-mono"
                aria-invalid={!!errors.password}
                {...form.register("password")}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? t("admins.form.hide") : t("admins.form.show")}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </InputGroupButton>
                <InputGroupButton
                  size="xs"
                  onClick={() => {
                    form.setValue("password", generatePassword(), { shouldValidate: true, shouldDirty: true });
                    setShowPassword(true);
                  }}
                >
                  <Wand2 /> {t("admins.form.generate")}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </form>
        <SheetFooter className="flex-row justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" form="admin-create-form" disabled={create.isPending}>
            {create.isPending && <Loader2 className="animate-spin" />}
            {t("common.actions.create")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function toEditForm(admin: Admin): AdminUpdateInput {
  return { firstName: admin.firstName, lastName: admin.lastName, email: admin.email, phone: admin.phone };
}

export function AdminEditSheet({ admin, open, onOpenChange }: { admin: Admin; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const { update } = useAdminActions();
  const form = useForm<AdminUpdateInput>({ resolver: zodResolver(adminUpdateSchema), defaultValues: toEditForm(admin) });

  useEffect(() => {
    if (open) form.reset(toEditForm(admin));
  }, [open, admin, form]);

  const onSubmit = form.handleSubmit((input) =>
    update.mutate(
      { id: admin.id, input },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e) => applyServerErrors(e, form.setError),
      },
    ),
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !update.isPending && onOpenChange(o)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("admins.form.editTitle")}</SheetTitle>
          <SheetDescription>{t("admins.form.editDescription")}</SheetDescription>
        </SheetHeader>
        <form id="admin-edit-form" onSubmit={onSubmit} className="space-y-4 px-4" noValidate>
          <ProfileFieldsBlock register={form.register} errors={form.formState.errors} />
        </form>
        <SheetFooter className="flex-row justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" form="admin-edit-form" disabled={update.isPending || !form.formState.isDirty}>
            {update.isPending && <Loader2 className="animate-spin" />}
            {t("common.actions.saveChanges")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
