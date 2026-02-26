import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    requireStudent,
    errorResponse,
    successResponse,
} from "@/lib/auth/student";
import { EssayEvaluationService } from "@/lib/services/essay-evaluation.service";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/tests/[id]/essay-status
 * Get essay evaluation status for a submitted test.
 * Used by the review page to poll for evaluation completion.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    const auth = await requireStudent();
    if (!auth.isAuthenticated) {
        return errorResponse(auth.error, auth.status);
    }

    const { id: testId } = await params;

    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(testId)) {
        return errorResponse("Invalid test ID format", 400);
    }

    try {
        const supabase = await createClient();
        const essayService = new EssayEvaluationService(supabase);

        const evaluations = await essayService.getEvaluationsForTest(testId);

        // Determine overall status
        const allCompleted =
            evaluations.length > 0 &&
            evaluations.every((e) => e.status === "completed");
        const anyFailed = evaluations.some((e) => e.status === "failed");
        const anyPending = evaluations.some(
            (e) => e.status === "pending" || e.status === "processing",
        );

        let overallStatus:
            | "no_essays"
            | "pending"
            | "completed"
            | "partial"
            | "failed";
        if (evaluations.length === 0) {
            overallStatus = "no_essays";
        } else if (allCompleted) {
            overallStatus = "completed";
        } else if (anyFailed && !anyPending) {
            overallStatus = "failed";
        } else if (anyPending) {
            overallStatus = "pending";
        } else {
            overallStatus = "partial";
        }
        console.log(
            `[EssayStatus] GET /api/tests/${testId}/essay-status — status: ${overallStatus}, evaluations: ${evaluations.length}`,
        );

        return successResponse({
            status: overallStatus,
            evaluations,
        });
    } catch (error) {
        console.error("Error fetching essay status:", error);
        return errorResponse(
            error instanceof Error
                ? error.message
                : "Failed to fetch essay status",
            500,
        );
    }
}
