import type { Metadata } from "next";
import { HomePage } from "@/components/site/home-page";

export const metadata: Metadata = {
  title: { absolute: "Barter.uz — buyumni buyumga almashing" },
  description: "O'zbekiston bo'ylab buyum almashish platformasi: keraksiz narsangizni keraklisiga almashtiring. Sotuv va to'lovlarsiz.",
  robots: { index: true, follow: true },
};

export default function Page() {
  return <HomePage />;
}
