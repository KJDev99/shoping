import { siteApi } from "@/lib/api/client";
import type { CreateListingInput, RequestCodeInput, VerifyCodeInput } from "@/schemas/site.schema";
import type { ListingStatus, ListParams, MyListing, PublicListing, PublicListingCard, SiteConfig, SiteUser } from "@/types";
import type { Lookups } from "./common.service";

/** Public marketplace API (end users). Separate from the admin API and session. */
export const siteService = {
  me: () => siteApi.get<SiteUser | null>("/auth/me"),
  requestCode: (input: RequestCodeInput) =>
    siteApi.post<{ isNewUser: boolean; resendAfterSec: number; devCode: string | null }>("/auth/request-code", input),
  verify: (input: VerifyCodeInput) => siteApi.post<{ needsProfile: boolean; user: SiteUser | null }>("/auth/verify", input),
  logout: () => siteApi.post<null>("/auth/logout"),

  config: () => siteApi.get<SiteConfig>("/config"),
  lookups: () => siteApi.get<Lookups>("/lookups"),
  listings: (params: ListParams) => siteApi.list<PublicListingCard>("/listings", params),
  listing: (id: string) => siteApi.get<{ listing: PublicListing; status: ListingStatus; isOwner: boolean }>(`/listings/${id}`),
  similar: (id: string) => siteApi.get<PublicListingCard[]>(`/listings/${id}/similar`),

  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return siteApi.post<{ id: string; url: string }>("/uploads", form);
  },
  myListings: (params: ListParams) => siteApi.list<MyListing>("/me/listings", params),
  createListing: (input: CreateListingInput) => siteApi.post<MyListing>("/me/listings", input),
};
