import type { ID, TranslatedText, Timestamps } from "./common";

export const CATEGORY_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export const ATTRIBUTE_TYPES = ["TEXT", "NUMBER", "SELECT", "MULTI_SELECT", "BOOLEAN"] as const;
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

export interface AttributeOption {
  value: string;
  label: TranslatedText;
}

export interface CategoryAttribute {
  id: ID;
  categoryId: ID;
  key: string;
  name: TranslatedText;
  type: AttributeType;
  required: boolean;
  options: AttributeOption[];
  unit: string | null;
  filterable: boolean;
  searchable: boolean;
  sortOrder: number;
}

export interface Category extends Timestamps {
  id: ID;
  parentId: ID | null;
  name: TranslatedText;
  slug: string;
  /** Lucide icon name, e.g. "Smartphone". */
  icon: string | null;
  image: string | null;
  status: CategoryStatus;
  sortOrder: number;
  listingsCount: number;
}

/** Category with its subcategories nested, as returned by the tree endpoint. */
export interface CategoryNode extends Category {
  children: Category[];
}
