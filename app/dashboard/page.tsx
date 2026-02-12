import { createClient } from "@/lib/supabase/server";
import { getStudentSession } from "@/lib/auth/student";
import { redirect } from "next/navigation";
import { ParentDashboard } from "./parent-dashboard";
import { StudentDashboard } from "./student-dashboard";
import { AdminDashboardContent } from "./admin-dashboard-content";

export default async function DashboardPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (!profile) {
            redirect("/auth");
        }

        // 🔹 ADMIN
        if (profile.role === "admin") {
            // Fetch admin stats
            const [
                { count: parentCount },
                { count: studentCount },
                { count: totalSubscriptions },
                { count: activeSubscriptions },
                { count: expiredSubscriptions },
                { count: graceSubscriptions },
            ] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("id", { count: "exact", head: true })
                    .eq("role", "parent"),
                supabase
                    .from("students")
                    .select("id", { count: "exact", head: true }),
                supabase
                    .from("subscriptions")
                    .select("id", { count: "exact", head: true }),
                supabase
                    .from("subscriptions")
                    .select("id", { count: "exact", head: true })
                    .eq("status", "active"),
                supabase
                    .from("subscriptions")
                    .select("id", { count: "exact", head: true })
                    .eq("status", "expired"),
                supabase
                    .from("subscriptions")
                    .select("id", { count: "exact", head: true })
                    .eq("status", "grace_period"),
            ]);

            return (
                <AdminDashboardContent
                    stats={{
                        parentCount: parentCount ?? 0,
                        studentCount: studentCount ?? 0,
                        totalSubscriptions: totalSubscriptions ?? 0,
                        activeSubscriptions: activeSubscriptions ?? 0,
                        expiredSubscriptions: expiredSubscriptions ?? 0,
                        graceSubscriptions: graceSubscriptions ?? 0,
                    }}
                />
            );
        }

        // PARENT
        if (profile.role === "parent") {
            // Fetch subscriptions with students
            const { data: subscriptions } = await supabase
                .from("subscriptions")
                .select(
                    `
          *,
          student:students(*)
        `,
                )
                .eq("parent_id", user.id)
                .order("created_at", { ascending: false });

            return (
                <ParentDashboard
                    user={{
                        id: user.id,
                        email: user.email!,
                        fullName: profile.full_name,
                        role: "parent",
                    }}
                    subscriptions={subscriptions || []}
                />
            );
        }

        redirect("/unauthorized");
    }

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

    redirect("/auth");
}
