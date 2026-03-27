import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createRequestTimer } from "@/lib/performance-logger";

export default async function proxy(request: NextRequest) {
  const timer = createRequestTimer(request.method, request.nextUrl.pathname);

  let response = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin-login")) {
    timer.stop(response.status);
    return response;
  }

  if (!pathname.startsWith("/admin")) {
    timer.stop(response.status);
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = new URL("/admin-login", request.url);
    url.searchParams.set("reason", "auth");
    timer.stop(307);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    const url = new URL("/admin-login", request.url);
    url.searchParams.set("reason", "forbidden");
    timer.stop(307);
    return NextResponse.redirect(url);
  }

  const { data: mfaSession } = await supabase
    .from("admin_mfa_sessions")
    .select("mfa_expires_at")
    .eq("admin_id", user.id)
    .single();

  const expiresAt = mfaSession?.mfa_expires_at
    ? new Date(mfaSession.mfa_expires_at)
    : null;

  if (!expiresAt || expiresAt <= new Date()) {
    const url = new URL("/admin-login", request.url);
    url.searchParams.set("reason", "mfa");
    timer.stop(307);
    return NextResponse.redirect(url);
  }

  timer.stop(response.status);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
