import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/auth/rbac";

/**
 * GET /api/admin/reports/subscribers
 *
 * Returns subscriber details with breakdown by date / month / quarter / year.
 *
 * Query params:
 *   status  – "active" | "expired" | "grace_period" | "all" (default: "all")
 *   period  – "date" | "month" | "quarter" | "year" (default: "month")
 */
export async function GET(request: NextRequest) {
    const { supabase } = await requireAdminAccess();

    const rawStatus = request.nextUrl.searchParams.get("status") ?? "all";
    const period = request.nextUrl.searchParams.get("period") ?? "month";

    const allowedStatuses = ["active", "expired", "grace_period", "all"];
    const allowedPeriods = ["date", "month", "quarter", "year"];

    if (!allowedStatuses.includes(rawStatus)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (!allowedPeriods.includes(period)) {
        return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    // Fetch subscriptions
    let query = supabase
        .from("subscriptions")
        .select(
            `id, plan, status, starts_at, expires_at, grace_period_ends_at, created_at,
             parent:profiles(id, email, full_name),
             student:students(id, full_name, student_id, is_active)`,
        )
        .order("created_at", { ascending: false });

    if (rawStatus !== "all") {
        query = query.eq("status", rawStatus);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = subscriptions ?? [];

    // ── Group by period ──────────────────────────────────────────────────────
    function getPeriodKey(dateStr: string): string {
        const d = new Date(dateStr);
        if (period === "date") {
            return d.toISOString().slice(0, 10); // YYYY-MM-DD
        }
        if (period === "month") {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        }
        if (period === "quarter") {
            const q = Math.floor(d.getMonth() / 3) + 1;
            return `${d.getFullYear()}-Q${q}`;
        }
        // year
        return String(d.getFullYear());
    }

    const grouped: Record<
        string,
        {
            period: string;
            active: number;
            expired: number;
            grace_period: number;
            total: number;
        }
    > = {};

    for (const sub of list) {
        const key = getPeriodKey(sub.created_at);
        if (!grouped[key]) {
            grouped[key] = {
                period: key,
                active: 0,
                expired: 0,
                grace_period: 0,
                total: 0,
            };
        }
        grouped[key].total += 1;
        if (sub.status === "active") grouped[key].active += 1;
        else if (sub.status === "expired") grouped[key].expired += 1;
        else if (sub.status === "grace_period") grouped[key].grace_period += 1;
    }

    const breakdown = Object.values(grouped).sort((a, b) =>
        a.period > b.period ? -1 : 1,
    );

    // Sanitize joined relations (Supabase may return arrays for 1:1 joins)
    const sanitized = list.map((s) => ({
        ...s,
        parent: Array.isArray(s.parent) ? s.parent[0] : s.parent,
        student: Array.isArray(s.student) ? s.student[0] : s.student,
    }));

    return NextResponse.json({
        subscriptions: sanitized,
        breakdown,
        total: list.length,
        period,
    });
}
