import type { Metadata } from "next";
import { LoginPage } from "@/components/site/login-page";

export const metadata: Metadata = { title: { absolute: "Kirish · Barter.uz" } };

export default function Page() {
  return <LoginPage />;
}
