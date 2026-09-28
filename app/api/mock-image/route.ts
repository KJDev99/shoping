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

function wrap(label: string, max = 16): string[] {
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max && line) {
      lines.push(line);
      line = w;
    } else line = (line + " " + w).trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const label = (sp.get("l") ?? "Item").slice(0, 60);
  const seed = sp.get("s") ?? label;
  const kind = sp.get("k") === "avatar" ? "avatar" : "item";
  const h = hash(label + (kind === "item" ? label : seed));
  const hue = h % 360;
  const shift = (hash(seed) % 40) - 20;

  let svg: string;
  if (kind === "avatar") {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" fill="hsl(${hue} 55% 46%)"/>
  <text x="64" y="64" dy=".35em" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="48" font-weight="600" fill="#fff">${escapeXml(label.slice(0, 2))}</text>
</svg>`;
  } else {
    const lines = wrap(label);
    const startY = 150 - (lines.length - 1) * 14;
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${hue} 45% 88%)"/><stop offset="1" stop-color="hsl(${(hue + 30 + shift) % 360} 50% 76%)"/>
  </linearGradient></defs>
  <rect width="400" height="300" fill="url(#g)"/>
  <circle cx="${200 + shift * 3}" cy="${150 - shift}" r="95" fill="hsl(${hue} 40% 96%)" opacity=".55"/>
  ${lines
    .map(
      (ln, i) =>
        `<text x="200" y="${startY + i * 28}" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="24" font-weight="600" fill="hsl(${hue} 45% 22%)">${escapeXml(ln)}</text>`,
    )
    .join("\n  ")}
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
