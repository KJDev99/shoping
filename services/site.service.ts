import { siteApi } from "@/lib/api/client";
import type { CreateListingInput, RequestCodeInput, SendOfferInput, VerifyCodeInput } from "@/schemas/site.schema";
import type { BarterRequestStatus, ListingStatus, ListParams, MyListing, PublicListing, PublicListingCard, SiteConfig, SiteOffer, SiteUser } from "@/types";
import type { Lookups } from "./common.service";

/** Public marketplace API (end users). Separate from the admin API and session. */
export const siteService = {
  me: () => siteApi.get<SiteUser | null>("/auth/me"),
  requestCode: (input: RequestCodeInput) =>
    siteApi.post<{ isNewUser: boolean; resendAfterSec: number; devCode: string | null; acceptsAnyCode: boolean }>("/auth/request-code", input),
  verify: (input: VerifyCodeInput) => siteApi.post<{ needsProfile: boolean; user: SiteUser | null }>("/auth/verify", input),
  logout: () => siteApi.post<null>("/auth/logout"),

  config: () => siteApi.get<SiteConfig>("/config"),
  lookups: () => siteApi.get<Lookups>("/lookups"),
  listings: (params: ListParams) => siteApi.list<PublicListingCard>("/listings", params),
  listing: (id: string) =>
    siteApi.get<{ listing: PublicListing; status: ListingStatus; isOwner: boolean; myOffer: { id: string; status: BarterRequestStatus } | null }>(`/listings/${id}`),
  videoView: (id: string) => siteApi.post<{ views: number }>(`/listings/${id}/video-view`),
  similar: (id: string) => siteApi.get<PublicListingCard[]>(`/listings/${id}/similar`),

  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return siteApi.post<{ id: string; url: string; kind: "image" | "video" }>("/uploads", form);
  },
  myListings: (params: ListParams) => siteApi.list<MyListing>("/me/listings", params),
  createListing: (input: CreateListingInput) => siteApi.post<MyListing>("/me/listings", input),

  sendOffer: (input: SendOfferInput) => siteApi.post<SiteOffer>("/offers", input),
  myOffers: (box: "incoming" | "outgoing") => siteApi.list<SiteOffer>("/me/offers", { page: 1, limit: 50, filters: { box } }),
  respondOffer: (id: string, action: "accept" | "decline" | "cancel") => siteApi.post<SiteOffer>(`/offers/${id}/${action}`),
};
