import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    requireStudent,
    errorResponse,
    successResponse,
} from "@/lib/auth/student";
import { TestService } from "@/lib/services/test.service";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/tests/[id]
 * Get a specific test with its questions
 *
 * For in-progress tests: Returns questions WITHOUT correct answers
 * For completed tests: Returns questions WITH correct answers and solutions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    const auth = await requireStudent();
    if (!auth.isAuthenticated) {
        return errorResponse(auth.error, auth.status);
    }

    const { id: testId } = await params;

    // Validate UUID format
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(testId)) {
        return errorResponse("Invalid test ID format", 400);
    }

    try {
        const supabase = await createClient();
        const testService = new TestService(supabase);

        const { test, can_access, is_read_only, reason } =
            await testService.getTest(testId, auth.session.student_id);

        if (!can_access) {
            return errorResponse(reason || "Cannot access this test", 403);
        }

        // Determine if we should include correct answers
        const isCompleted = ["submitted", "ended_early", "abandoned"].includes(
            test.status,
        );

        // Fetch questions (validates subscription)
        const questions = await testService.getQuestionsForTest(
            // auth.session.student_id,
            test.questions_order,
            isCompleted, // Include answers only for completed tests
        );

        return successResponse({
            test,
            questions,
            is_read_only,
            can_continue: test.status === "in_progress" && !is_read_only,
        });
    } catch (error) {
        console.error("Error fetching test:", error);
        return errorResponse(
            error instanceof Error ? error.message : "Failed to fetch test",
            500,
        );
    }
}

/**
 * PATCH /api/tests/[id]
 * Update a test (save answers, change status)
 *
 * Body options:
 * - action: "save_answer" | "start" | "end_early"
 * - For save_answer: { question_id, selected, time_spent_secs }
 * - For start: no additional params needed
 * - For end_early: no additional params needed
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const auth = await requireStudent();
    if (!auth.isAuthenticated) {
        return errorResponse(auth.error, auth.status);
    }

    const { id: testId } = await params;

    // Validate UUID format
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(testId)) {
        return errorResponse("Invalid test ID format", 400);
    }

    try {
        const body = await request.json();
        const { action } = body;

        if (!action) {
            return errorResponse("action is required", 400);
        }

        const supabase = await createClient();
        const testService = new TestService(supabase);

        switch (action) {
            case "start": {
                const test = await testService.startTest(
                    testId,
                    auth.session.student_id,
                );
                const questions = await testService.getQuestionsForTest(
                    // auth.session.student_id,
                    test.questions_order,
                    false,
                );
                return successResponse({
                    test,
                    questions,
                    message: "Test started successfully",
                });
            }

            case "end_early": {
                const test = await testService.endTestEarly(
                    testId,
                    auth.session.student_id,
                );
                return successResponse({
                    test,
                    message: "Test ended early",
                });
            }

            case "save_answer": {
                const { question_id, selected, time_spent_secs = 0 } = body;

                if (!question_id) {
                    return errorResponse(
                        "question_id is required for save_answer",
                        400,
                    );
                }

                if (selected === undefined) {
                    return errorResponse(
                        "selected is required for save_answer",
                        400,
                    );
                }

                await testService.saveAnswer(
                    testId,
                    auth.session.student_id,
                    question_id,
                    selected,
                    time_spent_secs,
                );

                return successResponse({
                    message: "Answer saved successfully",
                });
            }

            default:
                return errorResponse(
                    `Invalid action: ${action}. Use "start", "end_early", or "save_answer"`,
                    400,
                );
        }
    } catch (error) {
        console.error("Error updating test:", error);
        return errorResponse(
            error instanceof Error ? error.message : "Failed to update test",
            500,
        );
    }
}
