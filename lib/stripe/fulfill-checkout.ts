import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
    addDays,
    addMonths,
    getPlanById,
    GRACE_PERIOD_DAYS,
} from "@/lib/stripe-plans";

export type FulfillResult =
    | {
          ok: true;
          subscriptionId: string;
          created: boolean;
          renewed: boolean;
          studentId: string | null;
      }
    | { ok: false; error: string; status: number };

function customerIdFromSession(session: Stripe.Checkout.Session): string | null {
    if (typeof session.customer === "string") return session.customer;
    if (session.customer && "id" in session.customer) return session.customer.id;
    return null;
}

/** Remaining time carries over when renewing before expiry. */
export function computeRenewalExpiry(
    currentExpiresAt: string | null | undefined,
    durationMonths: number,
    now = new Date(),
): { expiresAt: Date; gracePeriodEndsAt: Date } {
    const current = currentExpiresAt ? new Date(currentExpiresAt) : null;
    const base =
        current && !Number.isNaN(current.getTime()) && current > now
            ? current
            : now;
    const expiresAt = addMonths(base, durationMonths);
    const gracePeriodEndsAt = addDays(expiresAt, GRACE_PERIOD_DAYS);
    return { expiresAt, gracePeriodEndsAt };
}

async function syncStudentPlan(
    supabase: SupabaseClient,
    studentId: string,
    planKey: string,
    expiresAtIso: string,
) {
    const { error } = await supabase
        .from("students")
        .update({
            plan_key: planKey,
            plan_expires_at: expiresAtIso,
            is_active: true,
            updated_at: new Date().toISOString(),
        })
        .eq("id", studentId);

    if (error) {
        console.error("syncStudentPlan failed:", error);
        return false;
    }
    return true;
}

/**
 * Idempotently create or renew a subscription from a paid Checkout Session.
 * Renew path requires metadata.studentId (set only by our checkout API after ownership check).
 */
export async function fulfillCheckoutSession(
    supabase: SupabaseClient,
    session: Stripe.Checkout.Session,
    options?: { expectedParentId?: string },
): Promise<FulfillResult> {
    if (session.payment_status !== "paid") {
        return { ok: false, error: "Payment not completed", status: 400 };
    }

    const parentId = session.metadata?.parentId;
    const planId = session.metadata?.planId;
    const studentId = session.metadata?.studentId?.trim() || null;

    if (!parentId) {
        return {
            ok: false,
            error: "Missing parentId in session metadata",
            status: 400,
        };
    }

    if (options?.expectedParentId && options.expectedParentId !== parentId) {
        return {
            ok: false,
            error: "Session does not belong to this user",
            status: 403,
        };
    }

    const plan = planId ? getPlanById(planId) : undefined;
    if (!plan) {
        return {
            ok: false,
            error: "Unknown plan in session metadata",
            status: 400,
        };
    }

    // Idempotency: this Checkout Session already applied
    const { data: existingBySession } = await supabase
        .from("subscriptions")
        .select("id, student_id")
        .eq("stripe_checkout_session_id", session.id)
        .maybeSingle();

    if (existingBySession) {
        return {
            ok: true,
            subscriptionId: existingBySession.id,
            created: false,
            renewed: Boolean(existingBySession.student_id),
            studentId: existingBySession.student_id ?? studentId,
        };
    }

    const customerId = customerIdFromSession(session);
    const now = new Date();

    // ── Renew existing student ────────────────────────────────────────────
    if (studentId) {
        const { data: student, error: studentError } = await supabase
            .from("students")
            .select("id, parent_id")
            .eq("id", studentId)
            .maybeSingle();

        if (studentError || !student) {
            return { ok: false, error: "Student not found", status: 400 };
        }

        if (student.parent_id !== parentId) {
            return {
                ok: false,
                error: "Student does not belong to this parent",
                status: 403,
            };
        }

        const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("id, expires_at, student_id")
            .eq("student_id", studentId)
            .eq("parent_id", parentId)
            .maybeSingle();

        const { expiresAt, gracePeriodEndsAt } = computeRenewalExpiry(
            existingSub?.expires_at,
            plan.durationMonths,
            now,
        );
        const expiresAtIso = expiresAt.toISOString();
        const graceIso = gracePeriodEndsAt.toISOString();

        if (existingSub) {
            const { data: updated, error: updateError } = await supabase
                .from("subscriptions")
                .update({
                    plan: plan.planKey,
                    status: "active",
                    expires_at: expiresAtIso,
                    grace_period_ends_at: graceIso,
                    stripe_checkout_session_id: session.id,
                    stripe_customer_id: customerId,
                    stripe_subscription_id: null,
                    updated_at: now.toISOString(),
                })
                .eq("id", existingSub.id)
                .eq("parent_id", parentId)
                .eq("student_id", studentId)
                .select("id")
                .single();

            if (updateError) {
                if (updateError.code === "23505") {
                    const { data: raced } = await supabase
                        .from("subscriptions")
                        .select("id, student_id")
                        .eq("stripe_checkout_session_id", session.id)
                        .maybeSingle();
                    if (raced) {
                        return {
                            ok: true,
                            subscriptionId: raced.id,
                            created: false,
                            renewed: true,
                            studentId,
                        };
                    }
                }
                console.error("Renew subscription update failed:", updateError);
                return {
                    ok: false,
                    error: updateError.message || "Failed to renew subscription",
                    status: 500,
                };
            }

            await syncStudentPlan(
                supabase,
                studentId,
                plan.planKey,
                expiresAtIso,
            );

            return {
                ok: true,
                subscriptionId: updated.id,
                created: false,
                renewed: true,
                studentId,
            };
        }

        // Student exists but no subscription row — create linked
        const { data: inserted, error: insertError } = await supabase
            .from("subscriptions")
            .insert({
                parent_id: parentId,
                student_id: studentId,
                plan: plan.planKey,
                status: "active",
                starts_at: now.toISOString(),
                expires_at: expiresAtIso,
                grace_period_ends_at: graceIso,
                stripe_checkout_session_id: session.id,
                stripe_subscription_id: null,
                stripe_customer_id: customerId,
            })
            .select("id")
            .single();

        if (insertError) {
            if (insertError.code === "23505") {
                const { data: raced } = await supabase
                    .from("subscriptions")
                    .select("id, student_id")
                    .eq("stripe_checkout_session_id", session.id)
                    .maybeSingle();
                if (raced) {
                    return {
                        ok: true,
                        subscriptionId: raced.id,
                        created: false,
                        renewed: true,
                        studentId,
                    };
                }
            }
            console.error("Renew subscription insert failed:", insertError);
            return {
                ok: false,
                error: insertError.message || "Failed to create subscription",
                status: 500,
            };
        }

        await syncStudentPlan(supabase, studentId, plan.planKey, expiresAtIso);

        return {
            ok: true,
            subscriptionId: inserted.id,
            created: true,
            renewed: true,
            studentId,
        };
    }

    // ── New purchase (unassigned) ─────────────────────────────────────────
    const expiresAt = addMonths(now, plan.durationMonths);
    const gracePeriodEndsAt = addDays(expiresAt, GRACE_PERIOD_DAYS);

    const { data: inserted, error } = await supabase
        .from("subscriptions")
        .insert({
            parent_id: parentId,
            plan: plan.planKey,
            status: "active",
            starts_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            grace_period_ends_at: gracePeriodEndsAt.toISOString(),
            stripe_checkout_session_id: session.id,
            stripe_subscription_id: null,
            stripe_customer_id: customerId,
        })
        .select("id")
        .single();

    if (error) {
        if (error.code === "23505") {
            const { data: raced } = await supabase
                .from("subscriptions")
                .select("id")
                .eq("stripe_checkout_session_id", session.id)
                .maybeSingle();
            if (raced) {
                return {
                    ok: true,
                    subscriptionId: raced.id,
                    created: false,
                    renewed: false,
                    studentId: null,
                };
            }
        }
        console.error("fulfillCheckoutSession insert error:", error);
        return {
            ok: false,
            error: error.message || "Failed to create subscription",
            status: 500,
        };
    }

    return {
        ok: true,
        subscriptionId: inserted.id,
        created: true,
        renewed: false,
        studentId: null,
    };
}
