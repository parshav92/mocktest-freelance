import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

// GET - Fetch all students for the current parent
export async function GET() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: students, error } = await supabase
        .from("students")
        .select(
            `
      *,
      subscription:subscriptions(*)
    `,
        )
        .eq("parent_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ students });
}

// POST - Create a new student and assign to subscription
export async function POST(request: Request) {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { fullName, password, subscriptionId } = await request.json();

        // Validate inputs
        if (!fullName || !password || !subscriptionId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 },
            );
        }

        if (!/^\d{6}$/.test(password)) {
            return NextResponse.json(
                { error: "Password must be exactly 6 digits" },
                { status: 400 },
            );
        }

        // Verify subscription belongs to this parent and has no student assigned
        const { data: subscription, error: subError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("id", subscriptionId)
            .eq("parent_id", user.id)
            .is("student_id", null)
            .single();

        if (subError || !subscription) {
            return NextResponse.json(
                { error: "Invalid or already used subscription" },
                { status: 400 },
            );
        }

        // Generate unique student ID
        const { data: studentIdData, error: genError } = await supabase.rpc(
            "generate_student_id",
        );

        if (genError) {
            return NextResponse.json(
                { error: "Failed to generate student ID" },
                { status: 500 },
            );
        }

        // Check if generated ID is unique (retry if collision)
        let studentId = studentIdData;
        let attempts = 0;
        while (attempts < 5) {
            const { data: existing } = await supabase
                .from("students")
                .select("id")
                .eq("student_id", studentId)
                .single();

            if (!existing) break;

            // Regenerate
            const { data: newId } = await supabase.rpc("generate_student_id");
            studentId = newId;
            attempts++;
        }

        if (attempts >= 5) {
            return NextResponse.json(
                { error: "Failed to generate unique student ID" },
                { status: 500 },
            );
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create student
        const { data: student, error: studentError } = await supabase
            .from("students")
            .insert({
                student_id: studentId,
                password_hash: passwordHash,
                full_name: fullName,
                parent_id: user.id,
                is_active: true,
            })
            .select()
            .single();

        if (studentError) {
            return NextResponse.json(
                { error: studentError.message },
                { status: 500 },
            );
        }

        // Link student to subscription and denormalize plan onto student
        const { error: linkError } = await supabase
            .from("subscriptions")
            .update({ student_id: student.id })
            .eq("id", subscriptionId);

        if (linkError) {
            await supabase.from("students").delete().eq("id", student.id);
            return NextResponse.json(
                { error: "Failed to link student to subscription" },
                { status: 500 },
            );
        }

        const { error: planSyncError } = await supabase
            .from("students")
            .update({
                plan_key: subscription.plan,
                plan_expires_at: subscription.expires_at,
                is_active: true,
            })
            .eq("id", student.id);

        if (planSyncError) {
            console.error("Failed to sync student plan_key:", planSyncError);
            // Subscription is linked; plan_key can be repaired by cron/backfill
        }

        return NextResponse.json({
            student: {
                id: student.id,
                student_id: student.student_id,
                full_name: student.full_name,
            },
        });
    } catch {
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 },
        );
    }
}
