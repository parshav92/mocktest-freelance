import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminLayoutClient from "./layout-client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/admin-login");
  }

  return <AdminLayoutClient profile={profile}>{children}</AdminLayoutClient>;
}
