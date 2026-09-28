import type { Locale } from "@/types";
import type { Paths } from "../define";
import { admins } from "./admins";
import { audit } from "./audit";
import { barter } from "./barter";
import { categories } from "./categories";
import { common, validation } from "./common";
import { dashboard } from "./dashboard";
import { enums } from "./enums";
import { exchanges } from "./exchanges";
import { auth, header, nav } from "./layout";
import { listings } from "./listings";
import { locations } from "./locations";
import { matches } from "./matches";
import { moderation } from "./moderation";
import { notifications } from "./notifications";
import { profile } from "./profile";
import { reports } from "./reports";
import { settings } from "./settings";
import { site } from "./site";
import { users } from "./users";

const namespaces = {
  common,
  validation,
  enums,
  nav,
  header,
  auth,
  dashboard,
  users,
  listings,
  barter,
  exchanges,
  matches,
  categories,
  reports,
  moderation,
  locations,
  notifications,
  admins,
  audit,
  settings,
  profile,
  site,
};

type Namespaces = typeof namespaces;
type Dictionary = { [NS in keyof Namespaces]: Namespaces[NS]["en"] };

/** Every valid translation key, e.g. "users.title" or "enums.userStatus.ACTIVE". */
export type MessageKey = Paths<Dictionary>;

function build(locale: Locale): Dictionary {
  return Object.fromEntries(Object.entries(namespaces).map(([ns, m]) => [ns, m[locale]])) as Dictionary;
}

export const dictionaries: Record<Locale, Dictionary> = {
  uz: build("uz"),
  ru: build("ru"),
  en: build("en"),
};
