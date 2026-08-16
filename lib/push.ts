import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@teenflow.app";
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  /** In-app path to open on click, e.g. "/tasks". */
  url?: string;
};

/**
 * Sends a Web Push notification to every subscription belonging to the given
 * profiles (a member may have several — one per browser/device). Best-effort:
 * a family action (task submitted, reward requested, …) should never fail
 * because a notification couldn't be delivered, so errors are swallowed here
 * — except 404/410, which mean the browser unsubscribed or the endpoint
 * expired, and are used to prune the dead row so we stop retrying it.
 */
export async function sendPushToProfiles(
  supabase: SupabaseClient,
  profileIds: string[],
  payload: PushPayload,
): Promise<void> {
  ensureConfigured();
  if (!configured || profileIds.length === 0) return;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("profile_id", profileIds);
  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );
}
