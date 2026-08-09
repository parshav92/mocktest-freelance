import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getPlanById } from "@/lib/stripe-plans";

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
        const body = await request.json();
        const planId = body.planId as string | undefined;
        const studentIdRaw = body.studentId as string | undefined;
        const studentId =
            typeof studentIdRaw === "string" && studentIdRaw.trim()
                ? studentIdRaw.trim()
                : null;

        const plan = getPlanById(planId ?? "");

        if (!plan) {
            return NextResponse.json(
                { error: "Invalid plan selected" },
                { status: 400 },
            );
        }

        if (!plan.stripePriceId) {
            return NextResponse.json(
                { error: "Stripe price not configured for this plan" },
                { status: 500 },
            );
        }

        // Renew: bind checkout to a student only after ownership check
        if (studentId) {
            if (!UUID_RE.test(studentId)) {
                return NextResponse.json(
                    { error: "Invalid student id" },
                    { status: 400 },
                );
            }

            const { data: student, error: studentError } = await supabase
                .from("students")
                .select("id, parent_id, full_name")
                .eq("id", studentId)
                .eq("parent_id", user.id)
                .maybeSingle();

            if (studentError || !student) {
                return NextResponse.json(
                    { error: "Student not found" },
                    { status: 404 },
                );
            }
        }

        const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const metadata: Record<string, string> = {
            parentId: user.id,
            planId: plan.id,
            planKey: plan.planKey,
            durationMonths: String(plan.durationMonths),
        };
        if (studentId) {
            metadata.studentId = studentId;
        }

        const session = await stripe.checkout.sessions.create({
            ui_mode: "embedded_page",
            line_items: [
                {
                    price: plan.stripePriceId,
                    quantity: 1,
                },
            ],
            mode: "payment",
            return_url: `${baseUrl}/dashboard/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
            metadata,
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
