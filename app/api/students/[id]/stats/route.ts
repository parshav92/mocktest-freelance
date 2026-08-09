import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireMinAnalyticsLevel } from "@/lib/plans/entitlements";
import { featureLockedErrorResponse } from "@/lib/api/responses";

/**
 * GET /api/students/[id]/stats
 *
 * Fetches a student's performance stats and recent test history.
 * Only accessible by the student's parent.
 * Requires analytics_level >= basic.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: studentId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: student, error: studentError } = await supabase
        .from("students")
        .select(
            "id, student_id, full_name, parent_id, is_active, created_at, plan_key",
        )
        .eq("id", studentId)
        .eq("parent_id", user.id)
        .single();

    if (studentError || !student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const gate = await requireMinAnalyticsLevel(studentId, supabase, "basic");
    if (!gate.ok) {
        return featureLockedErrorResponse(gate.error, gate.feature);
    }

    const { data: subjectStats } = await supabase
        .from("student_subject_stats")
        .select(
            `
      *,
      subject:subjects(id, name, slug, icon)
    `,
        )
        .eq("student_id", studentId)
        .order("last_test_at", { ascending: false });

    const { data: recentTests } = await supabase
        .from("tests")
        .select(
            `
      id,
      subject:subjects(id, name, slug),
      status,
      started_at,
      ended_at,
      duration_mins,
      time_spent_secs,
      total_marks,
      marks_obtained,
      percentage,
      score_breakdown,
      created_at
    `,
        )
        .eq("student_id", studentId)
        .in("status", ["submitted", "ended_early"])
        .order("created_at", { ascending: false })
        .limit(20);

    const tests = recentTests || [];
    const totalTests = tests.length;
    const avgPercentage =
        totalTests > 0
            ? Math.round(
                  tests.reduce((sum, t) => sum + (t.percentage || 0), 0) /
                      totalTests,
              )
            : 0;
    const bestScore =
        totalTests > 0
            ? Math.round(Math.max(...tests.map((t) => t.percentage || 0)))
            : 0;
    const totalTimeSpent = tests.reduce(
        (sum, t) => sum + (t.time_spent_secs || 0),
        0,
    );

    return NextResponse.json({
        student,
        subjectStats: subjectStats || [],
        recentTests: tests,
        summary: {
            totalTests,
            avgPercentage,
            bestScore,
            totalTimeSpent,
        },
        entitlements: {
            planKey: gate.planKey,
            name: gate.entitlements.name,
            maxFullMocks: gate.entitlements.maxFullMocks,
            analyticsLevel: gate.entitlements.analyticsLevel,
            peerCompare: gate.entitlements.peerCompare,
            tips: gate.entitlements.tips,
        },
    });
}
