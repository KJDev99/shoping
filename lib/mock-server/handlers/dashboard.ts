import "server-only";

import { presentBarter, presentListing, type MockDb } from "@/lib/mock/db";
import type {
  BarterInsights,
  CategoryStat,
  DashboardCharts,
  DashboardOverview,
  ID,
  ISODate,
  RegionStat,
  TimeSeriesPoint,
} from "@/types";
import { requirePermission } from "../context";
import { badRequest, ok } from "../http";
import { route } from "../router";

const DAY = 86_400_000;
const DEFAULT_RANGE_DAYS = 30;
/** Ranges longer than this are bucketed by week instead of by day. */
const WEEKLY_THRESHOLD_DAYS = 90;
const MAX_RANGE_DAYS = 366 * 3;

interface Period {
  start: number;
  end: number;
}

interface Range {
  current: Period;
  previous: Period;
  from: string;
  to: string;
  days: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toDateParam = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses `from`/`to` (YYYY-MM-DD, inclusive, local time) with a 30-day default, plus the previous equal-length period. */
function parseRange(url: URL): Range {
  const sp = url.searchParams;
  const today = new Date();
  const toStr = sp.get("to") || toDateParam(today);
  const fromDefault = new Date(today);
  fromDefault.setDate(fromDefault.getDate() - (DEFAULT_RANGE_DAYS - 1));
  const fromStr = sp.get("from") || toDateParam(fromDefault);
  if (!DATE_RE.test(fromStr) || !DATE_RE.test(toStr)) throw badRequest("Invalid date range");
  const start = new Date(`${fromStr}T00:00:00`).getTime();
  const end = new Date(`${toStr}T23:59:59.999`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) throw badRequest("Invalid date range");
  const days = Math.round((end + 1 - start) / DAY);
  if (days > MAX_RANGE_DAYS) throw badRequest("Date range is too long");
  const length = end + 1 - start;
  return { current: { start, end }, previous: { start: start - length, end: start - 1 }, from: fromStr, to: toStr, days };
}

const inPeriod = (iso: ISODate | null | undefined, p: Period) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= p.start && t <= p.end;
};
const before = (iso: ISODate | null | undefined, t: number) => !!iso && new Date(iso).getTime() <= t;

/** Fractional change; undefined when there is no baseline to compare against. */
function delta(current: number, previous: number): number | undefined {
  if (previous === 0) return current === 0 ? 0 : undefined;
  return Math.round(((current - previous) / previous) * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

/** Users who did anything observable in the period (listed, offered, responded, exchanged, reported, logged in). */
function activeUserIds(db: MockDb, p: Period): Set<ID> {
  const ids = new Set<ID>();
  for (const u of db.users) if (u.status !== "DELETED" && inPeriod(u.lastActiveAt, p)) ids.add(u.id);
  for (const l of db.listings) if (inPeriod(l.createdAt, p)) ids.add(l.userId);
  for (const b of db.barterRequests) {
    if (inPeriod(b.createdAt, p)) ids.add(b.senderId);
    if (inPeriod(b.respondedAt, p)) ids.add(b.receiverId);
  }
  for (const e of db.exchanges) if (e.status === "COMPLETED" && inPeriod(e.completedAt, p)) e.participants.forEach((pt) => ids.add(pt.userId));
  for (const r of db.reports) if (inPeriod(r.createdAt, p)) ids.add(r.reporterId);
  return ids;
}

/**
 * Status snapshot counts (active/pending/rejected listings, open requests, blocked users) are "now",
 * limited to records created before the end of the range. Their deltas compare the cohort created
 * within the period against the cohort created in the previous period, so the trend reflects inflow.
 */
function computeOverview(db: MockDb, r: Range): DashboardOverview {
  const { current: cur, previous: prev } = r;
  const users = db.users.filter((u) => u.status !== "DELETED");
  const listings = db.listings.filter((l) => !l.deletedAt);

  const count = <T,>(items: T[], pred: (x: T) => boolean) => items.reduce((n, x) => n + (pred(x) ? 1 : 0), 0);
  const cohort = <T extends { createdAt: ISODate }>(items: T[], pred: (x: T) => boolean) => ({
    now: count(items, (x) => before(x.createdAt, cur.end) && pred(x)),
    cur: count(items, (x) => inPeriod(x.createdAt, cur) && pred(x)),
    prev: count(items, (x) => inPeriod(x.createdAt, prev) && pred(x)),
  });

  const totalUsersNow = count(users, (u) => before(u.createdAt, cur.end));
  const totalUsersPrev = count(users, (u) => before(u.createdAt, prev.end));
  const totalListingsNow = count(listings, (l) => before(l.createdAt, cur.end));
  const totalListingsPrev = count(listings, (l) => before(l.createdAt, prev.end));
  const newUsers = cohort(users, () => true);
  const active = { cur: activeUserIds(db, cur).size, prev: activeUserIds(db, prev).size };
  const activeListings = cohort(listings, (l) => l.status === "ACTIVE");
  const pendingListings = cohort(listings, (l) => l.status === "PENDING");
  const rejectedListings = cohort(listings, (l) => l.status === "REJECTED");
  const openRequests = cohort(db.barterRequests, (b) => b.status === "PENDING" || b.status === "ACCEPTED");
  const blocked = cohort(db.users, (u) => u.status === "BLOCKED");
  const completed = {
    cur: count(db.exchanges, (e) => e.status === "COMPLETED" && inPeriod(e.completedAt, cur)),
    prev: count(db.exchanges, (e) => e.status === "COMPLETED" && inPeriod(e.completedAt, prev)),
  };
  const reports = { cur: count(db.reports, (x) => inPeriod(x.createdAt, cur)), prev: count(db.reports, (x) => inPeriod(x.createdAt, prev)) };

  const deltas: DashboardOverview["deltas"] = {};
  const setDelta = (k: keyof DashboardOverview["deltas"], c: number, p: number) => {
    const d = delta(c, p);
    if (d !== undefined) deltas[k] = d;
  };
  setDelta("totalUsers", totalUsersNow, totalUsersPrev);
  setDelta("activeUsers", active.cur, active.prev);
  setDelta("newUsers", newUsers.cur, newUsers.prev);
  setDelta("totalListings", totalListingsNow, totalListingsPrev);
  setDelta("activeListings", activeListings.cur, activeListings.prev);
  setDelta("pendingListings", pendingListings.cur, pendingListings.prev);
  setDelta("rejectedListings", rejectedListings.cur, rejectedListings.prev);
  setDelta("completedExchanges", completed.cur, completed.prev);
  setDelta("openBarterRequests", openRequests.cur, openRequests.prev);
  setDelta("reports", reports.cur, reports.prev);
  setDelta("blockedUsers", blocked.cur, blocked.prev);

  return {
    totalUsers: totalUsersNow,
    activeUsers: active.cur,
    newUsers: newUsers.cur,
    totalListings: totalListingsNow,
    activeListings: activeListings.now,
    pendingListings: pendingListings.now,
    rejectedListings: rejectedListings.now,
    completedExchanges: completed.cur,
    openBarterRequests: openRequests.now,
    reports: reports.cur,
    blockedUsers: blocked.now,
    deltas,
  };
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

function buildSeries(r: Range, weekly: boolean, dates: (ISODate | null | undefined)[]): TimeSeriesPoint[] {
  const starts: number[] = [];
  const cursor = new Date(r.current.start);
  while (cursor.getTime() <= r.current.end) {
    starts.push(cursor.getTime());
    cursor.setDate(cursor.getDate() + (weekly ? 7 : 1));
  }
  const counts = new Array<number>(starts.length).fill(0);
  for (const iso of dates) {
    if (!inPeriod(iso, r.current)) continue;
    const t = new Date(iso!).getTime();
    // Binary search for the last bucket start <= t.
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= t) lo = mid;
      else hi = mid - 1;
    }
    counts[lo] += 1;
  }
  return starts.map((s, i) => ({ date: toDateParam(new Date(s)), value: counts[i] }));
}

function computeCharts(db: MockDb, r: Range): DashboardCharts & { bucket: "day" | "week" } {
  const weekly = r.days > WEEKLY_THRESHOLD_DAYS;
  return {
    bucket: weekly ? "week" : "day",
    registrations: buildSeries(r, weekly, db.users.map((u) => u.createdAt)),
    listings: buildSeries(r, weekly, db.listings.filter((l) => !l.deletedAt).map((l) => l.createdAt)),
    exchanges: buildSeries(r, weekly, db.exchanges.filter((e) => e.status === "COMPLETED").map((e) => e.completedAt)),
    barterRequests: buildSeries(r, weekly, db.barterRequests.map((b) => b.createdAt)),
    reports: buildSeries(r, weekly, db.reports.map((x) => x.createdAt)),
  };
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

const TOP_N = 6;

function computeInsights(db: MockDb, r: Range): BarterInsights {
  const p = r.current;
  const listingById = new Map(db.listings.map((l) => [l.id, l]));
  const categoryById = new Map(db.categories.map((c) => [c.id, c]));
  const regionById = new Map(db.regions.map((x) => [x.id, x]));
  /** Top-level category of a listing. */
  const rootCategory = (id: ID) => {
    const l = listingById.get(id);
    if (!l) return null;
    let c = categoryById.get(l.categoryId);
    while (c?.parentId) c = categoryById.get(c.parentId);
    return c?.id ?? l.categoryId;
  };
  const top = (m: Map<ID, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N);
  const bump = (m: Map<ID, number>, k: ID | null, by = 1) => {
    if (k) m.set(k, (m.get(k) ?? 0) + by);
  };

  const activeListings = db.listings.filter((l) => l.status === "ACTIVE" && !l.deletedAt);
  const offers = db.barterRequests.filter((b) => inPeriod(b.createdAt, p));
  const accepted = offers.filter((b) => b.status === "ACCEPTED" || b.status === "COMPLETED").length;
  const declined = offers.filter((b) => b.status === "DECLINED").length;
  const completed = db.exchanges.filter((e) => e.status === "COMPLETED" && inPeriod(e.completedAt, p));

  const requestedEver = new Set(db.barterRequests.flatMap((b) => b.requestedListingIds));
  const offersReceivedInPeriod = offers.reduce((n, b) => n + b.requestedListingIds.length, 0);
  const reportedListings = new Set(db.reports.filter((x) => x.targetType === "LISTING" && inPeriod(x.createdAt, p)).map((x) => x.targetId));

  // Activity per category: listings created + listings involved in offers during the period.
  const catActivity = new Map<ID, number>();
  db.listings.filter((l) => !l.deletedAt && inPeriod(l.createdAt, p)).forEach((l) => bump(catActivity, rootCategory(l.id)));
  offers.forEach((b) => [...b.offeredListingIds, ...b.requestedListingIds].forEach((id) => bump(catActivity, rootCategory(id))));

  const catExchanged = new Map<ID, number>();
  completed.forEach((e) => e.participants.forEach((pt) => pt.items.forEach((it) => bump(catExchanged, rootCategory(it.id)))));

  // Activity per region: listings created + offers sent by users of that region.
  const userRegion = new Map(db.users.map((u) => [u.id, u.regionId]));
  const regionActivity = new Map<ID, number>();
  db.listings.filter((l) => !l.deletedAt && inPeriod(l.createdAt, p)).forEach((l) => bump(regionActivity, l.regionId));
  offers.forEach((b) => bump(regionActivity, userRegion.get(b.senderId) ?? null));

  const catStat = ([id, value]: [ID, number]): CategoryStat => ({ categoryId: id, name: categoryById.get(id)?.name.en ?? id, value });
  const regionStat = ([id, value]: [ID, number]): RegionStat => ({ regionId: id, name: regionById.get(id)?.name.en ?? id, value });

  return {
    activeListings: activeListings.length,
    offersSent: offers.length,
    acceptanceRate: accepted + declined > 0 ? Math.round((accepted / (accepted + declined)) * 1000) / 1000 : 0,
    completedExchanges: completed.length,
    avgOffersPerListing: activeListings.length ? Math.round((offersReceivedInPeriod / activeListings.length) * 100) / 100 : 0,
    listingsWithoutOffers: activeListings.filter((l) => !requestedEver.has(l.id)).length,
    reportedListings: reportedListings.size,
    blockedListings: db.listings.filter((l) => l.status === "BLOCKED" && !l.deletedAt).length,
    mostActiveCategories: top(catActivity).map(catStat),
    mostExchangedCategories: top(catExchanged).map(catStat),
    mostActiveRegions: top(regionActivity).map(regionStat),
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const RECENT = 5;
const newest = <T extends { createdAt: ISODate }>(items: T[]) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, RECENT);

export const dashboardRoutes = [
  route("GET", "/dashboard/overview", (ctx) => {
    requirePermission(ctx, "dashboard.read");
    return ok(computeOverview(ctx.db, parseRange(ctx.url)));
  }),

  route("GET", "/dashboard/charts", (ctx) => {
    requirePermission(ctx, "dashboard.read");
    return ok(computeCharts(ctx.db, parseRange(ctx.url)));
  }),

  route("GET", "/dashboard/insights", (ctx) => {
    requirePermission(ctx, "dashboard.read");
    return ok(computeInsights(ctx.db, parseRange(ctx.url)));
  }),

  route("GET", "/dashboard/recent", (ctx) => {
    requirePermission(ctx, "dashboard.read");
    const db = ctx.db;
    return ok({
      users: newest(db.users.filter((u) => u.status !== "DELETED")),
      listings: newest(db.listings.filter((l) => !l.deletedAt)).map((l) => presentListing(db, l)),
      barterRequests: newest(db.barterRequests).map((b) => presentBarter(db, b)),
      reports: newest(db.reports),
    });
  }),
];
