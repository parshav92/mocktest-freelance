import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";

const STUDENT_JWT_SECRET = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET || "your-super-secret-key-change-in-production"
);

export async function POST(request: Request) {
  try {
    const { studentId, password } = await request.json();

    if (!studentId || !password) {
      return NextResponse.json(
        { error: "Student ID and password are required" },
        { status: 400 }
      );
    }

    const normalizedStudentId = studentId.toUpperCase().trim();

    // Validate format
    if (!/^STU[A-Z0-9]{5}$/.test(normalizedStudentId)) {
      return NextResponse.json(
        { error: "Invalid Student ID format" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get client IP for rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
               request.headers.get("x-real-ip") || 
               "unknown";

    // Check rate limiting
    const { data: isRateLimited } = await supabase.rpc("is_student_rate_limited", {
      p_student_id: normalizedStudentId,
      p_ip: ip,
    });

    if (isRateLimited) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    // Find student
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, student_id, password_hash, full_name, parent_id, is_active")
      .eq("student_id", normalizedStudentId)
      .single();

    // Record login attempt (will be done regardless of success/failure)
    const recordAttempt = async (success: boolean) => {
      await supabase.from("student_login_attempts").insert({
        student_id_input: normalizedStudentId,
        ip_address: ip,
        success,
      });
    };

    if (studentError || !student) {
      await recordAttempt(false);
      return NextResponse.json(
        { error: "Invalid Student ID or password" },
        { status: 401 }
      );
    }

    if (!student.is_active) {
      await recordAttempt(false);
      return NextResponse.json(
        { error: "This account has been deactivated" },
        { status: 403 }
      );
    }

    // Verify password
    const passwordMatch = await compare(password, student.password_hash);

    if (!passwordMatch) {
      await recordAttempt(false);
      return NextResponse.json(
        { error: "Invalid Student ID or password" },
        { status: 401 }
      );
    }

    // Check subscription status
    const { data: subscriptionStatus } = await supabase.rpc(
      "get_student_subscription_status",
      { p_student_id: student.id }
    );

    const subscription = subscriptionStatus?.[0];
    
    if (!subscription || subscription.status === "expired") {
      await recordAttempt(false);
      return NextResponse.json(
        { error: "Your subscription has expired. Please contact your parent." },
        { status: 403 }
      );
    }

    // Record successful login
    await recordAttempt(true);

    // Generate JWT (30 days expiry)
    const token = await new SignJWT({
      student_id: student.id,
      student_code: student.student_id,
      parent_id: student.parent_id,
      full_name: student.full_name,
      is_read_only: subscription.is_read_only,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(STUDENT_JWT_SECRET);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("student_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        studentId: student.student_id,
        fullName: student.full_name,
        isReadOnly: subscription.is_read_only,
      },
    });
  } catch (error) {
    console.error("Student login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
