import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const requestedRedirect = searchParams.get("redirect") ?? searchParams.get("next");
  const next = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
    ? requestedRedirect
    : "/dashboard";
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const redirectToNext = () => {
    if (isLocalEnv) return NextResponse.redirect(`${origin}${next}`);
    if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${next}`);
    return NextResponse.redirect(`${origin}${next}`);
  };

  const supabase = await createClient();

  if (tokenHash && (type === "signup" || type === "recovery")) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as Extract<EmailOtpType, "signup" | "recovery">,
    });

    if (!error) return redirectToNext();
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirectToNext();
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=Could not authenticate`);
}
