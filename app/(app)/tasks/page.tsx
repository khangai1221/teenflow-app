import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/date";
import { PRIORITIES, PRIORITY_ORDER } from "@/lib/constants";
import type { TaskWithAssignee } from "@/lib/types";
import { signTaskPhotos } from "@/lib/task-photos";
import TaskCard from "@/components/tasks/task-card";

const TABS = [
  { key: "today", label: "Өнөөдөр" },
  { key: "upcoming", label: "Удахгүй" },
  { key: "done", label: "Дууссан" },
  { key: "review", label: "Шалгах" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/");

  const isParent = profile.role === "parent";
  // Kids have nothing to review — only parents see that tab.
  const visibleTabs = isParent ? TABS : TABS.filter((t) => t.key !== "review");

  const { tab } = await searchParams;
  const activeTab: TabKey = visibleTabs.some((t) => t.key === tab)
    ? (tab as TabKey)
    : "today";

  const today = todayISO();
  const supabase = await serverClient();

  let query = supabase
    .from("tasks")
    .select("*, assignee:assigned_to(id, display_name, avatar_url)");

  // Parents see the whole family's tasks; kids see their own.
  query = isParent
    ? query.eq("family_id", profile.family_id!)
    : query.eq("assigned_to", profile.id);

  if (activeTab === "today") {
    // Include missed tasks (past date, still pending) alongside today's, so
    // overdue work doesn't silently fall through every tab.
    query = query.or(
      `scheduled_date.eq.${today},and(scheduled_date.lt.${today},status.eq.pending)`,
    );
  } else if (activeTab === "upcoming") {
    query = query.gt("scheduled_date", today).eq("status", "pending");
  } else if (activeTab === "review") {
    query = query
      .eq("status", "awaiting_approval")
      .order("completed_at", { ascending: true });
  } else {
    query = query.eq("status", "done");
  }

  const { data } =
    activeTab === "review"
      ? await query
      : await query
          .order("scheduled_date", { ascending: true })
          .order("scheduled_time", { ascending: true, nullsFirst: false });
  const tasks = (data ?? []) as unknown as TaskWithAssignee[];

  const photoUrlByPath = await signTaskPhotos(supabase, tasks);

  // Count badge on the "Шалгах" tab: reuse the list we already fetched when
  // we're on that tab, otherwise a cheap head-only count.
  let reviewCount = 0;
  if (isParent) {
    if (activeTab === "review") {
      reviewCount = tasks.length;
    } else {
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("family_id", profile.family_id!)
        .eq("status", "awaiting_approval");
      reviewCount = count ?? 0;
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Даалгавар</h1>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl bg-surface p-1">
        {visibleTabs.map((t) => {
          const active = t.key === activeTab;
          return (
            <Link
              key={t.key}
              href={`/tasks?tab=${t.key}`}
              className={`flex-1 rounded-xl py-2 text-center text-xs font-semibold transition-colors ${
                active
                  ? "bg-gradient-to-r from-accent to-accent-2 text-accent-foreground"
                  : "text-muted"
              }`}
            >
              {t.label}
              {t.key === "review" && reviewCount > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-400 px-1 text-[9px] font-bold text-white">
                  {reviewCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* List */}
      {tasks.length === 0 ? (
        <div className="card mt-2 p-8 text-center text-sm text-muted">
          {activeTab === "review"
            ? "Шалгах даалгавар алга байна."
            : "Даалгавар алга. Доорх + товчоор нэмээрэй."}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              showAssignee={isParent}
              photoUrl={t.photo_path ? photoUrlByPath[t.photo_path] ?? null : null}
            />
          ))}
        </div>
      )}

      {/* Priority legend */}
      <div className="mt-1 flex items-center justify-center gap-4">
        {PRIORITY_ORDER.map((p) => (
          <span
            key={p}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: PRIORITIES[p].color }}
            />
            {PRIORITIES[p].label}
          </span>
        ))}
      </div>
    </div>
  );
}
