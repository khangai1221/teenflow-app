"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { getActionProfile } from "@/lib/auth";
import { sendPushToProfiles } from "@/lib/push";

export type ProfileActionState = { ok?: boolean; error?: string };

function revalidateAll() {
  revalidatePath("/profile");
  revalidatePath("/home");
}

export async function updateProfile(
  formData: FormData,
): Promise<ProfileActionState> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Нэвтрээгүй байна." };

  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) return { error: "Нэрээ оруулна уу." };

  const ageRaw = String(formData.get("age") ?? "").trim();
  const age = ageRaw ? parseInt(ageRaw, 10) : null;

  const patch: Record<string, unknown> = { display_name: displayName, age };

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/")) {
      return { error: "Зөвхөн зураг оруулна уу." };
    }
    if (avatar.size > 4 * 1024 * 1024) {
      return { error: "Зураг хэт том байна (дээд тал нь 4МБ)." };
    }
    const ext = avatar.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatar, { contentType: avatar.type, upsert: true });
    if (uploadError) return { error: "Зураг хуулахад алдаа гарлаа." };

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    patch.avatar_url = pub.publicUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);
  if (error) return { error: "Хадгалахад алдаа гарлаа." };

  revalidateAll();
  return { ok: true };
}

/** A parent renames the family. */
export async function updateFamilyName(
  formData: FormData,
): Promise<ProfileActionState> {
  const supabase = await serverClient();
  const { profile } = await getActionProfile(supabase);
  if (!profile?.family_id) return { error: "Гэр бүл олдсонгүй." };
  if (profile.role !== "parent") {
    return { error: "Зөвхөн эцэг эх нэрийг өөрчлөх боломжтой." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Нэрээ оруулна уу." };

  const { error } = await supabase
    .from("families")
    .update({ name })
    .eq("id", profile.family_id);
  if (error) return { error: "Хадгалахад алдаа гарлаа." };

  revalidateAll();
  return { ok: true };
}

function mapLeaveError(message: string): string {
  if (message.includes("last_parent"))
    return "Гэр бүлд хүүхэд байгаа тул та ганц эцэг эх байхдаа гарч болохгүй.";
  if (message.includes("not_in_family")) return "Та гэр бүлд алга байна.";
  return "Гарахад алдаа гарлаа.";
}

/** The signed-in member leaves their family. Redirects to /register so they
 * can create or join a new one — see leave_family() in schema.sql. */
export async function leaveFamily(): Promise<ProfileActionState> {
  const supabase = await serverClient();
  const { error } = await supabase.rpc("leave_family");
  if (error) return { error: mapLeaveError(error.message) };

  revalidateAll();
  redirect("/register");
}

function mapRemoveError(message: string): string {
  if (message.includes("cannot_remove_parent"))
    return "Эцэг эхийг хасах боломжгүй.";
  if (message.includes("forbidden"))
    return "Зөвхөн эцэг эх гишүүн хасах боломжтой.";
  return "Хасахад алдаа гарлаа.";
}

/** A parent removes a kid from the family. */
export async function removeFamilyMember(
  memberId: string,
): Promise<ProfileActionState> {
  const supabase = await serverClient();
  const { error } = await supabase.rpc("remove_family_member", {
    p_member_id: memberId,
  });
  if (error) return { error: mapRemoveError(error.message) };

  revalidateAll();
  return { ok: true };
}

export async function subscribeToPush(
  subscription: PushSubscriptionJSON,
): Promise<ProfileActionState> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Нэвтрээгүй байна." };
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { error: "Мэдэгдэл идэвхжүүлэхэд алдаа гарлаа." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      profile_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { error: "Мэдэгдэл идэвхжүүлэхэд алдаа гарлаа." };
  return { ok: true };
}

export async function unsubscribeFromPush(
  endpoint: string,
): Promise<ProfileActionState> {
  const supabase = await serverClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) return { error: "Идэвхгүй болгоход алдаа гарлаа." };
  return { ok: true };
}

/** Sends a one-off test push to the signed-in member's own subscriptions,
 * so the profile toggle can confirm delivery actually works. */
export async function sendTestPush(): Promise<ProfileActionState> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Нэвтрээгүй байна." };

  await sendPushToProfiles(supabase, [user.id], {
    title: "TeenFlow",
    body: "Мэдэгдэл ажиллаж байна! 🎉",
    url: "/profile",
  });
  return { ok: true };
}
