import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { fulfillCheckoutSession } from "@/lib/stripe/fulfill-checkout";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET is not set");
        return NextResponse.json(
            { error: "Webhook not configured" },
            { status: 500 },
        );
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
        return NextResponse.json(
            { error: "Missing stripe-signature" },
            { status: 400 },
        );
    }

    let event: Stripe.Event;
    try {
        const body = await request.text();
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return NextResponse.json(
            { error: "Invalid signature" },
            { status: 400 },
        );
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        try {
            const supabase = createAdminClient();
            const result = await fulfillCheckoutSession(supabase, session);
            if (!result.ok) {
                console.error("Webhook fulfill failed:", result.error);
                return NextResponse.json(
                    { error: result.error },
                    { status: result.status },
                );
            }
        } catch (err) {
            console.error("Webhook handler error:", err);
            return NextResponse.json(
                { error: "Webhook handler failed" },
                { status: 500 },
            );
        }
    }

    return NextResponse.json({ received: true });
}
