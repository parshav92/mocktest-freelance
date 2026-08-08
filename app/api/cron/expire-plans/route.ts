import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cron/expire-plans
 *
 * Vercel Cron: move subscriptions into grace_period / expired and
 * deactivate students past grace. Auth via CRON_SECRET.
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const supabase = createAdminClient();
        const now = new Date().toISOString();

        const { data: toGrace, error: graceError } = await supabase
            .from("subscriptions")
            .update({ status: "grace_period", updated_at: now })
            .eq("status", "active")
            .lte("expires_at", now)
            .gt("grace_period_ends_at", now)
            .select("id");

        if (graceError) {
            console.error("expire-plans grace update failed:", graceError);
            return NextResponse.json(
                { error: graceError.message },
                { status: 500 },
            );
        }

        // Past grace end
        const { data: expiredWithGrace, error: expiredWithGraceError } =
            await supabase
                .from("subscriptions")
                .update({ status: "expired", updated_at: now })
                .in("status", ["active", "grace_period"])
                .lte("expires_at", now)
                .lte("grace_period_ends_at", now)
                .select("id, student_id");

        if (expiredWithGraceError) {
            console.error(
                "expire-plans expired (with grace) failed:",
                expiredWithGraceError,
            );
            return NextResponse.json(
                { error: expiredWithGraceError.message },
                { status: 500 },
            );
        }

        // Legacy rows with no grace_period_ends_at
        const { data: expiredNoGrace, error: expiredNoGraceError } =
            await supabase
                .from("subscriptions")
                .update({ status: "expired", updated_at: now })
                .in("status", ["active", "grace_period"])
                .lte("expires_at", now)
                .is("grace_period_ends_at", null)
                .select("id, student_id");

        if (expiredNoGraceError) {
            console.error(
                "expire-plans expired (no grace) failed:",
                expiredNoGraceError,
            );
            return NextResponse.json(
                { error: expiredNoGraceError.message },
                { status: 500 },
            );
        }

        const expiredSubs = [
            ...(expiredWithGrace ?? []),
            ...(expiredNoGrace ?? []),
        ];

        const studentIds = [
            ...new Set(
                expiredSubs
                    .map((s) => s.student_id)
                    .filter((id): id is string => Boolean(id)),
            ),
        ];

        let deactivated = 0;
        if (studentIds.length > 0) {
            const { data: deactivatedRows, error: deactivateError } =
                await supabase
                    .from("students")
                    .update({ is_active: false, updated_at: now })
                    .in("id", studentIds)
                    .eq("is_active", true)
                    .select("id");

            if (deactivateError) {
                console.error(
                    "expire-plans deactivate failed:",
                    deactivateError,
                );
                return NextResponse.json(
                    { error: deactivateError.message },
                    { status: 500 },
                );
            }
            deactivated = deactivatedRows?.length ?? 0;
        }

        return NextResponse.json({
            ok: true,
            movedToGrace: toGrace?.length ?? 0,
            movedToExpired: expiredSubs.length,
            studentsDeactivated: deactivated,
        });
    } catch (err) {
        console.error("expire-plans error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Cron failed" },
            { status: 500 },
        );
    }
}
