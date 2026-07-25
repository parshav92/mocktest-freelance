import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getPlanById } from "@/lib/stripe-plans";

export async function POST(request: Request) {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { planId } = await request.json();
        const plan = getPlanById(planId);

        if (!plan) {
            return NextResponse.json(
                { error: "Invalid plan selected" },
                { status: 400 }
            );
        }

        if (!plan.stripePriceId) {
            return NextResponse.json(
                { error: "Stripe price not configured for this plan" },
                { status: 500 }
            );
        }

        const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const session = await stripe.checkout.sessions.create({
            ui_mode: "embedded_page",
            line_items: [
                {
                    price: plan.stripePriceId,
                    quantity: 1,
                },
            ],
            mode: "subscription",
            return_url: `${baseUrl}/dashboard/subscribe/success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
            metadata: {
                parentId: user.id,
                planId: plan.id,
                planDbKey: plan.dbPlan,
                durationMonths: String(plan.durationMonths),
            },
            customer_email: user.email,
        });

        return NextResponse.json({ clientSecret: session.client_secret });
    } catch (err) {
        console.error("Stripe session error:", err);
        const message =
            err instanceof Error ? err.message : "Failed to create session";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
