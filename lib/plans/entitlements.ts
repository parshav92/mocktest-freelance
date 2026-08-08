import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AnalyticsLevel = "none" | "basic" | "full";

export interface PlanEntitlements {
    key: string;
    name: string;
    /** null = unlimited */
    maxFullMocks: number | null;
    analyticsLevel: AnalyticsLevel;
    peerCompare: boolean;
    tips: boolean;
    displayOrder: number;
    isActive: boolean;
    updatedAt: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h safety net; cleared on admin plan save

let cache: { loadedAt: number; byKey: Map<string, PlanEntitlements> } | null =
    null;

function rowToEntitlements(row: {
    key: string;
    name: string;
    max_full_mocks: number | null;
    analytics_level: string;
    peer_compare: boolean;
    tips: boolean;
    display_order: number;
    is_active: boolean;
    updated_at: string;
}): PlanEntitlements {
    return {
        key: row.key,
        name: row.name,
        maxFullMocks: row.max_full_mocks,
        analyticsLevel: row.analytics_level as AnalyticsLevel,
        peerCompare: row.peer_compare,
        tips: row.tips,
        displayOrder: row.display_order,
        isActive: row.is_active,
        updatedAt: row.updated_at,
    };
}

/** Clear in-process cache (only after admin plan rule updates). */
export function invalidatePlansCache() {
    cache = null;
}

async function loadPlansMap(
    supabase?: SupabaseClient,
    options?: { forceRefresh?: boolean },
): Promise<Map<string, PlanEntitlements>> {
    const now = Date.now();
    if (
        !options?.forceRefresh &&
        cache &&
        now - cache.loadedAt < CACHE_TTL_MS
    ) {
        return cache.byKey;
    }

    const client = supabase ?? (await createClient());
    const { data, error } = await client
        .from("plans")
        .select(
            "key, name, max_full_mocks, analytics_level, peer_compare, tips, display_order, is_active, updated_at",
        )
        .order("display_order", { ascending: true });

    if (error) {
        console.error("Failed to load plans:", error);
        if (cache) return cache.byKey;
        throw new Error(error.message || "Failed to load plans");
    }

    const byKey = new Map<string, PlanEntitlements>();
    for (const row of data ?? []) {
        byKey.set(row.key, rowToEntitlements(row));
    }

    cache = { loadedAt: now, byKey };
    return byKey;
}

export async function listPlanEntitlements(
    supabase?: SupabaseClient,
    options?: { forceRefresh?: boolean },
): Promise<PlanEntitlements[]> {
    const map = await loadPlansMap(supabase, options);
    return [...map.values()].sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function getPlanEntitlements(
    planKey: string,
    supabase?: SupabaseClient,
): Promise<PlanEntitlements | null> {
    const map = await loadPlansMap(supabase);
    return map.get(planKey) ?? null;
}

/**
 * Resolve entitlements for a student from students.plan_key.
 * Returns null if student missing or has no plan_key / unknown plan.
 */
export async function getStudentEntitlements(
    studentId: string,
    supabase: SupabaseClient,
): Promise<
    | { ok: true; planKey: string; entitlements: PlanEntitlements }
    | { ok: false; error: string; code: "NO_PLAN" | "UNKNOWN_PLAN" | "INACTIVE_PLAN" }
> {
    const { data: student, error } = await supabase
        .from("students")
        .select("id, plan_key, is_active")
        .eq("id", studentId)
        .maybeSingle();

    if (error || !student) {
        return { ok: false, error: "Student not found", code: "NO_PLAN" };
    }

    if (!student.plan_key) {
        return {
            ok: false,
            error: "No plan assigned to this student",
            code: "NO_PLAN",
        };
    }

    const entitlements = await getPlanEntitlements(student.plan_key, supabase);
    if (!entitlements) {
        return {
            ok: false,
            error: `Unknown plan: ${student.plan_key}`,
            code: "UNKNOWN_PLAN",
        };
    }

    if (!entitlements.isActive) {
        return {
            ok: false,
            error: "This plan is no longer available",
            code: "INACTIVE_PLAN",
        };
    }

    return { ok: true, planKey: student.plan_key, entitlements };
}

export type MockLimitResult =
    | { allowed: true; used: number; limit: number | null }
    | {
          allowed: false;
          used: number;
          limit: number;
          error: string;
          code: "PLAN_LIMIT";
      };

/**
 * Enforce max_full_mocks for starting a new platform test.
 * Counts all tests for the student (full mock attempts).
 */
export async function checkMockExamLimit(
    studentId: string,
    supabase: SupabaseClient,
): Promise<MockLimitResult> {
    const resolved = await getStudentEntitlements(studentId, supabase);
    if (!resolved.ok) {
        return {
            allowed: false,
            used: 0,
            limit: 0,
            error: resolved.error,
            code: "PLAN_LIMIT",
        };
    }

    const limit = resolved.entitlements.maxFullMocks;

    const { count, error } = await supabase
        .from("tests")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId);

    if (error) {
        console.error("Mock count failed:", error);
        throw new Error("Failed to check plan mock limit");
    }

    const used = count ?? 0;

    if (limit === null) {
        return { allowed: true, used, limit: null };
    }

    if (used >= limit) {
        return {
            allowed: false,
            used,
            limit,
            error: `Your ${resolved.entitlements.name} plan allows ${limit} full mock exam${limit === 1 ? "" : "s"}. You have used ${used}. Please upgrade or renew with a higher plan.`,
            code: "PLAN_LIMIT",
        };
    }

    return { allowed: true, used, limit };
}
