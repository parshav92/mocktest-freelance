import { createClient } from "@/lib/supabase/server";
import { getStudentSession } from "@/lib/auth/student";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { AdminLayoutClient } from "@/components/admin-layout";

/**
 * Dashboard Layout
 * 
 * Handles authentication and role-based layout rendering:
 * - Admin: Wraps with sidebar layout + MFA validation
 * - Parent: Renders children directly
 * - Student: Renders children directly (uses JWT session)
 * - Unauthenticated: Redirects to /auth
 */
export default async function DashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Check for Supabase auth user (admin/parent)
    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role, full_name")
            .eq("id", user.id)
            .single();

        if (!profile) {
            redirect("/auth");
        }

        // 🔹 ADMIN: Check MFA and wrap with sidebar layout
        if (profile.role === "admin") {
            const { data: mfaSession } = await supabase
                .from("admin_mfa_sessions")
                .select("mfa_expires_at")
                .eq("admin_id", user.id)
                .single();

            const expiresAt = mfaSession?.mfa_expires_at
                ? new Date(mfaSession.mfa_expires_at)
                : null;

            if (!expiresAt || expiresAt <= new Date()) {
                redirect("/admin-login?reason=mfa");
            }

            return (
                <AdminLayoutClient
                    user={{
                        id: user.id,
                        fullName: profile.full_name,
                    }}
                >
                    {children}
                </AdminLayoutClient>
            );
        }

        // 🔹 PARENT: Render without sidebar
        if (profile.role === "parent") {
            return <>{children}</>;
        }

        // Unknown role
        redirect("/unauthorized");
    }

    // Check for student JWT session
    const studentSession = await getStudentSession();
    if (studentSession) {
        return <>{children}</>;
    }

    // No valid session
    redirect("/auth");
}
