import type { NextRequest } from "next/server";
import { dispatch, routes } from "@/lib/mock-server";

/**
 * Catch-all mock API: /api/admin/* → lib/mock-server handlers.
 * In production the frontend talks to the real backend via NEXT_PUBLIC_API_URL
 * and this route can be removed.
 */
async function handle(req: NextRequest, ctx: RouteContext<"/api/admin/[...path]">) {
  const { path } = await ctx.params;
  return dispatch(routes, req, path);
}

export const dynamic = "force-dynamic";
export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
