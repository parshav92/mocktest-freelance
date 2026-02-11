import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        // Reset MFA expiry to current time so the session is no longer valid
        const now = new Date().toISOString();
        await supabase
            .from("admin_mfa_sessions")
            .update({
                mfa_expires_at: now,
                // mfa_verified_at: now,
            })
            .eq("admin_id", user.id);

        // Sign out from Supabase auth
        await supabase.auth.signOut();
    }

    return NextResponse.redirect(
        new URL(
            "/admin-login",
            process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        ),
        { status: 303 }
    );
}
