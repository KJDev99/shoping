import type { NextRequest } from "next/server";
import { appRoutes, dispatchApp } from "@/lib/mock-server/app";

/**
 * Catch-all mock marketplace API: /api/app/* → lib/mock-server/app.
 * Replace with the real backend via NEXT_PUBLIC_SITE_API_URL.
 */
async function handle(req: NextRequest, ctx: RouteContext<"/api/app/[...path]">) {
  const { path } = await ctx.params;
  return dispatchApp(appRoutes, req, path);
}

export const dynamic = "force-dynamic";
export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
