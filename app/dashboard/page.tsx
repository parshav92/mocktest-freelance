import { createClient } from "@/lib/supabase/server";
import { getStudentSession } from "@/lib/auth/student";
import { redirect } from "next/navigation";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage() {
  // Check for parent/admin session first
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Fetch parent profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return (
      <DashboardContent
        userType="parent"
        user={{
          id: user.id,
          email: user.email!,
          fullName: profile?.full_name || user.email!,
          role: profile?.role || "parent",
        }}
      />
    );
  }

  // Check for student session
  const studentSession = await getStudentSession();

  if (studentSession) {
    return (
      <DashboardContent
        userType="student"
        user={{
          id: studentSession.student_id,
          studentCode: studentSession.student_code,
          fullName: studentSession.full_name,
          isReadOnly: studentSession.is_read_only,
        }}
      />
    );
  }

  // No session found, redirect to auth
  redirect("/auth");
}
