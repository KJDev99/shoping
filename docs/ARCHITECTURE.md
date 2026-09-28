# Barter.uz Admin — Architecture & Conventions

Pure **item ↔ item** barter marketplace. There is **no** selling, price, cart, checkout,
payment, order, balance, commission, revenue or GMV anywhere. The optional "cash difference"
is negotiation metadata only (setting `barter.allowCashDifference`, off by default).

## Stack
Next.js 16 (App Router, `proxy.ts` instead of middleware, async `params`), React 19, TypeScript strict,
Tailwind v4, shadcn/ui **base-nova style (Base UI primitives, not Radix)**, TanStack Query v5,
TanStack Table **v8**, React Hook Form + Zod v3, Recharts 3, Zustand (only if truly global client state), lucide-react.

### Base UI gotchas (important)
- No `asChild`. Use the `render` prop: `<DropdownMenuTrigger render={<Button variant="outline" />}>…</DropdownMenuTrigger>`.
- Buttons that navigate: use `<ButtonLink href=…>` from `components/common/button-link` (sets `nativeButton={false}`).
- Menu items that navigate: `<DropdownMenuItem render={<Link href=… />}>`.
- Selects: use `SimpleSelect` (`components/common/simple-select`), not raw `Select`.
- `Tabs` uses `value`/`onValueChange`/`defaultValue`; `TabsTrigger value=…`.
- Dialog/Sheet: `open` + `onOpenChange`. `DialogContent` / `SheetContent` accept `className`.

## Data flow
```
UI component → hooks/use-<module>.ts (TanStack Query) → services/<module>.service.ts → lib/api/client.ts (fetch)
   → NEXT_PUBLIC_API_URL (default /api/admin) → app/api/admin/[...path]/route.ts → lib/mock-server (router + handlers) → lib/mock/db.ts
```
Swapping in the real backend = set `NEXT_PUBLIC_API_URL`; services/hooks/UI don't change.

### API contract
- Single: `{ success: true, message, data }` → `api.get/post/patch/delete` return `data`.
- List: `{ success: true, data: [], meta: { page, limit, total, totalPages } }` → `api.list<T>(path, ListParams)`.
- Errors: `{ success:false, message, code, errors?: { field: ["validation.key"] } }` → thrown as `ApiError`
  (`isForbidden`, `isNotFound`, `isValidation`, `isRateLimited`…). 401 auto-redirects to `/admin/login?next=`.
- Query params for lists: `page, limit, search, sort, order, ...filters` (multi-value filters are comma-separated).

### Mock backend (`lib/mock-server`)
- One file per module in `handlers/`, exporting a `Route[]` built with `route(method, path, handler)`; already registered in `lib/mock-server/index.ts`.
- In every handler: `requirePermission(ctx, "perm.name")` first (this is the real permission gate), `validate(schema, ctx.body)` for bodies (→ 422),
  throw `notFound()/conflict()/badRequest()` for errors, `paginate(items, params)` / `ok(data)` to respond.
- Use `parseListParams`, `sortItems` (whitelisted keys), `matchesSearch`, `inDateRange`, `csv` from `http.ts`.
- Every mutation: `audit(ctx, {...})` (immutable audit log); moderation actions also `recordModeration(ctx, action, targetType, targetId, label, reason)`.
- Use presenters from `lib/mock/db.ts` (`presentListing`, `presentBarter`, `presentExchange`, `userRefOf`, `listingRefOf`, `adminRefOf`) so embedded refs are fresh.
- After changes affecting counters call `recomputeAggregates(db)`. After listing changes bump `db.listingsVersion++`.
- DELETE requests carry no body; pass `reason` as a query param.

### Validation (`schemas/`)
- Import `z` from `@/schemas/z` (global error map → translation keys). Messages are keys like `"validation.required"`.
- Schemas are shared by forms (zodResolver) and mock handlers (`validate`).

## UI conventions
- Route files in `app/admin/(panel)/<route>/page.tsx` are **Server Components**: export `metadata`, await `params`,
  wrap the client feature component in `<RequirePermission permission=…>` and `<Suspense>` (needed for `useSearchParams`).
- Feature components live in `components/admin/<module>/` and are `"use client"`.
- Lists: `useListParams(defaults, FILTER_KEYS)` (URL state) + `DataTable` + filters from `components/tables/filters`
  (`FacetedFilter`, `DateRangeFilter`, `NumberRangeFilter`). Column `id` == server sort key. Provide `mobileCard`.
  Reference implementation: `components/admin/users/users-page.tsx`.
- Detail pages: `DetailSkeleton` while loading, `ErrorState` (handles 403/404/429/500) on error, `PageHeader` with `backHref`,
  `Section` + `InfoList`, `Tabs`. Reference: `components/admin/users/user-detail-page.tsx`.
- Mutations: `useActionMutation({ mutationFn, successMessage, invalidate })` → disables buttons via `isPending`, toasts, invalidation.
  Forms: on error call `applyFieldErrors(error, form.setError)` to show 422 errors next to fields.
- Dangerous actions (delete, block, suspend, reject…) always go through `ConfirmDialog` (reason support, predefined reason options).
  Never `alert/confirm/prompt`.
- Shared building blocks: `StatusBadge kind=… value=…`, `Pill`, `UserCell`, `ListingCell`, `ItemImage`, `DateCell`, `NumberCell`,
  `Rating`, `CopyId`, `StatCard`, `EmptyState`, `ErrorState`, `RowActions`, `Can`, `useCan`, `AdminNotes`, `ModerationHistory`,
  `BarterComparison` (the core A ↔ B visual, N↔M items).
- Lookups (regions, districts, categories, attributes): `useLookupNames()` → `region(id)`, `category(id)`, maps, `lookups`.
- i18n: `const t = useT()`; `t("ns.key", {vars})` is type-checked; `t.text(translatedText)` for multilingual data; `t.dynamic(key)` for runtime keys.
  Each module owns `lib/i18n/messages/<ns>.ts` via `defineMessages({ en, uz, ru })` — all three must have identical keys. Default locale: `uz`.
  Enum labels live in `enums.*` (already complete).
- Dates/numbers: `formatDate/formatDateTime/formatRelative/formatNumber/formatPercent(value, locale)` from `lib/format`, with `const [locale] = useLocale()`.
- Styling: semantic tokens only (`bg-card`, `text-muted-foreground`, `text-success`, `bg-warning/10`, `text-destructive`, `chart-1..5`) so dark mode works.
  No gradients or gratuitous animation. Mobile first: stack on small screens, `sm:`/`lg:` grids.
- Safety indicators (`riskLevel`) are operational hints, never accusations — phrase UI copy accordingly.

## Demo accounts
`superadmin@barter.uz`, `admin@barter.uz`, `moderator@barter.uz`, `support@barter.uz` — password `Barter2026!`.
