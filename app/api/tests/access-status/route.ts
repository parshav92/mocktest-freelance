import { createClient } from "@/lib/supabase/server";
import {
  requireStudent,
  errorResponse,
  successResponse,
} from "@/lib/auth/student";
import { TestService } from "@/lib/services/test.service";

/**
 * GET /api/tests/access-status
 * Get the student's test access status based on subscription
 * 
 * Returns:
 * - can_take_new_tests: boolean
 * - is_in_grace_period: boolean
 * - subscription_status: 'active' | 'grace_period' | 'expired' | null
 * - expires_at: timestamp
 * - message: user-friendly message
 */
export async function GET() {
  const auth = await requireStudent();
  if (!auth.isAuthenticated) {
    return errorResponse(auth.error, auth.status);
  }

  try {
    const supabase = await createClient();
    const testService = new TestService(supabase);

    const accessStatus = await testService.getStudentTestAccessStatus(
      auth.session.student_id
    );

    return successResponse({
      ...accessStatus,
      student_id: auth.session.student_id,
    });
  } catch (error) {
    console.error("Error fetching access status:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch access status",
      500
    );
  }
}
