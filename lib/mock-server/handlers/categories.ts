import "server-only";

import { nextId, type MockDb } from "@/lib/mock/db";
import {
  attributeReorderSchema,
  attributeSchema,
  categoryReorderSchema,
  categorySchema,
  categoryStatusSchema,
  hasOptions,
  hasUnit,
  type AttributeInput,
} from "@/schemas/category.schema";
import type { CategoryAttributeWithUsage } from "@/services/categories.service";
import type { Category, CategoryAttribute, CategoryNode } from "@/types";
import { audit, requirePermission, type AuthedContext } from "../context";
import { conflict, HttpError, notFound, ok, unprocessable, validate } from "../http";
import { route, type Route } from "../router";

const PERM = "categories.manage" as const;

function findCategory(db: MockDb, id: string): Category {
  const category = db.categories.find((c) => c.id === id);
  if (!category) throw notFound("Category not found");
  return category;
}

function findAttribute(db: MockDb, id: string): CategoryAttribute {
  const attribute = db.attributes.find((a) => a.id === id);
  if (!attribute) throw notFound("Attribute not found");
  return attribute;
}

const bySortOrder = (a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder;
const siblingsOf = (db: MockDb, parentId: string | null) => db.categories.filter((c) => c.parentId === parentId).sort(bySortOrder);
const attributesOf = (db: MockDb, categoryId: string) => db.attributes.filter((a) => a.categoryId === categoryId).sort(bySortOrder);

/** Rewrites sortOrder as 0..n-1 in the current order (keeps ordering compact after moves/deletes). */
function normalize<T extends { sortOrder: number }>(items: T[]) {
  [...items].sort(bySortOrder).forEach((item, i) => (item.sortOrder = i));
}

/** Listings (not deleted) using a category as main category or subcategory. */
function listingsUsingCategory(db: MockDb, id: string) {
  return db.listings.filter((l) => !l.deletedAt && (l.categoryId === id || l.subcategoryId === id)).length;
}

function usageCount(db: MockDb, attributeId: string) {
  return db.listings.filter((l) => !l.deletedAt && l.attributes[attributeId] !== undefined).length;
}

function presentAttribute(db: MockDb, a: CategoryAttribute): CategoryAttributeWithUsage {
  return { ...a, options: a.options.map((o) => ({ value: o.value, label: { ...o.label } })), usageCount: usageCount(db, a.id) };
}

function buildTree(db: MockDb): CategoryNode[] {
  return siblingsOf(db, null).map((parent) => ({ ...parent, children: siblingsOf(db, parent.id).map((c) => ({ ...c })) }));
}

/** Parent must exist and be top-level (the catalogue is limited to two levels). */
function assertValidParent(db: MockDb, parentId: string | null, selfId?: string) {
  if (!parentId) return;
  const parent = db.categories.find((c) => c.id === parentId);
  if (!parent) throw unprocessable({ parentId: ["categories.validation.parentMissing"] });
  if (parent.id === selfId) throw unprocessable({ parentId: ["categories.validation.parentSelf"] });
  if (parent.parentId !== null) throw unprocessable({ parentId: ["categories.validation.parentLevel"] });
}

function assertUniqueSlug(db: MockDb, slug: string, selfId?: string) {
  if (db.categories.some((c) => c.id !== selfId && c.slug === slug)) {
    throw new HttpError(409, `The slug "${slug}" is already used by another category`, "SLUG_TAKEN");
  }
}

function assertUniqueKey(db: MockDb, categoryId: string, key: string, selfId?: string) {
  if (db.attributes.some((a) => a.categoryId === categoryId && a.id !== selfId && a.key === key)) {
    throw new HttpError(409, `The key "${key}" already exists in this category`, "ATTRIBUTE_KEY_TAKEN");
  }
}

function snapshotCategory(c: Category): Record<string, unknown> {
  return { name: { ...c.name }, slug: c.slug, icon: c.icon, image: c.image, parentId: c.parentId, status: c.status, sortOrder: c.sortOrder };
}

function snapshotAttribute(a: CategoryAttribute): Record<string, unknown> {
  return {
    key: a.key,
    name: { ...a.name },
    type: a.type,
    required: a.required,
    options: a.options.map((o) => ({ value: o.value, label: { ...o.label } })),
    unit: a.unit,
    filterable: a.filterable,
    searchable: a.searchable,
    sortOrder: a.sortOrder,
  };
}

function normalizeAttributeInput(input: AttributeInput) {
  return {
    key: input.key,
    name: input.name,
    type: input.type,
    required: input.required,
    options: hasOptions(input.type) ? input.options.map((o) => ({ value: o.value.trim(), label: o.label })) : [],
    unit: hasUnit(input.type) && input.unit ? input.unit : null,
    filterable: input.filterable,
    searchable: input.searchable,
  };
}

const labelOf = (c: Pick<Category, "name">) => c.name.en || c.name.uz;

/** Checks that `orderedIds` is exactly a permutation of the current ids. */
function assertPermutation(current: string[], orderedIds: string[]) {
  const set = new Set(orderedIds);
  if (set.size !== orderedIds.length || orderedIds.length !== current.length || current.some((id) => !set.has(id))) {
    throw unprocessable({ orderedIds: ["categories.validation.reorderMismatch"] }, "The ordered ids must contain every sibling exactly once");
  }
}

function auditCategory(ctx: AuthedContext, action: string, c: Category, oldValue: Record<string, unknown> | null, newValue: Record<string, unknown> | null) {
  audit(ctx, { action: `category.${action}`, entityType: "CATEGORY", entityId: c.id, entityLabel: labelOf(c), oldValue, newValue });
}

function auditAttribute(ctx: AuthedContext, action: string, a: CategoryAttribute, oldValue: Record<string, unknown> | null, newValue: Record<string, unknown> | null) {
  const category = ctx.db.categories.find((c) => c.id === a.categoryId);
  audit(ctx, {
    action: `attribute.${action}`,
    entityType: "ATTRIBUTE",
    entityId: a.id,
    entityLabel: `${category ? labelOf(category) : a.categoryId} → ${a.name.en || a.key}`,
    oldValue,
    newValue,
  });
}

export const categoryRoutes: Route[] = [
  // ----- Categories -----

  route("GET", "/categories/tree", (ctx) => {
    requirePermission(ctx, PERM);
    return ok(buildTree(ctx.db));
  }),

  route("GET", "/categories/:id", (ctx) => {
    requirePermission(ctx, PERM);
    return ok(findCategory(ctx.db, ctx.params.id));
  }),

  route("POST", "/categories", (ctx) => {
    requirePermission(ctx, PERM);
    const input = validate(categorySchema, ctx.body);
    assertValidParent(ctx.db, input.parentId);
    assertUniqueSlug(ctx.db, input.slug);
    const siblings = siblingsOf(ctx.db, input.parentId);
    const now = new Date().toISOString();
    const category: Category = {
      id: nextId(ctx.db, "cat"),
      parentId: input.parentId,
      name: input.name,
      slug: input.slug,
      icon: input.icon || null,
      image: input.image || null,
      status: input.status,
      sortOrder: siblings.length ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0,
      listingsCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    ctx.db.categories.push(category);
    auditCategory(ctx, "create", category, null, snapshotCategory(category));
    return ok(category, "Category created");
  }),

  route("PATCH", "/categories/:id", (ctx) => {
    requirePermission(ctx, PERM);
    const category = findCategory(ctx.db, ctx.params.id);
    const input = validate(categorySchema, ctx.body);
    assertUniqueSlug(ctx.db, input.slug, category.id);
    const old = snapshotCategory(category);
    const moving = input.parentId !== category.parentId;
    if (moving) {
      assertValidParent(ctx.db, input.parentId, category.id);
      if (input.parentId && ctx.db.categories.some((c) => c.parentId === category.id)) {
        throw unprocessable({ parentId: ["categories.validation.hasChildrenCannotNest"] });
      }
      if (listingsUsingCategory(ctx.db, category.id) > 0) {
        throw conflict("This category has listings, so it can't be moved to another parent. Create a new category instead.");
      }
    }
    const oldParent = category.parentId;
    Object.assign(category, {
      name: input.name,
      slug: input.slug,
      icon: input.icon || null,
      image: input.image || null,
      status: input.status,
      updatedAt: new Date().toISOString(),
    });
    if (moving) {
      const newSiblings = siblingsOf(ctx.db, input.parentId);
      category.parentId = input.parentId;
      category.sortOrder = newSiblings.length ? Math.max(...newSiblings.map((s) => s.sortOrder)) + 1 : 0;
      normalize(siblingsOf(ctx.db, oldParent));
    }
    auditCategory(ctx, "update", category, old, snapshotCategory(category));
    return ok(category, "Category updated");
  }),

  route("POST", "/categories/:id/status", (ctx) => {
    requirePermission(ctx, PERM);
    const category = findCategory(ctx.db, ctx.params.id);
    const { status } = validate(categoryStatusSchema, ctx.body);
    if (category.status === status) throw conflict(`Category is already ${status.toLowerCase()}`);
    const old = { status: category.status };
    category.status = status;
    category.updatedAt = new Date().toISOString();
    auditCategory(ctx, status === "ACTIVE" ? "enable" : "disable", category, old, { status });
    return ok(category, status === "ACTIVE" ? "Category enabled" : "Category disabled");
  }),

  route("DELETE", "/categories/:id", (ctx) => {
    requirePermission(ctx, PERM);
    const category = findCategory(ctx.db, ctx.params.id);
    const children = ctx.db.categories.filter((c) => c.parentId === category.id).length;
    if (children > 0) {
      throw conflict(`This category has ${children} subcategories. Delete or move them first, or disable the category instead.`);
    }
    const used = Math.max(listingsUsingCategory(ctx.db, category.id), category.listingsCount);
    if (used > 0) {
      throw conflict(`This category is used by ${used} listings and can't be deleted. Disable it instead to hide it from the apps.`);
    }
    const old = snapshotCategory(category);
    const removedAttributes = ctx.db.attributes.filter((a) => a.categoryId === category.id);
    ctx.db.attributes = ctx.db.attributes.filter((a) => a.categoryId !== category.id);
    ctx.db.categories = ctx.db.categories.filter((c) => c.id !== category.id);
    // Drop dangling references from exchange preferences ("wants").
    for (const l of ctx.db.listings) {
      const prefs = l.exchangePreferences;
      if (prefs.categories.includes(category.id) || prefs.subcategories.includes(category.id)) {
        prefs.categories = prefs.categories.filter((id) => id !== category.id);
        prefs.subcategories = prefs.subcategories.filter((id) => id !== category.id);
      }
    }
    ctx.db.listingsVersion++;
    normalize(siblingsOf(ctx.db, category.parentId));
    auditCategory(ctx, "delete", category, { ...old, attributes: removedAttributes.map((a) => a.key) }, null);
    return ok(null, "Category deleted");
  }),

  route("POST", "/categories/reorder", (ctx) => {
    requirePermission(ctx, PERM);
    const { parentId, orderedIds } = validate(categoryReorderSchema, ctx.body);
    if (parentId) findCategory(ctx.db, parentId);
    const siblings = siblingsOf(ctx.db, parentId);
    assertPermutation(
      siblings.map((s) => s.id),
      orderedIds,
    );
    const oldOrder = siblings.map((s) => s.slug);
    const byId = new Map(siblings.map((s) => [s.id, s]));
    orderedIds.forEach((id, i) => (byId.get(id)!.sortOrder = i));
    const parent = parentId ? findCategory(ctx.db, parentId) : null;
    audit(ctx, {
      action: "category.reorder",
      entityType: "CATEGORY",
      entityId: parentId,
      entityLabel: parent ? labelOf(parent) : "Top-level categories",
      oldValue: { order: oldOrder },
      newValue: { order: orderedIds.map((id) => byId.get(id)!.slug) },
    });
    return ok(siblingsOf(ctx.db, parentId), "Order saved");
  }),

  // ----- Attributes -----

  route("GET", "/categories/:id/attributes", (ctx) => {
    requirePermission(ctx, PERM);
    const category = findCategory(ctx.db, ctx.params.id);
    return ok(attributesOf(ctx.db, category.id).map((a) => presentAttribute(ctx.db, a)));
  }),

  route("POST", "/categories/:id/attributes", (ctx) => {
    requirePermission(ctx, PERM);
    const category = findCategory(ctx.db, ctx.params.id);
    const input = normalizeAttributeInput(validate(attributeSchema, ctx.body));
    assertUniqueKey(ctx.db, category.id, input.key);
    const existing = attributesOf(ctx.db, category.id);
    const attribute: CategoryAttribute = {
      id: nextId(ctx.db, "attr"),
      categoryId: category.id,
      ...input,
      sortOrder: existing.length ? Math.max(...existing.map((a) => a.sortOrder)) + 1 : 0,
    };
    ctx.db.attributes.push(attribute);
    auditAttribute(ctx, "create", attribute, null, snapshotAttribute(attribute));
    return ok(presentAttribute(ctx.db, attribute), "Attribute created");
  }),

  route("PATCH", "/attributes/:id", (ctx) => {
    requirePermission(ctx, PERM);
    const attribute = findAttribute(ctx.db, ctx.params.id);
    const input = normalizeAttributeInput(validate(attributeSchema, ctx.body));
    assertUniqueKey(ctx.db, attribute.categoryId, input.key, attribute.id);
    const used = usageCount(ctx.db, attribute.id);
    if (used > 0 && input.type !== attribute.type) {
      throw conflict(`This attribute already has values in ${used} listings, so its type can't be changed. Create a new attribute instead.`);
    }
    const old = snapshotAttribute(attribute);
    Object.assign(attribute, input);
    auditAttribute(ctx, "update", attribute, old, snapshotAttribute(attribute));
    return ok(presentAttribute(ctx.db, attribute), "Attribute updated");
  }),

  route("DELETE", "/attributes/:id", (ctx) => {
    requirePermission(ctx, PERM);
    const attribute = findAttribute(ctx.db, ctx.params.id);
    const old = snapshotAttribute(attribute);
    let cleared = 0;
    for (const l of ctx.db.listings) {
      if (l.attributes[attribute.id] !== undefined) {
        delete l.attributes[attribute.id];
        cleared++;
      }
    }
    if (cleared) ctx.db.listingsVersion++;
    ctx.db.attributes = ctx.db.attributes.filter((a) => a.id !== attribute.id);
    normalize(attributesOf(ctx.db, attribute.categoryId));
    auditAttribute(ctx, "delete", attribute, { ...old, listingValuesRemoved: cleared }, null);
    return ok(null, "Attribute deleted");
  }),

  route("POST", "/categories/:id/attributes/reorder", (ctx) => {
    requirePermission(ctx, PERM);
    const category = findCategory(ctx.db, ctx.params.id);
    const { orderedIds } = validate(attributeReorderSchema, ctx.body);
    const current = attributesOf(ctx.db, category.id);
    assertPermutation(
      current.map((a) => a.id),
      orderedIds,
    );
    const byId = new Map(current.map((a) => [a.id, a]));
    const oldOrder = current.map((a) => a.key);
    orderedIds.forEach((id, i) => (byId.get(id)!.sortOrder = i));
    audit(ctx, {
      action: "attribute.reorder",
      entityType: "ATTRIBUTE",
      entityId: category.id,
      entityLabel: labelOf(category),
      oldValue: { order: oldOrder },
      newValue: { order: orderedIds.map((id) => byId.get(id)!.key) },
    });
    return ok(attributesOf(ctx.db, category.id).map((a) => presentAttribute(ctx.db, a)), "Order saved");
  }),
];
