import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, successResponse } from "@/lib/auth/admin";

/**
 * GET /api/admin/questions
 *
 * Fetch all questions with pagination and optional subject filter.
 * Admin-only endpoint.
 *
 * Query params:
 *   - limit   (default 30, max 100)
 *   - offset  (default 0)
 *   - subject_id  (optional UUID – filter by subject)
 *   - question_type (optional – filter by question type)
 *   - difficulty (optional – filter by difficulty)
 *   - search (optional – search by question code)
 */
export async function GET(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.isAdmin) {
        return errorResponse(auth.error, auth.status);
    }

    try {
        const { searchParams } = request.nextUrl;

        // Pagination
        const limit = Math.min(
            Math.max(parseInt(searchParams.get("limit") || "30", 10), 1),
            100
        );
        const offset = Math.max(
            parseInt(searchParams.get("offset") || "0", 10),
            0
        );

        // Filters
        const subjectId = searchParams.get("subject_id");
        const questionType = searchParams.get("question_type");
        const difficulty = searchParams.get("difficulty");
        const search = searchParams.get("search");

        const supabase = await createClient();

        // Build query
        let query = supabase
            .from("questions")
            .select(
                `
                id,
                subject_id,
                code,
                question_type,
                difficulty,
                content,
                correct_answer,
                solution_text,
                marks,
                is_active,
                times_shown,
                times_correct,
                created_at,
                updated_at,
                subjects!inner ( id, name, slug, icon )
                `,
                { count: "exact" }
            )
            .order("created_at", { ascending: false });

        // Apply filters
        if (subjectId) {
            query = query.eq("subject_id", subjectId);
        }
        if (questionType) {
            query = query.eq("question_type", questionType);
        }
        if (difficulty) {
            query = query.eq("difficulty", difficulty);
        }
        if (search) {
            query = query.ilike("code", `%${search}%`);
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data: questions, count, error } = await query;

        if (error) {
            console.error("Failed to fetch questions:", error);
            return errorResponse("Failed to fetch questions", 500);
        }

        return successResponse({
            questions: questions || [],
            total: count || 0,
            limit,
            offset,
        });
    } catch (err) {
        console.error("Internal server error:", err);
        return errorResponse("Internal server error", 500);
    }
}
