import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/auth/rbac";

/**
 * GET /api/admin/reports/expiring
 *
 * Returns active subscriptions expiring within the next 15 days.
 */
export async function GET() {
    const { supabase } = await requireAdminAccess();

    const now = new Date();
    const cutoff = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    const { data: subscriptions, error } = await supabase
        .from("subscriptions")
        .select(
            `id, plan, status, starts_at, expires_at, grace_period_ends_at, created_at,
             parent:profiles(id, email, full_name),
             student:students(id, full_name, student_id, is_active)`,
        )
        .eq("status", "active")
        .lte("expires_at", cutoff.toISOString())
        .gte("expires_at", now.toISOString())
        .order("expires_at", { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sanitized = (subscriptions ?? []).map((s) => ({
        ...s,
        parent: Array.isArray(s.parent) ? s.parent[0] : s.parent,
        student: Array.isArray(s.student) ? s.student[0] : s.student,
        days_remaining: Math.ceil(
            (new Date(s.expires_at).getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
        ),
    }));

    return NextResponse.json({
        subscriptions: sanitized,
        total: sanitized.length,
        cutoff_date: cutoff.toISOString(),
    });
}
