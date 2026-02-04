import { jwtVerify } from "jose";
import { cookies } from "next/headers";

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
