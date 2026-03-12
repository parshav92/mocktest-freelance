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
