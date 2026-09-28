# Barter.uz — Admin Panel

Admin panel for **Barter.uz**, a barter marketplace in Uzbekistan where users trade **item ↔ item**.
The platform has no selling, prices, cart, checkout, payments or orders. An optional "cash difference" can be recorded as a
note during negotiation. The setting is off by default, and no payment is ever processed.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000 → /admin/login
```

Demo accounts (mock backend only), password **`Barter2026!`**:

| Email | Role |
|---|---|
| superadmin@barter.uz | SUPER_ADMIN (full access, manages admins) |
| admin@barter.uz | ADMIN |
| moderator@barter.uz | MODERATOR |
| support@barter.uz | SUPPORT (mostly read-only) |

## Sections

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
| `MOCK_API_LATENCY_MS` | `250` | Simulated latency of the mock backend |
