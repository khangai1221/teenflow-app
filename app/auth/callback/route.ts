import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";

/**
 * OAuth / PKCE callback. Supabase redirects here with a `code` after the user
 * authenticates with the provider (e.g. Google). We exchange it for a session
 * (which sets the auth cookies) and then forward the user on.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  // The provider (via Supabase) may redirect back with an error instead of a code.
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (code) {
    const supabase = await serverClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  const reason = providerError
    ? `?reason=${encodeURIComponent(providerError)}`
    : "";
  return NextResponse.redirect(`${origin}/auth/auth-code-error${reason}`);
}
