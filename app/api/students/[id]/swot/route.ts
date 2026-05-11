import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { StudentSwot } from "@/types/parent-analytics";

interface SwotRpcResponse {
    strengths?: StudentSwot["strengths"];
    weaknesses?: StudentSwot["weaknesses"];
    opportunities?: StudentSwot["opportunities"];
    threats?: StudentSwot["threats"];
    subject_swot?: StudentSwot["subject_swot"];
    meta?: StudentSwot["meta"];
}

const EMPTY_META: StudentSwot["meta"] = {
    student_overall_accuracy: 0,
    peer_overall_accuracy: 0,
    total_topics_analysed: 0,
    days_analysed: 0,
};

/**
 * GET /api/students/[id]/swot?days=90&subjectId=<uuid>
 *
 * Parent-only SWOT analysis endpoint.
 * Computes Strength/Weakness/Opportunity/Threat classification
 * per topic and per subject using DB-side aggregation.
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

    // Parse days
    const rawDays = request.nextUrl.searchParams.get("days");
    let days: number | null = 90;
    if (rawDays === "all") {
        days = null;
    } else if (rawDays) {
        const parsed = Number.parseInt(rawDays, 10);
        if (!Number.isFinite(parsed) || parsed < 7 || parsed > 3650) {
            return NextResponse.json(
                { error: "Invalid days parameter. Use a value between 7 and 3650." },
                { status: 400 },
            );
        }
        days = parsed;
    }

    // Parse optional subjectId
    const rawSubjectId = request.nextUrl.searchParams.get("subjectId");
    const subjectId =
        rawSubjectId && rawSubjectId !== "all" ? rawSubjectId : null;
    if (subjectId && !uuidRegex.test(subjectId)) {
        return NextResponse.json(
            { error: "Invalid subjectId parameter." },
            { status: 400 },
        );
    }

    // Verify parent owns this student
    const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("id", studentId)
        .eq("parent_id", user.id)
        .single();

    if (studentError || !student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const { data, error } = await supabase.rpc("get_student_swot", {
        p_parent_id: user.id,
        p_student_id: studentId,
        p_days: days,
        p_subject_id: subjectId,
    });

    if (error) {
        console.error("SWOT RPC failed:", error);
        return NextResponse.json(
            { error: "Failed to load SWOT analysis" },
            { status: 500 },
        );
    }

    const payload = (data || {}) as SwotRpcResponse;

    return NextResponse.json({
        strengths: payload.strengths ?? [],
        weaknesses: payload.weaknesses ?? [],
        opportunities: payload.opportunities ?? [],
        threats: payload.threats ?? [],
        subject_swot: payload.subject_swot ?? [],
        meta: payload.meta ?? EMPTY_META,
    } satisfies StudentSwot);
}
