import type { Metadata } from "next";
import { MyListingsPage } from "@/components/site/my-listings-page";

export const metadata: Metadata = { title: { absolute: "Mening e'lonlarim · Barter.uz" } };

export default function Page() {
  return <MyListingsPage />;
}
