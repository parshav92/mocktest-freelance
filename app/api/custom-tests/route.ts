import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/custom-tests
 *
 * List active custom tests filtered by visibility.
 * Used by the free-trial listing page.
 *
 * Query params:
 *   - visibility: "free_trial" | "admin_only" | "subscribers_only"
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const visibility = searchParams.get("visibility");

    const supabase = await createClient();

    // Must be authenticated
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 },
        );
    }

    let query = supabase
        .from("custom_tests")
        .select(
            `
            id,
            name,
            slug,
            description,
            visibility,
            duration_mins,
            display_order,
            custom_test_questions(count)
            `,
        )
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

    if (visibility) {
        query = query.eq("visibility", visibility);
    }

    const { data: tests, error } = await query;

    if (error) {
        console.error("Failed to fetch custom tests:", error);
        return NextResponse.json(
            { error: "Failed to fetch tests" },
            { status: 500 },
        );
    }

    const result = (tests || []).map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        visibility: t.visibility,
        duration_mins: t.duration_mins,
        display_order: t.display_order,
        question_count:
            (t.custom_test_questions as unknown as { count: number }[])?.[0]
                ?.count ?? 0,
    }));

    return NextResponse.json({ tests: result });
}
