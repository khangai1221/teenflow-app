"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createTask } from "@/app/(app)/tasks/actions";
import {
  CATEGORIES,
  CATEGORY_ORDER,
  PRIORITIES,
  PRIORITY_ORDER,
} from "@/lib/constants";
import { todayISO } from "@/lib/date";
import type { Category, Priority, RecurrenceRule } from "@/lib/types";

type Member = { id: string; display_name: string };

const REPEAT_OPTIONS: { key: "none" | RecurrenceRule; label: string }[] = [
  { key: "none", label: "Байхгүй" },
  { key: "daily", label: "Өдөр бүр" },
  { key: "weekdays", label: "Ажлын өдрүүдэд" },
  { key: "weekly", label: "7 хоног бүр" },
];

export default function CreateTaskFab({
  members,
  currentId,
  isParent,
}: {
  members: Member[];
  currentId: string;
  isParent: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("lesson");
  const [priority, setPriority] = useState<Priority>("med");
  const [assignedTo, setAssignedTo] = useState(currentId);
  const [repeat, setRepeat] = useState<"none" | RecurrenceRule>("none");
  const [repeatCount, setRepeatCount] = useState(8);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
    setCategory("lesson");
    setPriority("med");
    setAssignedTo(currentId);
    setRepeat("none");
    setRepeatCount(8);
    setRequiresApproval(false);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("category", category);
    formData.set("priority", priority);
    formData.set("assigned_to", isParent ? assignedTo : currentId);
    formData.set("repeat", repeat);
    formData.set("repeat_count", String(repeatCount));
    formData.set("requires_approval", requiresApproval ? "on" : "off");
    startTransition(async () => {
      // createTask() already calls revalidatePath(), so Next.js refreshes
      // the affected routes as part of the action response.
      const res = await createTask(formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      close();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Даалгавар нэмэх"
        className="absolute bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-accent-foreground shadow-[0_10px_30px_rgba(124,92,255,0.5)] transition-transform active:scale-95"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>

      {open && (
        <div className="absolute inset-0 z-40 flex items-end">
          <button
            aria-label="Хаах"
            onClick={close}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="no-scrollbar relative max-h-[88%] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-card px-5 pb-8 pt-4">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/20" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Шинэ даалгавар</h2>
              <button onClick={close} className="text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <input
                name="title"
                required
                placeholder="Даалгаврын нэр"
                className="fld"
                autoFocus
              />

              <textarea
                name="description"
                placeholder="Тайлбар (заавал биш)"
                rows={2}
                className="fld resize-none"
              />

              {/* Category chips */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted">Төрөл</span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_ORDER.map((c) => (
                    <Chip
                      key={c}
                      active={category === c}
                      color={CATEGORIES[c].color}
                      onClick={() => setCategory(c)}
                    >
                      {CATEGORIES[c].emoji} {CATEGORIES[c].label}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Priority chips */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted">Ач холбогдол</span>
                <div className="flex gap-2">
                  {PRIORITY_ORDER.map((p) => (
                    <Chip
                      key={p}
                      active={priority === p}
                      color={PRIORITIES[p].color}
                      onClick={() => setPriority(p)}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: PRIORITIES[p].color }}
                      />{" "}
                      {PRIORITIES[p].label}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Assignee (parents only) */}
              {isParent && members.length > 0 && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted">Хэнд</span>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="fld"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id} className="bg-card">
                        {m.display_name}
                        {m.id === currentId ? " (би)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {isParent && (
                <label className="flex items-center gap-2 text-xs font-medium text-muted">
                  <input
                    type="checkbox"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-accent"
                  />
                  Батламж шаардах (эцэг эх шалгана)
                </label>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted">Огноо</span>
                  <input
                    name="scheduled_date"
                    type="date"
                    defaultValue={todayISO()}
                    className="fld"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted">Цаг</span>
                  <input name="scheduled_time" type="time" className="fld" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted">
                    Үргэлжлэх (мин)
                  </span>
                  <input
                    name="duration_min"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="30"
                    className="fld"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted">Оноо</span>
                  <input
                    name="points"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    defaultValue={10}
                    className="fld"
                  />
                </label>
              </div>

              {/* Repeat */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted">Давтагдах</span>
                <div className="flex flex-wrap gap-2">
                  {REPEAT_OPTIONS.map((r) => (
                    <Chip
                      key={r.key}
                      active={repeat === r.key}
                      color="#7c5cff"
                      onClick={() => setRepeat(r.key)}
                    >
                      {r.label}
                    </Chip>
                  ))}
                </div>
                {repeat !== "none" && (
                  <label className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-muted">Хэдэн удаа</span>
                    <input
                      type="number"
                      min={2}
                      max={52}
                      inputMode="numeric"
                      value={repeatCount}
                      onChange={(e) =>
                        setRepeatCount(
                          Math.min(52, Math.max(2, parseInt(e.target.value, 10) || 2)),
                        )
                      }
                      className="fld w-20 text-center"
                    />
                  </label>
                )}
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={pending}
                className="mt-1 rounded-2xl bg-gradient-to-r from-accent to-accent-2 py-3.5 text-sm font-semibold text-accent-foreground shadow-[0_8px_30px_rgba(124,92,255,0.4)] transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {pending ? "Нэмж байна…" : "Даалгавар нэмэх"}
              </button>
            </form>

            <style>{`
              .fld {
                width: 100%;
                border-radius: 0.9rem;
                border: 1px solid var(--border);
                background: var(--surface);
                padding: 0.7rem 0.9rem;
                font-size: 0.9rem;
                color: var(--foreground);
                outline: none;
              }
              .fld::placeholder { color: var(--muted); }
              .fld:focus { border-color: var(--accent); }
            `}</style>
          </div>
        </div>
      )}
    </>
  );
}

function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
      style={{
        borderColor: active ? color : "var(--border)",
        background: active ? `${color}22` : "var(--surface)",
        color: active ? "#fff" : "var(--muted)",
      }}
    >
      {children}
    </button>
  );
}
