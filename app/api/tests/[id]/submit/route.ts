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
 * POST /api/tests/[id]/submit
 * Submit a test for grading
 * 
 * This endpoint:
 * 1. Validates the test belongs to the student and is in_progress
 * 2. Grades all answers
 * 3. Updates the test with scores
 * 4. Returns the graded test with correct answers
 * 
 * Note: Database triggers will automatically:
 * - Update student_subject_stats (overall performance)
 * - Update student_question_history (per-question tracking)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireStudent();
  if (!auth.isAuthenticated) {
    return errorResponse(auth.error, auth.status);
  }

  const { id: testId } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(testId)) {
    return errorResponse("Invalid test ID format", 400);
  }

  try {
    const supabase = await createClient();
    const testService = new TestService(supabase);

    // Submit and grade the test
    const { test, questions } = await testService.submitTest(
      testId,
      auth.session.student_id
    );

    // Build response with questions and student answers
    const questionsWithAnswers = questions.map((question) => {
      const studentAnswer = test.answers.find(
        (a) => a.question_id === question.id
      );
      return {
        ...question,
        student_answer: studentAnswer || null,
      };
    });

    return successResponse({
      test,
      questions_with_answers: questionsWithAnswers,
      summary: {
        total_questions: test.questions_order.length,
        answered: test.answers.length,
        correct: test.answers.filter((a) => a.is_correct).length,
        marks_obtained: test.marks_obtained,
        total_marks: test.total_marks,
        percentage: test.percentage,
        time_spent_secs: test.time_spent_secs,
        score_breakdown: test.score_breakdown,
      },
      message: "Test submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting test:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to submit test",
      500
    );
  }
}
