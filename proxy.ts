import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "barter_admin_session";
const USER_SESSION_COOKIE = "barter_session";
/** Marketplace pages that need a signed-in user. */
const USER_ONLY_PATHS = ["/listings/new", "/my"];
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];

/**
 * Optimistic auth gates (admin panel and the marketplace's signed-in pages):
 * unauthenticated visitors are sent to the matching login page
 * before any admin UI renders. This only checks cookie presence — the API
 * validates the session and enforces permissions on every request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (USER_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (request.cookies.has(USER_SESSION_COOKIE)) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const isPublic = PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!isPublic && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname === "/admin" || pathname === "/admin/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  // Defense-in-depth security headers for the admin area.
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "same-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/listings/new", "/my/:path*"],
};
