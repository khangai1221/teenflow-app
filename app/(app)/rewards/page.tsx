import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame, Gift } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";
import { effectiveStreak, formatRelative } from "@/lib/date";
import type { Profile, Reward, RewardRedemptionWithProfile } from "@/lib/types";
import RewardRow from "@/components/rewards/reward-row";
import CreateRewardForm from "@/components/rewards/create-reward-form";
import ReviewRedemptionButtons from "@/components/rewards/review-redemption-buttons";
import CancelRedemptionButton from "@/components/rewards/cancel-redemption-button";

const MEDALS = ["🥇", "🥈", "🥉"];

const TABS = [
  { key: "leaderboard", label: "Тэргүүлэгчид" },
  { key: "catalog", label: "Шагналын сан" },
  { key: "pending", label: "Хүлээгдэж буй" },
  { key: "history", label: "Түүх" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function RewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/");

  const { tab } = await searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === tab)
    ? (tab as TabKey)
    : "leaderboard";
  const isParent = profile.role === "parent";

  const supabase = await serverClient();

  // Only the columns the leaderboard actually renders — this table also
  // carries streak/points-history/avatar-upload fields nothing here needs.
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, points, role")
    .eq("family_id", profile.family_id!)
    .order("points", { ascending: false });
  const members = (data ?? []) as Pick<
    Profile,
    "id" | "display_name" | "avatar_url" | "points" | "role"
  >[];

  const myRank = members.findIndex((m) => m.id === profile.id) + 1;

  let rewards: Reward[] = [];
  let myPendingRewardIds = new Set<string>();
  if (activeTab === "catalog") {
    const { data: rewardsData } = await supabase
      .from("rewards")
      .select("*")
      .eq("family_id", profile.family_id!)
      .order("cost", { ascending: true });
    rewards = (rewardsData ?? []) as Reward[];

    const { data: myPending } = await supabase
      .from("reward_redemptions")
      .select("reward_id")
      .eq("profile_id", profile.id)
      .eq("status", "pending");
    myPendingRewardIds = new Set(
      (myPending ?? []).map((r) => r.reward_id as string).filter(Boolean),
    );
  }

  let redemptions: RewardRedemptionWithProfile[] = [];
  if (activeTab === "history") {
    const { data: redemptionsData } = await supabase
      .from("reward_redemptions")
      .select("*, profile:profile_id(id, display_name, avatar_url)")
      .eq("family_id", profile.family_id!)
      .eq("status", "approved")
      .order("redeemed_at", { ascending: false })
      .limit(30);
    redemptions = (redemptionsData ?? []) as unknown as RewardRedemptionWithProfile[];
  } else if (activeTab === "pending") {
    const { data: pendingData } = await supabase
      .from("reward_redemptions")
      .select("*, profile:profile_id(id, display_name, avatar_url)")
      .eq("family_id", profile.family_id!)
      .eq("status", "pending")
      .order("redeemed_at", { ascending: true });
    redemptions = (pendingData ?? []) as unknown as RewardRedemptionWithProfile[];
  }

  // Count badge on the "Хүлээгдэж буй" tab: reuse the list we already
  // fetched when we're on that tab, otherwise a cheap head-only count.
  let pendingCount = 0;
  if (activeTab === "pending") {
    pendingCount = redemptions.length;
  } else {
    const { count } = await supabase
      .from("reward_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("family_id", profile.family_id!)
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Шагнал</h1>
      </header>

      {/* My points hero */}
      <section className="card flex items-center justify-between overflow-hidden bg-gradient-to-br from-accent/30 to-card-2 p-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted">Миний оноо</span>
          <span className="text-3xl font-bold text-gold">
            ⭐ {profile.points}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-orange-400">
            <Flame className="h-3.5 w-3.5 fill-orange-400" />
            {effectiveStreak(profile.streak_days, profile.last_completed_date)} өдрийн цуваа
          </span>
        </div>
        <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-white/10">
          <span className="text-xs text-muted">Байр</span>
          <span className="text-xl font-bold">#{myRank || "-"}</span>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl bg-surface p-1">
        {TABS.map((t) => {
          const active = t.key === activeTab;
          return (
            <Link
              key={t.key}
              href={`/rewards?tab=${t.key}`}
              className={`flex-1 rounded-xl py-2 text-center text-xs font-semibold transition-colors ${
                active
                  ? "bg-gradient-to-r from-accent to-accent-2 text-accent-foreground"
                  : "text-muted"
              }`}
            >
              {t.label}
              {t.key === "pending" && pendingCount > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-400 px-1 text-[9px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {activeTab === "leaderboard" ? (
        /* Leaderboard */
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">
            Гэр бүлийн тэргүүлэгчид
          </h2>
          <div className="flex flex-col gap-2">
            {members.map((m, i) => {
              const isMe = m.id === profile.id;
              return (
                <div
                  key={m.id}
                  className={`card flex items-center gap-3 p-3 ${
                    isMe ? "border-accent/60 bg-accent/10" : ""
                  }`}
                >
                  <span className="w-6 text-center text-lg">
                    {MEDALS[i] ?? (
                      <span className="text-sm font-semibold text-muted">
                        {i + 1}
                      </span>
                    )}
                  </span>
                  {m.avatar_url ? (
                    <Image
                      src={m.avatar_url}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                      {m.display_name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold">
                      {m.display_name}
                      {isMe && <span className="text-muted"> (би)</span>}
                    </span>
                    <span className="text-[11px] text-muted">
                      {m.role === "parent" ? "Эцэг эх" : "Хүүхэд"}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gold">
                    ⭐ {m.points}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : activeTab === "catalog" ? (
        /* Reward catalog */
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">
            Оноогоор авах боломжтой шагнал
          </h2>
          {rewards.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 p-6 text-center text-sm text-muted">
              <Gift className="h-6 w-6" />
              {isParent
                ? "Шагнал алга. Доор шинэ шагнал нэмээрэй."
                : "Одоохондоо шагнал алга. Эцэг эхээсээ нэмэхийг хүсээрэй."}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {rewards.map((r) => (
                <RewardRow
                  key={r.id}
                  reward={r}
                  isParent={isParent}
                  canAfford={profile.points >= r.cost}
                  alreadyPending={myPendingRewardIds.has(r.id)}
                />
              ))}
            </div>
          )}
          {isParent && <CreateRewardForm />}
        </section>
      ) : activeTab === "pending" ? (
        /* Pending reward requests awaiting a parent's decision */
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">
            Батлуулахаар хүлээгдэж буй хүсэлтүүд
          </h2>
          {redemptions.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 p-6 text-center text-sm text-muted">
              <Gift className="h-6 w-6" />
              Одоогоор хүлээгдэж буй хүсэлт алга.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {redemptions.map((r) => (
                <div key={r.id} className="card flex items-center gap-3 p-3.5">
                  {r.profile?.avatar_url ? (
                    <Image
                      src={r.profile.avatar_url}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                      {r.profile?.display_name[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm">
                      <span className="font-semibold">
                        {r.profile?.display_name ?? "Гишүүн"}
                      </span>{" "}
                      «{r.title}» хүсч байна
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-gold">
                      ⭐ {r.cost} оноо · {formatRelative(r.redeemed_at)}
                    </span>
                  </div>
                  {isParent ? (
                    <ReviewRedemptionButtons redemptionId={r.id} />
                  ) : r.profile_id === profile.id ? (
                    <CancelRedemptionButton redemptionId={r.id} />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        /* Redemption history */
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">
            Сүүлд авсан шагналууд
          </h2>
          {redemptions.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 p-6 text-center text-sm text-muted">
              <Gift className="h-6 w-6" />
              Одоохондоо шагнал аваагүй байна.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {redemptions.map((r) => (
                <div key={r.id} className="card flex items-center gap-3 p-3.5">
                  {r.profile?.avatar_url ? (
                    <Image
                      src={r.profile.avatar_url}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                      {r.profile?.display_name[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm">
                      <span className="font-semibold">
                        {r.profile?.display_name ?? "Гишүүн"}
                      </span>{" "}
                      «{r.title}» авлаа
                    </span>
                    <span className="text-[11px] text-muted">
                      {formatRelative(r.redeemed_at)}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-gold">
                    -{r.cost}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
