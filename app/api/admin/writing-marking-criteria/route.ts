import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, errorResponse, successResponse } from "@/lib/auth/admin";
import type { MarkingCriteriaJson } from "@/lib/types/writing-marking-criteria";
import { WRITING_MAIN_TOPICS } from "@/lib/types/writing-marking-criteria";

function parseCriteria(raw: unknown) {
    if (!raw) return [];

    const json =
        typeof raw === "string"
            ? (JSON.parse(raw) as MarkingCriteriaJson)
            : (raw as MarkingCriteriaJson);

    return Array.isArray(json?.criteria) ? json.criteria : [];
}

/**
 * GET /api/admin/writing-marking-criteria
 * List writing marking criteria grouped by main topic for admin view.
 *
 * Uses the service-role client so reads are not blocked if RLS is enabled
 * on writing_marking_criteria without a SELECT policy.
 */
export async function GET() {
    const auth = await requireAdmin();
    if (!auth.isAdmin) return errorResponse(auth.error, auth.status);

    try {
        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("writing_marking_criteria")
            .select("id, main_topic, sub_topic, key_focus, marking_criteria")
            .order("main_topic", { ascending: true });

        if (error) {
            return errorResponse(error.message, 500);
        }

        const rows = data || [];

        const generalRow = rows.find(
            (r) => r.main_topic === "General" && r.sub_topic == null,
        );

        const styles = WRITING_MAIN_TOPICS.map((mainTopic) => {
            const styleRow = rows.find(
                (r) => r.main_topic === mainTopic && r.sub_topic == null,
            );
            const subtopics = rows
                .filter(
                    (r) =>
                        r.main_topic === mainTopic && r.sub_topic != null,
                )
                .map((r) => ({
                    id: r.id,
                    sub_topic: r.sub_topic as string,
                    key_focus: (r.key_focus as string | null) ?? null,
                    criteria: parseCriteria(r.marking_criteria),
                }))
                .sort((a, b) => a.sub_topic.localeCompare(b.sub_topic));

            return {
                main_topic: mainTopic,
                criteria: styleRow
                    ? parseCriteria(styleRow.marking_criteria)
                    : [],
                subtopics,
            };
        });

        return successResponse({
            general: {
                criteria: generalRow
                    ? parseCriteria(generalRow.marking_criteria)
                    : [],
            },
            styles,
        });
    } catch (err) {
        return errorResponse(
            err instanceof Error ? err.message : "Failed to load criteria",
            500,
        );
    }
}
