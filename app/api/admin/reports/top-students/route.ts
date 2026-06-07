import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/auth/rbac";

/**
 * GET /api/admin/reports/top-students
 *
 * Returns top-scoring students per subject.
 * Also provides weekly movement (current week avg vs. prior week avg).
 *
 * Query params:
 *   subjectId – filter by subject UUID (default: all)
 *   limit     – max results per subject (default: 10, max: 50)
 *   sortBy    – "avg_score" | "weekly_change" (default: "avg_score")
 */
export async function GET(request: NextRequest) {
    const { supabase } = await requireAdminAccess();

    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const rawSubjectId = request.nextUrl.searchParams.get("subjectId");
    const subjectId =
        rawSubjectId && uuidRegex.test(rawSubjectId) ? rawSubjectId : null;

    const rawLimit = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(
        50,
        Math.max(1, Number.parseInt(rawLimit ?? "10", 10) || 10),
    );

    const sortBy = request.nextUrl.searchParams.get("sortBy") ?? "avg_score";
    if (!["avg_score", "weekly_change"].includes(sortBy)) {
        return NextResponse.json({ error: "Invalid sortBy" }, { status: 400 });
    }

    // Fetch subjects list
    const subjectsQuery = supabase
        .from("subjects")
        .select("id, name, slug")
        .eq("is_active", true);

    const { data: subjects, error: subjectsError } = await subjectsQuery;
    if (subjectsError) {
        return NextResponse.json({ error: subjectsError.message }, { status: 500 });
    }

    const targetSubjects = subjectId
        ? (subjects ?? []).filter((s) => s.id === subjectId)
        : (subjects ?? []);

    if (targetSubjects.length === 0) {
        return NextResponse.json({ results: [] });
    }

    // Fetch student_subject_stats with student info
    let statsQuery = supabase
        .from("student_subject_stats")
        .select(
            `student_id, subject_id, tests_taken, overall_accuracy, last_test_at,
             student:students(id, full_name, student_id, is_active)`,
        )
        .order("overall_accuracy", { ascending: false });

    if (subjectId) {
        statsQuery = statsQuery.eq("subject_id", subjectId);
    }

    const { data: stats, error: statsError } = await statsQuery;
    if (statsError) {
        return NextResponse.json({ error: statsError.message }, { status: 500 });
    }

    // Fetch weekly scores for movement calculation
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();

    const { data: recentTests } = await supabase
        .from("tests")
        .select("student_id, subject_id, percentage, ended_at")
        .in("status", ["submitted", "ended_early"])
        .gte("ended_at", twoWeeksAgo)
        .not("percentage", "is", null);

    // Map weekly averages per student+subject
    const weeklyMap: Record<
        string,
        { currentWeek: number[]; prevWeek: number[] }
    > = {};

    for (const t of recentTests ?? []) {
        const key = `${t.student_id}::${t.subject_id}`;
        if (!weeklyMap[key]) weeklyMap[key] = { currentWeek: [], prevWeek: [] };
        const isCurrentWeek = t.ended_at >= oneWeekAgo;
        if (isCurrentWeek) {
            weeklyMap[key].currentWeek.push(t.percentage ?? 0);
        } else {
            weeklyMap[key].prevWeek.push(t.percentage ?? 0);
        }
    }

    function avg(arr: number[]): number | null {
        if (arr.length === 0) return null;
        return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
    }

    // Build per-subject leaderboards
    const subjectMap = Object.fromEntries(
        (subjects ?? []).map((s) => [s.id, s]),
    );

    const results: Array<{
        subject_id: string;
        subject_name: string;
        subject_slug: string;
        top_students: Array<{
            student_id: string;
            student_name: string;
            student_code: string;
            avg_score: number;
            tests_taken: number;
            current_week_avg: number | null;
            prev_week_avg: number | null;
            weekly_change: number | null;
            rank: number;
        }>;
    }> = [];

    for (const subject of targetSubjects) {
        const subjectStats = (stats ?? []).filter(
            (s) => s.subject_id === subject.id && s.overall_accuracy != null,
        );

        const ranked = subjectStats
            .map((s) => {
                const stu = Array.isArray(s.student) ? s.student[0] : s.student;
                const key = `${s.student_id}::${s.subject_id}`;
                const weekly = weeklyMap[key];
                const currentAvg = weekly ? avg(weekly.currentWeek) : null;
                const prevAvg = weekly ? avg(weekly.prevWeek) : null;
                const change =
                    currentAvg !== null && prevAvg !== null
                        ? currentAvg - prevAvg
                        : null;

                return {
                    student_id: s.student_id,
                    student_name: stu?.full_name ?? "Unknown",
                    student_code: stu?.student_id ?? "—",
                    avg_score: Math.round(Number(s.overall_accuracy) * 10) / 10,
                    tests_taken: s.tests_taken,
                    current_week_avg: currentAvg,
                    prev_week_avg: prevAvg,
                    weekly_change: change,
                    rank: 0,
                };
            })
            .sort((a, b) => {
                if (sortBy === "weekly_change") {
                    const ac = a.weekly_change ?? -Infinity;
                    const bc = b.weekly_change ?? -Infinity;
                    return bc - ac;
                }
                return b.avg_score - a.avg_score;
            })
            .slice(0, limit)
            .map((s, i) => ({ ...s, rank: i + 1 }));

        results.push({
            subject_id: subject.id,
            subject_name: subject.name,
            subject_slug: subject.slug,
            top_students: ranked,
        });
    }

    return NextResponse.json({ results, sort_by: sortBy });
}
