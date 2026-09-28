"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Lock, StickyNote } from "lucide-react";
import { useState } from "react";
import { UserAvatar } from "@/components/common/cells";
import { Section } from "@/components/common/info-list";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useActionMutation } from "@/hooks/use-action-mutation";
import { useCan } from "@/hooks/use-session";
import { formatDateTime } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import { commonService } from "@/services/common.service";
import type { NoteEntityType } from "@/types";

export const notesQueryKey = (entityType: NoteEntityType, entityId: string) => ["notes", entityType, entityId] as const;

/** Internal admin notes for any entity. Notes are never exposed to marketplace users. */
export function AdminNotes({ entityType, entityId, className }: { entityType: NoteEntityType; entityId: string; className?: string }) {
  const t = useT();
  const [locale] = useLocale();
  const canWriteNotes = useCan("users.notes");
  const canManageDisputes = useCan("disputes.manage");
  const canWrite = canWriteNotes || ((entityType === "EXCHANGE" || entityType === "DISPUTE") && canManageDisputes);
  const [body, setBody] = useState("");
  const query = useQuery({ queryKey: notesQueryKey(entityType, entityId), queryFn: () => commonService.notes(entityType, entityId) });
  const add = useActionMutation({
    mutationFn: (text: string) => commonService.addNote(entityType, entityId, text),
    successMessage: t("common.notes.added"),
    invalidate: [notesQueryKey(entityType, entityId)],
    onSuccess: () => setBody(""),
  });

  return (
    <Section
      className={className}
      title={
        <span className="inline-flex items-center gap-1.5">
          <Lock className="size-3.5 text-muted-foreground" /> {t("common.notes.title")}
        </span>
      }
      description={t("common.notes.hint")}
    >
      {canWrite && (
        <form
          className="mb-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim().length >= 3 && !add.isPending) add.mutate(body.trim());
          }}
        >
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("common.notes.placeholder")} rows={3} maxLength={2000} />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={body.trim().length < 3 || add.isPending}>
              {add.isPending && <Loader2 className="animate-spin" />}
              {t("common.notes.add")}
            </Button>
          </div>
        </form>
      )}
      {query.isPending ? (
        <ListSkeleton rows={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-6" />
      ) : query.data.length === 0 ? (
        <EmptyState icon={<StickyNote />} title={t("common.notes.empty")} className="py-6" />
      ) : (
        <ul className="space-y-4">
          {query.data.map((note) => (
            <li key={note.id} className="flex gap-3">
              <UserAvatar name={note.author.fullName} src={note.author.avatar} className="size-7" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-medium">{note.author.fullName}</span>
                  <StatusBadge kind="adminRole" value={note.author.role} dot={false} />
                  <span className="text-muted-foreground">{formatDateTime(note.createdAt, locale)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{note.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
