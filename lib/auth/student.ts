import { jwtVerify } from "jose";
import { cookies } from "next/headers";

// Re-export response helpers for convenience
export {
  errorResponse,
  successResponse,
  subscriptionErrorResponse,
} from "@/lib/api/responses";

const STUDENT_JWT_SECRET = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET || "your-super-secret-key-change-in-production"
);

export interface StudentSession {
  student_id: string;
  student_code: string;
  parent_id: string;
  full_name: string;
  is_read_only: boolean;
}

export async function getStudentSession(): Promise<StudentSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("student_session")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, STUDENT_JWT_SECRET);

    return {
      student_id: payload.student_id as string,
      student_code: payload.student_code as string,
      parent_id: payload.parent_id as string,
      full_name: payload.full_name as string,
      is_read_only: payload.is_read_only as boolean,
    };
  } catch {
    return null;
  }
}

/**
 * Require authenticated student session for API routes
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
 * Test access result from database function
 */
export interface TestAccessResult {
  can_access: boolean;
  is_read_only: boolean;
  reason: string;
}
