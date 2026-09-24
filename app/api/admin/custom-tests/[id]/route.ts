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

const VALID_VISIBILITIES = ["admin_only", "subscribers_only", "free_trial"];

/**
 * PATCH /api/admin/custom-tests/[id]
 *
 * Update an existing custom test (metadata + questions).
 * Questions are fully replaced when question_ids is provided.
 * Admin-only.
 *
 * Body (all optional except id from path):
 *   - name, slug, description, visibility, duration_mins,
 *     is_active, display_order, available_from, available_until,
 *     question_ids  (string[] – full replacement of assigned questions)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAdmin();
    if (!auth.isAdmin) {
        return errorResponse(auth.error, auth.status);
    }

    const { id } = await params;

    try {
        const body = await request.json();
        const {
            name,
            slug,
            description,
            visibility,
            duration_mins,
            is_active,
            display_order,
            available_from,
            available_until,
            question_ids,
        } = body as {
            name?: string;
            slug?: string;
            description?: string;
            visibility?: string;
            duration_mins?: number;
            is_active?: boolean;
            display_order?: number;
            available_from?: string | null;
            available_until?: string | null;
            question_ids?: string[];
        };

        const supabase = await createClient();

        // Confirm the test exists
        const { data: existing, error: fetchErr } = await supabase
            .from("custom_tests")
            .select("id, slug")
            .eq("id", id)
            .single();

        if (fetchErr || !existing) {
            return errorResponse("Custom test not found", 404);
        }

        // Build the update payload
        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (name !== undefined) {
            updates.name = typeof name === "string" ? name.trim() : name;
        }
        if (description !== undefined) {
            updates.description =
                typeof description === "string" ? description.trim() || null : null;
        }
        if (is_active !== undefined) updates.is_active = is_active;
        if (display_order !== undefined) updates.display_order = display_order;
        if (available_from !== undefined) updates.available_from = available_from || null;
        if (available_until !== undefined) updates.available_until = available_until || null;

        if (visibility !== undefined) {
            if (!VALID_VISIBILITIES.includes(visibility)) {
                return errorResponse(
                    `Visibility must be one of: ${VALID_VISIBILITIES.join(", ")}`,
                    400
                );
            }
            updates.visibility = visibility;
        }

        if (duration_mins !== undefined) {
            if (duration_mins < 1 || duration_mins > 300) {
                return errorResponse("Duration must be between 1 and 300 minutes", 400);
            }
            updates.duration_mins = duration_mins;
        }

        if (slug !== undefined) {
            const trimmedSlug = slug.trim();
            // Only check uniqueness if slug actually changed
            if (trimmedSlug !== existing.slug) {
                const { data: slugConflict } = await supabase
                    .from("custom_tests")
                    .select("id")
                    .eq("slug", trimmedSlug)
                    .single();
                if (slugConflict) {
                    return errorResponse("A test with this slug already exists", 409);
                }
            }
            updates.slug = trimmedSlug;
        }

        // Apply metadata update
        const { data: updatedTest, error: updateErr } = await supabase
            .from("custom_tests")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (updateErr) {
            console.error("Failed to update custom test:", updateErr);
            return errorResponse("Failed to update test", 500);
        }

        // Replace questions if provided
        if (question_ids !== undefined) {
            if (!Array.isArray(question_ids)) {
                return errorResponse("question_ids must be an array", 400);
            }

            if (question_ids.length === 0) {
                const { error: deleteErr } = await supabase
                    .from("custom_test_questions")
                    .delete()
                    .eq("custom_test_id", id);

                if (deleteErr) {
                    console.error("Failed to clear question assignments:", deleteErr);
                    return errorResponse("Failed to clear questions", 500);
                }
            } else {
                const { data: validQuestions, error: qError } = await supabase
                    .from("questions")
                    .select("id, is_active")
                    .in("id", question_ids);

                if (qError) {
                    return errorResponse("Failed to validate questions", 500);
                }

                const validIds = new Set((validQuestions || []).map((q) => q.id));
                const invalid = question_ids.filter((qid) => !validIds.has(qid));
                if (invalid.length > 0) {
                    return errorResponse(`Invalid question IDs: ${invalid.join(", ")}`, 400);
                }

                const inactiveIds = (validQuestions || [])
                    .filter((q) => !q.is_active)
                    .map((q) => q.id);
                if (inactiveIds.length > 0) {
                    return errorResponse(
                        `Inactive questions cannot be added to a custom test: ${inactiveIds.join(", ")}`,
                        400
                    );
                }

                const { error: deleteErr } = await supabase
                    .from("custom_test_questions")
                    .delete()
                    .eq("custom_test_id", id);

                if (deleteErr) {
                    console.error("Failed to delete old question assignments:", deleteErr);
                    return errorResponse("Failed to replace questions", 500);
                }

                const assignments = question_ids.map((qid, idx) => ({
                    custom_test_id: id,
                    question_id: qid,
                    sort_order: idx + 1,
                }));

                const { error: insertErr } = await supabase
                    .from("custom_test_questions")
                    .insert(assignments);

                if (insertErr) {
                    console.error("Failed to insert question assignments:", insertErr);
                    return errorResponse("Failed to assign questions", 500);
                }
            }
        }

        return successResponse({ test: updatedTest });
    } catch (err) {
        console.error("Internal server error:", err);
        return errorResponse("Internal server error", 500);
    }
}
