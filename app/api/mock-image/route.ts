import type { NextRequest } from "next/server";

/**
 * Generates deterministic SVG placeholder images for mock listings and avatars,
 * so the demo works fully offline. Real listings use uploaded media URLs.
 */
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

const CATEGORY_HUES: Record<string, number> = {
  cat_phones: 215, cat_laptops: 225, cat_tablets: 205, cat_audio: 265, cat_consoles: 250, cat_cameras: 195, cat_smartwatches: 235, cat_electronics: 215,
  cat_cars: 10, cat_motorcycles: 20, cat_bicycles: 150, cat_vehicles: 10,
  cat_furniture: 30, cat_appliances: 190, cat_home: 35,
  cat_mens: 205, cat_womens: 330, cat_shoes: 25, cat_fashion: 330,
  cat_fitness: 140, cat_outdoor: 120, cat_sports: 140,
  cat_fiction: 45, cat_education: 55, cat_books: 45,
  cat_hand_tools: 38, cat_power_tools: 28, cat_tools: 38, cat_other: 280,
};

const CATEGORY_PICTOGRAMS: Record<string, string> = {
  cat_phones: "📱", cat_laptops: "💻", cat_tablets: "📲", cat_audio: "🎧", cat_consoles: "🎮", cat_cameras: "📷", cat_smartwatches: "⌚", cat_electronics: "🔌",
  cat_cars: "🚗", cat_motorcycles: "🏍️", cat_bicycles: "🚲", cat_vehicles: "🚗",
  cat_furniture: "🛋️", cat_appliances: "🧺", cat_home: "🏠",
  cat_mens: "🧥", cat_womens: "👗", cat_shoes: "👟", cat_fashion: "👕",
  cat_fitness: "🏋️", cat_outdoor: "⛺", cat_sports: "⚽",
  cat_fiction: "📚", cat_education: "📘", cat_books: "📚",
  cat_hand_tools: "🔧", cat_power_tools: "🪛", cat_tools: "🧰",
};

/** Keyword hints win over the category (e.g. a guitar listed under "Other"). */
const KEYWORD_PICTOGRAMS: [RegExp, string][] = [
  [/gitara|guitar/i, "🎸"],
  [/sintezator|piano/i, "🎹"],
  [/kir yuvish|washing/i, "🧺"],
  [/muzlatgich|fridge/i, "🧊"],
  [/televizor|tv/i, "📺"],
  [/soat|watch/i, "⌚"],
  [/kolonka|speaker/i, "🔊"],
];

function pictogramFor(category: string, label: string) {
  return KEYWORD_PICTOGRAMS.find(([re]) => re.test(label))?.[1] ?? CATEGORY_PICTOGRAMS[category] ?? "📦";
}

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const label = (sp.get("l") ?? "Item").slice(0, 60);
  const seed = sp.get("s") ?? label;
  const kind = sp.get("k") === "avatar" ? "avatar" : "item";
  const h = hash(label + (kind === "item" ? label : seed));
  const hue = h % 360;

  let svg: string;
  if (kind === "avatar") {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" fill="hsl(${hue} 55% 46%)"/>
  <text x="64" y="64" dy=".35em" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="48" font-weight="600" fill="#fff">${escapeXml(label.slice(0, 2))}</text>
</svg>`;
  } else {
    // Calm flat background per category + one large pictogram; the title is already shown next to the image.
    const category = sp.get("c") ?? "";
    const emoji = pictogramFor(category, label);
    const base = CATEGORY_HUES[category] ?? hue;
    const variant = hash(seed) % 4;
    const light = [93, 90, 95, 88][variant];
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="hsl(${base} 38% ${light}%)"/>
  <ellipse cx="200" cy="232" rx="78" ry="12" fill="hsl(${base} 30% 40%)" opacity=".12"/>
  <text x="200" y="150" dy=".35em" text-anchor="middle" font-family="Segoe UI Emoji,Apple Color Emoji,Noto Color Emoji,sans-serif" font-size="118">${emoji}</text>
</svg>`;
  }
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
      // SVGs are served with a strict CSP so they can never execute script.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
