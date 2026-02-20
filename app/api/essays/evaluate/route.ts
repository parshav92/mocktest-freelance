import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/api/responses";
import { EssayEvaluationService } from "@/lib/services/essay-evaluation.service";

/**
 * Shared handler for processing the essay evaluation queue.
 */
async function processEssayQueue(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const batchSize = Math.min(
            parseInt(searchParams.get("batch_size") || "5", 10),
            20,
        );

        const supabase = await createClient();
        const essayService = new EssayEvaluationService(supabase);

        const result = await essayService.processQueue(batchSize);

        return successResponse({
            message: "Queue processed",
            ...result,
        });
    } catch (error) {
        console.error("Essay evaluation worker error:", error);
        return errorResponse(
            error instanceof Error ? error.message : "Worker failed",
            500,
        );
    }
}

/**
 * GET /api/essays/evaluate
 *
 * Called by Vercel Cron. Authenticated via CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
    // Vercel Cron sends the secret in the Authorization header
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return errorResponse("Unauthorized", 401);
    }

    return processEssayQueue(request);
}

/**
 * POST /api/essays/evaluate
 *
 * Manual trigger or external cron. Authenticated via ESSAY_EVAL_WORKER_SECRET.
 */
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    const workerSecret = process.env.ESSAY_EVAL_WORKER_SECRET;

    if (!workerSecret) {
        console.error("ESSAY_EVAL_WORKER_SECRET not configured");
        return errorResponse("Worker not configured", 500);
    }

    if (authHeader !== `Bearer ${workerSecret}`) {
        return errorResponse("Unauthorized", 401);
    }

    return processEssayQueue(request);
}
