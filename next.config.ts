import type { NextConfig } from "next";

/**
 * When BACKEND_URL is set (e.g. http://localhost:8000), the Django API is served through this app's
 * own origin, so the session cookies stay first-party and `proxy.ts` can see them.
 * `beforeFiles` makes these rewrites win over the mock route handlers in `app/api/*`.
 * Without BACKEND_URL the built-in mock backend is used.
 */
const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!BACKEND_URL) return { beforeFiles: [], afterFiles: [], fallback: [] };
    return {
      beforeFiles: [
        { source: "/api/admin/:path*", destination: `${BACKEND_URL}/api/admin/:path*` },
        { source: "/api/app/:path*", destination: `${BACKEND_URL}/api/app/:path*` },
        { source: "/media/:path*", destination: `${BACKEND_URL}/media/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
