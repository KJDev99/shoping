"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, FileClock, KeyRound, Loader2, Mail, Phone } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AuditDetailSheet } from "@/components/admin/audit/audit-detail-sheet";
import { AuditEntityBadge, useAuditSentence } from "@/components/admin/audit/audit-utils";
import { ButtonLink } from "@/components/common/button-link";
import { DateCell, UserAvatar } from "@/components/common/cells";
import { Section } from "@/components/common/info-list";
import { PageHeader } from "@/components/common/page-header";
import { DetailSkeleton, EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfileActions } from "@/hooks/use-admins";
import { applyFieldErrors } from "@/hooks/use-api-error";
import { useAuditList } from "@/hooks/use-audit";
import { useCan, useSession } from "@/hooks/use-session";
import { formatDate, formatRelative } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { groupPermissions } from "@/lib/rbac";
import { changePasswordSchema, profileSchema, type ChangePasswordInput, type ProfileInput } from "@/schemas/auth.schema";
import type { Admin, AuditLog, Permission } from "@/types";

export function ProfilePage() {
  const t = useT();
  const [locale] = useLocale();
  const session = useSession();

  if (session.isPending) return <DetailSkeleton />;
  if (session.isError) return <ErrorState error={session.error} onRetry={() => session.refetch()} />;
  const { admin, permissions } = session.data;
  const name = `${admin.firstName} ${admin.lastName}`;

  return (
    <div className="space-y-6">
      <PageHeader title={t("profile.title")} description={t("profile.subtitle")} />

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
        <UserAvatar name={name} src={admin.avatar} className="size-16 text-lg" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{name}</h2>
            <StatusBadge kind="adminRole" value={admin.role} dot={false} />
            <StatusBadge kind="adminStatus" value={admin.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mail className="size-3.5" /> {admin.email}
            </span>
            <span className="flex items-center gap-1.5 tabular-nums">
              <Phone className="size-3.5" /> {admin.phone}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {admin.lastLoginAt && t("profile.lastLogin", { date: formatRelative(admin.lastLoginAt, locale) })}
            {admin.lastLoginAt && " · "}
            {t("profile.memberSince", { date: formatDate(admin.createdAt, locale) })}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileForm admin={admin} />
        <PasswordForm />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <MyActivity className="lg:col-span-3" />
        <MyPermissions permissions={permissions} className="lg:col-span-2" />
      </div>
    </div>
  );
}

function ProfileForm({ admin }: { admin: Admin }) {
  const t = useT();
  const { updateProfile } = useProfileActions();
  const defaults: ProfileInput = { firstName: admin.firstName, lastName: admin.lastName, phone: admin.phone };
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), values: defaults });
  const { errors, isDirty } = form.formState;
  const onSubmit = form.handleSubmit((input) => updateProfile.mutate(input, { onError: (e) => applyFieldErrors(e, form.setError) }));

  return (
    <Section title={t("profile.details.title")} description={t("profile.details.description")}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <fieldset disabled={updateProfile.isPending} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("common.fields.firstName")} htmlFor="profile-firstName" error={errors.firstName} required>
              <Input id="profile-firstName" autoComplete="given-name" aria-invalid={!!errors.firstName} {...form.register("firstName")} />
            </Field>
            <Field label={t("common.fields.lastName")} htmlFor="profile-lastName" error={errors.lastName} required>
              <Input id="profile-lastName" autoComplete="family-name" aria-invalid={!!errors.lastName} {...form.register("lastName")} />
            </Field>
          </div>
          <Field label={t("common.fields.phone")} htmlFor="profile-phone" error={errors.phone} required>
            <Input id="profile-phone" inputMode="tel" autoComplete="tel" placeholder="+998 90 123 45 67" aria-invalid={!!errors.phone} {...form.register("phone")} />
          </Field>
          <Field label={t("common.fields.email")} htmlFor="profile-email">
            <Input id="profile-email" value={admin.email} readOnly disabled />
          </Field>
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => form.reset(defaults)} disabled={!isDirty || updateProfile.isPending}>
            {t("common.actions.reset")}
          </Button>
          <Button type="submit" disabled={!isDirty || updateProfile.isPending}>
            {updateProfile.isPending && <Loader2 className="animate-spin" />}
            {t("common.actions.saveChanges")}
          </Button>
        </div>
      </form>
    </Section>
  );
}

const EMPTY_PASSWORD: ChangePasswordInput = { currentPassword: "", password: "", confirmPassword: "" };

function PasswordForm() {
  const t = useT();
  const { changePassword } = useProfileActions();
  const form = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema), defaultValues: EMPTY_PASSWORD });
  const { errors } = form.formState;
  const onSubmit = form.handleSubmit((input) =>
    changePassword.mutate(input, {
      onSuccess: () => form.reset(EMPTY_PASSWORD),
      onError: (e) => applyFieldErrors(e, form.setError),
    }),
  );

  return (
    <Section title={t("profile.password.title")} description={t("profile.password.description")}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <fieldset disabled={changePassword.isPending} className="space-y-4">
          <Field label={t("profile.password.current")} htmlFor="pw-current" error={errors.currentPassword} required>
            <Input id="pw-current" type="password" autoComplete="current-password" aria-invalid={!!errors.currentPassword} {...form.register("currentPassword")} />
          </Field>
          <Field label={t("profile.password.new")} htmlFor="pw-new" error={errors.password} hint={t("profile.password.hint")} required>
            <Input id="pw-new" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
          </Field>
          <Field label={t("profile.password.confirm")} htmlFor="pw-confirm" error={errors.confirmPassword} required>
            <Input id="pw-confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...form.register("confirmPassword")} />
          </Field>
        </fieldset>
        <div className="flex justify-end">
          <Button type="submit" disabled={changePassword.isPending}>
            {changePassword.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
            {t("profile.password.submit")}
          </Button>
        </div>
      </form>
    </Section>
  );
}

const MY_ACTIVITY_PARAMS = { page: 1, limit: 8, sort: "createdAt", order: "desc" as const, filters: { adminId: "me" } };

function MyActivity({ className }: { className?: string }) {
  const t = useT();
  const canReadAudit = useCan("audit.read");
  const query = useAuditList(MY_ACTIVITY_PARAMS);
  const sentence = useAuditSentence();
  const [selected, setSelected] = useState<AuditLog | null>(null);

  return (
    <Section
      title={t("profile.activity.title")}
      description={t("profile.activity.description")}
      className={className}
      contentClassName="p-0"
      action={
        canReadAudit && (
          <ButtonLink href="/admin/audit-logs" variant="ghost" size="sm">
            <FileClock /> {t("profile.activity.viewAll")}
          </ButtonLink>
        )
      }
    >
      {query.isPending ? (
        <div className="p-4">
          <ListSkeleton rows={4} />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState title={t("profile.activity.empty")} />
      ) : (
        <ul className="divide-y">
          {query.data.data.map((log) => (
            <li key={log.id}>
              <button type="button" onClick={() => setSelected(log)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm">{sentence(log)}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <AuditEntityBadge type={log.entityType} />
                    <span className="font-mono">{log.ipAddress}</span>
                  </div>
                </div>
                <DateCell value={log.createdAt} className="shrink-0 text-xs text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <AuditDetailSheet log={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </Section>
  );
}

function MyPermissions({ permissions, className }: { permissions: readonly Permission[]; className?: string }) {
  const t = useT();
  const groups = useMemo(() => {
    const granted = new Set(permissions);
    return Object.entries(groupPermissions())
      .map(([group, perms]) => [group, perms.filter((p) => granted.has(p))] as const)
      .filter(([, perms]) => perms.length > 0);
  }, [permissions]);

  return (
    <Section
      title={t("profile.permissions.title")}
      description={t("profile.permissions.description")}
      className={className}
      action={<span className="text-xs whitespace-nowrap text-muted-foreground">{t("profile.permissions.count", { count: permissions.length })}</span>}
    >
      <div className="space-y-4">
        {groups.map(([group, perms]) => (
          <div key={group} className="space-y-1.5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t.dynamic(`admins.permissionGroups.${group}`)}</p>
            <ul className="space-y-1">
              {perms.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm">
                  <Check className="size-3.5 shrink-0 text-success" />
                  <span>{t(`admins.permissions.${p}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
