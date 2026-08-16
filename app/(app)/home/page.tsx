import Image from "next/image";
import Link from "next/link";
import { Flame, ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";
import { todayISO, formatHeaderDate, formatTime, effectiveStreak } from "@/lib/date";
import { CATEGORIES } from "@/lib/constants";
import type { Task } from "@/lib/types";
import { signTaskPhotos } from "@/lib/task-photos";
import { getRecentActivity } from "@/lib/activity";
import ProgressRing from "@/components/ui/progress-ring";
import TaskRowTrigger from "@/components/tasks/task-row-trigger";
import NotificationBell from "@/components/notifications/notification-bell";

export default async function HomePage() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/");

  const supabase = await serverClient();
  const today = todayISO();
  const { data: tasksData } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", profile.id)
    .eq("scheduled_date", today)
    .order("scheduled_time", { ascending: true, nullsFirst: false });

  const tasks = (tasksData ?? []) as Task[];
  const photoUrlByPath = await signTaskPhotos(supabase, tasks);
  const activity = profile.family_id
    ? await getRecentActivity(supabase, profile.family_id)
    : [];
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const remaining = total - done;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const nextTask = tasks.find((t) => t.status === "pending") ?? null;

  const firstName = profile.display_name.split(" ")[0];

  return (
    <div className="flex flex-col gap-5 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted">Өглөөний мэнд</span>
          <h1 className="text-xl font-bold">
            {firstName} <span className="text-lg">👋</span>
          </h1>
          <span className="mt-0.5 text-[11px] text-muted">
            {formatHeaderDate(new Date())}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell items={activity} />
          <Avatar url={profile.avatar_url} name={firstName} />
        </div>
      </header>

      {/* Progress card */}
      <section className="card overflow-hidden bg-gradient-to-br from-card-2 to-card p-5">
        <div className="flex items-center gap-4">
          <ProgressRing value={pct}>
            <span className="text-lg font-bold">{pct}%</span>
          </ProgressRing>
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-sm text-muted">
              Өнөөдрийн{" "}
              <span className="font-semibold text-foreground">{total}</span>{" "}
              даалгаврын{" "}
              <span className="font-semibold text-foreground">{done}</span>-ыг
              гүйцэтгэсэн
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1 font-semibold text-gold">
                ⭐ {profile.points} оноо
              </span>
              <span className="inline-flex items-center gap-1 text-orange-400">
                <Flame className="h-4 w-4 fill-orange-400" />
                {effectiveStreak(profile.streak_days, profile.last_completed_date)} өдөр
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
          <Stat label="Нийт" value={total} />
          <Stat label="Дууссан" value={done} />
          <Stat label="Үлдсэн" value={remaining} />
        </div>
      </section>

      {/* Next task */}
      {nextTask && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">Дараагийн даалгавар</h2>
          <TaskRowTrigger
            task={nextTask}
            photoUrl={
              nextTask.photo_path
                ? photoUrlByPath[nextTask.photo_path] ?? null
                : null
            }
            className="card flex items-center gap-3 bg-gradient-to-br from-accent/25 to-card p-3.5"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
              style={{ background: `${CATEGORIES[nextTask.category].color}22` }}
            >
              {CATEGORIES[nextTask.category].emoji}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">
                {nextTask.title}
              </span>
              <span className="text-[11px] text-muted">
                {[
                  formatTime(nextTask.scheduled_time),
                  nextTask.duration_min ? `${nextTask.duration_min} мин` : "",
                  nextTask.points ? `+${nextTask.points} оноо` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <span className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground">
              Эхлэх
            </span>
          </TaskRowTrigger>
        </section>
      )}

      {/* Today's schedule */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Өнөөдрийн хуваарь</h2>
          <Link
            href="/schedule"
            className="inline-flex items-center text-xs text-accent-2"
          >
            Бүгд харах <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {tasks.length === 0 ? (
          <div className="card p-5 text-center text-sm text-muted">
            Өнөөдөр даалгавар алга. + товчоор нэмээрэй.
          </div>
        ) : (
          <div className="card divide-y divide-border p-1">
            {tasks.map((t) => (
              <TaskRowTrigger
                key={t.id}
                task={t}
                photoUrl={t.photo_path ? photoUrlByPath[t.photo_path] ?? null : null}
                className="flex items-center gap-3 px-3 py-2.5 text-sm"
              >
                <span className="w-12 shrink-0 text-xs text-muted">
                  {formatTime(t.scheduled_time) || "--:--"}
                </span>
                <span
                  className={`flex-1 truncate ${t.status === "done" ? "text-muted line-through" : ""}`}
                >
                  {t.title}
                </span>
              </TaskRowTrigger>
            ))}
          </div>
        )}
      </section>

      {/* Motivational banner */}
      <section className="card flex items-center gap-3 bg-gradient-to-r from-accent/30 to-card-2 p-4">
        <span className="text-3xl">🏆</span>
        <p className="text-xs leading-relaxed text-foreground/90">
          Өнөөдрийн эхний алхам маргаашийн том амжилтыг бүтээнэ. Урагшаа!
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-lg font-bold">{value}</span>
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
