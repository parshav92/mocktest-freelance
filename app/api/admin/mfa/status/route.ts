import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ authenticated: false, isAdmin: false });
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        return NextResponse.json({ authenticated: true, isAdmin: false });
    }

    const { data: mfaSession } = await supabase
        .from("admin_mfa_sessions")
        .select("mfa_expires_at")
        .eq("admin_id", user.id)
        .single();

    const now = new Date();
    const expiresAt = mfaSession?.mfa_expires_at
        ? new Date(mfaSession.mfa_expires_at)
        : null;
    const mfaValid = !!expiresAt && expiresAt > now;

    return NextResponse.json({
        authenticated: true,
        isAdmin: true,
        mfaValid,
        mfaExpiresAt: expiresAt?.toISOString() ?? null,
    });
}
