import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch all subscriptions for the current parent
export async function GET() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(`
      *,
      student:students(*)
    `)
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subscriptions });
}

// POST - Create a new subscription (dummy Stripe for now)
export async function POST(request: Request) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { plan } = await request.json();
    
    if (!plan || !["half_yearly", "yearly"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Calculate expiry based on plan
    const now = new Date();
    const expiresAt = new Date(now);
    if (plan === "half_yearly") {
      expiresAt.setMonth(expiresAt.getMonth() + 6);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Create subscription (student_id is null until student is assigned)
    // Note: stripe_subscription_id and stripe_customer_id are stored as dummy values
    // These will be replaced with real Stripe IDs when payment integration is done
    const dummyStripeSubId = `sub_dummy_${Date.now()}`;
    const dummyStripeCustomerId = `cus_dummy_${user.id.slice(0, 8)}`;

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .insert({
        parent_id: user.id,
        plan,
        status: "active",
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Subscription insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return subscription with dummy stripe IDs (not stored in DB for now)
    return NextResponse.json({ 
      subscription: {
        ...subscription,
        stripe_subscription_id: dummyStripeSubId,
        stripe_customer_id: dummyStripeCustomerId,
      }
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
