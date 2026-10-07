import { redirect } from "next/navigation";

/**
 * Root "/" — middleware redirects authenticated users to their role home.
 * This fallback redirect handles the edge case where middleware doesn't fire.
 */
export default function RootPage() {
  redirect("/auth/login");
}
