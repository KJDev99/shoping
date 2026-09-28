import "server-only";

import { nextId, type MockDb } from "@/lib/mock/db";
import { slugify } from "@/schemas/category.schema";
import { districtSchema, districtUpdateSchema, regionSchema, regionUpdateSchema } from "@/schemas/location.schema";
import type { DistrictWithStats } from "@/services/locations.service";
import type { District, Locale, Region } from "@/types";
import { audit, requirePermission } from "../context";
import { conflict, csv, matchesSearch, notFound, ok, paginate, parseListParams, sortItems, validate } from "../http";
import { route, type Route } from "../router";

const PERM = "locations.manage" as const;
const LOCALES: readonly Locale[] = ["uz", "ru", "en"];

function findRegion(db: MockDb, id: string): Region {
  const region = db.regions.find((r) => r.id === id);
  if (!region) throw notFound("Region not found");
  return region;
}

function findDistrict(db: MockDb, id: string): District {
  const district = db.districts.find((d) => d.id === id);
  if (!district) throw notFound("District not found");
  return district;
}

function presentDistrict(db: MockDb, d: District): DistrictWithStats {
  return {
    ...d,
    usersCount: db.users.filter((u) => u.status !== "DELETED" && u.districtId === d.id).length,
    listingsCount: db.listings.filter((l) => !l.deletedAt && l.districtId === d.id).length,
  };
}

function refreshDistrictCount(db: MockDb, regionId: string) {
  const region = db.regions.find((r) => r.id === regionId);
  if (region) region.districtsCount = db.districts.filter((d) => d.regionId === regionId).length;
}

function uniqueSlug(db: MockDb, base: string) {
  const root = base || "region";
  let slug = root;
  for (let i = 2; db.regions.some((r) => r.slug === slug); i++) slug = `${root}-${i}`;
  return slug;
}

function assertUniqueRegionName(db: MockDb, name: Region["name"], selfId?: string) {
  const norm = (s: string) => s.trim().toLowerCase();
  const clash = db.regions.find((r) => r.id !== selfId && LOCALES.some((l) => norm(r.name[l]) === norm(name[l])));
  if (clash) throw conflict(`A region named "${clash.name.en}" already exists`);
}

function assertUniqueDistrictName(db: MockDb, regionId: string, name: District["name"], selfId?: string) {
  const norm = (s: string) => s.trim().toLowerCase();
  const clash = db.districts.find(
    (d) => d.regionId === regionId && d.id !== selfId && LOCALES.some((l) => norm(d.name[l]) === norm(name[l])),
  );
  if (clash) throw conflict(`A district named "${clash.name.en}" already exists in this region`);
}

const snapshotRegion = (r: Region) => ({ name: { ...r.name }, enabled: r.enabled });
const snapshotDistrict = (d: District) => ({ name: { ...d.name }, type: d.type, enabled: d.enabled });

export const locationRoutes: Route[] = [
  // ----- Regions -----

  route("GET", "/regions", (ctx) => {
    requirePermission(ctx, PERM);
    const p = parseListParams(ctx.url, { sort: "sortOrder", order: "asc", limit: 50 });
    const locale: Locale = LOCALES.includes(p.filters.locale as Locale) ? (p.filters.locale as Locale) : "uz";
    const enabled = csv(p.filters.enabled);
    let items = ctx.db.regions.filter(
      (r) =>
        (!enabled.length || enabled.includes(String(r.enabled))) &&
        matchesSearch(p.search, r.name.uz, r.name.ru, r.name.en, r.slug, r.id),
    );
    items = sortItems(items, p.sort, p.order, {
      sortOrder: (r) => r.sortOrder,
      name: (r) => r.name[locale],
      districtsCount: (r) => r.districtsCount,
      usersCount: (r) => r.usersCount,
      listingsCount: (r) => r.listingsCount,
    });
    return paginate(items, p);
  }),

  route("GET", "/regions/:id", (ctx) => {
    requirePermission(ctx, PERM);
    return ok(findRegion(ctx.db, ctx.params.id));
  }),

  route("POST", "/regions", (ctx) => {
    requirePermission(ctx, PERM);
    const input = validate(regionSchema, ctx.body);
    assertUniqueRegionName(ctx.db, input.name);
    const region: Region = {
      id: nextId(ctx.db, "reg"),
      countryId: "uz",
      name: input.name,
      slug: uniqueSlug(ctx.db, slugify(input.name.uz || input.name.en)),
      enabled: input.enabled,
      sortOrder: ctx.db.regions.length ? Math.max(...ctx.db.regions.map((r) => r.sortOrder)) + 1 : 0,
      districtsCount: 0,
      listingsCount: 0,
      usersCount: 0,
    };
    ctx.db.regions.push(region);
    audit(ctx, { action: "region.create", entityType: "REGION", entityId: region.id, entityLabel: region.name.en, newValue: snapshotRegion(region) });
    return ok(region, "Region created");
  }),

  route("PATCH", "/regions/:id", (ctx) => {
    requirePermission(ctx, PERM);
    const region = findRegion(ctx.db, ctx.params.id);
    const input = validate(regionUpdateSchema, ctx.body);
    if (input.name) assertUniqueRegionName(ctx.db, input.name, region.id);
    const old = snapshotRegion(region);
    if (input.name) region.name = input.name;
    if (input.enabled !== undefined) region.enabled = input.enabled;
    const action = input.name === undefined && input.enabled !== undefined ? (input.enabled ? "region.enable" : "region.disable") : "region.update";
    audit(ctx, { action, entityType: "REGION", entityId: region.id, entityLabel: region.name.en, oldValue: old, newValue: snapshotRegion(region) });
    return ok(region, "Region updated");
  }),

  // ----- Districts -----

  route("GET", "/regions/:id/districts", (ctx) => {
    requirePermission(ctx, PERM);
    const region = findRegion(ctx.db, ctx.params.id);
    const search = ctx.url.searchParams.get("search")?.trim() || undefined;
    const items = ctx.db.districts
      .filter((d) => d.regionId === region.id && matchesSearch(search, d.name.uz, d.name.ru, d.name.en))
      .map((d) => presentDistrict(ctx.db, d));
    return ok(items);
  }),

  route("POST", "/regions/:id/districts", (ctx) => {
    requirePermission(ctx, PERM);
    const region = findRegion(ctx.db, ctx.params.id);
    const input = validate(districtSchema, ctx.body);
    assertUniqueDistrictName(ctx.db, region.id, input.name);
    const district: District = { id: nextId(ctx.db, "dst"), regionId: region.id, ...input };
    ctx.db.districts.push(district);
    refreshDistrictCount(ctx.db, region.id);
    audit(ctx, {
      action: "district.create",
      entityType: "DISTRICT",
      entityId: district.id,
      entityLabel: `${region.name.en} → ${district.name.en}`,
      newValue: snapshotDistrict(district),
    });
    return ok(presentDistrict(ctx.db, district), "District created");
  }),

  route("PATCH", "/districts/:id", (ctx) => {
    requirePermission(ctx, PERM);
    const district = findDistrict(ctx.db, ctx.params.id);
    const input = validate(districtUpdateSchema, ctx.body);
    if (input.name) assertUniqueDistrictName(ctx.db, district.regionId, input.name, district.id);
    const old = snapshotDistrict(district);
    if (input.name) district.name = input.name;
    if (input.type) district.type = input.type;
    if (input.enabled !== undefined) district.enabled = input.enabled;
    const onlyToggle = input.name === undefined && input.type === undefined && input.enabled !== undefined;
    const region = ctx.db.regions.find((r) => r.id === district.regionId);
    audit(ctx, {
      action: onlyToggle ? (input.enabled ? "district.enable" : "district.disable") : "district.update",
      entityType: "DISTRICT",
      entityId: district.id,
      entityLabel: `${region?.name.en ?? district.regionId} → ${district.name.en}`,
      oldValue: old,
      newValue: snapshotDistrict(district),
    });
    return ok(presentDistrict(ctx.db, district), "District updated");
  }),

  route("DELETE", "/districts/:id", (ctx) => {
    requirePermission(ctx, PERM);
    const district = findDistrict(ctx.db, ctx.params.id);
    const users = ctx.db.users.filter((u) => u.districtId === district.id).length;
    const listings = ctx.db.listings.filter((l) => l.districtId === district.id).length;
    if (users || listings) {
      throw conflict(
        `This district is used by ${users} users and ${listings} listings, so it can't be deleted. Disable it instead to hide it from new listings.`,
      );
    }
    ctx.db.districts = ctx.db.districts.filter((d) => d.id !== district.id);
    refreshDistrictCount(ctx.db, district.regionId);
    const region = ctx.db.regions.find((r) => r.id === district.regionId);
    audit(ctx, {
      action: "district.delete",
      entityType: "DISTRICT",
      entityId: district.id,
      entityLabel: `${region?.name.en ?? district.regionId} → ${district.name.en}`,
      oldValue: snapshotDistrict(district),
    });
    return ok(null, "District deleted");
  }),
];
