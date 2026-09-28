# Barter.uz — Marketplace + Admin Panel

Admin panel for **Barter.uz**, a barter marketplace in Uzbekistan where users trade **item ↔ item**.
The platform has no selling, prices, cart, checkout, payments or orders. An optional "cash difference" can be recorded as a
note during negotiation. The setting is off by default, and no payment is ever processed.

## Quick start

```bash
npm install
npm run dev
```

- **Marketplace:** http://localhost:3000. Anyone can browse listings. Click **"E'lon joylash"** to post one.
  Sign in with any Uzbek phone number (`+998 …`). The mock backend has no SMS provider, so the one-time code is
  shown on screen (in `npm run dev`, or when `MOCK_EXPOSE_OTP=true`). A new number is asked for a name and
  region, and an account is created. New listings go to moderation and appear in **Admin → Moderation → Pending listings**.
- **Admin panel:** http://localhost:3000/admin/login.

Demo accounts (mock backend only), password **`Barter2026!`**:

| Email | Role |
|---|---|
| superadmin@barter.uz | SUPER_ADMIN (full access, manages admins) |
| admin@barter.uz | ADMIN |
| moderator@barter.uz | MODERATOR |
| support@barter.uz | SUPPORT (mostly read-only) |

## Marketplace (public site)

`/` listings feed (search, category, region, condition, "open to any offer") · `/listings/[id]` listing page
(photos, attributes, what the owner wants in exchange) · `/login` phone + SMS code · `/listings/new` post a listing
(image upload with type/size/content checks, category attributes, exchange preferences) · `/my/listings`
(status and rejection reason). The public API (`/api/app/*`) uses its own session cookie and never exposes phone
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
| `MOCK_API_LATENCY_MS` | `250` | Simulated latency of the mock backend |
| `MOCK_EXPOSE_OTP` | unset | Show SMS codes in a production build of the mock (always shown in dev). Never enable with real users. |
