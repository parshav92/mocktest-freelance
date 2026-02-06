import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdminSession() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/admin-login?reason=auth");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        redirect("/admin-login?reason=forbidden");
    }

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

    return supabase;
}
