import { requireAdminSession } from "@/lib/auth/admin";
import KatexClient from "./client";

export default async function KatexTestPage() {
  await requireAdminSession(); // redirects to /admin-login if not admin
  return <KatexClient />;
}
