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
 *   - sort_order (optional – 'asc' or 'desc', default 'desc')
 *   - code_from (optional – start of code range, inclusive)
 *   - code_to   (optional – end of code range, inclusive)
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

        // Sort order
        const sortOrder = searchParams.get("sort_order");
        const ascending = sortOrder === "asc";

        // Code range search
        const codeFrom = searchParams.get("code_from");
        const codeTo = searchParams.get("code_to");

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
                topic,
                subtopic,
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
            .order("code", { ascending });

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
        if (codeFrom) {
            query = query.gte("code", codeFrom.toUpperCase());
        }
        if (codeTo) {
            query = query.lte("code", codeTo.toUpperCase());
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

/**
 * PATCH /api/admin/questions
 *
 * Partial update for a question. Supports:
 *   - content        (question content object)
 *   - correct_answer (correct answer object)
 *   - solution_text  (solution string)
 *   - difficulty     (easy | medium | hard)
 *   - marks          (number)
 *   - is_active      (boolean)
 *
 * Body: { id: string, ...fields }
 * OR for bulk toggle: { ids: string[], is_active: boolean }
 */
export async function PATCH(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.isAdmin) {
        return errorResponse(auth.error, auth.status);
    }

    try {
        const body = await request.json();

        // ── Bulk toggle: { ids: string[], is_active: boolean } ──
        if (Array.isArray(body.ids)) {
            const { ids, is_active } = body as { ids: string[]; is_active: boolean };
            if (!ids.length || typeof is_active !== "boolean") {
                return errorResponse("ids (array) and is_active (boolean) are required", 400);
            }

            const supabase = await createClient();
            const { error } = await supabase
                .from("questions")
                .update({ is_active, updated_at: new Date().toISOString() })
                .in("id", ids);

            if (error) {
                console.error("Failed to bulk update questions:", error);
                return errorResponse("Failed to bulk update questions", 500);
            }

            return successResponse({ updated: ids.length });
        }

        // ── Single question update ──
        const { id, ...updates } = body as {
            id: string;
            content?: Record<string, unknown>;
            correct_answer?: Record<string, unknown>;
            solution_text?: string | null;
            difficulty?: string;
            marks?: number;
            is_active?: boolean;
        };

        if (!id) {
            return errorResponse("Question id is required", 400);
        }

        // Only allow safe fields
        const allowed: Record<string, unknown> = {};
        if ("content" in updates) allowed.content = updates.content;
        if ("correct_answer" in updates) allowed.correct_answer = updates.correct_answer;
        if ("solution_text" in updates) allowed.solution_text = updates.solution_text;
        if ("difficulty" in updates) allowed.difficulty = updates.difficulty;
        if ("marks" in updates) allowed.marks = updates.marks;
        if ("is_active" in updates) allowed.is_active = updates.is_active;

        if (Object.keys(allowed).length === 0) {
            return errorResponse("No valid fields to update", 400);
        }

        const supabase = await createClient();
        const { data, error } = await supabase
            .from("questions")
            .update({ ...allowed, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Failed to update question:", error);
            return errorResponse("Failed to update question", 500);
        }

        return successResponse({ question: data });
    } catch (err) {
        console.error("Internal server error:", err);
        return errorResponse("Internal server error", 500);
    }
}

/**
 * DELETE /api/admin/questions
 *
 * Permanently deletes a question by id.
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.isAdmin) {
        return errorResponse(auth.error, auth.status);
    }

    try {
        const body = await request.json();
        const { id } = body as { id: string };

        if (!id) {
            return errorResponse("Question id is required", 400);
        }

        const supabase = await createClient();
        const { error } = await supabase
            .from("questions")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Failed to delete question:", error);
            return errorResponse("Failed to delete question", 500);
        }

        return successResponse({ deleted: true });
    } catch (err) {
        console.error("Internal server error:", err);
        return errorResponse("Internal server error", 500);
    }
}
