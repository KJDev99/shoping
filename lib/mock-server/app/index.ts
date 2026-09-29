import "server-only";

import type { AppRoute } from "./core";
import { authRoutes } from "./handlers/auth";
import { catalogRoutes } from "./handlers/catalog";
import { meRoutes } from "./handlers/me";
import { offerRoutes } from "./handlers/offers";

/** Mock marketplace (end-user) API, served at /api/app/*. */
export const appRoutes: AppRoute[] = [...authRoutes, ...catalogRoutes, ...meRoutes, ...offerRoutes];

export { dispatchApp } from "./core";
