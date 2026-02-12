import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Re-export response helpers for convenience
export { errorResponse, successResponse } from "@/lib/api/responses";

/**
 * Server Component version - uses redirect() for auth failures
 * Use this in Server Components and layouts
 */
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

/**
 * API Route version - returns JSON error responses
 * Use this in API routes (app/api/*)
 * Returns discriminated union for type-safe handling
 */
export async function requireAdmin(): Promise<
  | { isAdmin: true; userId: string }
  | { isAdmin: false; error: string; status: number }
> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { isAdmin: false, error: "Unauthorized", status: 401 };
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { isAdmin: false, error: "Profile not found", status: 404 };
  }

  if (profile.role !== "admin") {
    return { isAdmin: false, error: "Forbidden - Admin access required", status: 403 };
  }

  // Check MFA session
  const { data: mfaSession } = await supabase
    .from("admin_mfa_sessions")
    .select("mfa_expires_at")
    .eq("admin_id", user.id)
    .single();

  const expiresAt = mfaSession?.mfa_expires_at
    ? new Date(mfaSession.mfa_expires_at)
    : null;

  if (!expiresAt || expiresAt <= new Date()) {
    return { isAdmin: false, error: "MFA session expired", status: 401 };
  }

  return { isAdmin: true, userId: user.id };
}
