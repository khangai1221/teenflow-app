import Image from "next/image";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { weekDates, effectiveStreak } from "@/lib/date";
import FamilyCodeCard from "@/components/family-code-card";
import WeeklyChart from "@/components/profile/weekly-chart";
import AchievementsGrid from "@/components/profile/achievements-grid";
import EditProfileSheet from "@/components/profile/edit-profile-sheet";
import FamilyNameHeading from "@/components/profile/family-name-heading";
import LeaveFamilyButton from "@/components/profile/leave-family-button";
import RemoveMemberButton from "@/components/profile/remove-member-button";
import PushToggle from "@/components/notifications/push-toggle";
import type { AchievementStats } from "@/lib/achievements";
import type { Family, Profile } from "@/lib/types";

export default async function ProfilePage() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/");

  const supabase = await serverClient();
  const { data: familyData } = await supabase
    .from("families")
    .select("*")
    .eq("id", profile.family_id!)
    .maybeSingle();
  const family = familyData as Family | null;
  const { data: membersData } = await supabase
    .from("profiles")
    .select("*")
    .eq("family_id", profile.family_id!)
    .order("role", { ascending: true });
  const members = (membersData ?? []) as Profile[];

  const week = weekDates(new Date());
  const { data: weekTasksData } = await supabase
    .from("tasks")
    .select("scheduled_date")
    .eq("assigned_to", profile.id)
    .eq("status", "done")
    .in("scheduled_date", week);
  const countByDate = new Map<string, number>();
  for (const t of weekTasksData ?? []) {
    countByDate.set(t.scheduled_date, (countByDate.get(t.scheduled_date) ?? 0) + 1);
  }
  const weekChartData = week.map((date) => ({
    date,
    count: countByDate.get(date) ?? 0,
  }));

  const { count: tasksDoneCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("assigned_to", profile.id)
    .eq("status", "done");
  const { count: rewardsRedeemedCount } = await supabase
    .from("reward_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("status", "approved");

  const achievementStats: AchievementStats = {
    tasksDone: tasksDoneCount ?? 0,
    lifetimePoints: profile.lifetime_points,
    streak: effectiveStreak(profile.streak_days, profile.last_completed_date),
    rewardsRedeemed: rewardsRedeemedCount ?? 0,
  };

  return (
    <div className="flex flex-col gap-5 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <h1 className="text-xl font-bold">Профайл</h1>

      {/* Identity */}
      <section className="flex flex-col items-center gap-3 pt-2">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt=""
            width={88}
            height={88}
            className="h-22 w-22 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-3xl font-bold text-accent-foreground">
            {profile.display_name[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold">{profile.display_name}</span>
            <EditProfileSheet profile={profile} />
          </div>
          <span className="text-sm text-muted">{user.email}</span>
          <span className="mt-1 rounded-full bg-accent/20 px-3 py-0.5 text-xs font-medium text-accent-2">
            {profile.role === "parent" ? "Эцэг эх" : "Хүүхэд"}
            {profile.age ? ` · ${profile.age} нас` : ""}
          </span>
        </div>
      </section>

      {family && <FamilyCodeCard code={family.code} />}

      {/* Family members */}
      <section className="flex flex-col gap-2">
        <FamilyNameHeading
          name={family?.name ?? "Гэр бүл"}
          memberCount={members.length}
          isParent={profile.role === "parent"}
        />
        <div className="card divide-y divide-border">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              {m.avatar_url ? (
                <Image
                  src={m.avatar_url}
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-bold">
                  {m.display_name[0]?.toUpperCase()}
                </div>
              )}
              <span className="flex-1 text-sm font-medium">
                {m.display_name}
              </span>
              <span className="text-xs text-muted">
                {m.role === "parent" ? "Эцэг эх" : "Хүүхэд"}
              </span>
              {profile.role === "parent" && m.role === "kid" && (
                <RemoveMemberButton memberId={m.id} />
              )}
            </div>
          ))}
        </div>
      </section>

      <WeeklyChart days={weekChartData} />
      <AchievementsGrid stats={achievementStats} />

      <PushToggle />

      <div className="flex flex-col gap-2">
        <LeaveFamilyButton />
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 py-3.5 text-sm font-semibold text-red-400 transition-colors hover:bg-surface-2"
          >
            <LogOut className="h-4 w-4" />
            Гарах
          </button>
        </form>
      </div>
    </div>
  );
}
