import "server-only";

import type { Route } from "./router";
import { adminRoutes } from "./handlers/admins";
import { auditRoutes } from "./handlers/audit";
import { authRoutes } from "./handlers/auth";
import { barterRoutes } from "./handlers/barter";
import { categoryRoutes } from "./handlers/categories";
import { commonRoutes } from "./handlers/common";
import { dashboardRoutes } from "./handlers/dashboard";
import { exchangeRoutes } from "./handlers/exchanges";
import { listingRoutes } from "./handlers/listings";
import { locationRoutes } from "./handlers/locations";
import { matchRoutes } from "./handlers/matches";
import { moderationRoutes } from "./handlers/moderation";
import { notificationRoutes } from "./handlers/notifications";
import { reportRoutes } from "./handlers/reports";
import { settingsRoutes } from "./handlers/settings";
import { userRoutes } from "./handlers/users";

/**
 * Mock REST backend. Replace by pointing NEXT_PUBLIC_API_URL at the real API;
 * the frontend service layer does not change.
 */
export const routes: Route[] = [
  ...authRoutes,
  ...commonRoutes,
  ...dashboardRoutes,
  ...userRoutes,
  ...listingRoutes,
  ...barterRoutes,
  ...exchangeRoutes,
  ...matchRoutes,
  ...categoryRoutes,
  ...reportRoutes,
  ...moderationRoutes,
  ...locationRoutes,
  ...notificationRoutes,
  ...adminRoutes,
  ...auditRoutes,
  ...settingsRoutes,
];

export { dispatch } from "./router";
