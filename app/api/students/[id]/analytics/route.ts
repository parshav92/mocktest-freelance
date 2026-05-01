import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ParentStudentAnalytics } from "@/types/parent-analytics";

interface AnalyticsRpcResponse {
    summary?: ParentStudentAnalytics["summary"];
    peer_overall?: ParentStudentAnalytics["peer_overall"];
    pacing?: ParentStudentAnalytics["pacing"];
    engagement?: ParentStudentAnalytics["engagement"];
    subject_comparison?: ParentStudentAnalytics["subject_comparison"];
    error_patterns?: ParentStudentAnalytics["error_patterns"];
    topic_breakdown?: ParentStudentAnalytics["topic_breakdown"];
    topic_pagination?: ParentStudentAnalytics["topic_pagination"];
    trajectories?: ParentStudentAnalytics["trajectories"];
}

/**
 * GET /api/students/[id]/analytics?days=90&subjectId=<uuid>&topicPage=1&topicPageSize=10
 *
 * Parent-only analytics endpoint.
 * Uses DB-side aggregation for better performance at scale.
 */
export async function GET(
    request: NextRequest,
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

    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const rawDays = request.nextUrl.searchParams.get("days");
    let days: number | null = 90;
    if (rawDays) {
        const parsed = Number.parseInt(rawDays, 10);
        if (!Number.isFinite(parsed) || parsed < 7 || parsed > 3650) {
            return NextResponse.json(
                { error: "Invalid days parameter. Use a value between 7 and 3650." },
                { status: 400 },
            );
        }
        days = parsed;
    }

    if (rawDays === "all") {
        days = null;
    }

    const rawSubjectId = request.nextUrl.searchParams.get("subjectId");
    const subjectId =
        rawSubjectId && rawSubjectId !== "all" ? rawSubjectId : null;
    if (subjectId && !uuidRegex.test(subjectId)) {
        return NextResponse.json(
            { error: "Invalid subjectId parameter." },
            { status: 400 },
        );
    }

    const rawTopicPage = request.nextUrl.searchParams.get("topicPage");
    const topicPage = rawTopicPage ? Number.parseInt(rawTopicPage, 10) : 1;
    if (!Number.isFinite(topicPage) || topicPage < 1 || topicPage > 1000) {
        return NextResponse.json(
            { error: "Invalid topicPage parameter. Use a value between 1 and 1000." },
            { status: 400 },
        );
    }

    const rawTopicPageSize = request.nextUrl.searchParams.get("topicPageSize");
    const topicPageSize = rawTopicPageSize
        ? Number.parseInt(rawTopicPageSize, 10)
        : 10;
    if (
        !Number.isFinite(topicPageSize) ||
        topicPageSize < 1 ||
        topicPageSize > 50
    ) {
        return NextResponse.json(
            {
                error: "Invalid topicPageSize parameter. Use a value between 1 and 50.",
            },
            { status: 400 },
        );
    }

    const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("id", studentId)
        .eq("parent_id", user.id)
        .single();

    if (studentError || !student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const { data, error } = await supabase.rpc("get_parent_student_analytics", {
        p_parent_id: user.id,
        p_student_id: studentId,
        p_days: days,
        p_subject_id: subjectId,
        p_topic_page: topicPage,
        p_topic_page_size: topicPageSize,
    });

    if (error) {
        console.error("Analytics RPC failed:", error);
        return NextResponse.json(
            { error: "Failed to load analytics" },
            { status: 500 },
        );
    }

    const payload = (data || {}) as AnalyticsRpcResponse;

    return NextResponse.json({
        summary: payload.summary ?? {
            total_tests: 0,
            avg_percentage: 0,
            best_percentage: 0,
            total_time_spent_secs: 0,
        },
        peer_overall: payload.peer_overall ?? {
            student_avg_percentage: 0,
            peer_avg_percentage: 0,
            delta_percentage: 0,
            percentile_rank: 0,
            peer_student_count: 0,
        },
        pacing: payload.pacing ?? {
            pace_vs_allotted_pct: 0,
            ended_early_rate_pct: 0,
        },
        engagement: payload.engagement ?? {
            avg_tests_per_week: 0,
            longest_gap_days: 0,
        },
        subject_comparison: payload.subject_comparison ?? [],
        error_patterns: payload.error_patterns ?? {
            by_difficulty: [],
            by_question_type: [],
        },
        topic_breakdown: payload.topic_breakdown ?? [],
        topic_pagination: payload.topic_pagination ?? {
            page: topicPage,
            page_size: topicPageSize,
            total_rows: 0,
            total_pages: 0,
        },
        trajectories: payload.trajectories ?? {
            daily: [],
            weekly: [],
        },
    } satisfies ParentStudentAnalytics);
}
