import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireStudent,
  requireActiveStudent,
  errorResponse,
  successResponse,
  subscriptionErrorResponse,
} from "@/lib/api/student";
import { TestService } from "@/lib/services/test.service";
import type { TestStatus } from "@/types/test";

/**
 * GET /api/tests
 * List all tests for the authenticated student
 * 
 * Query params:
 * - subject_id: Filter by subject
 * - status: Filter by status (can be comma-separated for multiple)
 * - limit: Number of results (default 10)
 * - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  // Authenticate student
  const auth = await requireStudent();
  if (!auth.isAuthenticated) {
    return errorResponse(auth.error, auth.status);
  }

  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subject_id") || undefined;
  const statusParam = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Parse status filter
  let status: TestStatus | TestStatus[] | undefined;
  if (statusParam) {
    const statuses = statusParam.split(",") as TestStatus[];
    status = statuses.length === 1 ? statuses[0] : statuses;
  }

  try {
    const supabase = await createClient();
    const testService = new TestService(supabase);

    const { tests, total } = await testService.getStudentTests(
      auth.session.student_id,
      { subjectId, status, limit, offset }
    );

    // Also get subscription status for UI
    const accessStatus = await testService.getStudentTestAccessStatus(
      auth.session.student_id
    );

    return successResponse({
      tests,
      total,
      limit,
      offset,
      access_status: accessStatus,
    });
  } catch (error) {
    console.error("Error fetching tests:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch tests",
      500
    );
  }
}

/**
 * POST /api/tests
 * Create a new test for the authenticated student
 * 
 * Body:
 * - subject_id: UUID of the subject
 * - start_immediately: boolean (default: true) - whether to start the test immediately
 */
export async function POST(request: NextRequest) {
  // Require active subscription (not read-only)
  const auth = await requireActiveStudent();
  if (!auth.isAuthenticated) {
    // Check if it's a subscription error
    if (auth.status === 403) {
      return subscriptionErrorResponse(auth.error);
    }
    return errorResponse(auth.error, auth.status);
  }

  try {
    const body = await request.json();
    const { subject_id, start_immediately = true } = body;

    if (!subject_id) {
      return errorResponse("subject_id is required", 400);
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(subject_id)) {
      return errorResponse("Invalid subject_id format", 400);
    }

    const supabase = await createClient();
    const testService = new TestService(supabase);

    // Verify student can take new tests
    const canTakeTest = await testService.canStudentTakeTest(
      auth.session.student_id
    );

    if (!canTakeTest) {
      return subscriptionErrorResponse(
        "You need an active subscription to start new tests."
      );
    }

    // Create the test
    const { test, questions } = await testService.createTest(
      auth.session.student_id,
      subject_id
    );

    // Start the test immediately if requested
    let finalTest = test;
    if (start_immediately) {
      finalTest = await testService.startTest(test.id, auth.session.student_id);
    }

    return successResponse(
      {
        test: finalTest,
        questions,
        message: start_immediately
          ? "Test started successfully"
          : "Test created successfully",
      },
      201
    );
  } catch (error) {
    console.error("Error creating test:", error);
    
    const message = error instanceof Error ? error.message : "Failed to create test";
    
    // Check for subscription-related errors
    if (message.toLowerCase().includes("subscription")) {
      return subscriptionErrorResponse(message);
    }
    
    return errorResponse(message, 500);
  }
}
