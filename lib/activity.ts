import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityItem = {
  id: string;
  kind: "task" | "task_review" | "reward" | "reward_request";
  text: string;
  at: string;
};

/**
 * Recent family activity for the notification bell: completed tasks, tasks
 * awaiting a parent's review, redeemed rewards, and pending reward requests
 * — merged and sorted newest-first. No separate table — this just re-reads
 * events that already leave a timestamp behind.
 */
export async function getRecentActivity(
  supabase: SupabaseClient,
  familyId: string,
  limit = 15,
): Promise<ActivityItem[]> {
  const [
    { data: doneTasks },
    { data: reviewTasks },
    { data: redemptions },
    { data: rewardRequests },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, points, completed_at, assignee:assigned_to(display_name)")
      .eq("family_id", familyId)
      .eq("status", "done")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(limit),
    supabase
      .from("tasks")
      .select("id, title, completed_at, assignee:assigned_to(display_name)")
      .eq("family_id", familyId)
      .eq("status", "awaiting_approval")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(limit),
    supabase
      .from("reward_redemptions")
      .select("id, title, cost, redeemed_at, profile:profile_id(display_name)")
      .eq("family_id", familyId)
      .eq("status", "approved")
      .order("redeemed_at", { ascending: false })
      .limit(limit),
    supabase
      .from("reward_redemptions")
      .select("id, title, cost, redeemed_at, profile:profile_id(display_name)")
      .eq("family_id", familyId)
      .eq("status", "pending")
      .order("redeemed_at", { ascending: false })
      .limit(limit),
  ]);

  type TaskRow = {
    id: string;
    title: string;
    points?: number;
    completed_at: string;
    assignee: { display_name: string } | null;
  };
  type RedemptionRow = {
    id: string;
    title: string;
    cost: number;
    redeemed_at: string;
    profile: { display_name: string } | null;
  };

  const taskItems: ActivityItem[] = ((doneTasks ?? []) as unknown as TaskRow[]).map((t) => ({
    id: `task-${t.id}`,
    kind: "task",
    text: `${t.assignee?.display_name ?? "Гишүүн"} «${t.title}» даалгаврыг гүйцэтгэлээ${
      t.points ? ` (+${t.points} оноо)` : ""
    }`,
    at: t.completed_at,
  }));

  const reviewItems: ActivityItem[] = (
    (reviewTasks ?? []) as unknown as TaskRow[]
  ).map((t) => ({
    id: `task-review-${t.id}`,
    kind: "task_review",
    text: `${t.assignee?.display_name ?? "Гишүүн"} «${t.title}» даалгаврыг шалгуулахаар илгээлээ`,
    at: t.completed_at,
  }));

  const rewardItems: ActivityItem[] = (
    (redemptions ?? []) as unknown as RedemptionRow[]
  ).map((r) => ({
    id: `reward-${r.id}`,
    kind: "reward",
    text: `${r.profile?.display_name ?? "Гишүүн"} «${r.title}» шагналыг авлаа (-${r.cost} оноо)`,
    at: r.redeemed_at,
  }));

  const rewardRequestItems: ActivityItem[] = (
    (rewardRequests ?? []) as unknown as RedemptionRow[]
  ).map((r) => ({
    id: `reward-request-${r.id}`,
    kind: "reward_request",
    text: `${r.profile?.display_name ?? "Гишүүн"} «${r.title}» шагналыг хүсч байна`,
    at: r.redeemed_at,
  }));

  return [...taskItems, ...reviewItems, ...rewardItems, ...rewardRequestItems]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}
