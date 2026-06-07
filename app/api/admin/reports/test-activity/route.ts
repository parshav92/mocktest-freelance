import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/auth/rbac";

/**
 * GET /api/admin/reports/test-activity
 *
 * Returns students with the most test attempts, with breakdown per subject.
 *
 * Query params:
 *   limit – max number of students to return (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
    const { supabase } = await requireAdminAccess();

    const rawLimit = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(rawLimit ?? "20", 10) || 20),
    );

    // Fetch all test counts grouped by student + subject
    const { data: testRows, error } = await supabase
        .from("tests")
        .select("student_id, subject_id")
        .in("status", ["submitted", "ended_early"]);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch students
    const { data: students } = await supabase
        .from("students")
        .select("id, full_name, student_id, is_active");

    // Fetch subjects
    const { data: subjects } = await supabase
        .from("subjects")
        .select("id, name, slug")
        .eq("is_active", true);

    const studentMap = Object.fromEntries(
        (students ?? []).map((s) => [s.id, s]),
    );
    const subjectMap = Object.fromEntries(
        (subjects ?? []).map((s) => [s.id, s]),
    );

    // Aggregate: per student total and per subject breakdown
    const perStudent: Record<
        string,
        {
            student_id: string;
            total: number;
            by_subject: Record<string, number>;
        }
    > = {};

    for (const row of testRows ?? []) {
        if (!perStudent[row.student_id]) {
            perStudent[row.student_id] = {
                student_id: row.student_id,
                total: 0,
                by_subject: {},
            };
        }
        perStudent[row.student_id].total += 1;
        const sid = row.subject_id;
        perStudent[row.student_id].by_subject[sid] =
            (perStudent[row.student_id].by_subject[sid] ?? 0) + 1;
    }

    // Sort by total tests desc, take top N
    const sorted = Object.values(perStudent)
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);

    const result = sorted.map((entry, idx) => {
        const stu = studentMap[entry.student_id];
        const subjectBreakdown = Object.entries(entry.by_subject)
            .map(([subjectId, count]) => ({
                subject_id: subjectId,
                subject_name: subjectMap[subjectId]?.name ?? "Unknown",
                subject_slug: subjectMap[subjectId]?.slug ?? "",
                tests_count: count,
            }))
            .sort((a, b) => b.tests_count - a.tests_count);

        return {
            rank: idx + 1,
            student_id: entry.student_id,
            student_name: stu?.full_name ?? "Unknown",
            student_code: stu?.student_id ?? "—",
            is_active: stu?.is_active ?? false,
            total_tests: entry.total,
            subject_breakdown: subjectBreakdown,
        };
    });

    return NextResponse.json({ students: result, total: result.length });
}
