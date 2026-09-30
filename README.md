# Barter.uz — Marketplace + Admin Panel

Admin panel for **Barter.uz**, a barter marketplace in Uzbekistan where users trade **item ↔ item**.
The platform has no selling, prices, cart, checkout, payments or orders. An optional "cash difference" can be recorded as a
note during negotiation. The setting is off by default, and no payment is ever processed.

## Quick start (with the Django backend)

```bash
# 1) backend  (folder: ../barter shoping/backend)
.venv\Scriptsctivate
python manage.py runserver 8000
python manage.py run_bot          # Telegram bot (second terminal)

# 2) frontend (this folder) — .env.local:  BACKEND_URL=http://localhost:8000
npm run dev
```

With `BACKEND_URL` set, `/api/admin/*`, `/api/app/*` and `/media/*` are proxied to Django through this app's own origin
(`next.config.ts`, `beforeFiles` rewrites), so the session cookies stay first-party. Users sign in with the Telegram bot:
"Kirish" → open the bot → Start → share phone → type the 6-digit code. Without `BACKEND_URL` the built-in mock backend is used
(its Telegram login accepts any 6-digit code).

## Quick start (mock only)

```bash
npm install
npm run dev
```

- **Marketplace:** http://localhost:3000. Anyone can browse listings. Click **"E'lon joylash"** to post one —
  no account needed: the form asks for a name and phone number at the end, and the SMS code creates the account
  and publishes the listing in one step. Sign in at `/login` with any Uzbek phone number (`+998 …`).
  The mock backend has no SMS provider, so **any 6-digit code is accepted** (set `MOCK_STRICT_OTP=true` to require
  the generated code). New listings go to moderation and appear in **Admin → Moderation → Pending listings**.
- **Offers:** on someone else's listing press **"Almashishni taklif qilish"**, pick one or more of your active
  listings and send. Offers are answered in **Takliflarim** (`/my/offers`); after acceptance both sides see each
  other's phone number.
- **Admin panel:** http://localhost:3000/admin/login.

Demo accounts (mock backend only), password **`Barter2026!`**:

| Email | Role |
|---|---|
| superadmin@barter.uz | SUPER_ADMIN (full access, manages admins) |
| admin@barter.uz | ADMIN |
| moderator@barter.uz | MODERATOR |
| support@barter.uz | SUPPORT (mostly read-only) |

## Marketplace (public site)

`/` listings feed (search, category, region) · `/listings/[id]` listing page (photos, video with a play counter,
attributes, hashtags of what the owner wants, "offer an exchange") · `/login` phone + SMS code · `/listings/new`
post a listing, also as a guest (photos ≤5 MB, one video ≤10 MB, type checked by file content, hashtags) ·
`/my/listings` (status and rejection reason) · `/my/offers` (received / sent offers: accept, decline, cancel).
The site is light-theme only. The public API (`/api/app/*`) uses its own session cookie and never exposes phone
numbers or moderation data.

## Admin sections

Dashboard · Users · Listings · Barter Requests · Exchanges (+ Disputes) · Matches · Categories (+ dynamic attributes) ·
Locations · Reports · Moderation (queues + safety tools) · Notifications · Admins (RBAC) · Audit Logs · Settings · Profile.

## Architecture

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full contract. In short:

```
app/admin/(auth)/…          login, forgot/reset password
app/admin/(panel)/…         authenticated pages (Server Component route files)
app/api/admin/[...path]     mock REST backend (remove when the real API exists)
components/{admin,common,tables,dialogs,forms,charts,ui}
services/*.service.ts       typed API layer (one per module)
hooks/                      TanStack Query hooks, URL table state, permissions
schemas/                    Zod schemas shared by forms and the API
lib/mock, lib/mock-server   seeded data + handlers (auth, RBAC, CSRF, audit)
lib/i18n                    uz (default) / ru / en, type-checked keys
types/                      database-ready domain models
proxy.ts                    auth gate + security headers (Next 16 "proxy")
```

### Connecting the real backend
Set `NEXT_PUBLIC_API_URL` (for example `https://api.barter.uz/admin`). The backend must implement the same endpoints and
envelopes (`{ success, message, data }`, paginated `{ data, meta }`, errors with `errors` field map), use an httpOnly
session cookie and a readable `barter_csrf` cookie checked against the `X-CSRF-Token` header, and **enforce every
permission server-side**. Frontend permission checks only hide or disable UI.

### Environment
| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `/api/admin` | API base URL |
| `NEXT_PUBLIC_SITE_API_URL` | `/api/app` | Public marketplace API base URL |
| `BACKEND_URL` | unset | Django backend origin (e.g. `http://localhost:8000`). Set → real backend via rewrites; unset → mock |
| `MOCK_API_LATENCY_MS` | `250` | Simulated latency of the mock backend |
| `MOCK_EXPOSE_OTP` | unset | Show SMS codes in a production build of the mock (always shown in dev). Never enable with real users. |
| `MOCK_STRICT_OTP` | unset | `true` = the mock checks the generated SMS code instead of accepting any 6 digits. |
