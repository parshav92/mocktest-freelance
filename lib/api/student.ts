import { NextResponse } from "next/server";
import { getStudentSession, StudentSession } from "@/lib/auth/student";

/**
 * Require authenticated student session
 * Returns { isAuthenticated: true, session } or { isAuthenticated: false, error, status }
 */
export async function requireStudent(): Promise<
  | { isAuthenticated: true; session: StudentSession }
  | { isAuthenticated: false; error: string; status: number }
> {
  const session = await getStudentSession();

  if (!session) {
    return {
      isAuthenticated: false,
      error: "Student session not found. Please log in.",
      status: 401,
    };
  }

  return { isAuthenticated: true, session };
}

/**
 * Require authenticated student who can take new tests (not read-only)
 */
export async function requireActiveStudent(): Promise<
  | { isAuthenticated: true; session: StudentSession }
  | { isAuthenticated: false; error: string; status: number }
> {
  const auth = await requireStudent();

  if (!auth.isAuthenticated) {
    return auth;
  }

  if (auth.session.is_read_only) {
    return {
      isAuthenticated: false,
      error: "Your subscription has expired. Please renew to start new tests.",
      status: 403,
    };
  }

  return auth;
}

/**
 * Helper to return error response
 */
export function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/**
 * Helper to return success response
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Helper to return subscription error response
 */
export function subscriptionErrorResponse(message: string) {
  return NextResponse.json(
    {
      error: message,
      subscription_error: true,
    },
    { status: 403 }
  );
}

/**
 * Test access result from database function
 */
export interface TestAccessResult {
  can_access: boolean;
  is_read_only: boolean;
  reason: string;
}
