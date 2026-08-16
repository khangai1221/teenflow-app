"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase/server";
import { getActionProfile } from "@/lib/auth";
import { sendPushToProfiles } from "@/lib/push";

export type RewardActionState = { ok?: boolean; error?: string };

function revalidateAll() {
  revalidatePath("/rewards");
  revalidatePath("/home");
}

export async function createReward(
  formData: FormData,
): Promise<RewardActionState> {
  const supabase = await serverClient();
  const { user, profile } = await getActionProfile(supabase);
  if (!user) return { error: "Нэвтрээгүй байна." };
  if (!profile?.family_id) return { error: "Гэр бүл олдсонгүй." };
  if (profile.role !== "parent") {
    return { error: "Зөвхөн эцэг эх шагнал нэмэх боломжтой." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Шагналын нэрээ оруулна уу." };

  const costRaw = String(formData.get("cost") ?? "").trim();
  const cost = parseInt(costRaw, 10);
  if (!cost || cost <= 0) return { error: "Оноогоо зөв оруулна уу." };

  const { error } = await supabase.from("rewards").insert({
    family_id: profile.family_id,
    title,
    cost,
    created_by: profile.id,
  });

  if (error) return { error: "Шагнал нэмэхэд алдаа гарлаа." };

  revalidateAll();
  return { ok: true };
}

/** A parent edits an existing reward's title/cost. */
export async function updateReward(
  rewardId: string,
  formData: FormData,
): Promise<RewardActionState> {
  const supabase = await serverClient();
  const { user, profile } = await getActionProfile(supabase);
  if (!user) return { error: "Нэвтрээгүй байна." };
  if (!profile?.family_id) return { error: "Гэр бүл олдсонгүй." };
  if (profile.role !== "parent") {
    return { error: "Зөвхөн эцэг эх шагнал засах боломжтой." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Шагналын нэрээ оруулна уу." };

  const costRaw = String(formData.get("cost") ?? "").trim();
  const cost = parseInt(costRaw, 10);
  if (!cost || cost <= 0) return { error: "Оноогоо зөв оруулна уу." };

  const { error } = await supabase
    .from("rewards")
    .update({ title, cost })
    .eq("id", rewardId)
    .eq("family_id", profile.family_id);
  if (error) return { error: "Засахад алдаа гарлаа." };

  revalidateAll();
  return { ok: true };
}

export async function redeemReward(
  rewardId: string,
): Promise<RewardActionState> {
  const supabase = await serverClient();
  const { profile } = await getActionProfile(supabase);
  const { data: reward } = await supabase
    .from("rewards")
    .select("title")
    .eq("id", rewardId)
    .maybeSingle();

  const { error } = await supabase.rpc("redeem_reward", {
    p_reward_id: rewardId,
  });

  if (error) {
    if (error.message.includes("insufficient_points")) {
      return { error: "Оноо хүрэлцэхгүй байна." };
    }
    if (error.message.includes("already_requested")) {
      return { error: "Энэ шагналыг аль хэдийн хүссэн байна." };
    }
    return { error: "Авахад алдаа гарлаа." };
  }

  revalidateAll();

  // Kids' requests need a parent's approval — parents redeeming themselves
  // are approved instantly by the RPC, so no one needs notifying.
  if (profile && profile.role !== "parent" && profile.family_id) {
    const { data: parents } = await supabase
      .from("profiles")
      .select("id")
      .eq("family_id", profile.family_id)
      .eq("role", "parent");
    const parentIds = (parents ?? []).map((p) => p.id);
    if (parentIds.length > 0) {
      await sendPushToProfiles(supabase, parentIds, {
        title: "Шагнал хүслээ",
        body: `${profile.display_name} «${reward?.title ?? "шагнал"}»-ыг хүсч байна`,
        url: "/rewards",
      });
    }
  }

  return { ok: true };
}

/** A parent approves (deducts points) or rejects a pending reward request. */
export async function reviewRedemption(
  redemptionId: string,
  approve: boolean,
): Promise<RewardActionState> {
  const supabase = await serverClient();
  const { data: redemption } = await supabase
    .from("reward_redemptions")
    .select("title, profile_id")
    .eq("id", redemptionId)
    .maybeSingle();

  const { error } = await supabase.rpc("review_redemption", {
    p_redemption_id: redemptionId,
    p_approve: approve,
  });

  if (error) {
    if (error.message.includes("insufficient_points")) {
      return { error: "Оноо хүрэлцэхгүй байна." };
    }
    return { error: "Шийдвэрлэхэд алдаа гарлаа." };
  }

  revalidateAll();

  if (redemption?.profile_id) {
    await sendPushToProfiles(supabase, [redemption.profile_id], {
      title: approve ? "Шагнал батлагдлаа" : "Шагнал татгалзагдлаа",
      body: approve
        ? `«${redemption.title}» шагналыг авлаа`
        : `«${redemption.title}» шагналын хүсэлт татгалзагдлаа`,
      url: "/rewards",
    });
  }

  return { ok: true };
}

/** The requester withdraws their own still-pending reward request. */
export async function cancelRedemptionRequest(
  redemptionId: string,
): Promise<RewardActionState> {
  const supabase = await serverClient();
  const { error } = await supabase.rpc("cancel_redemption_request", {
    p_redemption_id: redemptionId,
  });
  if (error) return { error: "Цуцлахад алдаа гарлаа." };
  revalidateAll();
  return { ok: true };
}

export async function deleteReward(
  rewardId: string,
): Promise<RewardActionState> {
  const supabase = await serverClient();
  const { error } = await supabase.from("rewards").delete().eq("id", rewardId);
  if (error) return { error: "Устгахад алдаа гарлаа." };
  revalidateAll();
  return { ok: true };
}
