import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/custom-tests/[slug]
 *
 * Fetch a custom test by slug for test-taking.
 * Returns questions WITHOUT correct_answer (to prevent cheating).
 *
 * Access rules based on visibility:
 *   - free_trial:       any authenticated user (Supabase auth)
 *   - admin_only:       admin with MFA only
 *   - subscribers_only: authenticated user with active subscription
 *
 * The test must also be active (is_active = true).
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const supabase = await createClient();

    // Check authenticated user (Supabase auth — covers parents and admins)
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 },
        );
    }

    // Fetch the custom test
    const { data: test, error: testError } = await supabase
        .from("custom_tests")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

    if (testError || !test) {
        return NextResponse.json(
            { error: "Test not found or not active" },
            { status: 404 },
        );
    }

    // ── Visibility check ──────────────────────────────────
    const visibility = test.visibility as string;

    if (visibility === "admin_only") {
        // Must be an admin with MFA
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 },
            );
        }

        const { data: mfa } = await supabase
            .from("admin_mfa_sessions")
            .select("mfa_expires_at")
            .eq("admin_id", user.id)
            .single();

        const expiresAt = mfa?.mfa_expires_at
            ? new Date(mfa.mfa_expires_at)
            : null;

        if (!expiresAt || expiresAt <= new Date()) {
            return NextResponse.json(
                { error: "MFA session expired" },
                { status: 401 },
            );
        }
    }

    // free_trial: any authenticated user is fine (already verified above)
    // subscribers_only: TODO — check subscription when needed

    // ── Fetch questions (without correct_answer) ──────────
    const { data: assignments, error: assignError } = await supabase
        .from("custom_test_questions")
        .select(
            `
            id,
            question_id,
            sort_order,
            questions (
                id,
                code,
                question_type,
                difficulty,
                content,
                marks,
                passage_ids
            )
            `,
        )
        .eq("custom_test_id", test.id)
        .order("sort_order", { ascending: true });

    if (assignError) {
        console.error("Failed to fetch test questions:", assignError);
        return NextResponse.json(
            { error: "Failed to fetch test questions" },
            { status: 500 },
        );
    }

    // Flatten questions and collect passage IDs
    const allPassageIds = new Set<string>();
    const questions = (assignments || []).map((a) => {
        const q = a.questions as unknown as {
            id: string;
            code: string;
            question_type: string;
            difficulty: string;
            content: Record<string, unknown>;
            marks: number;
            passage_ids: string[] | null;
        };

        if (q.passage_ids) {
            for (const pid of q.passage_ids) {
                allPassageIds.add(pid);
            }
        }

        return {
            id: q.id,
            code: q.code,
            question_type: q.question_type,
            difficulty: q.difficulty,
            content: q.content,
            marks: q.marks,
            passage_ids: q.passage_ids || [],
        };
    });

    // Fetch passages if any
    let passagesMap: Record<
        string,
        {
            id: string;
            code: string;
            passage_type: string;
            title: string | null;
            content: string;
            image_url: string | null;
        }
    > = {};

    if (allPassageIds.size > 0) {
        const { data: passages } = await supabase
            .from("passages")
            .select("id, code, passage_type, title, content, image_url")
            .in("id", Array.from(allPassageIds));

        if (passages) {
            for (const p of passages) {
                passagesMap[p.id] = p;
            }
        }
    }

    // Attach passages to questions
    const questionsWithPassages = questions.map((q) => ({
        id: q.id,
        code: q.code,
        question_type: q.question_type,
        difficulty: q.difficulty,
        content: q.content,
        marks: q.marks,
        passages: (q.passage_ids || [])
            .map((pid: string) => passagesMap[pid])
            .filter(Boolean),
    }));

    return NextResponse.json({
        test: {
            id: test.id,
            name: test.name,
            slug: test.slug,
            description: test.description,
            visibility: test.visibility,
            duration_mins: test.duration_mins,
            instructions: test.instructions,
        },
        questions: questionsWithPassages,
    });
  } catch (err) {
    console.error("Custom test GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
