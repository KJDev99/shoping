import "server-only";

import type { AppRoute } from "./core";
import { authRoutes } from "./handlers/auth";
import { catalogRoutes } from "./handlers/catalog";
import { meRoutes } from "./handlers/me";

/** Mock marketplace (end-user) API, served at /api/app/*. */
export const appRoutes: AppRoute[] = [...authRoutes, ...catalogRoutes, ...meRoutes];

export { dispatchApp } from "./core";
