import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Secure middleware to require admin role for protected routes.
 * Checks authentication, admin role, and MFA verification.
 *
 * Use in:
 * - Route layouts for admin-only sections
 * - Server components that need admin-authenticated supabase client
 *
 * @returns Supabase client, user, and profile if authorized
 * @throws Redirect to /admin-login or /unauthorized
 */
export async function requireAdminAccess() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/admin-login?reason=auth");
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        redirect("/admin-login?reason=auth");
    }

    if (profile.role !== "admin") {
        redirect("/unauthorized");
    }

    // Validate MFA session
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

    return { supabase, user, profile };
}

/**
 * Secure middleware to require parent role for protected routes.
 *
 * Use in:
 * - Route layouts for parent-only sections (subscribe, students)
 * - Server components that need parent-authenticated supabase client
 *
 * @returns Supabase client, user, and profile if authorized
 * @throws Redirect to /auth or /unauthorized
 */
export async function requireParentAccess() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth");
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        redirect("/auth");
    }

    if (profile.role !== "parent") {
        redirect("/unauthorized");
    }

    return { supabase, user, profile };
}

/**
 * Secure middleware for routes accessible by parents or admins.
 * Admins must have a valid MFA session (same as requireAdminAccess).
 *
 * @returns Supabase client, user, profile, and role
 * @throws Redirect to /auth, /admin-login, or /unauthorized
 */
export async function requireParentOrAdminAccess() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth");
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        redirect("/auth");
    }

    if (profile.role === "parent") {
        return { supabase, user, profile, role: "parent" as const };
    }

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

        return { supabase, user, profile, role: "admin" as const };
    }

    redirect("/unauthorized");
}

/**
 * Get authenticated supabase client for use in pages where layout
 * has already validated access. Use when you need the client but
 * don't need to re-validate permissions.
 *
 * @returns Supabase client
 */
export async function getAuthenticatedClient() {
    return createClient();
}
