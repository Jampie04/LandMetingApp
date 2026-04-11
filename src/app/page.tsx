// Root page — middleware handles the redirect to /login or /dashboard/home.
// This is a fallback if middleware ever misses (should not happen in production).
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
