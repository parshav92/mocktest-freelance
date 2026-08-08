import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
    invalidatePlansCache,
    listPlanEntitlements,
} from "@/lib/plans/entitlements";

/**
 * GET /api/admin/plans — list plan entitlement rules
 */
export async function GET() {
    const auth = await requireAdmin();
    if (!auth.isAdmin) {
        return NextResponse.json(
            { error: auth.error },
            { status: auth.status },
        );
    }

    try {
        const supabase = await createClient();
        // Fresh read for admin UI; does not clear the student-facing cache
        const plans = await listPlanEntitlements(supabase, {
            forceRefresh: true,
        });
        return NextResponse.json({ plans });
    } catch (err) {
        console.error("GET /api/admin/plans:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to load plans" },
            { status: 500 },
        );
    }
}

const ANALYTICS_LEVELS = new Set(["none", "basic", "full"]);

/**
 * PATCH /api/admin/plans — update one plan's rules by key
 * Body: { key, name?, maxFullMocks?, analyticsLevel?, peerCompare?, tips?, isActive? }
 * Does not allow changing duration or Stripe price IDs (those stay in env/code).
 */
export async function PATCH(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.isAdmin) {
        return NextResponse.json(
            { error: auth.error },
            { status: auth.status },
        );
    }

    try {
        const body = await request.json();
        const key = typeof body.key === "string" ? body.key.trim() : "";

        if (!key) {
            return NextResponse.json(
                { error: "key is required" },
                { status: 400 },
            );
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (body.name !== undefined) {
            if (typeof body.name !== "string" || !body.name.trim()) {
                return NextResponse.json(
                    { error: "name must be a non-empty string" },
                    { status: 400 },
                );
            }
            updates.name = body.name.trim();
        }

        if (body.maxFullMocks !== undefined) {
            if (body.maxFullMocks === null) {
                updates.max_full_mocks = null;
            } else if (
                typeof body.maxFullMocks === "number" &&
                Number.isInteger(body.maxFullMocks) &&
                body.maxFullMocks >= 0
            ) {
                updates.max_full_mocks = body.maxFullMocks;
            } else {
                return NextResponse.json(
                    {
                        error: "maxFullMocks must be a non-negative integer or null (unlimited)",
                    },
                    { status: 400 },
                );
            }
        }

        if (body.analyticsLevel !== undefined) {
            if (
                typeof body.analyticsLevel !== "string" ||
                !ANALYTICS_LEVELS.has(body.analyticsLevel)
            ) {
                return NextResponse.json(
                    { error: "analyticsLevel must be none | basic | full" },
                    { status: 400 },
                );
            }
            updates.analytics_level = body.analyticsLevel;
        }

        if (body.peerCompare !== undefined) {
            if (typeof body.peerCompare !== "boolean") {
                return NextResponse.json(
                    { error: "peerCompare must be a boolean" },
                    { status: 400 },
                );
            }
            updates.peer_compare = body.peerCompare;
        }

        if (body.tips !== undefined) {
            if (typeof body.tips !== "boolean") {
                return NextResponse.json(
                    { error: "tips must be a boolean" },
                    { status: 400 },
                );
            }
            updates.tips = body.tips;
        }

        if (body.isActive !== undefined) {
            if (typeof body.isActive !== "boolean") {
                return NextResponse.json(
                    { error: "isActive must be a boolean" },
                    { status: 400 },
                );
            }
            updates.is_active = body.isActive;
        }

        if (Object.keys(updates).length <= 1) {
            return NextResponse.json(
                { error: "No updatable fields provided" },
                { status: 400 },
            );
        }

        const supabase = await createClient();
        const { data, error } = await supabase
            .from("plans")
            .update(updates)
            .eq("key", key)
            .select(
                "key, name, max_full_mocks, analytics_level, peer_compare, tips, display_order, is_active, updated_at",
            )
            .maybeSingle();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json(
                { error: "Plan not found" },
                { status: 404 },
            );
        }

        invalidatePlansCache();

        return NextResponse.json({
            plan: {
                key: data.key,
                name: data.name,
                maxFullMocks: data.max_full_mocks,
                analyticsLevel: data.analytics_level,
                peerCompare: data.peer_compare,
                tips: data.tips,
                displayOrder: data.display_order,
                isActive: data.is_active,
                updatedAt: data.updated_at,
            },
        });
    } catch (err) {
        console.error("PATCH /api/admin/plans:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to update plan" },
            { status: 500 },
        );
    }
}
