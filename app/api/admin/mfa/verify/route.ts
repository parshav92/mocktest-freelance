import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
    const supabase = await createClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || profile?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError || aal?.currentLevel !== "aal2") {
        return NextResponse.json({ error: "MFA not verified" }, { status: 403 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const { error: upsertError } = await supabase
        .from("admin_mfa_sessions")
        .upsert(
            {
                admin_id: user.id,
                mfa_verified_at: now.toISOString(),
                mfa_expires_at: expiresAt.toISOString(),
            },
            { onConflict: "admin_id" }
        );

    if (upsertError) {
        return NextResponse.json(
            { error: "Failed to store MFA session" },
            { status: 500 }
        );
    }

    return NextResponse.json({ mfa_expires_at: expiresAt.toISOString() });
}
