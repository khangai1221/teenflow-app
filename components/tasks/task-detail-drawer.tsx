"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { X, Play, Pause, Upload, Trash2, Pencil, AlertCircle } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_ORDER,
  PRIORITIES,
  PRIORITY_ORDER,
} from "@/lib/constants";
import { formatTime, isOverdue } from "@/lib/date";
import { useFamily } from "@/lib/family-context";
import {
  toggleTaskStatus,
  submitTaskForApproval,
  reviewTask,
  uploadTaskPhoto,
  deleteTask,
  deleteTaskSeries,
  updateTask,
} from "@/app/(app)/tasks/actions";
import type { Category, Priority, Task, TaskStatus } from "@/lib/types";

const DEFAULT_MINUTES = 25;

const REPEAT_LABELS: Record<string, string> = {
  daily: "Өдөр бүр давтагдана",
  weekdays: "Ажлын өдрүүдэд давтагдана",
  weekly: "7 хоног бүр давтагдана",
};

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TaskDetailDrawer({
  task,
  photoUrl,
  onClose,
}: {
  task: Task;
  photoUrl: string | null;
  onClose: () => void;
}) {
  const { members, isParent } = useFamily();
  const cat = CATEGORIES[task.category];
  const prio = PRIORITIES[task.priority];
  const overdue = isOverdue(task.scheduled_date, task.status);
  const initialSeconds = (task.duration_min || DEFAULT_MINUTES) * 60;

  const TIMER_KEY = `teenflow-timer-${task.id}`;

  function loadTimer() {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as { taskId: string; remaining: number; running: boolean; savedAt: number };
    } catch {
      return null;
    }
  }

  const stored = loadTimer();

  const initialRemaining =
    stored && stored.taskId === task.id
      ? Math.max(0, stored.remaining - (stored.running ? Math.floor((Date.now() - stored.savedAt) / 1000) : 0))
      : initialSeconds;

  const initialRunning =
    stored && stored.taskId === task.id && stored.remaining > 0
      ? stored.running
      : false;

  // Slide-in animation: mount off-screen, then move on-screen a frame later.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  function close() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  const [remaining, setRemaining] = useState(initialRemaining);
  const [running, setRunning] = useState(initialRunning);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const finished = status !== "pending";
  const [finishError, setFinishError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const firedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (finished || remaining <= 0) {
      localStorage.removeItem(TIMER_KEY);
    } else {
      localStorage.setItem(TIMER_KEY, JSON.stringify({
        taskId: task.id,
        remaining,
        running,
        savedAt: Date.now(),
      }));
    }
  }, [remaining, running, finished, task.id]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  function complete() {
    if (firedRef.current || finished) return;
    firedRef.current = true;
    setRunning(false);
    setFinishError(null);
    startTransition(async () => {
      const res = task.requires_approval
        ? await submitTaskForApproval(task.id)
        : await toggleTaskStatus(task.id, true);
      if (res?.error) {
        firedRef.current = false;
        setFinishError(res.error);
      } else {
        setStatus(task.requires_approval ? "awaiting_approval" : "done");
      }
    });
  }

  useEffect(() => {
    if (remaining === 0 && !finished) complete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const [reviewPending, startReview] = useTransition();
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);

  function review(approve: boolean) {
    setReviewError(null);
    startReview(async () => {
      const res = await reviewTask(task.id, approve);
      if (res?.error) setReviewError(res.error);
      else setStatus(approve ? "done" : "pending");
    });
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPending, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    const formData = new FormData();
    formData.set("taskId", task.id);
    formData.set("photo", file);
    startUpload(async () => {
      const res = await uploadTaskPhoto(formData);
      if (res.error) setUploadError(res.error);
    });
  }

  const [editing, setEditing] = useState(false);
  const [editCategory, setEditCategory] = useState<Category>(task.category);
  const [editPriority, setEditPriority] = useState<Priority>(task.priority);
  const [editAssignedTo, setEditAssignedTo] = useState(task.assigned_to ?? "");
  const [editRequiresApproval, setEditRequiresApproval] = useState(
    task.requires_approval,
  );
  const [editScope, setEditScope] = useState<"one" | "series">("one");
  const [editPending, startEdit] = useTransition();
  const [editError, setEditError] = useState<string | null>(null);

  function onEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("category", editCategory);
    formData.set("priority", editPriority);
    if (isParent) {
      formData.set("assigned_to", editAssignedTo);
      formData.set("requires_approval", editRequiresApproval ? "on" : "off");
    }
    if (task.recurrence_id) formData.set("scope", editScope);
    setEditError(null);
    startEdit(async () => {
      const res = await updateTask(task.id, formData);
      if (res.error) {
        setEditError(res.error);
        return;
      }
      close();
    });
  }

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePending, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete(scope: "one" | "series") {
    setDeleteError(null);
    startDelete(async () => {
      const res =
        scope === "series" && task.recurrence_id
          ? await deleteTaskSeries(task.recurrence_id, task.scheduled_date)
          : await deleteTask(task.id);
      if (res.error) setDeleteError(res.error);
      else close();
    });
  }

  return (
    <div className="absolute inset-0 z-50 flex justify-end">
      <button
        aria-label="Хаах"
        onClick={close}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`no-scrollbar relative h-full w-[86%] max-w-sm overflow-y-auto border-l border-border bg-card px-5 pb-8 pt-5 shadow-[0_0_60px_rgba(0,0,0,0.5)] transition-transform duration-300 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <span
              className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium"
              style={{ background: `${cat.color}22`, color: cat.color }}
            >
              {cat.emoji} {cat.label}
            </span>
            <h2 className="text-lg font-bold leading-snug">{task.title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                aria-label="Засах"
                className="text-muted"
              >
                <Pencil className="h-[18px] w-[18px]" />
              </button>
            )}
            <button onClick={close} aria-label="Хаах" className="text-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {editing ? (
          <form onSubmit={onEditSubmit} className="flex flex-col gap-4">
            <input
              name="title"
              required
              defaultValue={task.title}
              placeholder="Даалгаврын нэр"
              className="edit-fld"
              autoFocus
            />

            <textarea
              name="description"
              defaultValue={task.description ?? ""}
              placeholder="Тайлбар (заавал биш)"
              rows={2}
              className="edit-fld resize-none"
            />

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted">Төрөл</span>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ORDER.map((c) => (
                  <EditChip
                    key={c}
                    active={editCategory === c}
                    color={CATEGORIES[c].color}
                    onClick={() => setEditCategory(c)}
                  >
                    {CATEGORIES[c].emoji} {CATEGORIES[c].label}
                  </EditChip>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted">Ач холбогдол</span>
              <div className="flex gap-2">
                {PRIORITY_ORDER.map((p) => (
                  <EditChip
                    key={p}
                    active={editPriority === p}
                    color={PRIORITIES[p].color}
                    onClick={() => setEditPriority(p)}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: PRIORITIES[p].color }}
                    />{" "}
                    {PRIORITIES[p].label}
                  </EditChip>
                ))}
              </div>
            </div>

            {isParent && members.length > 0 && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Хэнд</span>
                <select
                  value={editAssignedTo}
                  onChange={(e) => setEditAssignedTo(e.target.value)}
                  className="edit-fld"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id} className="bg-card">
                      {m.display_name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {isParent && (
              <label className="flex items-center gap-2 text-xs font-medium text-muted">
                <input
                  type="checkbox"
                  checked={editRequiresApproval}
                  onChange={(e) => setEditRequiresApproval(e.target.checked)}
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
                  defaultValue={task.scheduled_date}
                  className="edit-fld"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Цаг</span>
                <input
                  name="scheduled_time"
                  type="time"
                  defaultValue={formatTime(task.scheduled_time)}
                  className="edit-fld"
                />
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
                  defaultValue={task.duration_min ?? ""}
                  className="edit-fld"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Оноо</span>
                <input
                  name="points"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  defaultValue={task.points}
                  className="edit-fld"
                />
              </label>
            </div>

            {task.recurrence_id && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted">
                  Хэрэгжих хүрээ
                </span>
                <div className="flex gap-2">
                  <EditChip
                    active={editScope === "one"}
                    color="#7c5cff"
                    onClick={() => setEditScope("one")}
                  >
                    Зөвхөн энэ өдөр
                  </EditChip>
                  <EditChip
                    active={editScope === "series"}
                    color="#7c5cff"
                    onClick={() => setEditScope("series")}
                  >
                    Энэ болон дараах бүгд
                  </EditChip>
                </div>
              </div>
            )}

            {editError && <p className="text-sm text-red-400">{editError}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={editPending}
                className="flex-1 rounded-2xl border border-border py-3 text-sm font-medium text-muted disabled:opacity-50"
              >
                Цуцлах
              </button>
              <button
                type="submit"
                disabled={editPending}
                className="flex-1 rounded-2xl bg-gradient-to-r from-accent to-accent-2 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
              >
                {editPending ? "Хадгалж байна…" : "Хадгалах"}
              </button>
            </div>

            <style>{`
              .edit-fld {
                width: 100%;
                border-radius: 0.9rem;
                border: 1px solid var(--border);
                background: var(--surface);
                padding: 0.7rem 0.9rem;
                font-size: 0.9rem;
                color: var(--foreground);
                outline: none;
              }
              .edit-fld::placeholder { color: var(--muted); }
              .edit-fld:focus { border-color: var(--accent); }
            `}</style>
          </form>
        ) : (
          <>
        {task.description && (
          <p className="mb-4 text-sm leading-relaxed text-muted">
            {task.description}
          </p>
        )}

        <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-muted">
          {overdue && (
            <span className="inline-flex items-center gap-1 font-medium text-red-400">
              <AlertCircle className="h-3.5 w-3.5" />
              Хугацаа хэтэрсэн
            </span>
          )}
          {task.scheduled_time && <span>🕒 {formatTime(task.scheduled_time)}</span>}
          <span className="inline-flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: prio.color }}
            />
            {prio.label}
          </span>
          {task.points > 0 && (
            <span className="text-gold">⭐ +{task.points} оноо</span>
          )}
          {task.recurrence_rule && (
            <span>🔁 {REPEAT_LABELS[task.recurrence_rule]}</span>
          )}
          {task.requires_approval && <span>🔒 Батламж шаардана</span>}
        </div>

        {/* Focus timer / status */}
        <div className="card mb-5 flex flex-col items-center gap-3 bg-gradient-to-br from-accent/20 to-card-2 p-5">
          {status === "done" ? (
            <>
              <span className="text-3xl">🎉</span>
              <p className="text-sm font-semibold">Даалгавар дууслаа!</p>
              {task.points > 0 && (
                <p className="text-xs text-gold">
                  +{task.points} оноо нэмэгдлээ
                </p>
              )}
            </>
          ) : status === "awaiting_approval" ? (
            <>
              <span className="text-3xl">⏳</span>
              <p className="text-sm font-semibold">Шалгуулахаар илгээгдлээ</p>
              <p className="text-center text-xs text-muted">
                Эцэг эх шалгаж, батлахыг хүлээж байна
              </p>
              {isParent && !confirmReject && (
                <div className="mt-1 flex gap-2">
                  <button
                    onClick={() => review(true)}
                    disabled={reviewPending}
                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-xs font-semibold text-accent-foreground disabled:opacity-50"
                  >
                    Батлах{task.points > 0 ? ` (+${task.points})` : ""}
                  </button>
                  <button
                    onClick={() => setConfirmReject(true)}
                    disabled={reviewPending}
                    className="flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-400/10 px-5 py-2.5 text-xs font-semibold text-red-400 disabled:opacity-50"
                  >
                    Буцаах
                  </button>
                </div>
              )}
              {isParent && confirmReject && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] text-muted">Итгэлтэй байна уу?</span>
                  <button
                    onClick={() => review(false)}
                    disabled={reviewPending}
                    className="rounded-full bg-red-400 px-3 py-1.5 text-[11px] font-semibold text-[#2a0a0a] disabled:opacity-50"
                  >
                    Тийм
                  </button>
                  <button
                    onClick={() => setConfirmReject(false)}
                    disabled={reviewPending}
                    className="rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted disabled:opacity-50"
                  >
                    Цуцлах
                  </button>
                </div>
              )}
              {reviewError && (
                <p className="text-[11px] text-red-400">{reviewError}</p>
              )}
            </>
          ) : (
            <>
              <span className="text-4xl font-bold tabular-nums">
                {formatClock(remaining)}
              </span>
              {!task.duration_min && (
                <span className="text-center text-[11px] text-muted">
                  Хугацаа тогтоогоогүй тул {DEFAULT_MINUTES} минут ашиглав
                </span>
              )}
              <div className="flex gap-2">
                {!running ? (
                  <button
                    onClick={() => setRunning(true)}
                    disabled={pending}
                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-xs font-semibold text-accent-foreground disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" fill="currentColor" />
                    {remaining === initialSeconds ? "Эхлүүлэх" : "Үргэлжлүүлэх"}
                  </button>
                ) : (
                  <button
                    onClick={() => setRunning(false)}
                    className="flex items-center gap-1.5 rounded-full bg-surface-2 px-5 py-2.5 text-xs font-semibold"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Түр зогсоох
                  </button>
                )}
              </div>
              <button
                onClick={complete}
                disabled={pending}
                className="text-[11px] text-muted underline disabled:opacity-50"
              >
                Одоо дуусгах
              </button>
              {finishError && (
                <p className="text-[11px] text-red-400">{finishError}</p>
              )}
            </>
          )}
        </div>

        {/* Proof photo */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted">Гэрч зураг</span>
          {photoUrl && (
            <div className="relative h-40 w-full overflow-hidden rounded-2xl">
              <Image src={photoUrl} alt="" fill className="object-cover" />
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadPending}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-xs font-medium text-muted transition-colors hover:bg-surface disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploadPending
              ? "Хуулж байна…"
              : photoUrl
                ? "Зураг солих"
                : "Зураг нэмэх"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
            className="hidden"
          />
          {uploadError && (
            <p className="text-[11px] text-red-400">{uploadError}</p>
          )}
        </div>

        {/* Delete */}
        <div className="mt-5 flex flex-col gap-2">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Даалгавар устгах
            </button>
          ) : (
            <div className="flex flex-col gap-2 rounded-2xl border border-red-400/30 bg-red-400/10 p-3">
              <p className="text-xs text-red-300">
                Устгахдаа итгэлтэй байна уу?
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleDelete("one")}
                  disabled={deletePending}
                  className="rounded-full bg-red-400 px-3 py-1.5 text-[11px] font-semibold text-[#2a0a0a] disabled:opacity-50"
                >
                  Энэ өдрийг устгах
                </button>
                {task.recurrence_id && (
                  <button
                    onClick={() => handleDelete("series")}
                    disabled={deletePending}
                    className="rounded-full bg-red-400/80 px-3 py-1.5 text-[11px] font-semibold text-[#2a0a0a] disabled:opacity-50"
                  >
                    Энэ болон дараах бүгд
                  </button>
                )}
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deletePending}
                  className="rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted"
                >
                  Цуцлах
                </button>
              </div>
              {deleteError && (
                <p className="text-[11px] text-red-400">{deleteError}</p>
              )}
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}

function EditChip({
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
