import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    requireAdmin,
    errorResponse,
    successResponse,
} from "@/lib/auth/admin";

/**
 * GET /api/admin/custom-tests/[id]
 *
 * Fetch a single custom test with its assigned questions (full details).
 * Admin-only.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAdmin();
    if (!auth.isAdmin) {
        return errorResponse(auth.error, auth.status);
    }

    const { id } = await params;

    try {
        const supabase = await createClient();

        // Fetch the custom test
        const { data: test, error: testError } = await supabase
            .from("custom_tests")
            .select("*")
            .eq("id", id)
            .single();

        if (testError || !test) {
            return errorResponse("Custom test not found", 404);
        }

        // Fetch assigned questions with full details, ordered
        const { data: assignments, error: assignError } = await supabase
            .from("custom_test_questions")
            .select(
                `
                id,
                question_id,
                sort_order,
                questions (
                    id,
                    subject_id,
                    code,
                    question_type,
                    difficulty,
                    topic,
                    subtopic,
                    content,
                    correct_answer,
                    marks,
                    is_active,
                    subjects ( id, name, slug, icon )
                )
                `
            )
            .eq("custom_test_id", id)
            .order("sort_order", { ascending: true });

        if (assignError) {
            console.error("Failed to fetch test questions:", assignError);
            return errorResponse("Failed to fetch test questions", 500);
        }

        return successResponse({
            test,
            questions: assignments || [],
        });
    } catch (err) {
        console.error("Internal server error:", err);
        return errorResponse("Internal server error", 500);
    }
}
