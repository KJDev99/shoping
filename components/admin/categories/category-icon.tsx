import {
  Armchair,
  Baby,
  Bike,
  BookOpen,
  Camera,
  Car,
  Dog,
  Drill,
  Dumbbell,
  Flower2,
  Footprints,
  Gamepad2,
  Gem,
  Gift,
  GraduationCap,
  Guitar,
  Hammer,
  Headphones,
  Home,
  Laptop,
  Monitor,
  Music,
  Package,
  Palette,
  PawPrint,
  Printer,
  Puzzle,
  Refrigerator,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sofa,
  Sparkles,
  Tablet,
  Tent,
  Trophy,
  Tv,
  UtensilsCrossed,
  Watch,
  WashingMachine,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Whitelist of lucide icons admins can assign to categories. Icons are stored
 * by name; anything not in this map (typo, removed icon) falls back to Package,
 * so rendering never depends on arbitrary strings from the API.
 */
export const CATEGORY_ICONS = {
  Smartphone,
  Laptop,
  Tablet,
  Monitor,
  Tv,
  Headphones,
  Camera,
  Watch,
  Gamepad2,
  Printer,
  Car,
  Bike,
  Sofa,
  Armchair,
  Home,
  Refrigerator,
  WashingMachine,
  UtensilsCrossed,
  Shirt,
  Footprints,
  ShoppingBag,
  Gem,
  Sparkles,
  Baby,
  Puzzle,
  Dumbbell,
  Tent,
  Trophy,
  BookOpen,
  GraduationCap,
  Music,
  Guitar,
  Palette,
  Wrench,
  Drill,
  Hammer,
  Flower2,
  Dog,
  PawPrint,
  Gift,
  Package,
} satisfies Record<string, LucideIcon>;

export type CategoryIconName = keyof typeof CATEGORY_ICONS;
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS) as CategoryIconName[];

export function isCategoryIconName(name: string | null | undefined): name is CategoryIconName {
  return !!name && Object.prototype.hasOwnProperty.call(CATEGORY_ICONS, name);
}

export function CategoryIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = isCategoryIconName(name) ? CATEGORY_ICONS[name] : Package;
  return <Icon aria-hidden className={cn("size-4", className)} />;
}
