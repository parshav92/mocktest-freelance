import { createClient } from "@/lib/supabase/server";
import { getStudentSession } from "@/lib/auth/student";
import { redirect } from "next/navigation";
import { ParentDashboard } from "./parent-dashboard";
import { StudentDashboard } from "./student-dashboard";

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

    // Fetch subscriptions with students
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select(`
        *,
        student:students(*)
      `)
      .eq("parent_id", user.id)
      .order("created_at", { ascending: false });

    return (
      <ParentDashboard
        user={{
          id: user.id,
          email: user.email!,
          fullName: profile?.full_name || user.email!,
          role: profile?.role || "parent",
        }}
        subscriptions={subscriptions || []}
      />
    );
  }

  // Check for student session
  const studentSession = await getStudentSession();

  if (studentSession) {
    return (
      <StudentDashboard
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
