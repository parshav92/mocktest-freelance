import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
        return NextResponse.json(
            { error: "session_id is required" },
            { status: 400 }
        );
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        return NextResponse.json({
            status: session.status,
            paymentStatus: session.payment_status,
            customerEmail: session.customer_email,
            metadata: session.metadata,
        });
    } catch (err) {
        console.error("Stripe session retrieve error:", err);
        return NextResponse.json(
            { error: "Failed to retrieve session" },
            { status: 500 }
        );
    }
}
