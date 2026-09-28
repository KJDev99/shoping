import { notFound } from "next/navigation";

/** Unknown /admin/* URLs render the 404 state inside the admin shell. */
export default function UnknownAdminRoute() {
  notFound();
}
