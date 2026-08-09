import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStudentEntitlements } from "@/lib/plans/entitlements";

/**
 * GET /api/students/[id]/entitlements
 * Parent-only: plan entitlements for UI gating.
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
        .select("id")
        .eq("id", studentId)
        .eq("parent_id", user.id)
        .maybeSingle();

    if (studentError || !student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const resolved = await getStudentEntitlements(studentId, supabase);
    if (!resolved.ok) {
        return NextResponse.json(
            {
                error: resolved.error,
                code: resolved.code,
                entitlements: null,
            },
            { status: 403 },
        );
    }

    const e = resolved.entitlements;
    return NextResponse.json({
        planKey: resolved.planKey,
        entitlements: {
            name: e.name,
            maxFullMocks: e.maxFullMocks,
            analyticsLevel: e.analyticsLevel,
            peerCompare: e.peerCompare,
            tips: e.tips,
        },
    });
}
