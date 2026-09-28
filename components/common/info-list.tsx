import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InfoItem {
  label: ReactNode;
  value: ReactNode;
  /** Hide the row entirely (e.g. field not applicable). */
  hidden?: boolean;
}

/** Label/value rows for detail pages. */
export function InfoList({ items, className, columns = 1 }: { items: InfoItem[]; className?: string; columns?: 1 | 2 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3 text-sm", columns === 2 && "sm:grid-cols-2", className)}>
      {items
        .filter((i) => !i.hidden)
        .map((item, idx) => (
          <div key={idx} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="min-w-0 break-words">{item.value ?? "—"}</dd>
          </div>
        ))}
    </dl>
  );
}

/** Card section with a title row and optional action. */
export function Section({ title, description, action, children, className, contentClassName }: { title: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; contentClassName?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card text-card-foreground", className)}>
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      <div className={cn("p-4", contentClassName)}>{children}</div>
    </section>
  );
}
