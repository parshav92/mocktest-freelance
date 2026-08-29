import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    requireAdmin,
    errorResponse,
    successResponse,
} from "@/lib/auth/admin";

/**
 * GET /api/admin/passage
 *
 * Fetch all passages with pagination and optional filters.
 * Admin-only endpoint.
 *
 * Query params:
 *   - limit        (default 20, max 100)
 *   - offset       (default 0)
 *   - subject_id   (optional UUID – filter by subject)
 *   - passage_type (optional – extract | poem | article)
 *   - search       (optional – search by passage code or title)
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
            Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
            100
        );
        const offset = Math.max(
            parseInt(searchParams.get("offset") || "0", 10),
            0
        );

        // Filters
        const subjectId = searchParams.get("subject_id");
        const passageType = searchParams.get("passage_type");
        const search = searchParams.get("search");

        const supabase = await createClient();

        // Build query
        let query = supabase
            .from("passages")
            .select(
                `
                id,
                subject_id,
                code,
                passage_type,
                title,
                content,
                image_url,
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
        if (passageType) {
            query = query.eq("passage_type", passageType);
        }
        if (search) {
            query = query.or(
                `code.ilike.%${search}%,title.ilike.%${search}%`
            );
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data: passages, count, error } = await query;

        if (error) {
            console.error("Failed to fetch passages:", error);
            return errorResponse("Failed to fetch passages", 500);
        }

        return successResponse({
            passages: passages || [],
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
 * PATCH /api/admin/passage
 *
 * Update a passage. Body: { id, title?, content?, passage_type?, image_url? }
 */
export async function PATCH(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.isAdmin) {
        return errorResponse(auth.error, auth.status);
    }

    try {
        const body = await request.json();
        const { id, title, content, passage_type, image_url } = body as {
            id: string;
            title?: string | null;
            content?: string;
            passage_type?: string;
            image_url?: string | null;
        };

        if (!id) {
            return errorResponse("Passage id is required", 400);
        }

        const allowed: Record<string, unknown> = {};
        if ("title" in body) allowed.title = title ?? null;
        if ("content" in body) {
            if (typeof content !== "string" || !content.trim()) {
                return errorResponse("Content is required", 400);
            }
            allowed.content = content;
        }
        if ("passage_type" in body) {
            if (!["extract", "poem", "article"].includes(passage_type ?? "")) {
                return errorResponse("Invalid passage type", 400);
            }
            allowed.passage_type = passage_type;
        }
        if ("image_url" in body) allowed.image_url = image_url ?? null;

        if (Object.keys(allowed).length === 0) {
            return errorResponse("No valid fields to update", 400);
        }

        const supabase = await createClient();
        const { data, error } = await supabase
            .from("passages")
            .update({ ...allowed, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select(
                `
                id,
                subject_id,
                code,
                passage_type,
                title,
                content,
                image_url,
                created_at,
                updated_at,
                subjects!inner ( id, name, slug, icon )
                `,
            )
            .single();

        if (error) {
            console.error("Failed to update passage:", error);
            return errorResponse("Failed to update passage", 500);
        }

        return successResponse({ passage: data });
    } catch (err) {
        console.error("Internal server error:", err);
        return errorResponse("Internal server error", 500);
    }
}
