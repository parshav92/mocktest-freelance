import { getStudentSession } from "@/lib/auth/student";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getStudentSession();

    if (!session) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
        authenticated: true,
        student: {
            id: session.student_id,
            studentCode: session.student_code,
            fullName: session.full_name,
            isReadOnly: session.is_read_only,
        },
    });
}
