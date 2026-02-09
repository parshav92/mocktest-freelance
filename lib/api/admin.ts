import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Check if the current user is an admin with valid MFA session
 * Returns { isAdmin: true, userId } or { isAdmin: false, error, status }
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

/**
 * Helper to return error response
 */
export function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/**
 * Helper to return success response
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}
