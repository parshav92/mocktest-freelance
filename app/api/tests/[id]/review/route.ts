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
 * GET /api/tests/[id]/review
 * Get a completed test for review with all answers and solutions
 *
 * This endpoint is only available for completed tests (submitted, ended_early, abandoned)
 * Returns questions with:
 * - correct_answer
 * - solution_text
 * - student's selected answer
 * - whether the answer was correct
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

        // Only allow review for completed tests
        const completedStatuses = ["submitted", "ended_early", "abandoned"];
        if (!completedStatuses.includes(test.status)) {
            return errorResponse(
                "Can only review completed tests. This test is still " +
                    test.status,
                400,
            );
        }

        // Fetch questions with answers and solutions (validates subscription)
        const questions = await testService.getQuestionsForTest(
            // auth.session.student_id,
            test.questions_order,
            true, // Include correct answers
        );

        // Build detailed review data
        const reviewData = questions.map((question, index) => {
            const studentAnswer = test.answers.find(
                (a) => a.question_id === question.id,
            );

            return {
                question_number: index + 1,
                question,
                student_answer: studentAnswer?.selected ?? null,
                is_correct: studentAnswer?.is_correct ?? false,
                marks_earned: studentAnswer?.marks_earned ?? 0,
                time_spent_secs: studentAnswer?.time_spent_secs ?? 0,
                was_attempted: studentAnswer !== undefined,
            };
        });

        // Calculate summary statistics
        const summary = {
            total_questions: test.questions_order.length,
            attempted: test.answers.length,
            unattempted: test.questions_order.length - test.answers.length,
            correct: test.answers.filter((a) => a.is_correct).length,
            incorrect: test.answers.filter((a) => !a.is_correct).length,
            marks_obtained: test.marks_obtained,
            total_marks: test.total_marks,
            percentage: test.percentage,
            time_spent_secs: test.time_spent_secs,
            duration_mins: test.duration_mins,
            score_breakdown: test.score_breakdown,
        };

        return successResponse({
            test: {
                id: test.id,
                status: test.status,
                started_at: test.started_at,
                ended_at: test.ended_at,
                subject: test.subject,
            },
            questions: reviewData,
            summary,
            is_read_only,
        });
    } catch (error) {
        console.error("Error fetching test review:", error);
        return errorResponse(
            error instanceof Error
                ? error.message
                : "Failed to fetch test review",
            500,
        );
    }
}
