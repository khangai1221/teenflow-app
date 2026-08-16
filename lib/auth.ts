import { cache } from "react";
import { serverClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

/**
 * Returns the current authenticated user and their TeenFlow profile (or null
 * if not signed in / not yet registered). Used by route guards.
 *
 * Uses getSession() (reads the cookie, no network hop) rather than getUser()
 * (a round-trip to Supabase's Auth service on every call). Middleware already
 * network-verifies/refreshes the token for every matched request, and every
 * table this touches has RLS keyed on auth.uid(), so Postgres itself rejects
 * a stale/tampered session at the data layer — this call only decides what
 * to query, not what's allowed to be returned.
 */
export const getSessionProfile = cache(async (): Promise<{
  user: { id: string; email?: string } | null;
  profile: Profile | null;
}> => {
  const supabase = await serverClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user: { id: user.id, email: user.email }, profile: profile ?? null };
});

/**
 * Same shape as getSessionProfile(), but for server actions: takes the
 * caller's already-created client (actions typically go on to run more
 * queries on it, so this avoids standing up a second one) and uses
 * getUser() rather than getSession(), since actions run outside the
 * middleware-refreshed request path getSession() relies on. Not cached —
 * each action invocation is its own request, so there's nothing to dedupe.
 *
 * Every action previously re-ran its own `auth.getUser()` +
 * `profiles.select(...)` pair inline; centralizing it here is what let six
 * near-identical copies of that boilerplate collapse into one call.
 */
export async function getActionProfile(supabase: SupabaseClient): Promise<{
  user: { id: string; email?: string } | null;
  profile: Profile | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user: { id: user.id, email: user.email }, profile: profile ?? null };
}
