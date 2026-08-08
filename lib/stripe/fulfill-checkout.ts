import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
    addDays,
    addMonths,
    getPlanById,
    GRACE_PERIOD_DAYS,
} from "@/lib/stripe-plans";

export type FulfillResult =
    | { ok: true; subscriptionId: string; created: boolean }
    | { ok: false; error: string; status: number };

/**
 * Idempotently create a subscriptions row from a paid Checkout Session.
 * Used by success page and checkout.session.completed webhook.
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

    if (!parentId) {
        return {
            ok: false,
            error: "Missing parentId in session metadata",
            status: 400,
        };
    }

    if (
        options?.expectedParentId &&
        options.expectedParentId !== parentId
    ) {
        return {
            ok: false,
            error: "Session does not belong to this user",
            status: 403,
        };
    }

    const plan = planId ? getPlanById(planId) : undefined;
    if (!plan) {
        return { ok: false, error: "Unknown plan in session metadata", status: 400 };
    }

    const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("stripe_checkout_session_id", session.id)
        .maybeSingle();

    if (existing) {
        return { ok: true, subscriptionId: existing.id, created: false };
    }

    const now = new Date();
    const expiresAt = addMonths(now, plan.durationMonths);
    const gracePeriodEndsAt = addDays(expiresAt, GRACE_PERIOD_DAYS);

    const customerId =
        typeof session.customer === "string"
            ? session.customer
            : session.customer && "id" in session.customer
              ? session.customer.id
              : null;

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
        // Race: another request inserted the same session id
        if (error.code === "23505") {
            const { data: raced } = await supabase
                .from("subscriptions")
                .select("id")
                .eq("stripe_checkout_session_id", session.id)
                .maybeSingle();
            if (raced) {
                return { ok: true, subscriptionId: raced.id, created: false };
            }
        }
        console.error("fulfillCheckoutSession insert error:", error);
        return {
            ok: false,
            error: error.message || "Failed to create subscription",
            status: 500,
        };
    }

    return { ok: true, subscriptionId: inserted.id, created: true };
}
