import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getPlanById } from "@/lib/stripe-plans";
import SuccessClient from "@/app/dashboard/subscribe/success/success-client";

interface PageProps {
    searchParams: Promise<{ session_id?: string; plan?: string }>;
}

export default async function SubscribeSuccessPage({ searchParams }: PageProps) {
    const { session_id, plan } = await searchParams;

    if (!session_id) {
        redirect("/dashboard/subscribe");
    }

    // 1. Retrieve the Stripe session safely (keep redirect outside try/catch for Next.js)
    let stripeSession;
    try {
        stripeSession = await stripe.checkout.sessions.retrieve(session_id);
    } catch (err) {
        console.error("Stripe session retrieve error:", err);
    }

    if (!stripeSession) {
        redirect("/dashboard/subscribe?error=invalid_session");
    }

    if (stripeSession.payment_status !== "paid") {
        redirect("/dashboard/subscribe?error=payment_failed");
    }

    // 2. Get the authenticated parent user
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/auth");
    }

    // 3. Resolve plan details
    const planId =
        (stripeSession.metadata?.planId as string) ||
        plan ||
        "silver";
    const planDetails = getPlanById(planId);

    if (!planDetails) {
        redirect("/dashboard/subscribe?error=unknown_plan");
    }

    // 4. Calculate subscription dates
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + planDetails.durationMonths);

    // 5. Resolve the real Stripe subscription ID (for idempotency and DB tracking)
    // In subscription mode, stripeSession.subscription contains the sub_... ID.
    const realSubscriptionId =
        typeof stripeSession.subscription === "string"
            ? stripeSession.subscription
            : stripeSession.subscription && "id" in stripeSession.subscription
            ? stripeSession.subscription.id
            : session_id; // fallback to session ID if subscription ID is unexpectedly missing

    // 6. Check if subscription already exists for this Stripe session (Idempotency)
    const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("stripe_subscription_id", realSubscriptionId)
        .maybeSingle();

    let subscriptionId: string;

    if (existing) {
        subscriptionId = existing.id;
    } else {
        // Resolve customer ID safely
        const customerId =
            typeof stripeSession.customer === "string"
                ? stripeSession.customer
                : stripeSession.customer && "id" in stripeSession.customer
                ? stripeSession.customer.id
                : null;

        // Try inserting full record
        let subInsertResult = await supabase
            .from("subscriptions")
            .insert({
                parent_id: user.id,
                plan: planDetails.dbPlan,
                status: "active",
                starts_at: now.toISOString(),
                expires_at: expiresAt.toISOString(),
                stripe_subscription_id: realSubscriptionId,
                stripe_customer_id: customerId,
            })
            .select("id")
            .single();

        // Fallback: If insert failed (e.g. stripe_* columns missing in DB), try without stripe columns
        if (subInsertResult.error) {
            console.warn(
                "First subscription insert attempt failed, trying fallback without stripe columns:",
                subInsertResult.error.message
            );
            subInsertResult = await supabase
                .from("subscriptions")
                .insert({
                    parent_id: user.id,
                    plan: planDetails.dbPlan,
                    status: "active",
                    starts_at: now.toISOString(),
                    expires_at: expiresAt.toISOString(),
                })
                .select("id")
                .single();
        }

        if (subInsertResult.error || !subInsertResult.data) {
            console.error("Failed to create subscription in DB:", subInsertResult.error);
            const errMsg = subInsertResult.error?.message || "subscription_creation_failed";
            redirect(`/dashboard?error=${encodeURIComponent(errMsg)}`);
        }

        subscriptionId = subInsertResult.data.id;
    }

    // Resolve best email to display
    const customerEmail =
        stripeSession.customer_details?.email ??
        stripeSession.customer_email ??
        user.email ??
        "";

    return (
        <SuccessClient
            planName={planDetails.name}
            planPrice={planDetails.price}
            planPeriod={planDetails.period}
            subscriptionId={subscriptionId}
            customerEmail={customerEmail}
        />
    );
}
