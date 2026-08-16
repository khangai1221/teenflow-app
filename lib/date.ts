// Mongolian date helpers. All dates handled as local YYYY-MM-DD strings so the
// calendar/schedule align with the user's day, not UTC.

export const WEEKDAYS_SHORT = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"]; // Mon..Sun
export const WEEKDAYS_LONG = [
  "Даваа",
  "Мягмар",
  "Лхагва",
  "Пүрэв",
  "Баасан",
  "Бямба",
  "Ням",
];
export const MONTHS = [
  "1-р сар",
  "2-р сар",
  "3-р сар",
  "4-р сар",
  "5-р сар",
  "6-р сар",
  "7-р сар",
  "8-р сар",
  "9-р сар",
  "10-р сар",
  "11-р сар",
  "12-р сар",
];

/** YYYY-MM-DD for a Date, in local time. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Parse a YYYY-MM-DD string into a local Date (midnight). */
export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Monday-based weekday index (0 = Monday … 6 = Sunday). */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** The 7 dates of the week (Mon..Sun) containing `d`, as ISO strings. */
export function weekDates(d: Date): string[] {
  const monday = new Date(d);
  monday.setDate(d.getDate() - mondayIndex(d));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return toISODate(day);
  });
}

/** "YYYY-MM" for a Date, in local time. */
export function toISOMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Parse a "YYYY-MM" string into a local Date at day 1. */
export function fromISOMonth(s: string): Date {
  const [y, m] = s.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

/** Shift a "YYYY-MM" string by `delta` months. */
export function shiftMonth(monthISO: string, delta: number): string {
  const d = fromISOMonth(monthISO);
  d.setMonth(d.getMonth() + delta);
  return toISOMonth(d);
}

/**
 * The 42 dates (6 Mon-Sun weeks) covering the month containing `d`, as ISO
 * strings — always a fixed 6-row grid so the calendar layout never jumps.
 */
export function monthGridDates(d: Date): string[] {
  const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - mondayIndex(firstOfMonth));
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return toISODate(day);
  });
}

/** Generates `count` scheduled_date strings for a repeat rule, from `start`. */
export function recurrenceDates(
  start: string,
  rule: "daily" | "weekdays" | "weekly",
  count: number,
): string[] {
  const dates: string[] = [];
  const cursor = fromISODate(start);
  while (dates.length < count) {
    const dow = cursor.getDay(); // 0 = Sun … 6 = Sat
    const isWeekday = dow !== 0 && dow !== 6;
    if (rule !== "weekdays" || isWeekday) {
      dates.push(toISODate(cursor));
    }
    cursor.setDate(cursor.getDate() + (rule === "weekly" ? 7 : 1));
  }
  return dates;
}

/** "HH:MM" from a "HH:MM:SS" time string. */
export function formatTime(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

/** e.g. "2024.05.25 | Бямба" */
export function formatHeaderDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day} | ${WEEKDAYS_LONG[mondayIndex(d)]}`;
}

/** Yesterday's date as a local YYYY-MM-DD string. */
export function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

/**
 * The streak counter is only ever bumped when a task is completed, so a
 * skipped day never gets written back to zero on its own. Compute what
 * should actually be shown: if the last completion wasn't today or
 * yesterday, the streak is stale — display 0 without touching the DB.
 */
export function effectiveStreak(
  streakDays: number,
  lastCompletedDate: string | null,
): number {
  if (!lastCompletedDate) return 0;
  const today = todayISO();
  const yesterday = yesterdayISO();
  if (lastCompletedDate === today || lastCompletedDate === yesterday) {
    return streakDays;
  }
  return 0;
}

/** True when a pending task's scheduled date has already passed. */
export function isOverdue(scheduledDate: string, status: string): boolean {
  return status === "pending" && scheduledDate < todayISO();
}

/** Mongolian relative time, e.g. "5 минутын өмнө", "Өчигдөр". */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.round((now - then) / 1000));

  if (diffSec < 60) return "Дөнгөж сая";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} минутын өмнө`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} цагийн өмнө`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay === 1) return "Өчигдөр";
  if (diffDay < 7) return `${diffDay} өдрийн өмнө`;
  const diffWeek = Math.round(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek} долоо хоногийн өмнө`;
  const diffMonth = Math.round(diffDay / 30);
  return `${diffMonth} сарын өмнө`;
}
