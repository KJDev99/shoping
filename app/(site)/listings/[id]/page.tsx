import type { Metadata } from "next";
import { ListingPage } from "@/components/site/listing-page";

export const metadata: Metadata = { title: { absolute: "E'lon · Barter.uz" }, robots: { index: true, follow: true } };

export default async function Page({ params }: PageProps<"/listings/[id]">) {
  const { id } = await params;
  return <ListingPage id={id} />;
}
