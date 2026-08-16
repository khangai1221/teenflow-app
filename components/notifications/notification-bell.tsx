"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Gift, Hourglass } from "lucide-react";
import { formatRelative } from "@/lib/date";
import type { ActivityItem } from "@/lib/activity";

function ActivityIcon({ kind }: { kind: ActivityItem["kind"] }) {
  if (kind === "task") {
    return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />;
  }
  if (kind === "task_review") {
    return <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />;
  }
  if (kind === "reward_request") {
    return <Gift className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />;
  }
  return <Gift className="mt-0.5 h-4 w-4 shrink-0 text-gold" />;
}

const SEEN_KEY = "teenflow-notif-seen-at";

export default function NotificationBell({ items }: { items: ActivityItem[] }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seenAt = localStorage.getItem(SEEN_KEY);
    const latest = items[0]?.at;
    setUnread(Boolean(latest && (!seenAt || new Date(latest) > new Date(seenAt))));
  }, [items]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && typeof window !== "undefined") {
      localStorage.setItem(SEEN_KEY, new Date().toISOString());
      setUnread(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Мэдэгдэл"
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface text-muted"
      >
        <Bell className="h-5 w-5" />
        {unread && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-400" />
        )}
      </button>

      {open && (
        <>
          <button
            aria-label="Хаах"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="no-scrollbar absolute right-0 top-12 z-50 max-h-96 w-72 overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            {items.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted">
                Одоохондоо мэдэгдэл алга.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2.5 rounded-xl p-2.5 text-xs"
                  >
                    <ActivityIcon kind={item.kind} />
                    <div className="flex flex-col gap-0.5">
                      <span className="leading-snug text-foreground/90">
                        {item.text}
                      </span>
                      <span className="text-[10px] text-muted">
                        {formatRelative(item.at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
