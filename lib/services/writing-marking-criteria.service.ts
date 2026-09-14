import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
    MarkingCriteriaJson,
    MergedMarkingCriteria,
    WritingMainTopic,
} from "@/lib/types/writing-marking-criteria";
import { WRITING_MAIN_TOPICS } from "@/lib/types/writing-marking-criteria";

function normalizeTopicValue(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

export function normalizeWritingTopic(value: string): string {
    return normalizeTopicValue(value);
}

export function canonicalizeWritingMainTopic(value: string): WritingMainTopic | null {
    const normalized = normalizeTopicValue(value).toLowerCase();
    return (
        WRITING_MAIN_TOPICS.find(
            (topic) => topic.toLowerCase() === normalized,
        ) ?? null
    );
}

export function isWritingMainTopic(value: string): value is WritingMainTopic {
    return canonicalizeWritingMainTopic(value) !== null;
}

export function buildTopicPairKey(mainTopic: string, subTopic: string): string {
    return `${normalizeTopicValue(mainTopic).toLowerCase()}::${normalizeTopicValue(subTopic).toLowerCase()}`;
}

/**
 * Always reads via service role — writing_marking_criteria may have RLS
 * without a SELECT policy for the session client.
 */
function criteriaClient(_supabase?: SupabaseClient) {
    return createAdminClient();
}

export async function loadValidWritingSubtopicKeys(
    _supabase?: SupabaseClient,
): Promise<Set<string>> {
    const { data, error } = await criteriaClient(_supabase)
        .from("writing_marking_criteria")
        .select("main_topic, sub_topic")
        .not("sub_topic", "is", null);

    if (error) {
        throw new Error(
            `Failed to load writing marking criteria: ${error.message}`,
        );
    }

    return new Set(
        (data || []).map((row) =>
            buildTopicPairKey(row.main_topic, row.sub_topic as string),
        ),
    );
}

export function validateWritingTopicPair(
    validPairs: Set<string>,
    topic: string,
    subtopic: string,
): string | null {
    const normalizedTopic = normalizeTopicValue(topic);
    const normalizedSubtopic = normalizeTopicValue(subtopic);

    if (!isWritingMainTopic(normalizedTopic)) {
        return `topic must be one of: ${WRITING_MAIN_TOPICS.join(", ")}`;
    }

    if (!normalizedSubtopic) {
        return "subtopic is required for writing essay questions";
    }

    if (
        !validPairs.has(buildTopicPairKey(normalizedTopic, normalizedSubtopic))
    ) {
        return `No marking criteria found for topic "${normalizedTopic}" and subtopic "${normalizedSubtopic}"`;
    }

    return null;
}

function parseCriteriaJson(
    mainTopic: string,
    markingCriteria: MarkingCriteriaJson | string | null,
): MergedMarkingCriteria["criteria"] {
    const parsed =
        typeof markingCriteria === "string"
            ? (JSON.parse(markingCriteria) as MarkingCriteriaJson)
            : markingCriteria;

    if (!parsed?.criteria?.length) {
        return [];
    }

    return parsed.criteria.map((criterion) => ({
        name: criterion.name,
        style: mainTopic,
        descriptions: criterion.descriptions,
    }));
}

export async function getMergedMarkingCriteria(
    _supabase: SupabaseClient | undefined,
    mainTopic: string,
    subTopic: string,
): Promise<MergedMarkingCriteria> {
    const normalizedMainTopic =
        canonicalizeWritingMainTopic(mainTopic) ??
        normalizeTopicValue(mainTopic);
    const normalizedSubTopic = normalizeTopicValue(subTopic);

    const { data, error } = await criteriaClient(_supabase)
        .from("writing_marking_criteria")
        .select("main_topic, sub_topic, key_focus, marking_criteria")
        .in("main_topic", [normalizedMainTopic, "General"]);

    if (error) {
        throw new Error(
            `Failed to fetch marking criteria: ${error.message}`,
        );
    }

    const rows = data || [];
    const styleRow = rows.find(
        (row) =>
            row.main_topic === normalizedMainTopic && row.sub_topic == null,
    );
    const generalRow = rows.find(
        (row) => row.main_topic === "General" && row.sub_topic == null,
    );
    const subtopicRow = rows.find(
        (row) =>
            row.main_topic === normalizedMainTopic &&
            row.sub_topic != null &&
            normalizeTopicValue(row.sub_topic) === normalizedSubTopic,
    );

    if (!styleRow) {
        throw new Error(
            `No style criteria found for main topic "${normalizedMainTopic}"`,
        );
    }

    if (!generalRow) {
        throw new Error("General marking criteria are not configured");
    }

    const criteria = [
        ...parseCriteriaJson(
            normalizedMainTopic,
            styleRow.marking_criteria as MarkingCriteriaJson,
        ),
        ...parseCriteriaJson(
            "General",
            generalRow.marking_criteria as MarkingCriteriaJson,
        ),
    ];

    if (criteria.length === 0) {
        throw new Error(
            `Marking criteria for "${normalizedMainTopic}" are empty`,
        );
    }

    return {
        mainTopic: normalizedMainTopic,
        subTopic: normalizedSubTopic,
        keyFocus: (subtopicRow?.key_focus as string | null) ?? null,
        criteria,
    };
}

export function formatMarkingCriteriaForPrompt(
    merged: MergedMarkingCriteria,
): string {
    return merged.criteria
        .map((criterion) => {
            return `### ${criterion.name} (${criterion.style})
Level 5 (High Achievement): ${criterion.descriptions.high}
Level 3 (Satisfactory): ${criterion.descriptions.satisfactory}`;
        })
        .join("\n\n");
}
