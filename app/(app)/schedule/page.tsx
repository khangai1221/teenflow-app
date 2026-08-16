import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";
import {
  todayISO,
  formatTime,
  fromISODate,
  toISOMonth,
  fromISOMonth,
  shiftMonth,
  monthGridDates,
  isOverdue,
  WEEKDAYS_SHORT,
  MONTHS,
} from "@/lib/date";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/constants";
import type { Category, Task } from "@/lib/types";
import { signTaskPhotos } from "@/lib/task-photos";
import TaskRowTrigger from "@/components/tasks/task-row-trigger";

function scheduleHref(params: {
  date?: string;
  month?: string;
  cat?: string | null;
}) {
  const sp = new URLSearchParams();
  if (params.date) sp.set("date", params.date);
  if (params.month) sp.set("month", params.month);
  if (params.cat) sp.set("cat", params.cat);
  return `/schedule?${sp.toString()}`;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; month?: string; cat?: string }>;
}) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/");

  const { date, month, cat } = await searchParams;
  const selected = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayISO();
  const displayedMonth =
    month && /^\d{4}-\d{2}$/.test(month)
      ? month
      : toISOMonth(fromISODate(selected));
  const activeCat = (cat as Category) ?? null;
  const today = todayISO();

  // Fixed 6-week grid for the displayed month; fetch every task in that
  // range once and slice the selected day's agenda out of it below, rather
  // than issuing a second query.
  const grid = monthGridDates(fromISOMonth(displayedMonth));
  const gridStart = grid[0];
  const gridEnd = grid[grid.length - 1];

  const supabase = await serverClient();
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", profile.id)
    .gte("scheduled_date", gridStart)
    .lte("scheduled_date", gridEnd);
  if (activeCat) query = query.eq("category", activeCat);
  const { data } = await query.order("scheduled_time", {
    ascending: true,
    nullsFirst: false,
  });
  const gridTasks = (data ?? []) as Task[];

  const tasksByDate = new Map<string, Task[]>();
  for (const t of gridTasks) {
    const list = tasksByDate.get(t.scheduled_date);
    if (list) list.push(t);
    else tasksByDate.set(t.scheduled_date, [t]);
  }

  const tasks = tasksByDate.get(selected) ?? [];
  const photoUrlByPath = await signTaskPhotos(supabase, tasks);

  const monthDate = fromISOMonth(displayedMonth);
  const monthLabel = `${MONTHS[monthDate.getMonth()]} · ${monthDate.getFullYear()}`;

  return (
    <div className="flex flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Миний хуваарь</h1>
        <Link
          href={scheduleHref({
            date: today,
            month: toISOMonth(new Date()),
            cat: activeCat,
          })}
          className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-muted"
        >
          Өнөөдөр
        </Link>
      </header>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={scheduleHref({
            date: selected,
            month: shiftMonth(displayedMonth, -1),
            cat: activeCat,
          })}
          aria-label="Өмнөх сар"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <Link
          href={scheduleHref({
            date: selected,
            month: shiftMonth(displayedMonth, 1),
            cat: activeCat,
          })}
          aria-label="Дараах сар"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Month grid */}
      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted">
          {WEEKDAYS_SHORT.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((iso) => {
            const inMonth = iso.slice(0, 7) === displayedMonth;
            const isSelected = iso === selected;
            const isToday = iso === today;
            const dayTasks = tasksByDate.get(iso) ?? [];
            const dayNum = fromISODate(iso).getDate();
            return (
              <Link
                key={iso}
                href={scheduleHref({
                  date: iso,
                  month: iso.slice(0, 7),
                  cat: activeCat,
                })}
                prefetch={false}
                className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-xs transition-colors ${
                  isSelected
                    ? "bg-gradient-to-br from-accent to-accent-2 font-semibold text-accent-foreground"
                    : inMonth
                      ? "text-foreground"
                      : "text-muted/40"
                } ${!isSelected && isToday ? "ring-1 ring-accent-2" : ""}`}
              >
                <span>{dayNum}</span>
                <div className="flex h-1.5 items-center gap-0.5">
                  {dayTasks.slice(0, 3).map((t, i) => (
                    <span
                      key={i}
                      className="h-1 w-1 rounded-full"
                      style={{
                        background: isSelected
                          ? "currentColor"
                          : CATEGORIES[t.category].color,
                      }}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[8px] leading-none">
                      +{dayTasks.length - 3}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Category filters */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <FilterChip
          href={scheduleHref({ date: selected, month: displayedMonth })}
          active={!activeCat}
        >
          Бүгд
        </FilterChip>
        {CATEGORY_ORDER.map((c) => (
          <FilterChip
            key={c}
            href={scheduleHref({ date: selected, month: displayedMonth, cat: c })}
            active={activeCat === c}
            color={CATEGORIES[c].color}
          >
            {CATEGORIES[c].label}
          </FilterChip>
        ))}
      </div>

      {/* Agenda for the selected day */}
      {tasks.length === 0 ? (
        <div className="card mt-2 p-6 text-center text-sm text-muted">
          Энэ өдөр даалгавар алга.
        </div>
      ) : (
        <ol className="relative mt-2 flex flex-col gap-3 pl-6">
          <span className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
          {tasks.map((t) => {
            const c = CATEGORIES[t.category];
            const done = t.status === "done";
            const overdue = isOverdue(t.scheduled_date, t.status);
            return (
              <li key={t.id} className="relative">
                <span
                  className="absolute -left-[22px] top-3 h-3.5 w-3.5 rounded-full border-2 border-background"
                  style={{ background: done ? "#2ecc71" : overdue ? "#ef4444" : c.color }}
                />
                <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted">
                  {formatTime(t.scheduled_time) || "Цаггүй"}
                  {overdue && (
                    <span className="text-red-400">· Хугацаа хэтэрсэн</span>
                  )}
                </div>
                <TaskRowTrigger
                  task={t}
                  photoUrl={t.photo_path ? photoUrlByPath[t.photo_path] ?? null : null}
                  className={`card flex items-center justify-between gap-2 p-3 ${overdue ? "border-red-400/40 bg-red-400/5" : ""}`}
                >
                  <span
                    className={`truncate text-sm font-medium ${done ? "text-muted line-through" : ""}`}
                  >
                    {t.title}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium"
                    style={{ background: `${c.color}22`, color: c.color }}
                  >
                    {c.label}
                  </span>
                </TaskRowTrigger>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  color = "#7c5cff",
  children,
}: {
  href: string;
  active: boolean;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors"
      style={{
        borderColor: active ? color : "var(--border)",
        background: active ? color : "var(--surface)",
        color: active ? "#fff" : "var(--muted)",
      }}
    >
      {children}
    </Link>
  );
}
