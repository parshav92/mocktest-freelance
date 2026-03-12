import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    requireAdmin,
    errorResponse,
    successResponse,
} from "@/lib/auth/admin";

const VALID_VISIBILITIES = ["admin_only", "subscribers_only", "free_trial"];

/**
 * GET /api/admin/custom-tests
 *
 * List all custom tests with pagination.
 * Admin-only.
 *
 * Query params:
 *   - limit  (default 20, max 100)
 *   - offset (default 0)
 *   - visibility (optional filter)
 *   - search (optional – name/slug search)
 */
export async function GET(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.isAdmin) {
        return errorResponse(auth.error, auth.status);
    }

    try {
        const { searchParams } = request.nextUrl;

        const limit = Math.min(
            Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
            100
        );
        const offset = Math.max(
            parseInt(searchParams.get("offset") || "0", 10),
            0
        );
        const visibility = searchParams.get("visibility");
        const search = searchParams.get("search");

        const supabase = await createClient();

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
                is_active,
                display_order,
                available_from,
                available_until,
                created_by,
                created_at,
                updated_at,
                custom_test_questions ( id )
                `,
                { count: "exact" }
            )
            .order("created_at", { ascending: false });

        if (visibility && VALID_VISIBILITIES.includes(visibility)) {
            query = query.eq("visibility", visibility);
        }
        if (search) {
            query = query.or(
                `name.ilike.%${search}%,slug.ilike.%${search}%`
            );
        }

        query = query.range(offset, offset + limit - 1);

        const { data, count, error } = await query;

        if (error) {
            console.error("Failed to fetch custom tests:", error);
            return errorResponse("Failed to fetch custom tests", 500);
        }

        // Flatten question count
        const tests = (data || []).map((t) => ({
            ...t,
            question_count: Array.isArray(t.custom_test_questions)
                ? t.custom_test_questions.length
                : 0,
            custom_test_questions: undefined,
        }));

        return successResponse({
            tests,
            total: count || 0,
            limit,
            offset,
        });
    } catch (err) {
        console.error("Internal server error:", err);
        return errorResponse("Internal server error", 500);
    }
}

/**
 * POST /api/admin/custom-tests
 *
 * Create a new custom test with hand-picked questions.
 * Admin-only.
 *
 * Body:
 *   - name: string (required)
 *   - slug: string (required, unique)
 *   - description?: string
 *   - visibility: "admin_only" | "subscribers_only" | "free_trial"
 *   - duration_mins: number
 *   - instructions?: { title: string; content: string }[]
 *   - is_active?: boolean
 *   - display_order?: number
 *   - available_from?: string (ISO date)
 *   - available_until?: string (ISO date)
 *   - question_ids: string[] (ordered array of question UUIDs)
 */
export async function POST(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.isAdmin) {
        return errorResponse(auth.error, auth.status);
    }

    try {
        const body = await request.json();
        const {
            name,
            slug,
            description,
            visibility,
            duration_mins,
            instructions,
            is_active,
            display_order,
            available_from,
            available_until,
            question_ids,
        } = body;

        // Validate required fields
        if (!name?.trim()) {
            return errorResponse("Test name is required", 400);
        }
        if (!slug?.trim()) {
            return errorResponse("Slug is required", 400);
        }
        if (!visibility || !VALID_VISIBILITIES.includes(visibility)) {
            return errorResponse(
                `Visibility must be one of: ${VALID_VISIBILITIES.join(", ")}`,
                400
            );
        }
        if (!duration_mins || duration_mins < 1 || duration_mins > 300) {
            return errorResponse(
                "Duration must be between 1 and 300 minutes",
                400
            );
        }
        if (
            !question_ids ||
            !Array.isArray(question_ids) ||
            question_ids.length === 0
        ) {
            return errorResponse(
                "At least one question is required",
                400
            );
        }

        const supabase = await createClient();

        // Check slug uniqueness
        const { data: existing } = await supabase
            .from("custom_tests")
            .select("id")
            .eq("slug", slug.trim())
            .single();

        if (existing) {
            return errorResponse("A test with this slug already exists", 409);
        }

        // Verify all question IDs exist
        const { data: validQuestions, error: qError } = await supabase
            .from("questions")
            .select("id")
            .in("id", question_ids);

        if (qError) {
            return errorResponse("Failed to validate questions", 500);
        }

        const validIds = new Set((validQuestions || []).map((q) => q.id));
        const invalidIds = question_ids.filter(
            (id: string) => !validIds.has(id)
        );
        if (invalidIds.length > 0) {
            return errorResponse(
                `Invalid question IDs: ${invalidIds.join(", ")}`,
                400
            );
        }

        // Create the custom test
        const { data: newTest, error: insertError } = await supabase
            .from("custom_tests")
            .insert({
                name: name.trim(),
                slug: slug.trim(),
                description: description?.trim() || null,
                visibility,
                duration_mins,
                instructions: instructions || null,
                is_active: is_active ?? false,
                display_order: display_order ?? 0,
                available_from: available_from || null,
                available_until: available_until || null,
                created_by: auth.userId,
            })
            .select()
            .single();

        if (insertError) {
            console.error("Failed to create custom test:", insertError);
            return errorResponse("Failed to create custom test", 500);
        }

        // Insert question assignments
        const questionRows = question_ids.map(
            (qId: string, index: number) => ({
                custom_test_id: newTest.id,
                question_id: qId,
                sort_order: index,
            })
        );

        const { error: questionsInsertError } = await supabase
            .from("custom_test_questions")
            .insert(questionRows);

        if (questionsInsertError) {
            console.error(
                "Failed to insert test questions:",
                questionsInsertError
            );
            // Clean up the test if questions failed
            await supabase
                .from("custom_tests")
                .delete()
                .eq("id", newTest.id);
            return errorResponse("Failed to assign questions to test", 500);
        }

        return successResponse(
            {
                test: { ...newTest, question_count: question_ids.length },
                message: "Custom test created successfully",
            },
            201
        );
    } catch (err) {
        console.error("Internal server error:", err);
        return errorResponse("Internal server error", 500);
    }
}
