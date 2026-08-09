import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTips } from "@/lib/plans/entitlements";
import { featureLockedErrorResponse } from "@/lib/api/responses";
import { PLAN_TIPS } from "@/lib/plans/tips-content";

/**
 * GET /api/students/[id]/tips
 * Parent-only tips & tricks (Platinum / tips entitlement).
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

    const gate = await requireTips(studentId, supabase);
    if (!gate.ok) {
        return featureLockedErrorResponse(gate.error, gate.feature);
    }

    return NextResponse.json({
        tips: PLAN_TIPS,
        planKey: gate.planKey,
        planName: gate.entitlements.name,
    });
}
