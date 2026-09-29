import type { Metadata } from "next";
import { MyOffersPage } from "@/components/site/my-offers-page";

export const metadata: Metadata = { title: { absolute: "Takliflarim · Barter.uz" } };

export default function Page() {
  return <MyOffersPage />;
}
