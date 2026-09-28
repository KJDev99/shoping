import "server-only";

import type {
  Admin,
  AdminAlert,
  AdminNote,
  AdminRef,
  AuditLog,
  BarterRequest,
  BarterRequestStatus,
  Category,
  CategoryAttribute,
  District,
  Dispute,
  DisputeCategory,
  Exchange,
  ExchangeParticipant,
  ExchangeStatus,
  ExchangeStatusChange,
  Favorite,
  ID,
  Listing,
  ListingRef,
  ListingStatus,
  ModerationAction,
  ModerationActionType,
  Notification,
  PlatformSettings,
  Region,
  RejectionReason,
  Report,
  ReportReason,
  ReportTargetType,
  Review,
  User,
  UserRef,
  UserStatus,
} from "@/types";
import {
  ADMIN_FIXTURES,
  CATEGORIES,
  CONDITION_WEIGHTS,
  DEMO_PASSWORD,
  DISPUTE_MESSAGES,
  FEMALE_FIRST,
  ITEM_TEMPLATES,
  LAST_NAMES,
  MALE_FIRST,
  REGIONS,
  REPORT_DESCRIPTIONS,
  REVIEW_COMMENTS,
  femaleLastName,
} from "./fixtures";
import { createRandom } from "./random";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminRecord extends Admin {
  password: string;
  failedLogins: number;
}

export interface SessionRecord {
  token: string;
  adminId: ID;
  csrfToken: string;
  expiresAt: number;
}

export interface PasswordResetRecord {
  token: string;
  adminId: ID;
  expiresAt: number;
}

/** Marketplace (end-user) session — separate cookie and store from admin sessions. */
export interface UserSessionRecord {
  token: string;
  userId: ID;
  csrfToken: string;
  expiresAt: number;
}

export interface OtpRecord {
  phone: string;
  code: string;
  expiresAt: number;
  attempts: number;
  sentAt: number;
}

export interface UploadRecord {
  id: string;
  userId: ID;
  contentType: string;
  data: Uint8Array;
  createdAt: number;
}

export interface MockDb {
  admins: AdminRecord[];
  users: User[];
  regions: Region[];
  districts: District[];
  categories: Category[];
  attributes: CategoryAttribute[];
  listings: Listing[];
  barterRequests: BarterRequest[];
  exchanges: Exchange[];
  disputes: Dispute[];
  reviews: Review[];
  reports: Report[];
  moderationActions: ModerationAction[];
  notes: AdminNote[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  alerts: AdminAlert[];
  favorites: Favorite[];
  settings: PlatformSettings;
  sessions: Map<string, SessionRecord>;
  passwordResets: Map<string, PasswordResetRecord>;
  userSessions: Map<string, UserSessionRecord>;
  /** Keyed by normalized phone (digits only). */
  otps: Map<string, OtpRecord>;
  uploads: Map<string, UploadRecord>;
  seq: Record<string, number>;
  /** Monotonic counter bumped on any listing change; used to invalidate the match cache. */
  listingsVersion: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY = 86_400_000;

export function mockImage(label: string, seed: number | string, kind: "item" | "avatar" = "item"): string {
  const params = new URLSearchParams({ l: label, s: String(seed), k: kind });
  return `/api/mock-image?${params.toString()}`;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

function generate(): MockDb {
  const rnd = createRandom(20260928);
  const NOW = Date.now();
  const ago = (days: number, jitterHours = 12) => NOW - days * DAY - rnd.int(0, jitterHours) * 3_600_000;

  // ----- Admins -----
  const admins: AdminRecord[] = ADMIN_FIXTURES.map((a, i) => ({
    id: a.id,
    firstName: a.firstName,
    lastName: a.lastName,
    email: a.email,
    phone: `+998 90 ${String(100 + i * 37).padStart(3, "0")} ${String(10 + i * 7).padStart(2, "0")} ${String(20 + i * 3).padStart(2, "0")}`,
    avatar: i % 3 === 0 ? null : mockImage(initials(`${a.firstName} ${a.lastName}`), `adm${i}`, "avatar"),
    role: a.role,
    status: a.id === "adm_8" ? "BLOCKED" : "ACTIVE",
    lastLoginAt: iso(ago(i === 0 ? 0 : rnd.int(0, 20))),
    createdAt: iso(ago(420 - i * 30)),
    updatedAt: iso(ago(rnd.int(1, 30))),
    password: DEMO_PASSWORD,
    failedLogins: 0,
  }));
  const adminRef = (a: AdminRecord): AdminRef => ({
    id: a.id,
    fullName: `${a.firstName} ${a.lastName}`,
    avatar: a.avatar,
    role: a.role,
  });
  const staff = admins.filter((a) => a.role !== "SUPPORT");

  // ----- Locations -----
  const regions: Region[] = [];
  const districts: District[] = [];
  REGIONS.forEach((r, i) => {
    regions.push({
      id: r.id,
      countryId: "uz",
      name: r.name,
      slug: r.slug,
      enabled: true,
      sortOrder: i,
      districtsCount: r.districts.length,
      listingsCount: 0,
      usersCount: 0,
    });
    r.districts.forEach((dst) =>
      districts.push({ id: dst.id, regionId: r.id, name: dst.name, type: dst.type, enabled: true }),
    );
  });
  const regionWeights = REGIONS.map((r) => [r.id, r.weight] as const);

  // ----- Categories -----
  const categories: Category[] = [];
  const attributes: CategoryAttribute[] = [];
  CATEGORIES.forEach((c, i) => {
    categories.push({
      id: c.id,
      parentId: null,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      image: null,
      status: "ACTIVE",
      sortOrder: i,
      listingsCount: 0,
      createdAt: iso(ago(500)),
      updatedAt: iso(ago(rnd.int(5, 90))),
    });
    c.children.forEach((ch, j) => {
      categories.push({
        id: ch.id,
        parentId: c.id,
        name: ch.name,
        slug: ch.slug,
        icon: ch.icon,
        image: null,
        status: "ACTIVE",
        sortOrder: j,
        listingsCount: 0,
        createdAt: iso(ago(500)),
        updatedAt: iso(ago(rnd.int(5, 90))),
      });
      ch.attributes?.forEach((attr, k) =>
        attributes.push({
          id: `attr_${ch.id.replace("cat_", "")}_${attr.key}`,
          categoryId: ch.id,
          key: attr.key,
          name: attr.name,
          type: attr.type,
          required: attr.required ?? false,
          options: (attr.options ?? []).map((o) => ({
            value: o,
            label: { uz: attr.unit ? `${o} ${attr.unit}` : o, ru: attr.unit ? `${o} ${attr.unit}` : o, en: attr.unit ? `${o} ${attr.unit}` : o },
          })),
          unit: attr.unit ?? null,
          filterable: attr.filterable ?? false,
          searchable: attr.searchable ?? false,
          sortOrder: k,
        }),
      );
    });
  });
  // One disabled category to exercise the UI.
  categories.push({
    id: "cat_collectibles",
    parentId: "cat_other",
    name: { uz: "Kolleksiya buyumlari", ru: "Коллекционирование", en: "Collectibles" },
    slug: "collectibles",
    icon: "Gem",
    image: null,
    status: "DISABLED",
    sortOrder: 0,
    listingsCount: 0,
    createdAt: iso(ago(60)),
    updatedAt: iso(ago(10)),
  });

  // ----- Users -----
  const users: User[] = [];
  const USER_COUNT = 180;
  const usedPhones = new Set<string>();
  for (let i = 0; i < USER_COUNT; i++) {
    const female = rnd.chance(0.35);
    const first = female ? rnd.pick(FEMALE_FIRST) : rnd.pick(MALE_FIRST);
    const lastBase = rnd.pick(LAST_NAMES);
    const last = female ? femaleLastName(lastBase) : lastBase;
    // First three users are the canonical examples from the brief.
    const [fn, ln] = i === 0 ? ["Aziz", "Karimov"] : i === 1 ? ["Jasur", "Aliyev"] : i === 2 ? ["Dilshod", "Rasulov"] : [first, last];
    const fullName = `${fn} ${ln}`;
    let phone: string;
    do {
      phone = `+998 ${rnd.pick(["90", "91", "93", "94", "97", "99", "88", "33"])} ${rnd.int(100, 999)} ${String(rnd.int(0, 99)).padStart(2, "0")} ${String(rnd.int(0, 99)).padStart(2, "0")}`;
    } while (usedPhones.has(phone));
    usedPhones.add(phone);
    const regionId = rnd.weighted(regionWeights);
    const regionDistricts = districts.filter((dd) => dd.regionId === regionId);
    const registeredDaysAgo = i < 3 ? 400 - i * 20 : Math.floor(Math.pow(rnd.next(), 1.6) * 420);
    const createdAt = ago(registeredDaysAgo);
    const rolled: UserStatus = rnd.weighted([["ACTIVE", 88], ["SUSPENDED", 4], ["BLOCKED", 5], ["DELETED", 3]]);
    // Brand-new accounts haven't had time to be moderated yet.
    const status: UserStatus = i < 3 || registeredDaysAgo < 14 ? "ACTIVE" : rolled;
    const translit = `${fn}${ln}`.toLowerCase().replace(/[^a-z]/g, "");
    users.push({
      id: `usr_${1000 + i}`,
      firstName: fn,
      lastName: ln,
      fullName,
      username: `${translit}${rnd.int(1, 99)}`,
      phone,
      email: rnd.chance(0.7) ? `${translit}${rnd.int(1, 999)}@${rnd.pick(["gmail.com", "mail.ru", "yandex.ru", "inbox.uz"])}` : null,
      avatar: rnd.chance(0.55) ? mockImage(initials(fullName), `u${i}`, "avatar") : null,
      bio: rnd.chance(0.3) ? rnd.pick(["Texnika ixlosmandi", "Faqat halol almashuv", "Toshkentda uchrashish mumkin", "Коллекционер гаджетов"]) : null,
      regionId,
      districtId: regionDistricts.length ? rnd.pick(regionDistricts).id : null,
      status,
      statusReason:
        status === "BLOCKED"
          ? rnd.pick(["Bir nechta firibgarlik shikoyatlari tasdiqlandi", "Spam e'lonlar", "Taqiqlangan buyumlar joylashtirgan"])
          : status === "SUSPENDED"
            ? rnd.pick(["Buyum holati bo'yicha ko'p shikoyatlar", "Uchrashuvlarga kelmaslik"])
            : null,
      suspendedUntil: status === "SUSPENDED" ? iso(NOW + rnd.int(2, 20) * DAY) : null,
      phoneVerified: true,
      emailVerified: rnd.chance(0.6),
      language: rnd.weighted([["uz", 6], ["ru", 3], ["en", 1]]),
      listingsCount: 0,
      completedExchanges: 0,
      reportsCount: 0,
      reportsSubmittedCount: 0,
      rating: null,
      reviewsCount: 0,
      riskLevel: "LOW",
      registeredVia: rnd.weighted([["PHONE", 6], ["TELEGRAM", 3], ["GOOGLE", 2]]),
      lastActiveAt: status === "DELETED" ? iso(createdAt + DAY) : iso(ago(Math.min(registeredDaysAgo, Math.floor(Math.pow(rnd.next(), 2.5) * 60)))),
      deletedAt: status === "DELETED" ? iso(ago(rnd.int(1, 30))) : null,
      createdAt: iso(createdAt),
      updatedAt: iso(ago(rnd.int(0, Math.max(1, registeredDaysAgo)))),
    });
  }
  const userById = new Map(users.map((u) => [u.id, u]));
  const liveUsers = users.filter((u) => u.status !== "DELETED");

  // ----- Listings -----
  const listings: Listing[] = [];
  const LISTING_COUNT = 460;
  for (let i = 0; i < LISTING_COUNT; i++) {
    const tpl = i < ITEM_TEMPLATES.length ? ITEM_TEMPLATES[i] : rnd.pick(ITEM_TEMPLATES);
    // Canonical example: Aziz has the iPhone 12, Jasur has the Samsung S23.
    const owner =
      i === 0 ? users[0] : i === 4 ? users[1] : i === 15 ? users[2] : rnd.pick(liveUsers);
    const ownerCreated = new Date(owner.createdAt).getTime();
    const maxAge = Math.max(1, Math.floor((NOW - ownerCreated) / DAY));
    const ageDays = Math.floor(Math.pow(rnd.next(), 1.4) * Math.min(maxAge, 300));
    const createdAt = ago(ageDays);
    let status: ListingStatus =
      owner.status === "BLOCKED"
        ? rnd.pick(["BLOCKED", "ARCHIVED"] as const)
        : rnd.weighted([
            ["ACTIVE", 58],
            ["PENDING", 9],
            ["REJECTED", 5],
            ["PAUSED", 4],
            ["EXCHANGED", 12],
            ["ARCHIVED", 6],
            ["BLOCKED", 2],
            ["DRAFT", 4],
          ]);
    if (i === 0 || i === 4) status = "ACTIVE";
    if (ageDays < 2 && rnd.chance(0.6)) status = "PENDING";
    // Moderation keeps up: only recent listings are still waiting for review.
    if (status === "PENDING" && ageDays > 4) status = "ACTIVE";
    const rejectionReason: RejectionReason | null =
      status === "REJECTED"
        ? rnd.pick(["INCORRECT_CATEGORY", "MISLEADING_DESCRIPTION", "DUPLICATE_LISTING", "POOR_QUALITY_IMAGES", "SPAM"] as const)
        : status === "BLOCKED"
          ? rnd.pick(["PROHIBITED_ITEM", "SUSPICIOUS_CONTENT"] as const)
          : null;
    const imageCount = rnd.int(1, 5);
    const openToOffers = rnd.chance(0.22);
    const titleSuffix = i >= ITEM_TEMPLATES.length && rnd.chance(0.25) ? rnd.pick([" (ideal)", " — srochno", " + aksessuarlar", ""]) : "";
    const title = `${tpl.title}${titleSuffix}`;
    const attrsForSub = attributes.filter((a) => a.categoryId === tpl.subcategoryId);
    const attrValues: Listing["attributes"] = {};
    attrsForSub.forEach((a) => {
      if (tpl.attributes[a.key] !== undefined) attrValues[a.id] = tpl.attributes[a.key];
    });
    const wantsSubs = openToOffers ? [] : tpl.wants.filter((w) => w !== "cat_other");
    const wantsParents = [...new Set(wantsSubs.map((s) => categories.find((c) => c.id === s)?.parentId).filter((x): x is string => !!x))];
    const ownerRegionDistricts = districts.filter((dd) => dd.regionId === owner.regionId);
    listings.push({
      id: `lst_${10000 + i}`,
      code: `LST-${10000 + i}`,
      userId: owner.id,
      owner: { id: owner.id, fullName: owner.fullName, avatar: owner.avatar, phone: owner.phone },
      title,
      description: tpl.description,
      categoryId: tpl.categoryId,
      subcategoryId: tpl.subcategoryId || null,
      condition: i === 0 ? "LIKE_NEW" : rnd.weighted(CONDITION_WEIGHTS),
      images: Array.from({ length: imageCount }, (_, k) => ({
        id: `img_${i}_${k}`,
        url: mockImage(tpl.title, `${i}-${k}`),
        sortOrder: k,
        isCover: k === 0,
      })),
      video: rnd.chance(0.12) ? { url: "/videos/sample.mp4", durationSec: rnd.int(10, 60), sizeMb: rnd.int(5, 45) } : null,
      attributes: attrValues,
      regionId: owner.regionId,
      districtId: owner.districtId ?? (ownerRegionDistricts[0]?.id ?? null),
      location: rnd.chance(0.4) ? rnd.pick(["Metro yaqinida", "Markaziy bozor oldida", "Kelishiladi", "Uyga yaqin joyda"]) : null,
      exchangePreferences: {
        openToOffers,
        categories: wantsParents,
        subcategories: wantsSubs,
        keywords: openToOffers ? [] : tpl.wantKeywords,
        conditions: rnd.chance(0.5) ? ["NEW", "LIKE_NEW", "GOOD"] : [],
        regionIds: rnd.chance(0.5) ? [owner.regionId] : [],
        note: openToOffers ? "Har qanday takliflarni ko'rib chiqaman" : tpl.wishNote,
        cashDifference: rnd.chance(0.08) ? { direction: rnd.pick(["WILL_ADD", "EXPECTS"] as const), note: "Farqi kelishiladi" } : null,
      },
      status,
      rejectionReason,
      rejectionNote: rejectionReason ? rnd.pick(["Iltimos, to'g'ri kategoriyani tanlang.", "Rasmlar sifatsiz.", null]) : null,
      rejectionCount: status === "REJECTED" ? rnd.weighted([[1, 6], [2, 2], [3, 1]]) : rnd.chance(0.05) ? 1 : 0,
      views: status === "DRAFT" || status === "PENDING" ? 0 : rnd.int(15, 2400),
      favoritesCount: status === "ACTIVE" ? rnd.int(0, 60) : rnd.int(0, 8),
      offersCount: 0,
      reportsCount: 0,
      possibleDuplicateOf: null,
      publishedAt: ["DRAFT", "PENDING", "REJECTED"].includes(status) ? null : iso(Math.min(NOW - 60_000, createdAt + rnd.int(1, 20) * 3_600_000)),
      expiresAt: status === "ACTIVE" ? iso(createdAt + 60 * DAY) : null,
      deletedAt: null,
      createdAt: iso(createdAt),
      updatedAt: iso(createdAt + rnd.int(0, ageDays) * DAY * 0.5),
    });
  }
  // Mark a few duplicates: same owner, same title.
  const byOwnerTitle = new Map<string, Listing>();
  for (const l of listings) {
    const key = `${l.userId}|${l.title}`;
    const prev = byOwnerTitle.get(key);
    if (prev) l.possibleDuplicateOf = prev.id;
    else byOwnerTitle.set(key, l);
  }
  // Force a handful of cross-owner duplicates for the moderation queue.
  for (let k = 0; k < 6; k++) {
    const a = listings[50 + k * 11];
    const b = listings[51 + k * 11];
    b.title = a.title;
    b.description = a.description;
    b.categoryId = a.categoryId;
    b.subcategoryId = a.subcategoryId;
    b.attributes = { ...a.attributes };
    b.images = a.images.map((img, k) => ({ ...img, id: `${b.id}_dup_${k}` }));
    // A re-post of the same item: newer than the original and awaiting review.
    b.createdAt = b.updatedAt = new Date(Math.max(new Date(a.createdAt).getTime() + DAY, NOW - 2 * DAY)).toISOString();
    b.publishedAt = null;
    b.possibleDuplicateOf = a.id;
    if (b.status === "ACTIVE") b.status = "PENDING";
  }
  const listingById = new Map(listings.map((l) => [l.id, l]));

  const userRef = (id: ID): UserRef => {
    const u = userById.get(id)!;
    return { id: u.id, fullName: u.fullName, avatar: u.avatar, phone: u.phone };
  };
  const listingRef = (id: ID): ListingRef => {
    const l = listingById.get(id)!;
    return {
      id: l.id,
      title: l.title,
      image: l.images[0]?.url ?? null,
      condition: l.condition,
      categoryId: l.subcategoryId ?? l.categoryId,
      ownerId: l.userId,
      status: l.status,
    };
  };

  // ----- Barter requests & exchanges -----
  const barterRequests: BarterRequest[] = [];
  const exchanges: Exchange[] = [];
  const disputes: Dispute[] = [];
  const tradeable = listings.filter((l) => ["ACTIVE", "EXCHANGED", "PAUSED"].includes(l.status));
  const listingsByOwner = new Map<ID, Listing[]>();
  tradeable.forEach((l) => listingsByOwner.set(l.userId, [...(listingsByOwner.get(l.userId) ?? []), l]));
  const owners = [...listingsByOwner.keys()];

  const BARTER_COUNT = 320;
  for (let i = 0; i < BARTER_COUNT; i++) {
    let senderId: ID;
    let receiverId: ID;
    let offered: Listing[];
    let requested: Listing[];
    if (i === 0) {
      // "My iPhone 12 for your Samsung S23."
      senderId = users[0].id;
      receiverId = users[1].id;
      offered = [listings[0]];
      requested = [listings[4]];
    } else {
      senderId = rnd.pick(owners);
      do receiverId = rnd.pick(owners);
      while (receiverId === senderId);
      const shape = rnd.weighted([["1:1", 70], ["2:1", 18], ["2:2", 7], ["1:2", 5]]);
      const [nOffer, nReq] = shape.split(":").map(Number);
      offered = rnd.sample(listingsByOwner.get(senderId)!, nOffer);
      requested = rnd.sample(listingsByOwner.get(receiverId)!, nReq);
    }
    const created = Math.max(
      ...[...offered, ...requested].map((l) => new Date(l.createdAt).getTime()),
      new Date(userById.get(senderId)!.createdAt).getTime(),
    );
    // Leave room after the offer for the response/exchange timeline so nothing clusters at "now".
    const spread = rnd.next();
    // The canonical "iPhone 12 ↔ Samsung S23" offer is fresh and still pending.
    const createdAt = i === 0 ? NOW - 5 * 3_600_000 : created + (NOW - created) * 0.85 * spread;
    const allExchanged = [...offered, ...requested].every((l) => l.status === "EXCHANGED");
    let status: BarterRequestStatus = i === 0
      ? "PENDING"
      : allExchanged
        ? "COMPLETED"
        : rnd.weighted([
            ["PENDING", 22],
            ["ACCEPTED", 14],
            ["DECLINED", 24],
            ["CANCELLED", 10],
            ["EXPIRED", 12],
            ["COMPLETED", 18],
          ]);
    if (status === "PENDING" && NOW - createdAt > 7 * DAY) status = "EXPIRED";
    const id = `bar_${1000 + i}`;
    const items = [
      ...offered.map((l, k) => ({ id: `${id}_o${k}`, barterRequestId: id, listingId: l.id, side: "OFFERED" as const, listing: listingRef(l.id) })),
      ...requested.map((l, k) => ({ id: `${id}_r${k}`, barterRequestId: id, listingId: l.id, side: "REQUESTED" as const, listing: listingRef(l.id) })),
    ];
    const respondedAt =
      status === "PENDING" || status === "EXPIRED"
        ? null
        : createdAt + Math.min(rnd.int(1, 72) * 3_600_000, (NOW - createdAt) * (0.2 + 0.5 * rnd.next()));
    const br: BarterRequest = {
      id,
      code: `BAR-${1000 + i}`,
      senderId,
      receiverId,
      sender: userRef(senderId),
      receiver: userRef(receiverId),
      offeredListingIds: offered.map((l) => l.id),
      requestedListingIds: requested.map((l) => l.id),
      items,
      message:
        i === 0
          ? "Mening iPhone 12 im sizning Samsung S23 ingizga. Qalaysiz?"
          : rnd.pick([
              "Assalomu alaykum! Almashamizmi?",
              `${offered.map((l) => l.title).join(" + ")} ni ${requested.map((l) => l.title).join(" + ")} ga taklif qilaman.`,
              "Здравствуйте, интересует обмен. Могу показать вживую.",
              "Holati juda yaxshi, ko'rib chiqing.",
              "Hi! Would you trade for this?",
              null,
            ]),
      cashDifferenceNote: rnd.chance(0.05) && i !== 0 ? "Men 200 000 so'm qo'shaman (kelishilgan holda)" : null,
      status,
      expiresAt: iso(createdAt + 7 * DAY),
      respondedAt: respondedAt ? iso(respondedAt) : null,
      exchangeId: null,
      createdAt: iso(createdAt),
      updatedAt: iso(respondedAt ?? createdAt),
    };
    barterRequests.push(br);

    if (status === "ACCEPTED" || status === "COMPLETED") {
      const exId = `exc_${500 + exchanges.length}`;
      const exStatus: ExchangeStatus =
        status === "COMPLETED"
          ? rnd.chance(0.92) ? "COMPLETED" : "DISPUTED"
          : rnd.weighted([["AGREED", 35], ["IN_PROGRESS", 30], ["CANCELLED", 20], ["DISPUTED", 15]]);
      const agreedAt = respondedAt ?? createdAt;
      const history: ExchangeStatusChange[] = [
        { status: "AGREED", at: iso(agreedAt), note: null, actor: { type: "SYSTEM", id: null, name: null } },
      ];
      let completedAt: number | null = null;
      let cancelledAt: number | null = null;
      if (exStatus !== "AGREED") {
        history.push({ status: "IN_PROGRESS", at: iso(agreedAt + Math.min(rnd.int(2, 48) * 3_600_000, (NOW - agreedAt) * 0.3)), note: "Uchrashuv vaqti belgilandi", actor: { type: "USER", id: senderId, name: br.sender.fullName } });
      }
      if (exStatus === "COMPLETED") {
        completedAt = agreedAt + Math.min(rnd.int(1, 6) * DAY, (NOW - agreedAt) * 0.8);
        history.push({ status: "COMPLETED", at: iso(completedAt), note: "Ikkala tomon tasdiqladi", actor: { type: "SYSTEM", id: null, name: null } });
      }
      if (exStatus === "CANCELLED") {
        cancelledAt = agreedAt + Math.min(rnd.int(1, 5) * DAY, (NOW - agreedAt) * 0.8);
        history.push({ status: "CANCELLED", at: iso(cancelledAt), note: rnd.pick(["Foydalanuvchi fikridan qaytdi", "Uchrashuv amalga oshmadi"]), actor: { type: "USER", id: receiverId, name: br.receiver.fullName } });
      }
      if (exStatus === "DISPUTED") {
        history.push({ status: "DISPUTED", at: iso(agreedAt + Math.min(rnd.int(1, 4) * DAY, (NOW - agreedAt) * 0.6)), note: "Nizo ochildi", actor: { type: "USER", id: receiverId, name: br.receiver.fullName } });
      }
      const participants: [ExchangeParticipant, ExchangeParticipant] = [
        { userId: senderId, user: userRef(senderId), side: "A", items: offered.map((l) => listingRef(l.id)), confirmedAt: completedAt ? iso(completedAt) : null },
        { userId: receiverId, user: userRef(receiverId), side: "B", items: requested.map((l) => listingRef(l.id)), confirmedAt: completedAt ? iso(completedAt - 3_600_000) : null },
      ];
      const exchange: Exchange = {
        id: exId,
        code: `EXC-${500 + exchanges.length}`,
        barterRequestId: id,
        participants,
        status: exStatus,
        meetingRegionId: userById.get(receiverId)!.regionId,
        meetingNote: rnd.pick(["Metro bekati oldida", "Savdo markazi, 1-qavat", "Kelishilgan joyda", null]),
        statusHistory: history,
        disputeId: null,
        completedAt: completedAt ? iso(completedAt) : null,
        cancelledAt: cancelledAt ? iso(cancelledAt) : null,
        createdAt: iso(agreedAt),
        updatedAt: history[history.length - 1].at,
      };
      br.exchangeId = exId;
      if (exStatus === "COMPLETED") {
        [...offered, ...requested].forEach((l) => (l.status = "EXCHANGED"));
      }
      if (exStatus === "DISPUTED") {
        const category: DisputeCategory = rnd.pick(["CONDITION_MISMATCH", "FAKE_ITEM", "WRONG_ITEM", "NO_SHOW", "HARASSMENT", "OTHER"] as const);
        const openedAt = new Date(history[history.length - 1].at).getTime();
        const assignee = rnd.chance(0.6) ? rnd.pick(staff) : null;
        const dispute: Dispute = {
          id: `dsp_${100 + disputes.length}`,
          exchangeId: exId,
          openedBy: userRef(receiverId),
          against: userRef(senderId),
          category,
          description: rnd.pick([
            "Telefon ekranida tavsifda ko'rsatilmagan chiziqlar bor. Rasmlarda ular yashirilgan.",
            "Uchrashuvga kelmadi va javob bermayapti.",
            "Berilgan buyum boshqa model ekan.",
            "Buyum original emas, seriya raqami mos kelmaydi.",
          ]),
          status: assignee ? "UNDER_REVIEW" : "OPEN",
          resolution: null,
          resolutionNote: null,
          assignedTo: assignee ? adminRef(assignee) : null,
          evidence: Array.from({ length: rnd.int(1, 3) }, (_, k) => ({
            id: `evd_${disputes.length}_${k}`,
            uploadedBy: receiverId,
            url: mockImage(`Dalil ${k + 1}`, `ev${disputes.length}${k}`),
            kind: "IMAGE" as const,
            caption: rnd.pick(["Ekrandagi chiziq", "Qutidagi seriya raqami", "Chat skrinshoti", null]),
            createdAt: iso(openedAt + k * 600_000),
          })),
          messages: DISPUTE_MESSAGES.slice(0, rnd.int(4, DISPUTE_MESSAGES.length)).map((body, k) => {
            const fromA = k % 2 === 1;
            const who = fromA ? br.sender : br.receiver;
            return { id: `msg_${disputes.length}_${k}`, senderId: who.id, senderName: who.fullName, body, createdAt: iso(agreedAt + k * 1_800_000) };
          }),
          history: [
            { id: `dev_${disputes.length}_0`, type: "OPENED", description: "Nizo ochildi", actor: { type: "USER", id: receiverId, name: br.receiver.fullName }, createdAt: iso(openedAt) },
            { id: `dev_${disputes.length}_1`, type: "EVIDENCE_ADDED", description: "Dalillar yuklandi", actor: { type: "USER", id: receiverId, name: br.receiver.fullName }, createdAt: iso(openedAt + 600_000) },
            ...(assignee
              ? [{ id: `dev_${disputes.length}_2`, type: "STATUS_CHANGED" as const, description: "Ko'rib chiqishga olindi", actor: { type: "ADMIN" as const, id: assignee.id, name: `${assignee.firstName} ${assignee.lastName}` }, createdAt: iso(openedAt + 7_200_000) }]
              : []),
          ],
          createdAt: iso(openedAt),
          closedAt: null,
        };
        disputes.push(dispute);
        exchange.disputeId = dispute.id;
      }
      exchanges.push(exchange);
    }
  }
  // offersCount per listing
  for (const br of barterRequests) {
    br.requestedListingIds.forEach((lid) => (listingById.get(lid)!.offersCount += 1));
  }

  // ----- Reviews -----
  const reviews: Review[] = [];
  for (const ex of exchanges.filter((e) => e.status === "COMPLETED")) {
    const [a, b] = ex.participants;
    for (const [author, target] of [[a, b], [b, a]] as const) {
      if (!rnd.chance(0.75)) continue;
      const rating = rnd.weighted([[5, 55], [4, 25], [3, 10], [2, 6], [1, 4]] as const);
      const comment =
        rating >= 4 ? rnd.pick(REVIEW_COMMENTS.positive) : rating === 3 ? rnd.pick(REVIEW_COMMENTS.neutral) : rnd.pick(REVIEW_COMMENTS.negative);
      reviews.push({
        id: `rev_${reviews.length + 1}`,
        exchangeId: ex.id,
        exchangeCode: ex.code,
        authorId: author.userId,
        targetUserId: target.userId,
        author: userRef(author.userId),
        targetUser: userRef(target.userId),
        rating,
        comment: rnd.chance(0.85) ? comment : null,
        status: rnd.chance(0.04) ? "HIDDEN" : "VISIBLE",
        createdAt: iso(Math.min(NOW - 60_000, new Date(ex.completedAt!).getTime() + rnd.int(1, 48) * 3_600_000)),
      });
    }
  }

  // ----- Reports -----
  const reports: Report[] = [];
  // Some users are "problematic" and attract more reports — drives the safety tools.
  const problematic = rnd.sample(liveUsers.slice(3), 12).map((u) => u.id);
  const REPORT_COUNT = 190;
  for (let i = 0; i < REPORT_COUNT; i++) {
    const targetType: ReportTargetType = rnd.weighted([["LISTING", 55], ["USER", 25], ["MESSAGE", 10], ["BARTER_REQUEST", 10]]);
    let target: Report["target"];
    let reportedOwnerId: ID;
    if (targetType === "LISTING") {
      const pool = rnd.chance(0.5) ? listings.filter((l) => problematic.includes(l.userId)) : listings;
      const l = rnd.pick(pool.length ? pool : listings);
      target = { type: "LISTING", id: l.id, label: l.title, image: l.images[0]?.url ?? null, ownerId: l.userId, ownerName: l.owner.fullName };
      reportedOwnerId = l.userId;
    } else if (targetType === "USER") {
      const u = userById.get(rnd.chance(0.6) ? rnd.pick(problematic) : rnd.pick(liveUsers).id)!;
      target = { type: "USER", id: u.id, label: u.fullName, image: u.avatar, ownerId: u.id, ownerName: u.fullName };
      reportedOwnerId = u.id;
    } else if (targetType === "BARTER_REQUEST") {
      const br = rnd.pick(barterRequests);
      target = { type: "BARTER_REQUEST", id: br.id, label: br.code, image: null, ownerId: br.senderId, ownerName: br.sender.fullName };
      reportedOwnerId = br.senderId;
    } else {
      const u = userById.get(rnd.pick(problematic))!;
      target = {
        type: "MESSAGE",
        id: `msg_rep_${i}`,
        label: rnd.pick(["\"Oldindan 50% to'lov qiling, keyin olib boraman\"", "\"Sen bilan gaplashib bo'lmaydi...\"", "\"Telegramga yozing, u yerda arzonroq\""]),
        image: null,
        ownerId: u.id,
        ownerName: u.fullName,
      };
      reportedOwnerId = u.id;
    }
    let reporter: User;
    do reporter = rnd.pick(liveUsers);
    while (reporter.id === reportedOwnerId);
    const reason: ReportReason =
      targetType === "MESSAGE"
        ? rnd.pick(["HARASSMENT", "SCAM", "SPAM"] as const)
        : targetType === "USER"
          ? rnd.pick(["SCAM", "HARASSMENT", "FAKE_ITEM", "OTHER"] as const)
          : rnd.weighted([["FAKE_ITEM", 4], ["MISLEADING_INFORMATION", 5], ["SPAM", 3], ["PROHIBITED_ITEM", 2], ["DUPLICATE", 3], ["SCAM", 2], ["OTHER", 1]]);
    const ageDays = Math.floor(Math.pow(rnd.next(), 2) * 120);
    const status = ageDays < 3 ? rnd.weighted([["NEW", 7], ["REVIEWING", 3]] as const) : rnd.weighted([["NEW", 2], ["REVIEWING", 2], ["RESOLVED", 6], ["REJECTED", 3]] as const);
    const assignee = status === "NEW" ? null : rnd.pick(staff);
    reports.push({
      id: `rpt_${2000 + i}`,
      code: `RPT-${2000 + i}`,
      reporterId: reporter.id,
      reporter: userRef(reporter.id),
      targetType,
      targetId: target.id,
      target,
      reason,
      description: rnd.chance(0.8) ? rnd.pick(REPORT_DESCRIPTIONS[reason]) : null,
      attachments: rnd.chance(0.3) ? [mockImage("Skrinshot", `rp${i}`)] : [],
      status,
      assignedTo: assignee ? adminRef(assignee) : null,
      resolutionNote:
        status === "RESOLVED" ? rnd.pick(["E'lon bloklandi", "Foydalanuvchiga ogohlantirish berildi", "E'lon tahrirlandi"]) : status === "REJECTED" ? "Qoidabuzarlik aniqlanmadi" : null,
      resolvedAt: status === "RESOLVED" || status === "REJECTED" ? iso(ago(Math.max(0, ageDays - 1))) : null,
      createdAt: iso(ago(ageDays)),
      updatedAt: iso(ago(Math.max(0, ageDays - 1))),
    });
  }

  // ----- Favorites (sampled) -----
  const favorites: Favorite[] = [];
  for (let i = 0; i < 400; i++) {
    const l = rnd.pick(tradeable);
    const u = rnd.pick(liveUsers);
    if (u.id === l.userId) continue;
    favorites.push({ id: `fav_${i}`, userId: u.id, listingId: l.id, createdAt: iso(ago(rnd.int(0, 90))) });
  }

  // ----- Moderation actions -----
  const moderationActions: ModerationAction[] = [];
  const addModeration = (action: ModerationActionType, targetType: ModerationAction["targetType"], targetId: ID, targetLabel: string, reason: string | null, at: number) => {
    const admin = rnd.pick(staff);
    moderationActions.push({
      id: `mod_${moderationActions.length + 1}`,
      adminId: admin.id,
      admin: adminRef(admin),
      action,
      targetType,
      targetId,
      targetLabel,
      reason,
      createdAt: iso(at),
    });
  };
  for (const l of listings) {
    const created = new Date(l.createdAt).getTime();
    if (l.publishedAt) addModeration("APPROVE", "LISTING", l.id, l.title, null, new Date(l.publishedAt).getTime());
    if (l.status === "REJECTED") addModeration("REJECT", "LISTING", l.id, l.title, l.rejectionReason, Math.min(NOW - 60_000, created + 5 * 3_600_000));
    if (l.status === "BLOCKED") addModeration("BLOCK", "LISTING", l.id, l.title, l.rejectionReason, Math.min(NOW - 60_000, created + 2 * DAY));
  }
  for (const u of users) {
    if (u.status === "BLOCKED") addModeration("BLOCK", "USER", u.id, u.fullName, u.statusReason, ago(rnd.int(1, 60)));
    if (u.status === "SUSPENDED") addModeration("SUSPEND", "USER", u.id, u.fullName, u.statusReason, ago(rnd.int(1, 10)));
  }
  for (const r of reports) {
    if (r.status === "RESOLVED") addModeration("RESOLVE_REPORT", "REPORT", r.id, r.code, r.resolutionNote, new Date(r.resolvedAt!).getTime());
    if (r.status === "REJECTED") addModeration("REJECT_REPORT", "REPORT", r.id, r.code, r.resolutionNote, new Date(r.resolvedAt!).getTime());
  }
  moderationActions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // ----- Admin notes -----
  const notes: AdminNote[] = [];
  const NOTE_BODIES = [
    "User received multiple complaints about misleading item condition.",
    "Foydalanuvchi bilan telefon orqali gaplashildi, vaziyat tushuntirildi.",
    "Ikkinchi marta ogohlantirish berildi. Keyingi safar bloklash.",
    "Пользователь подтвердил личность через звонок.",
    "Rasmlar internetdan olingan bo'lishi mumkin — kuzatib boring.",
  ];
  for (const uid of problematic) {
    const count = rnd.int(1, 3);
    for (let k = 0; k < count; k++) {
      const author = rnd.pick(admins);
      notes.push({ id: `note_${notes.length + 1}`, entityType: "USER", entityId: uid, author: adminRef(author), body: rnd.pick(NOTE_BODIES), createdAt: iso(ago(rnd.int(1, 60))) });
    }
  }
  for (const dsp of disputes.slice(0, 6)) {
    notes.push({ id: `note_${notes.length + 1}`, entityType: "EXCHANGE", entityId: dsp.exchangeId, author: adminRef(rnd.pick(staff)), body: "Ikkala tomondan ham qo'shimcha rasmlar so'raldi.", createdAt: iso(ago(rnd.int(0, 5))) });
  }

  // ----- Audit logs -----
  const auditLogs: AuditLog[] = [];
  const UAS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
  ];
  const auditFromModeration: Record<string, string> = {
    APPROVE: "approve",
    REJECT: "reject",
    BLOCK: "block",
    SUSPEND: "suspend",
    RESOLVE_REPORT: "resolve",
    REJECT_REPORT: "reject",
  };
  for (const m of moderationActions.slice(0, 350)) {
    const entityType = m.targetType === "LISTING" ? "LISTING" : m.targetType === "USER" ? "USER" : "REPORT";
    const verb = auditFromModeration[m.action] ?? m.action.toLowerCase();
    auditLogs.push({
      id: `aud_${auditLogs.length + 1}`,
      adminId: m.adminId,
      admin: m.admin,
      action: `${entityType.toLowerCase()}.${verb}`,
      entityType,
      entityId: m.targetId,
      entityLabel: m.targetLabel,
      oldValue: m.action === "APPROVE" ? { status: "PENDING" } : m.targetType === "USER" ? { status: "ACTIVE" } : { status: "NEW" },
      newValue:
        m.action === "APPROVE"
          ? { status: "ACTIVE" }
          : m.action === "REJECT"
            ? { status: "REJECTED", reason: m.reason }
            : m.action === "BLOCK"
              ? { status: "BLOCKED" }
              : m.action === "SUSPEND"
                ? { status: "SUSPENDED" }
                : { status: m.action === "RESOLVE_REPORT" ? "RESOLVED" : "REJECTED" },
      reason: m.reason,
      ipAddress: `10.20.${rnd.int(0, 5)}.${rnd.int(2, 254)}`,
      userAgent: rnd.pick(UAS),
      createdAt: m.createdAt,
    });
  }
  for (const a of admins) {
    for (let k = 0; k < rnd.int(3, 8); k++) {
      auditLogs.push({
        id: `aud_${auditLogs.length + 1}`,
        adminId: a.id,
        admin: adminRef(a),
        action: "auth.login",
        entityType: "AUTH",
        entityId: a.id,
        entityLabel: a.email,
        oldValue: null,
        newValue: null,
        reason: null,
        ipAddress: `213.230.${rnd.int(64, 127)}.${rnd.int(2, 254)}`,
        userAgent: rnd.pick(UAS),
        createdAt: iso(ago(rnd.int(0, 40))),
      });
    }
  }
  const superAdmin = admins[0];
  auditLogs.push(
    {
      id: `aud_${auditLogs.length + 1}`,
      adminId: superAdmin.id,
      admin: adminRef(superAdmin),
      action: "settings.update",
      entityType: "SETTINGS",
      entityId: "barter",
      entityLabel: "Barter settings",
      oldValue: { maxItemsPerOffer: 3 },
      newValue: { maxItemsPerOffer: 5 },
      reason: null,
      ipAddress: "213.230.90.14",
      userAgent: UAS[0],
      createdAt: iso(ago(12)),
    },
    {
      id: `aud_${auditLogs.length + 2}`,
      adminId: superAdmin.id,
      admin: adminRef(superAdmin),
      action: "admin.role_change",
      entityType: "ADMIN",
      entityId: "adm_7",
      entityLabel: "Javlon Umarov",
      oldValue: { role: "MODERATOR" },
      newValue: { role: "ADMIN" },
      reason: "Promoted to team lead",
      ipAddress: "213.230.90.14",
      userAgent: UAS[0],
      createdAt: iso(ago(30)),
    },
  );
  auditLogs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // ----- Notifications -----
  const notifications: Notification[] = [
    {
      id: "ntf_1",
      type: "ANNOUNCEMENT",
      title: "Yangi funksiya: ko'p buyumli almashuv",
      message: "Endi bir nechta buyumni bitta buyumga almashtirish mumkin. Taklif yuborishda 'Buyum qo'shish' tugmasini bosing.",
      target: { kind: "ALL" },
      channels: ["IN_APP"],
      status: "SENT",
      recipientsCount: liveUsers.length,
      readCount: Math.floor(liveUsers.length * 0.64),
      createdBy: adminRef(admins[1]),
      scheduledAt: null,
      sentAt: iso(ago(20)),
      createdAt: iso(ago(20)),
    },
    {
      id: "ntf_2",
      type: "SECURITY",
      title: "Xavfsiz almashuv qoidalari",
      message: "Hech qachon oldindan pul o'tkazmang. Uchrashuvlarni jamoat joylarida o'tkazing.",
      target: { kind: "ALL" },
      channels: ["IN_APP"],
      status: "SENT",
      recipientsCount: liveUsers.length,
      readCount: Math.floor(liveUsers.length * 0.71),
      createdBy: adminRef(admins[0]),
      scheduledAt: null,
      sentAt: iso(ago(45)),
      createdAt: iso(ago(45)),
    },
    {
      id: "ntf_3",
      type: "ANNOUNCEMENT",
      title: "Samarqandda almashuv festivali",
      message: "Shu shanba Registon maydonida oflayn almashuv yarmarkasi bo'lib o'tadi.",
      target: { kind: "REGION", regionIds: ["reg_samarkand"] },
      channels: ["IN_APP"],
      status: "SCHEDULED",
      recipientsCount: users.filter((u) => u.regionId === "reg_samarkand").length,
      readCount: 0,
      createdBy: adminRef(admins[1]),
      scheduledAt: iso(NOW + 3 * DAY),
      sentAt: null,
      createdAt: iso(ago(1)),
    },
    {
      id: "ntf_4",
      type: "SYSTEM",
      title: "Texnik ishlar",
      message: "Bugun 02:00–03:00 oralig'ida ilova qisqa muddat ishlamasligi mumkin.",
      target: { kind: "ALL" },
      channels: ["IN_APP"],
      status: "SENT",
      recipientsCount: liveUsers.length,
      readCount: Math.floor(liveUsers.length * 0.4),
      createdBy: adminRef(admins[0]),
      scheduledAt: iso(ago(8)),
      sentAt: iso(ago(8)),
      createdAt: iso(ago(9)),
    },
    {
      id: "ntf_5",
      type: "ANNOUNCEMENT",
      title: "Birinchi e'loningizni joylang!",
      message: "Sizda keraksiz buyum bormi? Uni kerakli narsaga almashtiring — birinchi e'lon 2 daqiqa oladi.",
      target: { kind: "SEGMENT", segment: "NO_LISTINGS" },
      channels: ["IN_APP"],
      status: "DRAFT",
      recipientsCount: 0,
      readCount: 0,
      createdBy: adminRef(admins[6]),
      scheduledAt: null,
      sentAt: null,
      createdAt: iso(ago(0)),
    },
    {
      id: "ntf_6",
      type: "MODERATION",
      title: "E'loningiz qoidalarga mos emas",
      message: "Iltimos, e'lon rasmlarini yangilang.",
      target: { kind: "USERS", userIds: users.slice(10, 13).map((u) => u.id) },
      channels: ["IN_APP"],
      status: "SENT",
      recipientsCount: 3,
      readCount: 2,
      createdBy: adminRef(admins[2]),
      scheduledAt: null,
      sentAt: iso(ago(3)),
      createdAt: iso(ago(3)),
    },
  ];

  const settings: PlatformSettings = {
    general: {
      platformName: "Barter.uz",
      logoUrl: null,
      faviconUrl: null,
      defaultLanguage: "uz",
      supportedLanguages: ["uz", "ru", "en"],
      maintenanceMode: false,
      supportEmail: "support@barter.uz",
      supportPhone: "+998 71 200 00 00",
    },
    listings: {
      maxImages: 10,
      maxVideoSizeMb: 50,
      expirationDays: 60,
      requireModeration: true,
      autoPublishTrustedUsers: true,
      trustedUserMinExchanges: 5,
    },
    barter: {
      maxItemsPerOffer: 5,
      offerExpirationHours: 168,
      allowMultiItemBarter: true,
      allowOpenOffers: true,
      allowCashDifference: false,
    },
    moderation: {
      reportThreshold: 5,
      autoHideAfterThreshold: true,
      blockedKeywords: ["qurol", "oruzhie", "narkotik", "sotiladi", "продам", "for sale", "valyuta"],
    },
    security: {
      sessionTimeoutMinutes: 60,
      maxLoginAttempts: 5,
      requireTwoFactorForAdmins: false,
      allowedAdminIps: [],
    },
    notifications: {
      enableInApp: true,
      enablePush: false,
      enableEmail: false,
      enableSms: false,
      adminDigestEmail: true,
    },
    updatedAt: iso(ago(12)),
    updatedBy: adminRef(admins[0]),
  };

  const db: MockDb = {
    admins,
    users,
    regions,
    districts,
    categories,
    attributes,
    listings,
    barterRequests,
    exchanges,
    disputes,
    reviews,
    reports,
    moderationActions,
    notes,
    auditLogs,
    notifications,
    alerts: [],
    favorites,
    settings,
    sessions: new Map(),
    passwordResets: new Map(),
    userSessions: new Map(),
    otps: new Map(),
    uploads: new Map(),
    seq: {},
    listingsVersion: 0,
  };
  recomputeAggregates(db);
  db.alerts = buildAlerts(db);
  return db;
}

// ---------------------------------------------------------------------------
// Derived data
// ---------------------------------------------------------------------------

/** Recomputes denormalized counters (listing counts, ratings, risk level...). */
export function recomputeAggregates(db: MockDb): void {
  const listingCounts = new Map<ID, number>();
  const regionListings = new Map<ID, number>();
  const categoryListings = new Map<ID, number>();
  for (const l of db.listings) {
    if (l.deletedAt) continue;
    listingCounts.set(l.userId, (listingCounts.get(l.userId) ?? 0) + 1);
    regionListings.set(l.regionId, (regionListings.get(l.regionId) ?? 0) + 1);
    categoryListings.set(l.categoryId, (categoryListings.get(l.categoryId) ?? 0) + 1);
    if (l.subcategoryId) categoryListings.set(l.subcategoryId, (categoryListings.get(l.subcategoryId) ?? 0) + 1);
    l.reportsCount = 0;
  }
  const completed = new Map<ID, number>();
  for (const ex of db.exchanges) {
    if (ex.status !== "COMPLETED") continue;
    ex.participants.forEach((p) => completed.set(p.userId, (completed.get(p.userId) ?? 0) + 1));
  }
  const reportsAgainst = new Map<ID, number>();
  const reportsBy = new Map<ID, number>();
  const listingById = new Map(db.listings.map((l) => [l.id, l]));
  for (const r of db.reports) {
    reportsBy.set(r.reporterId, (reportsBy.get(r.reporterId) ?? 0) + 1);
    if (r.status === "REJECTED") continue;
    if (r.target.ownerId) reportsAgainst.set(r.target.ownerId, (reportsAgainst.get(r.target.ownerId) ?? 0) + 1);
    if (r.targetType === "LISTING") {
      const l = listingById.get(r.targetId);
      if (l) l.reportsCount += 1;
    }
  }
  const ratings = new Map<ID, number[]>();
  for (const rv of db.reviews) {
    if (rv.status !== "VISIBLE") continue;
    ratings.set(rv.targetUserId, [...(ratings.get(rv.targetUserId) ?? []), rv.rating]);
  }
  const rejected = new Map<ID, number>();
  for (const l of db.listings) if (l.rejectionCount > 0) rejected.set(l.userId, (rejected.get(l.userId) ?? 0) + l.rejectionCount);

  const threshold = db.settings?.moderation.reportThreshold ?? 5;
  const regionUsers = new Map<ID, number>();
  for (const u of db.users) {
    u.listingsCount = listingCounts.get(u.id) ?? 0;
    u.completedExchanges = completed.get(u.id) ?? 0;
    u.reportsCount = reportsAgainst.get(u.id) ?? 0;
    u.reportsSubmittedCount = reportsBy.get(u.id) ?? 0;
    const rs = ratings.get(u.id) ?? [];
    u.reviewsCount = rs.length;
    u.rating = rs.length ? Math.round((rs.reduce((s, x) => s + x, 0) / rs.length) * 10) / 10 : null;
    u.riskLevel =
      u.reportsCount >= threshold ? "HIGH_REPORTS" : u.reportsCount >= 2 || (rejected.get(u.id) ?? 0) >= 3 ? "NEEDS_REVIEW" : "LOW";
    if (u.status !== "DELETED") regionUsers.set(u.regionId, (regionUsers.get(u.regionId) ?? 0) + 1);
  }
  for (const r of db.regions) {
    r.listingsCount = regionListings.get(r.id) ?? 0;
    r.usersCount = regionUsers.get(r.id) ?? 0;
    r.districtsCount = db.districts.filter((d) => d.regionId === r.id).length;
  }
  for (const c of db.categories) c.listingsCount = categoryListings.get(c.id) ?? 0;
}

function buildAlerts(db: MockDb): AdminAlert[] {
  const alerts: AdminAlert[] = [];
  db.reports
    .filter((r) => r.status === "NEW")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)
    .forEach((r) => alerts.push({ id: `alr_${r.id}`, kind: "NEW_REPORT", title: `${r.code}: ${r.target.label}`, href: `/admin/reports/${r.id}`, read: false, createdAt: r.createdAt }));
  db.listings
    .filter((l) => l.status === "PENDING")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3)
    .forEach((l) => alerts.push({ id: `alr_${l.id}`, kind: "PENDING_LISTING", title: l.title, href: `/admin/listings/${l.id}`, read: false, createdAt: l.createdAt }));
  db.disputes
    .filter((d) => d.status === "OPEN")
    .slice(0, 2)
    .forEach((d) => alerts.push({ id: `alr_${d.id}`, kind: "DISPUTE_OPENED", title: d.against.fullName, href: `/admin/exchanges/${d.exchangeId}/dispute`, read: false, createdAt: d.createdAt }));
  db.users
    .filter((u) => u.riskLevel === "HIGH_REPORTS" && u.status === "ACTIVE")
    .slice(0, 2)
    .forEach((u) => alerts.push({ id: `alr_${u.id}`, kind: "SUSPICIOUS_ACCOUNT", title: u.fullName, href: `/admin/users/${u.id}`, read: true, createdAt: u.lastActiveAt ?? u.createdAt }));
  return alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------------------------------------------------------------------------
// Singleton (survives hot reload in dev)
// ---------------------------------------------------------------------------

const globalForDb = globalThis as unknown as { __barterMockDb?: MockDb };

export function getDb(): MockDb {
  if (!globalForDb.__barterMockDb) globalForDb.__barterMockDb = generate();
  return globalForDb.__barterMockDb;
}

export function nextId(db: MockDb, prefix: string): string {
  db.seq[prefix] = (db.seq[prefix] ?? 9000) + 1;
  return `${prefix}_${db.seq[prefix]}`;
}

// ---------------------------------------------------------------------------
// Presenters — resolve embedded references from live data at read time
// ---------------------------------------------------------------------------

export function userRefOf(db: MockDb, id: ID): UserRef {
  const u = db.users.find((x) => x.id === id);
  return u
    ? { id: u.id, fullName: u.fullName, avatar: u.avatar, phone: u.phone }
    : { id, fullName: "—", avatar: null, phone: "" };
}

export function listingRefOf(db: MockDb, id: ID): ListingRef {
  const l = db.listings.find((x) => x.id === id);
  if (!l) return { id, title: "—", image: null, condition: "GOOD", categoryId: "", ownerId: "", status: "ARCHIVED" };
  return {
    id: l.id,
    title: l.title,
    image: l.images[0]?.url ?? null,
    condition: l.condition,
    categoryId: l.subcategoryId ?? l.categoryId,
    ownerId: l.userId,
    status: l.status,
  };
}

export function adminRefOf(db: MockDb, id: ID): AdminRef {
  const a = db.admins.find((x) => x.id === id);
  return a
    ? { id: a.id, fullName: `${a.firstName} ${a.lastName}`, avatar: a.avatar, role: a.role }
    : { id, fullName: "—", avatar: null, role: "SUPPORT" };
}

/** Strips server-only fields from an admin record. */
export function presentAdmin(a: AdminRecord): Admin {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, failedLogins, ...rest } = a;
  return rest;
}

export function presentListing(db: MockDb, l: Listing): Listing {
  return { ...l, owner: userRefOf(db, l.userId) };
}

export function presentBarter(db: MockDb, b: BarterRequest): BarterRequest {
  return {
    ...b,
    sender: userRefOf(db, b.senderId),
    receiver: userRefOf(db, b.receiverId),
    items: b.items.map((it) => ({ ...it, listing: listingRefOf(db, it.listingId) })),
  };
}

export function presentExchange(db: MockDb, e: Exchange): Exchange {
  return {
    ...e,
    participants: e.participants.map((p) => ({
      ...p,
      user: userRefOf(db, p.userId),
      items: p.items.map((it) => listingRefOf(db, it.id)),
    })) as Exchange["participants"],
  };
}
