import { NotFoundState } from "@/components/common/states";

export default function PanelNotFound() {
  return <NotFoundState backHref="/admin/dashboard" className="min-h-[60vh]" />;
}
