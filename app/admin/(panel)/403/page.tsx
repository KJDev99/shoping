import type { Metadata } from "next";
import { PermissionDenied } from "@/components/common/states";

export const metadata: Metadata = { title: "403" };

export default function ForbiddenPage() {
  return <PermissionDenied showHome className="min-h-[60vh]" />;
}
