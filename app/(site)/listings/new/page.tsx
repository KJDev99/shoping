import type { Metadata } from "next";
import { PostListingPage } from "@/components/site/post-listing-page";

export const metadata: Metadata = { title: { absolute: "E'lon joylash · Barter.uz" } };

export default function Page() {
  return <PostListingPage />;
}
