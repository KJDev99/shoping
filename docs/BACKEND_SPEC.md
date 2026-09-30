# Barter.uz — Backend texnik topshirig'i (Django + Telegram bot)

> Versiya: 1.0 · Sana: 2026-09-30
> Kim uchun: Django backend va Telegram bot dasturchilari.
> Frontend (Next.js) tayyor. U hozir vaqtinchalik **mock backend** bilan ishlayapti. Bu hujjat mock backend
> bajarayotgan hamma narsani haqiqiy Django backendga ko'chirish uchun **shartnoma** (contract).
> Frontend kodi o'zgarmasligi uchun URL'lar, JSON shakllari, cookie nomlari va xato kodlari aynan shu yerda
> yozilganidek bo'lishi shart.

---

## Mundarija

1. [Loyiha haqida va asosiy qoida](#1-loyiha-haqida-va-asosiy-qoida)
2. [Arxitektura va texnologiyalar](#2-arxitektura-va-texnologiyalar)
3. [Umumiy API qoidalari](#3-umumiy-api-qoidalari)
4. [Autentifikatsiya va xavfsizlik](#4-autentifikatsiya-va-xavfsizlik)
5. [Telegram bot orqali kirish (foydalanuvchilar)](#5-telegram-bot-orqali-kirish-foydalanuvchilar)
6. [Ma'lumotlar modeli (Django modellari)](#6-malumotlar-modeli-django-modellari)
7. [Marketplace API — `/api/app`](#7-marketplace-api--apiapp)
8. [Admin API — `/api/admin`](#8-admin-api--apiadmin)
9. [Biznes qoidalari](#9-biznes-qoidalari)
10. [Rollar va ruxsatlar (RBAC)](#10-rollar-va-ruxsatlar-rbac)
11. [Fon vazifalari (Celery)](#11-fon-vazifalari-celery)
12. [Telegram bot xabarnomalari](#12-telegram-bot-xabarnomalari)
13. [Frontend bilan ulash (deploy)](#13-frontend-bilan-ulash-deploy)
14. [Qabul qilish mezonlari (test ro'yxati)](#14-qabul-qilish-mezonlari-test-royxati)
15. [Ilovalar: enumlar va validatsiya kalitlari](#15-ilovalar-enumlar-va-validatsiya-kalitlari)

**Frontend repodagi manbalar (aniq ma'lumot kerak bo'lsa):**

| Nima | Qayerda |
|---|---|
| Barcha JSON tiplari (javob shakllari) | `types/*.ts` |
| So'rov tanasi validatsiyasi (Zod) | `schemas/*.ts` |
| Mock backend — kutilgan xatti-harakatning ishlaydigan namunasi | `lib/mock-server/handlers/*` (admin), `lib/mock-server/app/handlers/*` (sayt) |
| Rollar → ruxsatlar | `lib/rbac.ts` |
| Moslik (matching) algoritmi | `lib/matching/rules-engine.ts` |
| Frontend qaysi endpointni chaqiradi | `services/*.service.ts` |

Bu hujjat bilan kod o'rtasida ziddiyat bo'lsa, `types/` va `schemas/` ustun turadi. Ziddiyat haqida frontend jamoasiga xabar bering.

---

## 1. Loyiha haqida va asosiy qoida

Barter.uz — O'zbekistondagi **buyumni buyumga almashish** (barter) platformasi.

**Qat'iy qoida:** platformada sotuv, narx, savat, to'lov, buyurtma, balans, komissiya, tushum yoki GMV **yo'q**.
Hech bir modelda narx maydoni bo'lmasin. Yagona istisno — "pul farqi" (`cashDifference`). U faqat muzokara
uchun yozib qo'yiladigan izoh. Sozlamalarda `barter.allowCashDifference` bilan yoqiladi (standart holatda o'chiq).
Hech qanday to'lov qabul qilinmaydi.

**Tizim qismlari:**
- **Marketplace (sayt)** — oddiy foydalanuvchilar uchun:
  - e'lonlarni ko'rish va joylash;
  - almashuv taklifini yuborish va qabul qilish;
  - kirish **Telegram bot** orqali.
- **Admin panel** — `/admin`. Moderatorlar va adminlar uchun. Kirish email va parol bilan.
- **Telegram bot** — foydalanuvchini tasdiqlaydi (telefon raqam → kod) va xabarnomalar yuboradi.

---

## 2. Arxitektura va texnologiyalar

**Tavsiya etilgan stek:**

| Qism | Texnologiya |
|---|---|
| API | Python 3.12, Django 5.x, Django REST Framework |
| Ma'lumotlar bazasi | PostgreSQL 16 (JSONB, to'liq matnli qidiruv) |
| Kesh, rate limit, qisqa muddatli kodlar | Redis |
| Fon vazifalari | Celery + Celery Beat |
| Fayllar (rasm, video) | S3-mos saqlash (MinIO / AWS S3) + CDN |
| Telegram bot | aiogram 3 (webhook rejimi), Django ORM bilan umumiy baza |
| Reverse proxy | Nginx — frontend va API **bitta domenda** (13-bo'limga qarang) |

**Tavsiya etilgan Django ilovalari (apps):**

```
accounts/       User, TelegramAccount, UserSession, TelegramLoginRequest, UserActivity
admins/         AdminUser, AdminSession, PasswordReset, RBAC
catalog/        Category, CategoryAttribute, Region, District
listings/       Listing, ListingImage, ListingVideo, Upload, VideoView
barter/         BarterRequest, BarterRequestItem, BarterStatusChange
exchanges/      Exchange, ExchangeParticipant, ExchangeStatusChange, Dispute (+ evidence/messages/events), Review
moderation/     Report, ModerationAction, AdminNote, AdminAlert
notifications/  Notification, NotificationRecipient
system/         PlatformSettings, AuditLog
matching/       BarterMatch (hisoblangan keshi)
telegram_bot/   webhook, handlerlar, xabar yuborish servisi
api_admin/      /api/admin/* view va serializerlar
api_app/        /api/app/* view va serializerlar
```

**Muhit o'zgaruvchilari (backend):**

| O'zgaruvchi | Misol | Izoh |
|---|---|---|
| `DATABASE_URL` | `postgres://…` | |
| `REDIS_URL` | `redis://…` | |
| `SITE_URL` | `https://barter.uz` | Bot xabarlaridagi havolalar uchun |
| `TELEGRAM_BOT_TOKEN` | `123:ABC…` | BotFather'dan olinadi |
| `TELEGRAM_BOT_USERNAME` | `BarterUzBot` | Deep link yasash uchun |
| `TELEGRAM_WEBHOOK_SECRET` | tasodifiy 32+ belgi | `X-Telegram-Bot-Api-Secret-Token` tekshiruvi |
| `S3_*` | | Media saqlash |
| `COOKIE_SECURE` | `true` | Productionda doim `true` |

---

## 3. Umumiy API qoidalari

### 3.1. Manzillar

| API | Prefiks | Kim ishlatadi |
|---|---|---|
| Admin | `/api/admin` | `/admin/*` sahifalari |
| Marketplace | `/api/app` | Sayt (`/`, `/listings/*`, `/my/*`, `/login`) |
| Telegram webhook | `/telegram/webhook` | Faqat Telegram serverlari |

**Muhim:**
- Frontend URL'larni **oxirida `/` belgisisiz** chaqiradi (`/api/admin/users/usr_1`). Shuning uchun:
  - `APPEND_SLASH = False` qiling;
  - DRF routerlarda `trailing_slash=False` qiling.
- Admin va marketplace sessiyalari **butunlay alohida**: cookie'lar, jadvallar va autentifikatsiya klasslari boshqa-boshqa. Admin cookie'si bilan `/api/app/me/*` ga kirib bo'lmaydi va aksincha.

### 3.2. JSON formati

- Maydon nomlari **camelCase**: `firstName`, `exchangePreferences`, `createdAt`. Buni `djangorestframework-camel-case` yoki serializerlarda aniq `source=` bilan qiling.
- ID'lar — **string**. Formati ixtiyoriy: UUID yoki `usr_123` kabi prefiksli. Frontend ID'ni faqat solishtiradi va URL'ga qo'yadi.
- Odam o'qiydigan kodlar alohida maydonda turadi:

  | Obyekt | Kod formati |
  |---|---|
  | E'lon | `LST-10234` |
  | Almashuv taklifi | `BAR-1234` |
  | Almashuv | `EXC-512` |
  | Shikoyat | `REP-1001` |

- Sana va vaqt: ISO-8601, UTC, masalan `"2026-09-30T08:15:00.000Z"`.
- Sana filtrlari (`from`, `to`) `YYYY-MM-DD` formatida keladi va chegaralar kiradi (inclusive). Kun chegaralari **Asia/Tashkent** vaqti bo'yicha hisoblanadi.
- Telefon raqam javobda doim `"+998 90 123 45 67"` ko'rinishida qaytariladi. Bazada normallashtirilgan `+998901234567` alohida saqlanadi (qidiruv va unikallik uchun).
- Ko'p tilli matn (`TranslatedText`): `{"uz": "…", "ru": "…", "en": "…"}` — uchala til ham majburiy.

### 3.3. Javob konvertlari

**Bitta obyekt:**
```json
{ "success": true, "message": "Success", "data": { } }
```

**Ro'yxat (pagination):**
```json
{
  "success": true,
  "data": [ ],
  "meta": { "page": 1, "limit": 20, "total": 182, "totalPages": 10 }
}
```

**Xato:**
```json
{
  "success": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": {
    "title": ["validation.min3"],
    "exchangePreferences.keywords": ["validation.max50"],
    "attributes.attr_phones_brand": ["validation.required"]
  }
}
```

- `errors` kalitlari — maydon yo'li. camelCase, ichma-ich maydonlar nuqta bilan (`profile.regionId`, `options.2.value`).
- `errors` qiymatlari — **tarjima kalitlari**, oddiy matn emas. Frontend ularni 3 tilga o'zi tarjima qiladi. Ruxsat etilgan kalitlar ro'yxati 15.3-bo'limda.
- Buning uchun DRF'ning standart xato formatini **custom exception handler** bilan shu shaklga keltiring.

### 3.4. HTTP status va xato kodlari

| Status | `code` | Qachon |
|---|---|---|
| 400 | `BAD_REQUEST` | Noto'g'ri JSON, multipart kutilgan joyda boshqa format |
| 401 | `UNAUTHORIZED` | Sessiya yo'q yoki muddati o'tgan. Frontend login sahifasiga yo'naltiradi |
| 401 | `INVALID_CREDENTIALS` | Admin: email yoki parol noto'g'ri |
| 403 | `FORBIDDEN` | Ruxsat yo'q yoki CSRF xato |
| 403 | `ACCOUNT_BLOCKED` | Hisob bloklangan yoki o'chirilgan |
| 403 | `ACCOUNT_SUSPENDED` | Foydalanuvchi vaqtincha cheklangan: ko'ra oladi, lekin e'lon joylay yoki taklif yubora olmaydi |
| 404 | `NOT_FOUND` | Obyekt topilmadi yoki ko'rish huquqi yo'q |
| 409 | `CONFLICT` yoki aniq kod | Biznes qoidasi buzildi (9-bo'lim va har bir endpointda keltirilgan) |
| 422 | `VALIDATION_ERROR` | Maydon xatolari (`errors` bilan) |
| 429 | `RATE_LIMITED` | Juda ko'p so'rov yoki kunlik limit |
| 500 | `INTERNAL` | Kutilmagan xato. Ichki tafsilotlarni javobga chiqarmang |

Frontend quyidagi 409 kodlarini alohida taniydi:
- `EMAIL_TAKEN`, `SELF_ROLE_CHANGE`, `SAME_ROLE`, `LAST_SUPER_ADMIN`, `SELF_BLOCK`, `ALREADY_BLOCKED`, `ALREADY_ACTIVE`;
- `SLUG_TAKEN`, `ATTRIBUTE_KEY_TAKEN`, `NOT_CANCELLABLE`;
- `OFFER_EXISTS`, `OFFER_NOT_PENDING`.

### 3.5. Ro'yxat so'rovlari (server tomonda sahifalash)

Katta jadvallarning hammasi sahifalash, saralash, filtr va qidiruvni **serverda** bajaradi. Query parametrlari:

| Parametr | Izoh |
|---|---|
| `page` | 1 dan boshlanadi |
| `limit` | Standart 20, maksimal **100** |
| `search` | Matnli qidiruv. Qaysi maydonlar bo'yicha qidirilishi har bir endpointda ko'rsatilgan |
| `sort` | Faqat **ruxsat etilgan** maydonlardan biri (har bir endpointda ro'yxati bor). Boshqa qiymat kelsa, standart saralash ishlatiladi |
| `order` | `asc` yoki `desc` (standart `desc`) |
| boshqa parametrlar | Filtrlar. Bir nechta qiymat vergul bilan keladi: `status=PENDING,ACTIVE` |

- `DELETE` so'rovlarida tana (body) bo'lmaydi. Sabab query parametri sifatida keladi: `DELETE /api/admin/users/usr_1?reason=Spam`.
- Mutatsiyadan keyin yangilangan obyektni `data` ichida qaytaring. Frontend keshini shu javob bilan yangilaydi.

---

## 4. Autentifikatsiya va xavfsizlik

### 4.1. Cookie'lar (nomlar aniq shunday bo'lishi shart)

| Cookie | Kim uchun | Xususiyatlari | Vazifasi |
|---|---|---|---|
| `barter_admin_session` | Admin | `HttpOnly; Secure; SameSite=Lax; Path=/` | Sessiya tokeni |
| `barter_csrf` | Admin | **JS o'qiy oladi** (HttpOnly emas); `Secure; SameSite=Lax; Path=/` | CSRF tokeni |
| `barter_session` | Foydalanuvchi | `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=30 kun` | Sessiya tokeni |
| `barter_user_csrf` | Foydalanuvchi | JS o'qiy oladi; `Secure; SameSite=Lax; Path=/; Max-Age=30 kun` | CSRF tokeni |

- Next.js'dagi `proxy.ts` sahifalarni ochishdan oldin `barter_admin_session` va `barter_session` cookie'lari bor-yo'qligini tekshiradi. Shuning uchun cookie'lar **frontend domenida** bo'lishi kerak (13-bo'lim).
- `barter_admin_locale` cookie'sini frontend o'zi boshqaradi, backendga tegishli emas.

### 4.2. CSRF (double-submit, sessiyaga bog'langan)

- Har bir sessiya yozuvida `csrf_token` bo'ladi. Login paytida u CSRF cookie'siga yoziladi.
- Frontend barcha `POST/PATCH/PUT/DELETE` so'rovlarida `X-CSRF-Token: <cookie qiymati>` sarlavhasini yuboradi.
- Backend sarlavhani **sessiyadagi** token bilan solishtiradi. Mos kelmasa → `403 FORBIDDEN`.
- Sessiyasiz ochiq (public) endpointlarda CSRF tekshirilmaydi: login, Telegram start/verify, katalog.
- Django'ning standart `CsrfViewMiddleware` bitta cookie nomi bilan ishlaydi, shuning uchun bu yerga to'g'ri kelmaydi. Uni shu API'lar uchun o'chirib, o'z autentifikatsiya klassingiz ichida tekshiring.

### 4.3. Sessiyalar

- Token: kamida 256 bit tasodifiy qiymat (`secrets.token_urlsafe(32)`). Bazada **faqat hash'i** (SHA-256) saqlanadi.
- DRF autentifikatsiya klasslari:
  - `AdminCookieAuthentication` — `barter_admin_session` cookie'sini o'qiydi;
  - `UserCookieAuthentication` — `barter_session` cookie'sini o'qiydi.
- Har bir so'rovda tekshiriladi:
  - sessiya mavjud va muddati o'tmagan;
  - egasi `ACTIVE` holatda;
  - admin uchun qo'shimcha: IP ruxsat ro'yxati (4.4).
- Admin sessiyasi **sirpanuvchi** muddatga ega: har so'rovda `now + security.sessionTimeoutMinutes` ga uzaytiriladi. "Meni eslab qol" belgilangan bo'lsa, muddat 7 kun.
- Foydalanuvchi sessiyasi 30 kun amal qiladi.
- Foydalanuvchi bloklansa yoki o'chirilsa, uning barcha sessiyalari darhol bekor bo'ladi. Admin bloklansa yoki paroli tiklansa ham shunday.

### 4.4. Admin kirishi (email + parol) — hozirgidek qoladi

| Endpoint | Tana | Javob `data` |
|---|---|---|
| `POST /api/admin/auth/login` | `{ email, password, remember? }` | `AdminSession` = `{ admin: Admin, permissions: Permission[] }`. Cookie'lar o'rnatiladi |
| `POST /api/admin/auth/logout` | — | `null`. Sessiya o'chiriladi, cookie'lar tozalanadi |
| `GET /api/admin/auth/me` | — | `AdminSession`. Sessiya bo'lmasa 401 |
| `POST /api/admin/auth/forgot-password` | `{ email }` | `{ devResetToken: null }`. **Har doim 200** qaytadi (email bor-yo'qligi oshkor qilinmaydi) |
| `POST /api/admin/auth/reset-password` | `{ token, password, confirmPassword }` | `null` |
| `PATCH /api/admin/auth/profile` | `{ firstName, lastName, phone }` | `Admin` |
| `POST /api/admin/auth/change-password` | `{ currentPassword, password, confirmPassword }` | `null` |

**Qoidalar:**
- Noma'lum email va noto'g'ri parol uchun bir xil javob: `401 INVALID_CREDENTIALS`.
- Ketma-ket `security.maxLoginAttempts` marta xato bo'lsa, email **15 daqiqaga bloklanadi** → `429`.
- Bloklangan admin → `403 ACCOUNT_BLOCKED`.
- Parol qoidalari: kamida 8 belgi, kamida 1 ta bosh harf, kamida 1 ta raqam. Xato kalitlari: `validation.passwordMin`, `validation.passwordUpper`, `validation.passwordDigit`. Tasdiqlash mos kelmasa: `validation.passwordMismatch`.
- Joriy parol noto'g'ri → `422 { currentPassword: ["validation.currentPasswordWrong"] }`.
- Parol tiklash havolasi 30 daqiqa amal qiladi va bir marta ishlatiladi. Email orqali yuboriladi: `{SITE_URL}/admin/reset-password?token=…`.
  - Yaroqsiz token → `422 { token: ["validation.resetTokenInvalid"] }`.
  - Tiklangandan keyin adminning barcha sessiyalari bekor qilinadi.
- **IP ruxsat ro'yxati** (`security.allowedAdminIps`, IPv4/IPv6/CIDR): ro'yxat bo'sh bo'lmasa, boshqa IP'dan kelgan so'rov sessiyasiz hisoblanadi (401).
  - Real IP'ni `X-Forwarded-For` dan faqat ishonchli proksi orqali oling.
- Parollar Django `make_password` bilan saqlanadi (Argon2 tavsiya etiladi).
- Har bir muvaffaqiyatli login audit jurnaliga yoziladi (`auth.login`).
- **Admin 2FA** (`security.requireTwoFactorForAdmins`, ixtiyoriy, keyingi bosqich): yoqilgan bo'lsa, parol to'g'ri kiritilgandan keyin adminning bog'langan Telegram akkauntiga 6 xonali kod yuboriladi va `POST /auth/login/verify-2fa` orqali tasdiqlanadi. Frontend bu qismni hozircha qo'llamaydi.

---

## 5. Telegram bot orqali kirish (foydalanuvchilar)

Oddiy foydalanuvchida **parol yo'q**. Kirish ham, ro'yxatdan o'tish ham Telegram bot orqali bo'ladi:

> Saytda **"Kirish"** bosiladi → bot manzili chiqadi → foydalanuvchi botga kirib **Start** bosadi →
> **telefon raqamini yuboradi** → bot **6 xonali kod** beradi → kod saytga kiritiladi → foydalanuvchi tizimga kiradi.
> Raqam yangi bo'lsa, hisob avtomatik yaratiladi.

### 5.1. Nega kod saytdagi "kirish so'roviga" bog'lanadi

Kod faqat bitta maxsus kirish so'rovi (`loginToken`) uchun amal qiladi. Aks holda buzg'unchi tasodifiy 6 xonali kodlarni tanlab, istalgan birovning hisobiga kirib qolishi mumkin edi.

`loginToken`:
- saytdagi bot havolasiga deep link sifatida qo'shiladi: `https://t.me/BarterUzBot?start=<loginToken>`;
- `verify` so'rovida kod bilan birga yuboriladi.

Natijada har bir token uchun faqat 5 ta urinish bor va kod boshqa brauzerda ishlamaydi.

### 5.2. To'liq oqim

```
Brauzer (sayt)                    Django API                       Telegram bot                Foydalanuvchi
     │  "Kirish" bosildi               │                                 │                            │
     │── POST /auth/telegram/start ───▶│ TelegramLoginRequest(PENDING)   │                            │
     │◀── { loginToken, botUrl } ──────│                                 │                            │
     │  botUrl + QR + kod maydoni      │                                 │                            │
     │                                 │                                 │◀── /start <loginToken> ────│
     │                                 │◀── so'rovni topadi ─────────────│                            │
     │                                 │                                 │── "Raqamni yuborish" ─────▶│
     │                                 │                                 │◀── contact (o'z raqami) ───│
     │                                 │◀── telefon + telegram_id ───────│                            │
     │                                 │ kod yaratadi (hash, 5 daqiqa)   │                            │
     │                                 │ holat = CODE_SENT               │── "Kodingiz: 482913" ─────▶│
     │ (ixtiyoriy) GET /status ───────▶│ { status: "CODE_SENT" }         │                            │
     │── POST /auth/telegram/verify ──▶│ { loginToken, code }            │                            │
     │◀── user + cookie'lar ───────────│ holat = USED                    │                            │
```

### 5.3. Endpointlar (`/api/app`)

#### `POST /api/app/auth/telegram/start` — ochiq

So'rov tanasi yo'q. Javob:

```json
{
  "success": true,
  "data": {
    "loginToken": "Qm9n3tXh1c2VyXzEyMw-aZ",
    "botUsername": "BarterUzBot",
    "botUrl": "https://t.me/BarterUzBot?start=Qm9n3tXh1c2VyXzEyMw-aZ",
    "expiresAt": "2026-09-30T08:25:00.000Z",
    "pollAfterSec": 3
  }
}
```

**Qoidalar:**
- `loginToken` — faqat `[A-Za-z0-9_-]` belgilaridan iborat. Telegram deep link payload'i ko'pi bilan 64 belgi bo'ladi, shuning uchun uzunligi 32–43 belgi.
- Muddati: **10 daqiqa**.
- `TelegramLoginRequest` yaratiladi: `status=PENDING`, `ip`, `user_agent`.
- Rate limit: bitta IP'dan daqiqasiga 10 ta, soatiga 60 ta so'rov.

#### `GET /api/app/auth/telegram/status?loginToken=…` — ochiq, ixtiyoriy (polling)

```json
{ "success": true, "data": { "status": "CODE_SENT", "phoneMasked": "+998 90 *** ** 67" } }
```

- `status` qiymatlari: `PENDING` (bot hali ochilmagan), `CONTACT_REQUESTED`, `CODE_SENT`, `USED`, `EXPIRED`.
- Frontend buni har 3 soniyada chaqirib, "Kod botga yuborildi" degan yozuvni ko'rsatadi.

#### `POST /api/app/auth/telegram/verify` — ochiq

```json
{
  "loginToken": "Qm9n3tXh1c2VyXzEyMw-aZ",
  "code": "482913",
  "profile": { "firstName": "Aziz", "lastName": "", "regionId": "reg_tashkent_city" }
}
```

`profile` ixtiyoriy. U faqat yangi foydalanuvchi uchun, frontend `needsProfile` javobini olgandan keyin yuboriladi.

**Javoblar:**

1. Kod to'g'ri, foydalanuvchi mavjud (yoki `profile` bilan yangi yaratildi) → cookie'lar o'rnatiladi (4.1):
   ```json
   { "success": true, "message": "Signed in", "data": { "needsProfile": false, "user": { "…": "SiteUser" } } }
   ```
2. Kod to'g'ri, raqam yangi va viloyat noma'lum → kod **bekor qilinmaydi**, frontend viloyatni so'raydi va shu kod bilan qayta yuboradi:
   ```json
   {
     "success": true,
     "data": {
       "needsProfile": true,
       "user": null,
       "suggestedProfile": { "firstName": "Aziz", "lastName": "Karimov" }
     }
   }
   ```
   `suggestedProfile` Telegram'dagi ism va familiyadan olinadi.

3. Xatolar:

| Holat | Javob |
|---|---|
| Kod noto'g'ri | `422 { code: ["site.validation.codeWrong"] }`, urinishlar hisoblagichi +1 |
| Kod formati noto'g'ri | `422 { code: ["site.validation.code"] }` |
| Token/kod muddati o'tgan yoki ishlatilgan | `422 { code: ["site.validation.codeExpired"] }` |
| 5 marta xato | `429 RATE_LIMITED`, so'rov `EXPIRED` holatiga o'tadi (qaytadan "Kirish" bosish kerak) |
| Hisob bloklangan yoki o'chirilgan | `403 ACCOUNT_BLOCKED` |
| Viloyat yaroqsiz | `422 { "profile.regionId": ["validation.invalid"] }` |

**Foydalanuvchini topish yoki yaratish** (tranzaksiya ichida, `select_for_update` bilan):
1. `TelegramAccount.telegram_id` bo'yicha qidiriladi. Topilmasa, normallashtirilgan telefon bo'yicha qidiriladi.
2. Topilsa va Telegram akkaunt bog'lanmagan bo'lsa → `TelegramAccount` yaratib bog'lanadi.
   - Telefon boshqa `telegram_id` ga bog'langan bo'lsa (raqam boshqa Telegram akkauntga o'tgan), yangi akkaunt bog'lanadi va eski bog'lanish uziladi.
   - Bu hodisa `UserActivity` va audit uchun loglanadi.
3. Topilmasa:
   - `profile` bo'lmasa → `needsProfile: true` qaytariladi;
   - `profile` bo'lsa → `User` yaratiladi: `registeredVia = "TELEGRAM"`, `phoneVerified = true`, `status = "ACTIVE"`, `language` = Telegram'dagi `language_code` (`uz`/`ru`, boshqasi bo'lsa `uz`).
4. So'rov `USED` holatiga o'tadi, kod o'chiriladi, sessiya yaratiladi, `lastActiveAt` yangilanadi, `UserActivity(LOGIN)` yoziladi.

#### Qolgan auth endpointlari (o'zgarmaydi)

| Endpoint | Izoh |
|---|---|
| `POST /api/app/auth/logout` | Sessiya bekor qilinadi, cookie'lar o'chiriladi. `data: null` |
| `GET /api/app/auth/me` | Ochiq. Mehmonga `data: null`, kirgan foydalanuvchiga `SiteUser` qaytaradi |

`SiteUser`:
```json
{
  "id": "usr_9001", "firstName": "Aziz", "lastName": "Karimov", "fullName": "Aziz Karimov",
  "phone": "+998 90 123 45 67", "avatar": null, "regionId": "reg_tashkent_city",
  "status": "ACTIVE", "suspendedUntil": null, "listingsCount": 3
}
```

`status` faqat `ACTIVE` yoki `SUSPENDED` bo'ladi, chunki bloklangan foydalanuvchi kira olmaydi.

> Mock backenddagi `POST /auth/request-code` va `POST /auth/verify` (SMS) endpointlari **Telegram bilan almashtiriladi**. Haqiqiy backendda ular shart emas. Keyinchalik SMS zaxira kanali sifatida qo'shilsa, shu shakllarni saqlang.
>
> **Diqqat:** mock hozir *istalgan* 6 xonali kodni qabul qiladi. Bu faqat demo uchun. Haqiqiy backendda kod albatta tekshirilishi kerak.

### 5.4. Bot xatti-harakati

**Webhook:** `POST /telegram/webhook`.
- `X-Telegram-Bot-Api-Secret-Token` sarlavhasi `TELEGRAM_WEBHOOK_SECRET` ga teng bo'lishi shart, aks holda 403.
- Webhook `setWebhook(url, secret_token=…, allowed_updates=["message","callback_query","my_chat_member"])` bilan o'rnatiladi.

| Foydalanuvchi harakati | Bot javobi |
|---|---|
| `/start <loginToken>` (token yaroqli, `PENDING`) | Telegram akkaunt oldin telefon bilan bog'langan bo'lsa → **darhol kod yuboradi** (raqam qayta so'ralmaydi). Aks holda: "Kirish uchun telefon raqamingizni yuboring" + `KeyboardButton(request_contact=True)` "📱 Raqamni yuborish". Holat → `CONTACT_REQUESTED` |
| `/start <loginToken>` (token yaroqsiz yoki eskirgan) | "Havola eskirgan. Saytda «Kirish» tugmasini qayta bosing." + saytga `url` tugmasi |
| `/start` (tokensiz) | Salomlashadi va tushuntiradi: "Kirish uchun saytdagi «Kirish» tugmasini bosing" + `{SITE_URL}/login` tugmasi. Raqam yuborilsa, akkaunt oldindan bog'lab qo'yiladi (keyingi kirish tezroq bo'ladi) |
| Kontakt yuborildi | **Tekshiruv: `message.contact.user_id == message.from_user.id`**. Aks holda bu boshqa odamning kontakti bo'ladi: "Faqat o'zingizning raqamingizni tugma orqali yuboring" deb rad etiladi |
| Kontakt `+998` bilan boshlanmaydi | "Hozircha faqat O'zbekiston raqamlari (+998) qabul qilinadi" |
| Kontakt to'g'ri | Telefon normallashtiriladi. `TelegramLoginRequest` ga `telegram_id`, `phone`, `first_name`, `last_name`, `username`, `language_code` yoziladi. 6 xonali kod yaratiladi (`secrets.randbelow`), **hash'i** saqlanadi, muddati 5 daqiqa. Holat → `CODE_SENT`. Reply klaviatura olib tashlanadi (`ReplyKeyboardRemove`) |
| Kod xabari | Pastdagi namunaga qarang |
| Foydalanuvchi bloklangan | "Hisobingiz bloklangan. Qo'llab-quvvatlash: {supportPhone}" — kod berilmaydi |
| `my_chat_member` → foydalanuvchi botni bloklagan | `TelegramAccount.bot_blocked = true`. Xabarnomalar yuborilmaydi |

**Kod xabari namunasi (uz):**
```
🔐 Barter.uz ga kirish kodi: 482913

Kodni saytdagi oynaga kiriting. Kod 5 daqiqa amal qiladi.
⚠️ Bu kodni hech kimga bermang — Barter.uz xodimlari hech qachon kod so'ramaydi.
```

- Xabar foydalanuvchining `language_code` iga qarab uz yoki ru tilida yuboriladi.
- Kod yuborilgach, bot bitta tokenga qayta kod bermaydi. Qayta so'ralsa, eski kod bekor bo'lib yangisi yuboriladi (daqiqasiga ko'pi bilan 1 marta).

**Bot komandalari (menyu):**
- `/start` — kirish va bog'lash;
- `/help` — yordam;
- `/language` — tilni tanlash (uz/ru), `User.language` yangilanadi;
- `/stop` — xabarnomalarni o'chirish.

### 5.5. Mehmon e'lon joylashi (akkauntsiz)

Sayt tizimga kirmagan odamga ham "E'lon joylash" formasini to'ldirishga ruxsat beradi. Tugma bosilganda:
1. Frontend 5.3 dagi Telegram oynasini ochadi: start → botUrl → kod.
2. `verify` muvaffaqiyatli bo'lgach (yangi foydalanuvchi uchun `profile.regionId` formadagi viloyatdan olinadi), frontend fayllarni yuklaydi (`POST /uploads`) va e'lonni yaratadi (`POST /me/listings`).

Backend uchun alohida endpoint shart emas: bu oddiy kirish + oddiy e'lon yaratish. Telefon raqami **faqat Telegram'dan** olinadi, formaga yozilgan raqamga ishonilmaydi.

### 5.6. Xavfsizlik ro'yxati (Telegram kirish)

- [ ] Webhook secret tekshiriladi.
- [ ] `contact.user_id == from_user.id` tekshiriladi.
- [ ] Kod va tokenlar bazada faqat **hash** ko'rinishida saqlanadi. Solishtirish `hmac.compare_digest` bilan.
- [ ] Token muddati 10 daqiqa, kod muddati 5 daqiqa. Har ikkalasi bir martalik.
- [ ] Bitta token uchun 5 ta urinish. IP bo'yicha rate limit (start: 10/daqiqa; verify: 20/daqiqa).
- [ ] Bloklangan yoki o'chirilgan foydalanuvchiga kod berilmaydi va u kira olmaydi.
- [ ] Bot xabarlarida sessiya tokeni yoki boshqa maxfiy ma'lumot bo'lmaydi.
- [ ] Muddati o'tgan `TelegramLoginRequest` yozuvlari 24 soatdan keyin tozalanadi (Celery).

---

## 6. Ma'lumotlar modeli (Django modellari)

Barcha modellarda `created_at` va `updated_at` bor (UTC). Soft delete kerak bo'lgan joylarda `deleted_at` ishlatiladi.
JSON'dagi to'liq shakllar `types/*.ts` da. Jadvalda asosiy maydonlar va indekslar keltirilgan.

### 6.1. Foydalanuvchilar

**User** (`types/user.ts`)

| Maydon | Tur | Izoh |
|---|---|---|
| id | str/UUID PK | |
| first_name, last_name | varchar(50) | `last_name` bo'sh bo'lishi mumkin (Telegram'da yo'q bo'lsa) |
| username | varchar unique | Avtomatik yaratiladi |
| phone | varchar unique | Normallashtirilgan `+998901234567`. API'da formatlangan holda qaytariladi |
| email | varchar null | |
| avatar | url null | Telegram profil rasmi ixtiyoriy olinishi mumkin |
| bio | varchar(300) null | |
| region_id | FK Region | Majburiy (`needsProfile` shu sababli kerak) |
| district_id | FK District null | |
| status | enum `ACTIVE/BLOCKED/SUSPENDED/DELETED` | |
| status_reason | text null | |
| suspended_until | datetime null | |
| phone_verified, email_verified | bool | |
| language | `uz/ru/en` | |
| registered_via | `PHONE/GOOGLE/TELEGRAM` | Yangi foydalanuvchilar uchun `TELEGRAM` |
| risk_level | `LOW/NEEDS_REVIEW/HIGH_REPORTS` | Hisoblanadi (9.6) |
| listings_count, completed_exchanges, reports_count, reports_submitted_count, reviews_count | int | Hisoblagichlar (denormalizatsiya) |
| rating | decimal(2,1) null | Sharhlar o'rtachasi |
| last_active_at, deleted_at | datetime null | |

Indekslar: `phone`, `status`, `region_id`, `created_at`, `risk_level`. Ism va familiya uchun trigram indeks (qidiruv).

**TelegramAccount**:
- `user` (OneToOne);
- `telegram_id` (bigint unique);
- `username`, `first_name`, `last_name`, `language_code`;
- `bot_blocked` (bool), `notifications_enabled` (bool, standart true);
- `linked_at`.

**TelegramLoginRequest**:
- `token_hash` (unique);
- `status` (`PENDING/CONTACT_REQUESTED/CODE_SENT/USED/EXPIRED`);
- `telegram_id` null, `phone` null, `tg_first_name`, `tg_last_name`, `tg_username`, `tg_language`;
- `code_hash` null, `code_expires_at`, `attempts` (int);
- `ip`, `user_agent`;
- `expires_at`, `used_at`, `user` (FK null).

**UserSession**: `token_hash` unique, `user`, `csrf_token`, `expires_at`, `ip`, `user_agent`, `created_at`, `last_used_at`.

**UserActivity** (`types/user.ts`): `user`, `type` (enum 15.1), `entity_id`, `description`, `ip`, `created_at`. Admin panelda "Faollik" bo'limida ko'rsatiladi.

**Favorite**: `user`, `listing`, unique (`user`, `listing`). Kelajak uchun, hozir faqat hisoblagich.

### 6.2. Adminlar

- **AdminUser** (`types/admin.ts`): `first_name`, `last_name`, `email` unique (case-insensitive), `phone`, `avatar`, `role` (`SUPER_ADMIN/ADMIN/MODERATOR/SUPPORT`), `status` (`ACTIVE/BLOCKED`), `password` (hash), `failed_logins`, `last_login_at`, `telegram_id` null (2FA uchun, keyinchalik).
- **AdminSession**: `token_hash`, `admin`, `csrf_token`, `expires_at`, `remember`, `ip`, `user_agent`.
- **PasswordReset**: `token_hash`, `admin`, `expires_at`, `used_at`.

### 6.3. Katalog va joylashuv

- **Category** (`types/category.ts`): `parent` (FK self null, **maksimal 2 daraja**), `name` (JSONB `{uz,ru,en}`), `slug` unique, `icon` (Lucide nomi, masalan `Smartphone`), `image`, `status` (`ACTIVE/DISABLED`), `sort_order`. `listingsCount` hisoblanadi.
- **CategoryAttribute**: `category`, `key` (snake_case, kategoriya ichida unique), `name` (JSONB), `type` (`TEXT/NUMBER/SELECT/MULTI_SELECT/BOOLEAN`), `required`, `options` (JSONB `[{value, label:{uz,ru,en}}]`), `unit`, `filterable`, `searchable`, `sort_order`.
- **Region** (`types/system.ts`): `country_id`, `name` (JSONB), `slug`, `enabled`, `sort_order`. `districtsCount/listingsCount/usersCount` hisoblanadi.
- **District**: `region`, `name` (JSONB), `type` (`DISTRICT/CITY`), `enabled`.

### 6.4. E'lonlar

**Listing** (`types/listing.ts`)

| Maydon | Izoh |
|---|---|
| code | `LST-10001` dan boshlab ketma-ket, unique |
| user | FK User |
| title (3–120), description (3–5000) | |
| category, subcategory null | Subkategoriya shu kategoriyaning bolasi bo'lishi shart |
| condition | `NEW/LIKE_NEW/GOOD/FAIR/DAMAGED` |
| attributes | JSONB `{ "<attributeId>": value }` |
| region, district null, location varchar(120) null | Tuman shu viloyatga tegishli bo'lishi shart |
| exchange_preferences | JSONB — `ExchangePreference` (pastda) |
| status | `DRAFT/PENDING/ACTIVE/REJECTED/PAUSED/EXCHANGED/ARCHIVED/BLOCKED` |
| rejection_reason, rejection_note, rejection_count | |
| views, favorites_count, offers_count, reports_count | Hisoblagichlar |
| possible_duplicate_of | FK self null |
| published_at, expires_at, deleted_at | |

`ExchangePreference` (JSONB yoki alohida jadval):
```json
{
  "openToOffers": false,
  "categories": ["cat_electronics"],
  "subcategories": ["cat_phones"],
  "keywords": ["iPhone 13", "Noutbuk"],
  "conditions": ["NEW", "LIKE_NEW"],
  "regionIds": ["reg_tashkent_city"],
  "note": "Samsung S23 yoki iPhone 13",
  "cashDifference": null
}
```

- `keywords` — saytdagi **heshteglar**: ko'pi bilan 20 ta, har biri 2–50 belgi, katta-kichik harf farqisiz takrorlanmaydi.
- `cashDifference`: `null` yoki `{ "direction": "WILL_ADD" | "EXPECTS", "note": "3–300 belgi" }`.

Boshqa modellar:
- **ListingImage**: `listing`, `url`, `sort_order`, `is_cover` (birinchi rasm muqova bo'ladi).
- **ListingVideo** (bitta e'longa ko'pi bilan 1 ta): `listing` (OneToOne), `url`, `duration_sec`, `size_mb`, `views`. JSON: `{ url, durationSec, sizeMb, views }`.
- **VideoView**: `listing`, `viewer_key` (`user_id` yoki IP hash), `created_at`. Takroriy hisobni oldini olish uchun; Redis'da ham qilish mumkin.
- **Upload**: `id`, `user`, `kind` (`image/video`), `content_type`, `size`, `storage_key`, `url`, `attached_to_listing` null, `created_at`. E'longa biriktirilmagan fayllar 24 soatdan keyin o'chiriladi.

### 6.5. Barter, almashuv, nizolar

- **BarterRequest** (`types/barter.ts`): `code`, `sender`, `receiver`, `message` (≤1000), `cash_difference_note` null, `status` (`PENDING/ACCEPTED/DECLINED/CANCELLED/EXPIRED/COMPLETED`), `expires_at`, `responded_at`, `exchange` (FK null).
- **BarterRequestItem**: `barter_request`, `listing`, `side` (`OFFERED/REQUESTED`). Bir so'rovda N↔M buyum bo'lishi mumkin.
- **BarterStatusChange**: `barter_request`, `status`, `at`, `by_user` null.
- **Exchange** (`types/exchange.ts`): `code`, `barter_request`, `status` (`AGREED/IN_PROGRESS/COMPLETED/CANCELLED/DISPUTED`), `meeting_region`, `meeting_note`, `completed_at`, `cancelled_at`.
- **ExchangeParticipant**: `exchange`, `user`, `side` (`A` = taklif yuboruvchi, `B` = qabul qiluvchi), `items` (M2M Listing), `confirmed_at`.
- **ExchangeStatusChange**: `exchange`, `status`, `at`, `note`, `actor_type` (`USER/ADMIN/SYSTEM`), `actor_id`, `actor_name`.
- **Dispute**: `exchange` (OneToOne), `opened_by`, `against`, `category`, `description`, `status` (`OPEN/UNDER_REVIEW/RESOLVED/CLOSED`), `resolution`, `resolution_note`, `assigned_to` (AdminUser null), `closed_at`.
  - Bog'liq modellar: **DisputeEvidence** (`uploaded_by`, `url`, `kind` `IMAGE/DOCUMENT`, `caption`), **DisputeMessage** (`sender`, `body`), **DisputeEvent** (`type`, `description`, `actor`).
- **Review** (`types/moderation.ts`): `exchange`, `author`, `target_user`, `rating` (1–5), `comment`, `status` (`VISIBLE/HIDDEN/DELETED`). Foydalanuvchi reytingi faqat `VISIBLE` sharhlardan hisoblanadi.

### 6.6. Moderatsiya va tizim

- **Report**: `code`, `reporter`, `target_type` (`LISTING/USER/MESSAGE/BARTER_REQUEST`), `target_id`, `reason`, `description`, `attachments` (JSONB urls), `status` (`NEW/REVIEWING/RESOLVED/REJECTED`), `assigned_to`, `resolution_note`, `resolved_at`.
- **ModerationAction**: `admin`, `action`, `target_type`, `target_id`, `target_label`, `reason`, `created_at`. **O'zgarmaydi** — faqat qo'shiladi.
- **AdminNote**: `entity_type` (`USER/LISTING/EXCHANGE/REPORT/DISPUTE`), `entity_id`, `author`, `body` (3–2000). Faqat ichki: foydalanuvchi API'siga hech qachon chiqmaydi.
- **AdminAlert**: `kind` (`NEW_REPORT/PENDING_LISTING/DISPUTE_OPENED/SUSPICIOUS_ACCOUNT`), `title`, `href`, `read_by` (M2M Admin) yoki `read`, `created_at`.
- **Notification** (`types/system.ts`): `type`, `title` (3–120), `message` (3–1000), `target` (JSONB), `channels` (array), `status` (`DRAFT/SCHEDULED/SENDING/SENT/FAILED/CANCELLED`), `recipients_count`, `read_count`, `created_by`, `scheduled_at`, `sent_at`.
- **NotificationRecipient**: `notification`, `user`, `delivered_at`, `read_at`, `channel`. `readCount` shundan hisoblanadi.
- **AuditLog**: `admin`, `action` (masalan `listing.reject`), `entity_type`, `entity_id`, `entity_label`, `old_value` (JSONB), `new_value` (JSONB), `reason`, `ip`, `user_agent`, `created_at`. **Faqat qo'shiladi**: API orqali tahrirlash yoki o'chirish yo'q. Bazada ham `UPDATE/DELETE` ga ruxsat bermang.
- **PlatformSettings** — yagona yozuv (singleton), bo'limlar bo'yicha JSONB (`types/system.ts` → `PlatformSettings`). Standart qiymatlar:

  | Bo'lim | Standart qiymatlar |
  |---|---|
  | `listings` | `maxImages=10`, `maxVideoSizeMb=10`, `expirationDays=60`, `requireModeration=true`, `autoPublishTrustedUsers=true`, `trustedUserMinExchanges=5` |
  | `barter` | `maxItemsPerOffer=5`, `offerExpirationHours=168`, `allowMultiItemBarter=true`, `allowOpenOffers=true`, `allowCashDifference=false` |
  | `moderation` | `reportThreshold=5`, `autoHideAfterThreshold=true`, `blockedKeywords=["qurol","oruzhie","narkotik","sotiladi","продам","for sale","valyuta"]` |
  | `security` | `sessionTimeoutMinutes=60`, `maxLoginAttempts=5`, `requireTwoFactorForAdmins=false`, `allowedAdminIps=[]` |

  Video uchun **qat'iy yuqori chegara 10 MB** (buyurtmachi talabi). Sozlamadagi qiymat 10 dan oshsa ham 10 MB ishlatiladi.

- **BarterMatch** (ixtiyoriy kesh): 9.7 ga qarang.

---

## 7. Marketplace API — `/api/app`

Frontend manbasi: `services/site.service.ts`, tiplar: `types/site.ts`.

**Shartli belgilar:**
- 🌐 — ochiq, sessiya shart emas;
- 👤 — kirgan foydalanuvchi;
- ✅ — kirgan va `SUSPENDED` bo'lmagan foydalanuvchi (aks holda `403 ACCOUNT_SUSPENDED`).

### 7.1. Auth

5-bo'limga qarang:
- `POST /auth/telegram/start` 🌐
- `GET /auth/telegram/status` 🌐
- `POST /auth/telegram/verify` 🌐
- `POST /auth/logout` 👤
- `GET /auth/me` 🌐

### 7.2. Katalog

**`GET /config`** 🌐 → `SiteConfig`:
```json
{ "maxImages": 10, "requireModeration": true, "allowCashDifference": false, "allowOpenOffers": true }
```

**`GET /lookups`** 🌐 — faqat yoqilgan hududlar va faol kategoriyalar (faol bo'lmagan ota-kategoriyaning bolalari ham chiqmaydi):
```json
{
  "regions": [ "Region" ],
  "districts": [ "District" ],
  "categories": [ "Category" ],
  "attributes": [ "CategoryAttribute" ],
  "settings": { "allowCashDifference": false }
}
```

**`GET /listings`** 🌐 — ommaviy lenta. Javob: sahifalangan `PublicListingCard[]`.

Faqat quyidagi shartlarga mos e'lonlar chiqadi: `status=ACTIVE`, `deleted_at IS NULL`, egasi `BLOCKED/DELETED` emas.

| Parametr | Izoh |
|---|---|
| `search` | title, description, code va `keywords` bo'yicha |
| `categoryId` | vergul bilan; ota-kategoriya yoki subkategoriya ID si (ota-kategoriya berilsa, bolalari ham kiradi) |
| `regionId`, `condition` | vergul bilan |
| `openToOffers=true` | faqat "har qanday taklifga ochiq" e'lonlar |
| `sort` | `createdAt` (`publishedAt ?? createdAt` bo'yicha), `views`, `favoritesCount` |

`PublicListingCard`:
```json
{
  "id": "lst_10001", "code": "LST-10001", "title": "iPhone 12 128GB",
  "image": "https://cdn.barter.uz/l/abc.jpg", "imagesCount": 5, "condition": "LIKE_NEW",
  "categoryId": "cat_electronics", "subcategoryId": "cat_phones",
  "regionId": "reg_tashkent_city", "districtId": null,
  "wants": { "openToOffers": false, "subcategories": ["cat_laptops"], "categories": [], "keywords": ["iPhone 13"], "note": null },
  "views": 120, "favoritesCount": 4,
  "publishedAt": "2026-09-28T10:00:00.000Z", "createdAt": "2026-09-28T09:40:00.000Z"
}
```

**`GET /listings/:id`** 🌐:
```json
{
  "listing": "PublicListing",
  "status": "ACTIVE",
  "isOwner": false,
  "myOffer": { "id": "bar_9002", "status": "PENDING" }
}
```

- Hamma `ACTIVE` e'lonni ko'ra oladi. Egasi o'z e'lonini istalgan holatda ko'radi (`PENDING/REJECTED`…). Qolganlarga → 404.
- Egasi bo'lmagan odam ochsa `views += 1`. Tavsiya: bitta tashrif buyuruvchi uchun 30 daqiqada bir marta (Redis).
- `myOffer` — joriy foydalanuvchi shu e'longa yuborgan `PENDING` yoki `ACCEPTED` taklif, bo'lmasa `null`.
- `PublicListing` = karta maydonlari (`image`, `imagesCount`, `wants` dan tashqari) + `description`, `images[]`, `video` (`ListingVideo | null`), `attributes`, `location`, `exchangePreferences`, `offersCount`, `owner`.
  - `owner` shakli: `{ id, fullName, avatar, regionId, rating, reviewsCount, completedExchanges, memberSince }`.
- **Hech qachon chiqarmang:** telefon raqam, shikoyatlar soni, rad etish sababi (egasidan boshqaga), admin izohlari, `riskLevel`.
- `allowCashDifference=false` bo'lsa, `exchangePreferences.cashDifference = null` qaytariladi.

**`GET /listings/:id/similar`** 🌐 → `PublicListingCard[]`: shu subkategoriyadagi (yoki kategoriyadagi) boshqa ommaviy e'lonlar, ko'pi bilan 8 ta.

**`POST /listings/:id/video-view`** 🌐 → `{ "views": 57 }`:
- faqat ommaviy va videosi bor e'londa ishlaydi (aks holda 404);
- e'lon egasining ko'rishi hisoblanmaydi;
- bitta tashrif buyuruvchi (`user_id` yoki IP) 30 daqiqada bir marta hisoblanadi.

### 7.3. Fayl yuklash

**`POST /uploads`** ✅ — `multipart/form-data`, maydon nomi `file`. Javob `201`:
```json
{ "id": "upl_7f3a", "url": "https://cdn.barter.uz/u/7f3a.jpg", "kind": "image" }
```

| Tur | Ruxsat etilgan formatlar | Hajm |
|---|---|---|
| Rasm | JPEG, PNG, WEBP | ≤ 5 MB |
| Video | MP4, MOV (QuickTime), WEBM | ≤ 10 MB |

- Fayl turi **faylning mazmunidan (magic bytes)** aniqlanadi, clientning `Content-Type` iga ishonilmaydi:

  | Format | Belgisi |
  |---|---|
  | JPEG | `FF D8 FF` |
  | PNG | `89 50 4E 47` |
  | WEBP | `RIFF….WEBP` |
  | MP4/MOV | 4-baytdan boshlab `ftyp` (`ftypqt` bo'lsa MOV) |
  | WEBM | `1A 45 DF A3` |

- Xatolar:

  | Holat | Javob |
  |---|---|
  | Fayl yo'q | `422 { file: ["validation.required"] }` |
  | Tur noto'g'ri | `422 { file: ["site.validation.fileType"] }` |
  | Rasm katta | `422 { file: ["site.validation.fileTooLarge"] }` |
  | Video katta | `422 { file: ["site.validation.videoTooLarge"] }` |
  | Sutkada 100 dan ortiq fayl | `429` |

- Rasmlarni server tomonda qayta kodlash tavsiya etiladi (EXIF va GPS olib tashlanadi, 1600px gacha kichraytiriladi, WEBP). Videoni ixtiyoriy ravishda ffmpeg bilan tekshiring.
- Fayllar S3'ga shaxsiy kalit bilan yoziladi. `url` CDN manzili bo'ladi. Media javoblariga `X-Content-Type-Options: nosniff` qo'shing.

### 7.4. Mening e'lonlarim

**`GET /me/listings`** 👤 — `?status=ACTIVE|PENDING|REJECTED|…`, standart `limit` 20. Javob: `MyListing[]` (karta + `status`, `rejectionReason`, `rejectionNote`, `offersCount`, `updatedAt`), `createdAt desc` bo'yicha.

**`POST /me/listings`** ✅ — e'lon yaratish:
```json
{
  "title": "Bolalar velosipedi Stels",
  "description": "Ko'k rangli, 16 dyuym, yaxshi holatda.",
  "categoryId": "cat_vehicles",
  "subcategoryId": "cat_bicycles",
  "condition": "GOOD",
  "regionId": "reg_bukhara",
  "districtId": null,
  "location": null,
  "attributes": { "attr_bicycles_wheel": 16 },
  "exchangePreferences": {
    "openToOffers": false, "categories": [], "subcategories": [],
    "keywords": ["Samokat", "Planshet"], "conditions": [], "regionIds": [],
    "note": null, "cashDifference": null
  },
  "imageIds": ["upl_7f3a", "upl_81c2"],
  "video": { "id": "upl_9d10", "durationSec": 3 }
}
```

Validatsiya tartibi (xatolar **birga** yig'ilib, bitta 422 da qaytariladi):
1. Sxema (`schemas/site.schema.ts` → `createListingSchema`):
   - title 3–120, description 3–5000;
   - `imageIds` 1–20 ta;
   - `video` ixtiyoriy.
2. Havolalar:
   - kategoriya mavjud va `ACTIVE`;
   - subkategoriya shu kategoriyaning bolasi (`listings.validation.subcategoryMismatch`);
   - viloyat yoqilgan;
   - tuman shu viloyatniki (`listings.validation.districtMismatch`).
3. Atributlar (9.2): xatolar `attributes.<id>` kaliti bilan.
4. `exchangePreferences`:
   - `openToOffers=false` bo'lsa, kategoriya, subkategoriya, heshteg yoki izohdan kamida bittasi bo'lishi shart → `categories: ["listings.validation.preferencesRequired"]`;
   - `openToOffers=true` va sozlamada o'chiq → `exchangePreferences.openToOffers: ["site.validation.openOffersDisabled"]`;
   - `cashDifference` berilgan va sozlamada o'chiq bo'lsa, u jimgina `null` qilinadi.
5. Fayllar:
   - rasmlar soni `listings.maxImages` dan oshmasin → `imageIds: ["site.validation.tooManyImages"]`;
   - har bir `imageId` shu foydalanuvchining `image` turidagi yuklamasi → `imageIds: ["validation.invalid"]`;
   - `video.id` shu foydalanuvchining `video` turidagi yuklamasi → `video: ["validation.invalid"]`.
6. Taqiqlangan so'zlar: `title + description` ichida `moderation.blockedKeywords` dan biri bo'lsa (katta-kichik harf farqisiz, qism so'z sifatida ham) → `title: ["site.validation.blockedKeyword"]`.
7. Kunlik limit: bitta foydalanuvchi sutkada **10 ta** e'lon → `429`.

Muvaffaqiyatli bo'lsa:
- `status`:
  - `ACTIVE` — agar `requireModeration=false` yoki foydalanuvchi ishonchli (`autoPublishTrustedUsers && completedExchanges >= trustedUserMinExchanges`);
  - aks holda `PENDING`.
- `ACTIVE` bo'lsa: `publishedAt=now`, `expiresAt = now + expirationDays`.
- `code` keyingi `LST-…` raqami.
- `possibleDuplicateOf` — shu egasining o'chirilmagan va sarlavhasi aynan bir xil (katta-kichik harf farqisiz) e'loni.
- Rasmlar tartib bilan saqlanadi, birinchisi muqova (`isCover=true`). Video `ListingVideo(views=0, sizeMb=hajm)` bo'ladi.
- `PENDING` bo'lsa `AdminAlert(kind=PENDING_LISTING, href=/admin/listings/<id>)` yaratiladi.
- `UserActivity(LISTING_CREATED)` yoziladi. Hisoblagichlar yangilanadi.
- Javob: `201`, `data: MyListing`, `message: "Listing sent to moderation"` yoki `"Listing published"`.

> Kelajakda (frontend hali ishlatmaydi): `PATCH /me/listings/:id` (tahrirlash → qayta moderatsiya), `POST /me/listings/:id/archive`, `DELETE /me/listings/:id`.

### 7.5. Almashuv takliflari

Tip: `SiteOffer` (`types/site.ts`):
```json
{
  "id": "bar_9002", "code": "BAR-9002", "status": "PENDING", "direction": "incoming",
  "offered":   [ "PublicListingCard" ],
  "requested": [ "PublicListingCard" ],
  "counterpart": { "id": "usr_18", "fullName": "Akmal Salimov", "avatar": null, "phone": null },
  "message": "Assalomu alaykum, almashamizmi?",
  "createdAt": "2026-09-30T08:00:00.000Z", "respondedAt": null
}
```

- `direction`: `incoming` (menga kelgan) yoki `outgoing` (men yuborgan).
- `offered` — yuboruvchi beradigan buyumlar, `requested` — qabul qiluvchidan so'ralgan buyumlar.
- `counterpart.phone` faqat `ACCEPTED` yoki `COMPLETED` holatida to'ldiriladi, qolgan holatlarda `null`.

**`POST /offers`** ✅
```json
{ "listingId": "lst_10462", "offeredListingIds": ["lst_10011"], "message": "Almashamizmi?" }
```

Qoidalar:

| Tekshiruv | Xato |
|---|---|
| Nishon e'lon ommaviy (`ACTIVE`, egasi faol) | aks holda `404` |
| O'z e'loniga taklif | `422 { listingId: ["site.offer.ownListing"] }` |
| `offeredListingIds`: 1 dan `barter.maxItemsPerOffer` gacha, hammasi o'zining `ACTIVE` e'lonlari | `422 { offeredListingIds: ["site.offer.notYours"] }`; bo'sh bo'lsa `site.offer.pickOne` |
| `allowMultiItemBarter=false` bo'lsa, faqat 1 ta buyum | `422` |
| Shu e'longa allaqachon `PENDING` taklif yuborilgan | `409 OFFER_EXISTS` |
| Sutkasiga ko'pi bilan 30 ta taklif | `429` |

Muvaffaqiyatli bo'lsa:
- `BarterRequest(PENDING)` yaratiladi: `expiresAt = now + barter.offerExpirationHours`, elementlar `OFFERED` va `REQUESTED`;
- nishon e'londa `offersCount += 1`;
- `UserActivity(OFFER_SENT)` yoziladi;
- **qabul qiluvchiga bot orqali xabar** yuboriladi (12-bo'lim);
- javob: `201`, `SiteOffer`.

**`GET /me/offers?box=incoming|outgoing`** 👤 — sahifalangan `SiteOffer[]`, `createdAt desc`.
- Muddati o'tgan `PENDING` takliflarni javobdan oldin `EXPIRED` ga o'tkazing (Celery ham qiladi).

**`POST /offers/:id/accept`** ✅ — faqat qabul qiluvchi (aks holda 403). Faqat `PENDING` holatida (aks holda `409 OFFER_NOT_PENDING`).
- Holat `ACCEPTED`, `respondedAt=now`, `BarterStatusChange` yoziladi.
- **`Exchange(AGREED)` yaratiladi** (mock buni qilmaydi, haqiqiy backend qilishi shart): ishtirokchi A — yuboruvchi va `offered` buyumlari, B — qabul qiluvchi va `requested` buyumlari. `barterRequest.exchange` shu almashuvga bog'lanadi. Admin paneldagi "Almashuvlar" bo'limi shu yozuvlar bilan ishlaydi.
- Ikkala tomonga telefon ochiladi (`counterpart.phone`). Yuboruvchiga bot orqali xabar boradi.
- Javob: `SiteOffer`.

**`POST /offers/:id/decline`** 👤 — faqat qabul qiluvchi, faqat `PENDING` → `DECLINED`. Yuboruvchiga xabar boradi.

**`POST /offers/:id/cancel`** 👤 — faqat yuboruvchi, faqat `PENDING` → `CANCELLED`.

> Kelajakda: almashuvni "bo'ldi" deb tasdiqlash (`COMPLETED`), sharh qoldirish, shikoyat yuborish, chat. Admin panel bu ma'lumotlarni allaqachon ko'rsata oladi.

---

## 8. Admin API — `/api/admin`

Admin API'ning hamma endpointlari admin sessiyasini talab qiladi (login, forgot va reset parol bundan mustasno).
**Ruxsat server tomonda tekshiriladi** (`requirePermission`). Frontend tugmalarni yashiradi, lekin bu faqat qulaylik uchun: xavfsizlik backendga bog'liq.

**Har bir o'zgartiruvchi amal:**
1. `AuditLog` ga yoziladi: `action` (masalan `listing.reject`), `oldValue/newValue`, `reason`, IP, user-agent.
2. Moderatsiya amallari qo'shimcha ravishda `ModerationAction` ga yoziladi: `APPROVE`, `REJECT`, `BLOCK`, `UNBLOCK`, `SUSPEND`, `ARCHIVE`, `DELETE`, `RESTORE`, `REQUEST_CORRECTION`, `WARN`, `HIDE`, `RESOLVE_REPORT`, `REJECT_REPORT`.

Audit `action` nomlari (mock'da ishlatilganlari):

| Guruh | Nomlar |
|---|---|
| auth/admin | `auth.login`, `admin.create`, `admin.update`, `admin.role_change`, `admin.block`, `admin.activate`, `admin.profile_update`, `admin.password_change` |
| user | `user.update`, `user.suspend`, `user.block`, `user.unblock`, `user.delete`, `user.restore`, `user.warn` |
| listing | `listing.update`, `listing.approve`, `listing.reject`, `listing.request_correction`, `listing.block`, `listing.unblock`, `listing.archive`, `listing.delete`, `listing.restore`, `listing.not_duplicate` |
| review | `review.hide`, `review.delete`, `review.restore` |
| category | `category.create/update/status/delete/reorder`, `attribute.create/update/delete/reorder` |
| location | `region.create/update`, `district.create/update/delete` |
| exchange/dispute | `exchange.cancel`, `dispute.assign`, `dispute.warn`, `dispute.suspend`, `dispute.block`, `dispute.close` |
| report | `report.review`, `report.resolve`, `report.reject`, `report.block_listing`, `report.block_user`, `report.suspend_user` |
| boshqa | `note.create`, `notification.create`, `notification.cancel`, `settings.update` |

Jadval ustunlari: **Ruxsat** — `lib/rbac.ts` dagi permission; **Tana** — `schemas/` dagi Zod sxema nomi; **Javob** — `data` tipi.

### 8.1. Umumiy

| Metod | Yo'l | Ruxsat | Parametr / tana | Javob |
|---|---|---|---|---|
| GET | `/lookups` | sessiya | — | `{ regions, districts, categories, attributes, settings:{allowCashDifference} }` — **hamma** yozuvlar (o'chirilganlari ham) |
| GET | `/search` | sessiya | `q` (≥2 belgi, qisqa bo'lsa bo'sh natija) | `SearchResults`: users (ism/telefon/email/id/username), listings (title/code/id, o'chirilmaganlar), barterRequests (code/id), exchanges (code/id) — har biridan ko'pi bilan 5 ta |
| GET | `/alerts` | sessiya | — | `AdminAlert[]` (yangilari birinchi) |
| POST | `/alerts/read-all` | sessiya | — | `null` |
| GET | `/notes` | sessiya | `entityType`, `entityId` | `AdminNote[]` |
| POST | `/notes` | `users.notes`; `EXCHANGE/DISPUTE` uchun `users.notes` **yoki** `disputes.manage` | `{ entityType, entityId, body }` (`noteSchema`: 3–2000) | `AdminNote` |
| GET | `/moderation/history` | `moderation.read` | `targetType`, `targetId` | `ModerationAction[]` |

### 8.2. Dashboard (`dashboard.read`)

Barcha so'rovlar `from`, `to` (`YYYY-MM-DD`) oladi.

| Yo'l | Javob |
|---|---|
| `GET /dashboard/overview` | `DashboardOverview`. `deltas` — oldingi teng uzunlikdagi davrga nisbatan o'zgarish ulushi (0.12 = +12%) |
| `GET /dashboard/charts` | `DashboardCharts & { bucket: "day" \| "week" }`. Davr 90 kundan uzun bo'lsa haftalik |
| `GET /dashboard/insights` | `BarterInsights` (`acceptanceRate` 0..1, eng faol kategoriya va hududlar) |
| `GET /dashboard/recent` | `{ users, listings, barterRequests, reports }` — har biridan oxirgi 5–8 tasi |

Dashboardda pul bilan bog'liq ko'rsatkich **bo'lmaydi**.

### 8.3. Foydalanuvchilar

| Metod | Yo'l | Ruxsat | Parametr / tana | Javob |
|---|---|---|---|---|
| GET | `/users` | `users.read` | Filtrlar: `status`, `regionId`, `riskLevel` (vergul bilan), `from/to` (`createdAt`), `minListings`, `maxListings`, `minReports`. Qidiruv: ism, telefon, email, id, username. Sort: `fullName, listingsCount, completedExchanges, reportsCount, rating, createdAt, lastActiveAt` | `User[]` |
| GET | `/users/:id` | `users.read` | — | `User` |
| PATCH | `/users/:id` | `users.update` | `userUpdateSchema` | `User`. Telefon boshqa foydalanuvchida bo'lsa → `409` |
| POST | `/users/:id/suspend` | `users.block` | `{ reason (3–1000), days (1–365) }` | `User`: `SUSPENDED`, `suspendedUntil = now + days` |
| POST | `/users/:id/block` | `users.block` | `{ reason }` | `User`: `BLOCKED`, sessiyalar bekor qilinadi |
| POST | `/users/:id/unblock` | `users.block` | `{ reason? }` | `User`: `ACTIVE`. Faqat `BLOCKED` yoki `SUSPENDED` dan |
| DELETE | `/users/:id?reason=` | `users.delete` | — | `User`: soft delete, sessiyalar bekor qilinadi |
| POST | `/users/:id/restore` | `users.delete` | — | `User` |
| GET | `/users/:id/listings` | `users.read` | ro'yxat parametrlari | `Listing[]` |
| GET | `/users/:id/barter-requests` | `users.read` | | `BarterRequest[]` (yuborgan va olgan) |
| GET | `/users/:id/exchanges` | `users.read` | | `Exchange[]` |
| GET | `/users/:id/reviews` | `users.read` | `direction=received\|written` | `Review[]` |
| GET | `/users/:id/reports` | `users.read` | `direction=against\|submitted` | `Report[]` |
| GET | `/users/:id/activity` | `users.read` | | `UserActivity[]` |
| POST | `/reviews/:id/hide` · `/delete` · `/restore` | `reviews.moderate` | `{ reason }` (restore'da yo'q) | `Review` |

Holat bo'yicha 409 xatolari:
- bloklangan foydalanuvchini yana bloklash;
- o'chirilganni bloklash yoki cheklash;
- bloklanganni cheklash ("avval blokdan chiqaring");
- `BLOCKED` yoki `SUSPENDED` bo'lmaganni blokdan chiqarish;
- o'chirilganni yana o'chirish yoki o'chirilmaganni tiklash.

### 8.4. E'lonlar

| Metod | Yo'l | Ruxsat | Parametr / tana | Javob |
|---|---|---|---|---|
| GET | `/listings` | `listings.read` | Filtrlar: `status`, `categoryId` (ota yoki bola), `condition`, `regionId` (vergul bilan), `userId`, `reported=true`, `duplicate=true`, `deleted=true\|false`, `from/to`. Qidiruv: id, code, title, egasining ismi, username, telefoni. Sort: `title, views, offersCount, reportsCount, createdAt, updatedAt` | `Listing[]` |
| GET | `/listings/:id` | `listings.read` | | `Listing` |
| GET | `/listings/:id/offers` | `listings.read` | `status` | `BarterRequest[]` |
| GET | `/listings/:id/reports` | `listings.read` | | `Report[]` |
| PATCH | `/listings/:id` | `listings.update` | `listingUpdateSchema` (7.4 dagi kabi, `imageIds` siz) | `Listing` |
| POST | `/listings/:id/approve` | `listings.approve` | `{ reason? }` | `Listing` |
| POST | `/listings/:id/reject` | `listings.reject` | `{ reason: RejectionReason, note? }`. `OTHER` bo'lsa note ≥3 belgi (`listings.validation.noteRequiredForOther`) | `Listing` |
| POST | `/listings/:id/request-correction` | `listings.reject` | `{ note (3–1000) }` | `Listing` |
| POST | `/listings/:id/block` | `listings.block` | `{ reason }` | `Listing` |
| POST | `/listings/:id/unblock` | `listings.block` | `{ reason? }` | `Listing` |
| POST | `/listings/:id/archive` | `listings.update` | `{ reason? }` | `Listing` |
| DELETE | `/listings/:id?reason=` | `listings.delete` | | `Listing` (soft delete) |
| POST | `/listings/:id/restore` | `listings.delete` | | `Listing` |

Holatlar o'rtasidagi o'tishlar 9.1-bo'limda.

### 8.5. Barter so'rovlari (`barter.read`, faqat o'qish)

| Yo'l | Parametr | Javob |
|---|---|---|
| `GET /barter-requests` | `status`, `shape=1:1,multi`, `from/to`, `userId`, `listingId`. Qidiruv: code, id, ishtirokchilar ismi, buyum nomlari. Sort: `createdAt, updatedAt, status` | `BarterRequest[]` |
| `GET /barter-requests/:id` | | `BarterRequestDetail` = `BarterRequest` + `statusHistory`, `exchange` (qisqa), `reports`, `itemDetails` (`{ [listingId]: { code, attributes: [{id,label,value}], imagesCount } }`, `label` va `value` 3 tilda), `participants` (`{ [userId]: ParticipantInfo }`) |

### 8.6. Almashuvlar va nizolar

| Metod | Yo'l | Ruxsat | Tana | Javob |
|---|---|---|---|---|
| GET | `/exchanges` | `exchanges.read` | Filtrlar: `status`, `from/to`, `disputed=true`, `userId`. Sort: `createdAt, completedAt, updatedAt` | `Exchange[]` |
| GET | `/exchanges/:id` | `exchanges.read` | | `ExchangeDetail` (barterRequest, reviews, reports, dispute qisqa, itemDetails, participantsInfo) |
| POST | `/exchanges/:id/cancel` | `exchanges.manage` | `{ reason }` | `Exchange`. `COMPLETED` yoki `CANCELLED` dan → 409 |
| GET | `/exchanges/:id/dispute` | `exchanges.read` | | `DisputeDetail` |
| POST | `/exchanges/:id/dispute/assign` | `disputes.manage` | — | `Dispute` → `UNDER_REVIEW`, `assignedTo = men` |
| POST | `/exchanges/:id/dispute/warn` | `disputes.manage` | `{ userId, reason }` | `Dispute` |
| POST | `/exchanges/:id/dispute/suspend` | `disputes.manage` | `{ userId, reason, days }` | `Dispute` |
| POST | `/exchanges/:id/dispute/block` | `disputes.manage` | `{ userId, reason }` | `Dispute` |
| POST | `/exchanges/:id/dispute/close` | `disputes.manage` | `{ resolution: DisputeResolution, note }` | `Dispute` → `RESOLVED/CLOSED` |

- `userId` faqat nizo tomonlaridan biri bo'lishi mumkin.
- Yopilgan nizoda har qanday amal → `409`.
- Har bir amal `DisputeEvent` ga yoziladi.

### 8.7. Mosliklar (`matches.read`)

| Yo'l | Parametr | Javob |
|---|---|---|
| `GET /matches` | `type=ONE_WAY_MATCH,MUTUAL_MATCH`, `categoryId`, `regionId`, `minScore`, `listingId`. Qidiruv: sarlavhalar va kodlar. Sort: `score, computedAt` | `BarterMatch[]` |
| `GET /matches/:id` | | `BarterMatchDetail` (+ `codeA`, `codeB`, `preferencesA`, `preferencesB`) |

Algoritm 9.7-bo'limda.

### 8.8. Kategoriyalar (`categories.manage`)

| Metod | Yo'l | Tana | Javob |
|---|---|---|---|
| GET | `/categories/tree` | | `CategoryNode[]` (ota + `children`, `sortOrder` bo'yicha) |
| GET | `/categories/:id` | | `Category` |
| POST | `/categories` | `categorySchema` | `Category` |
| PATCH | `/categories/:id` | `categorySchema` | `Category` |
| POST | `/categories/:id/status` | `{ status }` | `Category` |
| DELETE | `/categories/:id` | | `null` |
| POST | `/categories/reorder` | `{ parentId, orderedIds }` | `Category[]` |
| GET | `/categories/:id/attributes` | | `CategoryAttributeWithUsage[]` (+ `usageCount`) |
| POST | `/categories/:id/attributes` | `attributeSchema` | `CategoryAttributeWithUsage` |
| PATCH | `/attributes/:id` | `attributeSchema` | shu |
| DELETE | `/attributes/:id` | | `null` |
| POST | `/categories/:id/attributes/reorder` | `{ orderedIds }` | `CategoryAttributeWithUsage[]` |

**Qoidalar:**
- `slug` global unique → `409 SLUG_TAKEN`. Atribut `key` kategoriya ichida unique → `409 ATTRIBUTE_KEY_TAKEN`.
- Maksimal **2 daraja**. Xato kalitlari: `categories.validation.parentMissing`, `parentSelf`, `parentLevel`, `hasChildrenCannotNest`.
- E'lonlari bor kategoriyani boshqa ota-kategoriyaga ko'chirib bo'lmaydi → 409.
- O'chirish: bolalari bor → 409; e'lonlarda ishlatilgan → 409 ("o'rniga o'chirib qo'ying", ya'ni `DISABLED` qiling).
- Atribut qiymatlari e'lonlarda bor bo'lsa, uning `type` ini o'zgartirib bo'lmaydi → 409.
- `SELECT/MULTI_SELECT` turida `options` majburiy (`categories.validation.optionsRequired`). Boshqa turlarda options bo'lmaydi (`optionsForbidden`). `unit` faqat `NUMBER/SELECT/MULTI_SELECT` da (`unitForbidden`). Option `value` lari takrorlanmaydi (`validation.duplicate`).
- `reorder` da ID'lar to'plami aynan shu ota-kategoriyaning bolalariga teng bo'lishi shart (`categories.validation.reorderMismatch`).
- `DISABLED` kategoriya va uning bolalari saytdagi `/lookups` dan yashiriladi.

### 8.9. Hududlar (`locations.manage`)

| Metod | Yo'l | Tana | Javob |
|---|---|---|---|
| GET | `/regions` | `enabled`, `locale`; qidiruv: nomlar, slug. Sort: `sortOrder, name, districtsCount, usersCount, listingsCount` | `Region[]` |
| GET | `/regions/:id` | | `Region` |
| POST | `/regions` | `{ name, enabled }` | `Region` |
| PATCH | `/regions/:id` | qisman `{ name?, enabled? }` | `Region` |
| GET | `/regions/:id/districts` | `search` | `DistrictWithStats[]` (+ `usersCount`, `listingsCount`) |
| POST | `/regions/:id/districts` | `{ name, type, enabled }` | `DistrictWithStats` |
| PATCH | `/districts/:id` | qisman | `DistrictWithStats` |
| DELETE | `/districts/:id` | | `null` |

Qoidalar:
- Nom takrorlansa (viloyatlar orasida yoki bitta viloyat ichidagi tumanlar orasida) → 409.
- Foydalanuvchi yoki e'lon bog'langan tumanni o'chirib bo'lmaydi → 409 (o'rniga o'chirib qo'ying).

### 8.10. Shikoyatlar

| Metod | Yo'l | Ruxsat | Tana | Javob |
|---|---|---|---|---|
| GET | `/reports` | `reports.read` | Filtrlar: `status`, `targetType`, `reason`, `assignedToMe=true`, `from/to`. Qidiruv: code, id, shikoyatchi ismi va telefoni, nishon nomi, egasi ismi. Sort: `createdAt`, `status` (`NEW < REVIEWING < RESOLVED < REJECTED`) | `Report[]` |
| GET | `/reports/:id` | `reports.read` | | `ReportDetail` (`schemas/report.schema.ts`): nishon tafsilotlari, `responsibleUser`, `otherReports` (≤10) + jami soni, `reporterStats` |
| POST | `/reports/:id/review` | `reports.resolve` | — | `Report` → `REVIEWING`, `assignedTo = men` (allaqachon menda bo'lsa 409) |
| POST | `/reports/:id/resolve` | `reports.resolve` | `{ note }` | `Report` → `RESOLVED` |
| POST | `/reports/:id/reject` | `reports.resolve` | `{ note }` | `Report` → `REJECTED` |
| POST | `/reports/:id/actions/block-listing` | `reports.resolve` | `{ reason }` | `Report`: e'lon bloklanadi, shu e'londagi ochiq shikoyatlar yopiladi |
| POST | `/reports/:id/actions/block-user` | `reports.resolve` | `{ reason }` | `Report`: mas'ul foydalanuvchi bloklanadi |
| POST | `/reports/:id/actions/suspend-user` | `reports.resolve` | `{ reason, days }` | `Report` |

Yopilgan shikoyatda (`RESOLVED/REJECTED`) amal → `409`.

### 8.11. Moderatsiya

| Metod | Yo'l | Ruxsat | Tana | Javob |
|---|---|---|---|---|
| GET | `/moderation/queues` | `moderation.read` | | `QueueCounts` — `{ PENDING_LISTINGS, REPORTED_LISTINGS, REPORTED_USERS, SUSPICIOUS_ACCOUNTS, DUPLICATE_LISTINGS }` |
| GET | `/moderation/queue/:queue` | `moderation.read` | ro'yxat parametrlari, `search` | `QueueItem[]` (`schemas/moderation.schema.ts`) |
| GET | `/moderation/safety` | `moderation.read` | | `SafetyOverview` |
| GET | `/moderation/actions` | `moderation.read` | `action`, `targetType`, `adminId`, `from/to`; qidiruv: nishon nomi, id, admin, sabab. Sort: `createdAt, action` | `ModerationAction[]` |
| GET | `/moderation/actions/admins` | `moderation.read` | | `AdminRef[]` (filtr uchun) |
| POST | `/moderation/listings/:id/approve` | `moderation.act` | `{ reason? }` | `Listing` (faqat `PENDING` dan) |
| POST | `/moderation/listings/:id/reject` | `moderation.act` | `{ reason, note? }` | `Listing` |
| POST | `/moderation/listings/:id/block` | `moderation.act` | `{ reason }` | `Listing` |
| POST | `/moderation/listings/:id/request-correction` | `moderation.act` | `{ reason?, note }` | `Listing` |
| POST | `/moderation/listings/:id/dismiss-reports` | `moderation.act` | `{ reason }` | `{ closed: number }`. Ochiq shikoyat bo'lmasa → 409 |
| POST | `/moderation/listings/:id/not-duplicate` | `moderation.act` | `{ reason? }` | `Listing`: `possibleDuplicateOf = null`. Belgi bo'lmasa → 409 |
| POST | `/moderation/users/:id/block` | `moderation.act` | `{ reason }` | `User` |
| POST | `/moderation/users/:id/suspend` | `moderation.act` | `{ reason, days }` | `User` |
| POST | `/moderation/users/:id/warn` | `moderation.act` | `{ reason }` | `User`. Bot orqali ogohlantirish xabari yuboriladi |
| POST | `/moderation/users/:id/dismiss-reports` | `moderation.act` | `{ reason }` | `{ closed: number }` |

**Navbatlar tarkibi:**

| Navbat | Qaysi yozuvlar |
|---|---|
| `PENDING_LISTINGS` | `status=PENDING`, o'chirilmagan |
| `REPORTED_LISTINGS` | `PENDING/ACTIVE/PAUSED` va ochiq (`NEW/REVIEWING`) shikoyati bor e'lonlar |
| `REPORTED_USERS` | Ochiq shikoyati bor foydalanuvchilar |
| `SUSPICIOUS_ACCOUNTS` | Signallar: `RISK_LEVEL` (`riskLevel≠LOW`), `REPEATED_REJECTIONS` (≥3 rad etilgan e'lon), `BURST_LISTINGS` (24 soatda ≥ 5 ta yangi e'lon). Bu **faqat operatsion belgi**, ayblov emas |
| `DUPLICATE_LISTINGS` | `possibleDuplicateOf` to'ldirilgan va `PENDING/ACTIVE/PAUSED` holatidagi e'lonlar |

### 8.12. Xabarnomalar

| Metod | Yo'l | Ruxsat | Tana | Javob |
|---|---|---|---|---|
| GET | `/notifications` | `notifications.read` | `status`, `type`, `targetKind`, `from/to`; qidiruv: title, id. Sort: `title, recipientsCount, readRate, scheduledAt, sentAt, createdAt` | `Notification[]` |
| GET | `/notifications/channels` | `notifications.read` | | `{ IN_APP: true, PUSH: false, EMAIL: false, SMS: false }` — `settings.notifications` dan |
| GET | `/notifications/user-options` | `notifications.send` | `search` yoki `ids` (vergul bilan) | `[{ id, fullName, phone, avatar }]` (≤20 ta; `BLOCKED` va `DELETED` foydalanuvchilar chiqmaydi) |
| POST | `/notifications/estimate` | `notifications.send` | `{ target }` | `{ recipientsCount }` |
| GET | `/notifications/:id` | `notifications.read` | | `Notification` |
| POST | `/notifications` | `notifications.send` | `notificationCreateSchema` | `Notification`: `scheduledAt` bo'lsa `SCHEDULED`, bo'lmasa darhol yuboriladi |
| POST | `/notifications/:id/cancel` | `notifications.send` | | `Notification`. Faqat `SCHEDULED/DRAFT` → aks holda `409 NOT_CANCELLABLE` |

**Qabul qiluvchilar (`target`):**

| `kind` | Qabul qiluvchilar |
|---|---|
| `ALL` | Barcha faol foydalanuvchilar |
| `USERS` | `userIds` (≤500) |
| `REGION` | `regionIds` bo'yicha |
| `SEGMENT` | `NEW_USERS` (oxirgi 30 kunda ro'yxatdan o'tgan), `ACTIVE_TRADERS` (kamida 1 ta yakunlangan almashuv va oxirgi 30 kunda faol), `INACTIVE_30D` (30 kundan beri faol emas), `NO_LISTINGS` (e'loni yo'q), `HIGH_RATED` (reyting ≥ 4.5 va kamida 3 ta sharh) |

`BLOCKED` va `DELETED` foydalanuvchilarga yuborilmaydi.

**Kanallar:**
- `IN_APP` — saytdagi xabarnoma (saytda hali UI yo'q, lekin backend `NotificationRecipient` ni saqlaydi).
- **Telegram orqali yetkazish tavsiya etiladi** (12-bo'lim): `IN_APP` tanlangan bo'lsa, xabarni botga ham yuboring. Keyinchalik alohida `TELEGRAM` kanalini qo'shish mumkin (frontend enumiga ham qo'shiladi).
- Yuborish Celery orqali bo'lakma-bo'lak bo'ladi. Telegram limiti ~30 xabar/soniya.

### 8.13. Adminlar va rollar

| Metod | Yo'l | Ruxsat | Tana | Javob |
|---|---|---|---|---|
| GET | `/admins` | `admins.read` | `role`, `status`, `from/to`; qidiruv: ism, email, id. Sort: `fullName, email, role, lastLoginAt, createdAt` | `Admin[]` |
| GET | `/roles` | `admins.read` | | `Role[]` — `[{ id: "MODERATOR", permissions: [...] }]` |
| GET | `/admins/:id` | `admins.read` | | `Admin` |
| POST | `/admins` | `admins.manage` | `adminCreateSchema` (vaqtinchalik parol bilan) | `Admin` |
| PATCH | `/admins/:id` | `admins.manage` | `adminUpdateSchema` | `Admin` |
| POST | `/admins/:id/role` | `admins.manage` | `{ role, reason? }` | `Admin` |
| POST | `/admins/:id/block` | `admins.manage` | `{ reason? }` | `Admin`: sessiyalari bekor qilinadi |
| POST | `/admins/:id/activate` | `admins.manage` | `{ reason? }` | `Admin` |

409 kodlari:

| Kod | Qachon |
|---|---|
| `EMAIL_TAKEN` | Bu email bilan admin allaqachon bor |
| `SELF_ROLE_CHANGE` | O'z rolini o'zgartirishga urinish |
| `SAME_ROLE` | Adminda allaqachon shu rol bor |
| `LAST_SUPER_ADMIN` | Oxirgi faol super adminni pasaytirish yoki bloklash |
| `SELF_BLOCK` | O'zini bloklashga urinish |
| `ALREADY_BLOCKED` | Admin allaqachon bloklangan |
| `ALREADY_ACTIVE` | Admin allaqachon faol |

Admin javoblarida parol hash'i hech qachon chiqmaydi.

### 8.14. Audit jurnali (`audit.read`, faqat o'qish)

| Yo'l | Parametr | Javob |
|---|---|---|
| `GET /audit-logs` | `adminId`, `action`, `entityType`, `entityId`, `from/to`; qidiruv: entityLabel, entityId, IP, id. Sort: `createdAt, action` | `AuditLog[]` |
| `GET /audit-logs/actions` | | `string[]` — mavjud `action` nomlari (filtr uchun) |
| `GET /audit-logs/:id` | | `AuditLog` |

### 8.15. Sozlamalar

| Metod | Yo'l | Ruxsat | Tana | Javob |
|---|---|---|---|---|
| GET | `/settings` | `settings.read` | | `PlatformSettings` (`updatedAt`, `updatedBy` bilan) |
| PATCH | `/settings/:section` | `settings.manage` | Bo'lim sxemasi: `general`, `listings`, `barter`, `moderation`, `security`, `notifications` (`schemas/settings.schema.ts`) | `PlatformSettings` |

Qoidalar:
- Noma'lum bo'lim → 404.
- Raqamlar diapazondan chiqsa → `settings.validation.outOfRange`. Diapazonlar `SETTINGS_LIMITS` da.
- `defaultLanguage` qo'llab-quvvatlanadigan tillar ichida bo'lishi shart (`settings.validation.defaultNotSupported`).
- IP formati xato bo'lsa → `settings.validation.ip`.
- **Admin o'zini qulflab qo'ymasligi uchun:** yangi `allowedAdminIps` ro'yxatida joriy adminning IP manzili bo'lmasa (ro'yxat bo'sh bo'lmasa) → `422 { allowedAdminIps: ["settings.validation.ipLockout"] }`.
- Sozlamalar keshda saqlanadi va o'zgarganda kesh tozalanadi.

---

## 9. Biznes qoidalari

### 9.1. E'lon hayot sikli

```
             yaratildi
                │  requireModeration=true va foydalanuvchi ishonchli emas
                ▼
  DRAFT ──▶ PENDING ──approve──▶ ACTIVE ──(muddati o'tdi, Celery)──▶ ARCHIVED
              │   ▲                 │  ▲
       reject │   │ (qayta          │  └── unblock ── BLOCKED ◀── block (istalgan holatdan)
   correction │   │  yuborish,      │
              ▼   │  keyinroq)      ├── reject / request-correction ──▶ REJECTED
           REJECTED                 └── almashuv yakunlandi ──▶ EXCHANGED
```

| Amal | Qaysi holatlardan | Natija |
|---|---|---|
| approve | `PENDING` | `ACTIVE`; `publishedAt` bo'sh bo'lsa `now`; `expiresAt = now + expirationDays` |
| reject | `PENDING, ACTIVE, PAUSED` | `REJECTED`; `rejectionReason`, `rejectionNote`; **`rejectionCount += 1`**; `expiresAt = null`; e'londagi ochiq shikoyatlar yopiladi |
| request-correction | `PENDING, ACTIVE, PAUSED` | `REJECTED`; `rejectionReason = null`, `rejectionNote = note`; `rejectionCount` **o'zgarmaydi**; ochiq shikoyatlar yopiladi |
| block | `BLOCKED` dan boshqa har qanday | `BLOCKED`; `expiresAt = null`; ochiq shikoyatlar yopiladi |
| unblock | `BLOCKED` | `ACTIVE`; `publishedAt` bo'sh bo'lsa `now`; yangi `expiresAt` |
| archive | `DRAFT, PENDING, ACTIVE, REJECTED, PAUSED, EXCHANGED` | `ARCHIVED`; `expiresAt = null` |
| delete | o'chirilmagan | `deletedAt = now` (holat saqlanadi) |
| restore | o'chirilgan | `deletedAt = null` |

- Ruxsat etilmagan holatdan amal bajarilsa → `409` ("Cannot approve a listing with status ACTIVE").
- O'chirilgan e'londa amal bajarilsa → `409` ("Listing is deleted. Restore it first").
- Rad etilgan e'lon egasiga bot orqali sabab bilan xabar boradi. Tasdiqlanganda ham xabar boradi.
- **Shikoyatlar chegarasi** (mock'da yo'q, backendda qilinishi kerak):
  - agar `moderation.autoHideAfterThreshold=true` bo'lsa va e'londagi ochiq shikoyatlar soni `reportThreshold` ga yetsa, e'lon `PAUSED` holatiga o'tadi (ommaviy lentadan yashiriladi);
  - shu bilan `AdminAlert` yaratiladi, `ModerationAction(HIDE)` da `admin = SYSTEM` yoziladi.
- Ommaviy lentada faqat `ACTIVE`, o'chirilmagan va egasi faol bo'lgan e'lonlar chiqadi.

### 9.2. Dinamik atributlar validatsiyasi

Namuna: `validateListingAttributes`, `schemas/listing.schema.ts`.

- Faqat shu e'lonning kategoriyasi va subkategoriyasiga tegishli atributlar hisobga olinadi. Noma'lum kalitlar tashlab yuboriladi.
- Majburiy atribut bo'sh bo'lsa → `validation.required`. Majburiy `BOOLEAN` bo'sh bo'lsa, `false` deb yoziladi.

| Tur | Qoida | Xato kaliti |
|---|---|---|
| `TEXT` | String, ≤120 belgi | `validation.max120` |
| `NUMBER` | Son, ≥0 | `validation.invalid`, `validation.positive` |
| `SELECT` | Qiymat `options` ichida | `listings.validation.unknownOption` |
| `MULTI_SELECT` | Massiv, har bir qiymat `options` ichida; takrorlar olib tashlanadi | `listings.validation.unknownOption` |
| `BOOLEAN` | true yoki false | `validation.invalid` |

### 9.3. Almashuv takliflari hayot sikli

```
PENDING ──accept (qabul qiluvchi)──▶ ACCEPTED ──(ikkala tomon tasdiqlaydi, keyinroq)──▶ COMPLETED
   ├──decline (qabul qiluvchi)──▶ DECLINED
   ├──cancel (yuboruvchi)──▶ CANCELLED
   └──expiresAt o'tdi (Celery)──▶ EXPIRED
```

- `ACCEPTED` bo'lganda `Exchange(AGREED)` yaratiladi (7.5).
- `COMPLETED` bo'lganda almashuv ham `COMPLETED` bo'ladi:
  - ikkala foydalanuvchida `completedExchanges += 1`;
  - ishtirok etgan e'lonlar `EXCHANGED` holatiga o'tadi;
  - shu e'lonlarga kelgan boshqa `PENDING` takliflar avtomatik `EXPIRED` bo'ladi.
- Telefon raqamlari faqat `ACCEPTED` va `COMPLETED` holatlarida ochiladi.

### 9.4. Foydalanuvchi holatlari

| Holat | Kira oladimi | Ko'ra oladimi | E'lon joylash / taklif yuborish | E'lonlari ommaviymi |
|---|---|---|---|---|
| `ACTIVE` | ha | ha | ha | ha |
| `SUSPENDED` | ha | ha | **yo'q** (`403 ACCOUNT_SUSPENDED`) | ha |
| `BLOCKED` | **yo'q** (`403 ACCOUNT_BLOCKED`) | — | — | **yo'q** |
| `DELETED` | **yo'q** | — | — | **yo'q** |

- `suspendedUntil` o'tganda foydalanuvchi avtomatik `ACTIVE` ga qaytadi (Celery, har 5 daqiqada).
- Bloklash va o'chirishda barcha sessiyalar darhol bekor qilinadi.

### 9.5. Hisoblagichlar

Quyidagilar tranzaksiyada yoki signal orqali yangilanadi (davriy qayta hisoblash ham tavsiya etiladi):
- `User`: `listingsCount`, `completedExchanges`, `reportsCount`, `reportsSubmittedCount`, `reviewsCount`, `rating`;
- `Listing`: `offersCount`, `reportsCount`, `views`, `favoritesCount`;
- `Region`: `listingsCount`, `usersCount`, `districtsCount`;
- `Category`: `listingsCount`.

### 9.6. Xavf darajasi (`riskLevel`) — operatsion belgi, ayblov emas

| Qiymat | Shart |
|---|---|
| `HIGH_REPORTS` | `reportsCount >= moderation.reportThreshold` |
| `NEEDS_REVIEW` | `reportsCount >= 2` yoki rad etilgan e'lonlari soni ≥ 3 |
| `LOW` | qolgan hollarda |

`HIGH_REPORTS` ga o'tgan faol foydalanuvchi uchun `AdminAlert(SUSPICIOUS_ACCOUNT)` yaratiladi.

### 9.7. Moslik (matching) — `RULES_V1`

Namuna implementatsiya: `lib/matching/rules-engine.ts`. Ikki e'lon (A va B) solishtiriladi:

| Mezon | Ball |
|---|---|
| Kategoriya: aniq subkategoriya mos | 20 (har bir yo'nalish uchun) |
| Kategoriya: ota-kategoriya mos | 14 |
| Kategoriya: faqat "har qanday taklifga ochiq" | 8 |
| Kalit so'z (heshteg) | 10 tadan, ko'pi bilan 30 |
| Joylashuv mos | 10, bir xil viloyat bo'lsa 15 gacha |
| Holat (condition) mos | 15 gacha |

- Maksimal ballar: kategoriya 40, kalit so'zlar 30, joylashuv 15, holat 15; jami 100.
- `MUTUAL_MATCH` — ikkala yo'nalish ham qanoatlantirilgan; `ONE_WAY_MATCH` — faqat bittasi.
- Javobda `breakdown` (ballar) va `reason` (izoh) qaytariladi.
- Tavsiya: e'lon `ACTIVE` bo'lganda yoki tahrirlanganda Celery shu e'lon uchun mosliklarni qayta hisoblaydi va `BarterMatch` ga yozadi. `engine = "RULES_V1"`.

### 9.8. Alertlar (admin qo'ng'iroqchasi)

| Hodisa | Alert |
|---|---|
| Yangi `PENDING` e'lon | `PENDING_LISTING` |
| Yangi shikoyat | `NEW_REPORT` |
| Nizo ochildi | `DISPUTE_OPENED` |
| Foydalanuvchi `HIGH_REPORTS` ga o'tdi | `SUSPICIOUS_ACCOUNT` |

`href` — admin paneldagi tegishli sahifa (`/admin/listings/<id>`, `/admin/reports/<id>`, `/admin/exchanges/<id>/dispute`, `/admin/users/<id>`).

---

## 10. Rollar va ruxsatlar (RBAC)

Manba: `lib/rbac.ts`. `GET /auth/me` javobidagi `permissions` shu jadvaldan olinadi.

| Ruxsat | SUPER_ADMIN | ADMIN | MODERATOR | SUPPORT |
|---|:-:|:-:|:-:|:-:|
| dashboard.read | ✓ | ✓ | ✓ | ✓ |
| users.read | ✓ | ✓ | ✓ | ✓ |
| users.update | ✓ | ✓ | | |
| users.block | ✓ | ✓ | ✓ | |
| users.delete | ✓ | ✓ | | |
| users.notes | ✓ | ✓ | ✓ | ✓ |
| listings.read | ✓ | ✓ | ✓ | ✓ |
| listings.update | ✓ | ✓ | ✓ | |
| listings.approve | ✓ | ✓ | ✓ | |
| listings.reject | ✓ | ✓ | ✓ | |
| listings.block | ✓ | ✓ | ✓ | |
| listings.delete | ✓ | ✓ | | |
| barter.read | ✓ | ✓ | ✓ | ✓ |
| exchanges.read | ✓ | ✓ | ✓ | ✓ |
| exchanges.manage | ✓ | ✓ | | |
| disputes.manage | ✓ | ✓ | ✓ | |
| matches.read | ✓ | ✓ | ✓ | ✓ |
| reviews.moderate | ✓ | ✓ | ✓ | |
| reports.read | ✓ | ✓ | ✓ | ✓ |
| reports.resolve | ✓ | ✓ | ✓ | |
| moderation.read | ✓ | ✓ | ✓ | ✓ |
| moderation.act | ✓ | ✓ | ✓ | |
| categories.manage | ✓ | ✓ | | |
| locations.manage | ✓ | ✓ | | |
| notifications.read | ✓ | ✓ | ✓ | ✓ |
| notifications.send | ✓ | ✓ | | |
| admins.read | ✓ | ✓ | | |
| admins.manage | ✓ | | | |
| audit.read | ✓ | ✓ | | |
| settings.read | ✓ | ✓ | | |
| settings.manage | ✓ | ✓ | | |

Ruxsat yo'q bo'lsa → `403 FORBIDDEN`, `message: "Missing permission: <nomi>"`.

---

## 11. Fon vazifalari (Celery)

| Vazifa | Jadval | Nima qiladi |
|---|---|---|
| `expire_listings` | har soat | `ACTIVE` va `expiresAt < now` → `ARCHIVED`; egasiga bot xabari ("e'loningiz muddati tugadi") |
| `expire_offers` | har 10 daqiqa | `PENDING` va `expiresAt < now` → `EXPIRED` |
| `end_suspensions` | har 5 daqiqa | `SUSPENDED` va `suspendedUntil < now` → `ACTIVE` |
| `send_scheduled_notifications` | har daqiqa | `SCHEDULED` va `scheduledAt <= now` → yuborish (`SENDING` → `SENT/FAILED`) |
| `cleanup_uploads` | har kuni | 24 soatdan eski biriktirilmagan yuklamalarni S3'dan o'chirish |
| `cleanup_login_requests` | har soat | Eskirgan `TelegramLoginRequest` va sessiyalarni tozalash |
| `recompute_matches` | hodisa bo'yicha + tungi | 9.7 |
| `recompute_counters` | tungi | 9.5 va `riskLevel` |
| `send_bot_message` | navbat | Barcha bot xabarlari shu navbat orqali ketadi (retry + 30 xabar/soniya limiti) |

---

## 12. Telegram bot xabarnomalari

Foydalanuvchining `TelegramAccount` i bor bo'lsa, `bot_blocked=false` va `notifications_enabled=true` bo'lsa, quyidagi xabarlar yuboriladi. Til `User.language` bo'yicha (uz yoki ru). Har bir xabarda saytga olib boradigan `url` tugmasi bo'ladi.

| Hodisa | Kimga | Matn (uz) | Tugma |
|---|---|---|---|
| E'lon tasdiqlandi | Egasiga | "✅ «{title}» e'loningiz chop etildi." | E'lonni ko'rish → `/listings/{id}` |
| E'lon rad etildi / tuzatish so'raldi | Egasiga | "❗ «{title}» e'loningiz qabul qilinmadi. Sabab: {reason}" | Mening e'lonlarim → `/my/listings` |
| Yangi taklif keldi | Qabul qiluvchiga | "🔄 {name} sizning «{title}» e'loningizga almashuv taklif qildi." | Takliflarim → `/my/offers` |
| Taklif qabul qilindi | Yuboruvchiga | "🎉 {name} taklifingizni qabul qildi! Telefon: {phone}" | Takliflarim |
| Taklif rad etildi | Yuboruvchiga | "Taklifingiz rad etildi: «{title}»" | Boshqa e'lonlar → `/` |
| E'lon muddati tugadi | Egasiga | "⏰ «{title}» e'loningiz muddati tugadi." | Mening e'lonlarim |
| Ogohlantirish (moderator) | Foydalanuvchiga | "⚠️ Ogohlantirish: {reason}" | — |
| Hisob cheklandi yoki bloklandi | Foydalanuvchiga | "Hisobingiz {until} gacha cheklandi. Sabab: {reason}" | — |
| Admin xabarnomasi (`IN_APP`) | Tanlangan auditoriya | `{title}\n\n{message}` | — |

Xabarlar Celery navbati orqali yuboriladi. Telegram `403 Forbidden: bot was blocked by the user` qaytarsa → `bot_blocked = true` qilinadi.

---

## 13. Frontend bilan ulash (deploy)

### 13.1. Bitta domen (majburiy)

Cookie'lar frontend domenida ko'rinishi shart (4.1). Shuning uchun API **shu domendagi** `/api/*` yo'lida ishlaydi:

```nginx
server {
  server_name barter.uz;

  location /api/admin/ { proxy_pass http://django:8000; include proxy_params; }
  location /api/app/   { proxy_pass http://django:8000; include proxy_params; client_max_body_size 12m; }
  location /telegram/  { proxy_pass http://django:8000; include proxy_params; }
  location /           { proxy_pass http://nextjs:3000; include proxy_params; }
}
```

`proxy_params` ichida `X-Forwarded-For` va `X-Forwarded-Proto` bo'lishi kerak. Django'da `SECURE_PROXY_SSL_HEADER` va ishonchli proksi IP'larini sozlang.

Shunda frontend muhit o'zgaruvchilari standart qiymatda qoladi:

```
NEXT_PUBLIC_API_URL=/api/admin
NEXT_PUBLIC_SITE_API_URL=/api/app
```

Nginx `/api/admin` va `/api/app` so'rovlarini Django'ga yuboradi. Next.js'dagi mock route'lar (`app/api/admin/[...path]`, `app/api/app/[...path]`, `app/api/mock-image`) ishlamay qoladi. Backend tayyor bo'lgach frontend jamoasi ularni va `lib/mock*` papkalarini olib tashlaydi.

Agar API alohida domenda bo'lsa (`api.barter.uz`), `proxy.ts` sessiya cookie'larini ko'rmaydi va sahifa himoyasi buziladi. Bu variant **tavsiya etilmaydi**.

### 13.2. CORS

Bitta domenda CORS kerak emas. Test (staging) muhitida boshqa origin kerak bo'lsa: `CORS_ALLOW_CREDENTIALS=True`, aniq origin ro'yxati, `X-CSRF-Token` sarlavhasiga ruxsat.

### 13.3. Frontendda qilinadigan o'zgarishlar (frontend jamoasi zimmasida)

- [ ] Kirish sahifasi va "Kirish" oynasi: telefon va SMS o'rniga Telegram oqimi.
  - `start` → "Telegram botni ochish" tugmasi (`botUrl`) va kompyuter uchun QR kod;
  - `status` polling;
  - 6 xonali kod maydoni → `verify`;
  - `needsProfile` bo'lsa viloyat tanlash.
- [ ] Mehmon e'lon joylashi: formadagi "Aloqa" qadamidan telefon maydoni olib tashlanadi. Tasdiqlash Telegram oynasi orqali bo'ladi.
- [ ] Mock backend va `/api/mock-image` olib tashlanadi.

### 13.4. Demo ma'lumotlar

Test muhiti uchun `manage.py seed_demo` komandasi yarating:
- 4 ta admin (parol `Barter2026!`, faqat staging uchun):
  - `superadmin@barter.uz`
  - `admin@barter.uz`
  - `moderator@barter.uz`
  - `support@barter.uz`
- O'zbekistonning 14 ta hududi va tumanlari;
- kategoriyalar va atributlar daraxti.

Hudud va kategoriya ro'yxatlari `lib/mock/fixtures.ts` da bor. **Hudud va kategoriyalar productionda ham kerak** (data migration).

---

## 14. Qabul qilish mezonlari (test ro'yxati)

**Telegram kirish**
- [ ] "Kirish" → botUrl → `/start` → kontakt → kod → verify → cookie'lar o'rnatiladi, `/auth/me` foydalanuvchini qaytaradi.
- [ ] Yangi raqam: `needsProfile` → viloyat bilan qayta verify → `User(registeredVia=TELEGRAM)` yaratiladi.
- [ ] Boshqa odamning kontaktini forward qilish rad etiladi.
- [ ] Noto'g'ri kod 5 marta kiritilsa → 429, token yaroqsiz bo'ladi.
- [ ] Muddati o'tgan kod → `site.validation.codeExpired`.
- [ ] Bloklangan foydalanuvchiga kod berilmaydi va u kira olmaydi.
- [ ] Bot allaqachon bog'langan akkauntga `/start <token>` bilan raqam so'ramasdan kod beradi.

**Marketplace**
- [ ] Mehmon ommaviy lentani, e'lonni, o'xshash e'lonlarni ko'radi. Telefonlar hech qayerda chiqmaydi.
- [ ] Soxta PNG (mazmuni rasm emas) → `site.validation.fileType`. 11 MB video → `site.validation.videoTooLarge`.
- [ ] E'lon yaratish: taqiqlangan so'z, majburiy atribut yo'qligi, boshqa odamning yuklamasi → 422 kerakli kalitlar bilan.
- [ ] Yangi e'lon `PENDING`, admin navbatida va alertlarda chiqadi. Tasdiqlangach ommaviy bo'ladi va egasiga bot xabari keladi.
- [ ] Video ko'rishlar: egasi hisoblanmaydi; bitta odam 30 daqiqada bir marta.
- [ ] Taklif: o'z e'loniga → 422; takroriy → `409 OFFER_EXISTS`; qabul qilish → `Exchange` yaratiladi va telefonlar ochiladi; boshqa odam qabul qila olmaydi → 403.
- [ ] CSRF sarlavhasiz mutatsiya → 403. Admin cookie'si bilan `/api/app/me/*` → 401.

**Admin**
- [ ] Har bir rol bilan: ruxsat yo'q endpoint → 403 (masalan, SUPPORT `POST /listings/:id/approve`).
- [ ] 5 marta xato parol → 15 daqiqa qulf (429).
- [ ] Har bir o'zgartiruvchi amal `AuditLog` da; moderatsiya amallari `ModerationAction` da.
- [ ] `LAST_SUPER_ADMIN`, `SELF_BLOCK`, `ipLockout` himoyalari ishlaydi.
- [ ] Ro'yxatlar: sahifalash, `sort` ruxsat ro'yxati, vergulli filtrlar, `from/to` Toshkent vaqti bilan.

---

## 15. Ilovalar: enumlar va validatsiya kalitlari

### 15.1. Enumlar

| Enum | Qiymatlar |
|---|---|
| UserStatus | `ACTIVE, BLOCKED, SUSPENDED, DELETED` |
| RiskLevel | `LOW, NEEDS_REVIEW, HIGH_REPORTS` |
| RegisteredVia | `PHONE, GOOGLE, TELEGRAM` |
| UserActivity.type | `LOGIN, LISTING_CREATED, LISTING_UPDATED, OFFER_SENT, OFFER_ACCEPTED, OFFER_DECLINED, EXCHANGE_COMPLETED, REVIEW_LEFT, REPORT_SUBMITTED, PROFILE_UPDATED` |
| AdminRole | `SUPER_ADMIN, ADMIN, MODERATOR, SUPPORT` |
| AdminStatus | `ACTIVE, BLOCKED` |
| ItemCondition | `NEW, LIKE_NEW, GOOD, FAIR, DAMAGED` |
| ListingStatus | `DRAFT, PENDING, ACTIVE, REJECTED, PAUSED, EXCHANGED, ARCHIVED, BLOCKED` |
| RejectionReason | `PROHIBITED_ITEM, INCORRECT_CATEGORY, MISLEADING_DESCRIPTION, DUPLICATE_LISTING, SUSPICIOUS_CONTENT, POOR_QUALITY_IMAGES, SPAM, OTHER` |
| CashDifference.direction | `WILL_ADD, EXPECTS` |
| CategoryStatus | `ACTIVE, DISABLED` |
| AttributeType | `TEXT, NUMBER, SELECT, MULTI_SELECT, BOOLEAN` |
| DistrictType | `DISTRICT, CITY` |
| BarterRequestStatus | `PENDING, ACCEPTED, DECLINED, CANCELLED, EXPIRED, COMPLETED` |
| BarterSide | `OFFERED, REQUESTED` |
| ExchangeStatus | `AGREED, IN_PROGRESS, COMPLETED, CANCELLED, DISPUTED` |
| DisputeCategory | `CONDITION_MISMATCH, FAKE_ITEM, WRONG_ITEM, NO_SHOW, HARASSMENT, OTHER` |
| DisputeStatus | `OPEN, UNDER_REVIEW, RESOLVED, CLOSED` |
| DisputeResolution | `NO_ACTION, WARNING_ISSUED, USER_SUSPENDED, USER_BLOCKED, EXCHANGE_CANCELLED` |
| ReviewStatus | `VISIBLE, HIDDEN, DELETED` |
| ReportTargetType | `LISTING, USER, MESSAGE, BARTER_REQUEST` |
| ReportReason | `SCAM, FAKE_ITEM, PROHIBITED_ITEM, SPAM, HARASSMENT, MISLEADING_INFORMATION, DUPLICATE, OTHER` |
| ReportStatus | `NEW, REVIEWING, RESOLVED, REJECTED` |
| ModerationActionType | `APPROVE, REJECT, BLOCK, UNBLOCK, SUSPEND, ARCHIVE, DELETE, RESTORE, REQUEST_CORRECTION, WARN, HIDE, RESOLVE_REPORT, REJECT_REPORT` |
| ModerationTargetType | `LISTING, USER, REVIEW, REPORT, BARTER_REQUEST, EXCHANGE` |
| ModerationQueue | `PENDING_LISTINGS, REPORTED_LISTINGS, REPORTED_USERS, SUSPICIOUS_ACCOUNTS, DUPLICATE_LISTINGS` |
| NoteEntityType | `USER, LISTING, EXCHANGE, REPORT, DISPUTE` |
| NotificationType | `SYSTEM, MODERATION, ANNOUNCEMENT, SECURITY` |
| NotificationStatus | `DRAFT, SCHEDULED, SENDING, SENT, FAILED, CANCELLED` |
| NotificationChannel | `IN_APP, PUSH, EMAIL, SMS` |
| UserSegment | `NEW_USERS, ACTIVE_TRADERS, INACTIVE_30D, NO_LISTINGS, HIGH_RATED` |
| AdminAlert.kind | `NEW_REPORT, PENDING_LISTING, DISPUTE_OPENED, SUSPICIOUS_ACCOUNT` |
| AuditEntityType | `USER, LISTING, BARTER_REQUEST, EXCHANGE, DISPUTE, CATEGORY, ATTRIBUTE, REPORT, REVIEW, REGION, DISTRICT, NOTIFICATION, ADMIN, SETTINGS, AUTH` |
| MatchType | `ONE_WAY_MATCH, MUTUAL_MATCH` |
| TelegramLoginRequest.status | `PENDING, CONTACT_REQUESTED, CODE_SENT, USED, EXPIRED` |
| Locale | `uz, ru, en` |

### 15.2. Telefon formati

Qabul qilinadigan ko'rinish: `^\+998[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$`.
- Saqlash: `+998901234567`.
- Javobda: `+998 90 123 45 67`.

### 15.3. Validatsiya xato kalitlari

`errors` massivida faqat shu kalitlar qaytarilsin. Frontend ularni tarjima qiladi. Yangi kalit kerak bo'lsa, frontend jamoasiga ayting.

| Guruh | Kalitlar |
|---|---|
| Umumiy | `validation.required`, `validation.invalid`, `validation.email`, `validation.phone`, `validation.min1`, `validation.min2`, `validation.min3`, `validation.max50`, `validation.max100`, `validation.max120`, `validation.max300`, `validation.max365`, `validation.max1000`, `validation.max2000`, `validation.max5000`, `validation.positive`, `validation.integer`, `validation.slug`, `validation.url`, `validation.reasonRequired`, `validation.passwordMin`, `validation.passwordUpper`, `validation.passwordDigit`, `validation.passwordMismatch`, `validation.currentPasswordWrong`, `validation.resetTokenInvalid`, `validation.atLeastOne`, `validation.futureDate`, `validation.duplicate` |
| Sayt | `site.validation.code`, `site.validation.codeExpired`, `site.validation.codeWrong`, `site.validation.imagesRequired`, `site.validation.fileTooLarge`, `site.validation.fileType`, `site.validation.videoTooLarge`, `site.validation.videoType`, `site.validation.openOffersDisabled`, `site.validation.tooManyImages`, `site.validation.blockedKeyword` |
| Takliflar | `site.offer.pickOne`, `site.offer.ownListing`, `site.offer.notYours` |
| E'lonlar | `listings.validation.preferencesRequired`, `listings.validation.subcategoryMismatch`, `listings.validation.districtMismatch`, `listings.validation.cashDifferenceDisabled`, `listings.validation.unknownOption`, `listings.validation.noteRequiredForOther` |
| Kategoriyalar | `categories.validation.attributeKey`, `categories.validation.unitMax`, `categories.validation.optionsRequired`, `categories.validation.optionsForbidden`, `categories.validation.unitForbidden`, `categories.validation.parentMissing`, `categories.validation.parentSelf`, `categories.validation.parentLevel`, `categories.validation.hasChildrenCannotNest`, `categories.validation.reorderMismatch`, `categories.validation.slugTaken`, `categories.validation.keyTaken` |
| Sozlamalar | `settings.validation.ipLockout`, `settings.validation.outOfRange`, `settings.validation.defaultNotSupported`, `settings.validation.ip` |

Maydon uzunligi va formati bo'yicha aniq qoidalar `schemas/*.ts` da. Masalan: title 3–120, description 3–5000, sabab (reason) 3–1000, izoh (note) 3–2000, bildirishnoma sarlavhasi 3–120 va matni 3–1000.
