import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getPlanById } from "@/lib/stripe-plans";
import { fulfillCheckoutSession } from "@/lib/stripe/fulfill-checkout";
import SuccessClient from "@/app/dashboard/subscribe/success/success-client";

interface PageProps {
    searchParams: Promise<{ session_id?: string }>;
}

export default async function SubscribeSuccessPage({ searchParams }: PageProps) {
    const { session_id } = await searchParams;

    if (!session_id) {
        redirect("/dashboard/subscribe");
    }

    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/auth");
    }

    let stripeSession;
    try {
        stripeSession = await stripe.checkout.sessions.retrieve(session_id);
    } catch (err) {
        console.error("Stripe session retrieve error:", err);
        redirect("/dashboard/subscribe?error=invalid_session");
    }

    const result = await fulfillCheckoutSession(supabase, stripeSession, {
        expectedParentId: user.id,
    });

    if (!result.ok) {
        if (result.status === 403) {
            redirect("/dashboard/subscribe?error=session_mismatch");
        }
        redirect(
            `/dashboard/subscribe?error=${encodeURIComponent(result.error)}`,
        );
    }

    const planId = stripeSession.metadata?.planId ?? "";
    const planDetails = getPlanById(planId);
    if (!planDetails) {
        redirect("/dashboard/subscribe?error=unknown_plan");
    }

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
            subscriptionId={result.subscriptionId}
            customerEmail={customerEmail}
        />
    );
}
