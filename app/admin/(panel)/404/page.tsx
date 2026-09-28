import type { Metadata } from "next";
import { NotFoundState } from "@/components/common/states";

export const metadata: Metadata = { title: "404" };

export default function AdminNotFoundPage() {
  return <NotFoundState backHref="/admin/dashboard" className="min-h-[60vh]" />;
}
