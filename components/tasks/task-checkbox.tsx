"use client";

import { useState, useTransition } from "react";
import { Check, Hourglass } from "lucide-react";
import {
  toggleTaskStatus,
  submitTaskForApproval,
} from "@/app/(app)/tasks/actions";
import type { TaskStatus } from "@/lib/types";

export default function TaskCheckbox({
  taskId,
  status,
  requiresApproval,
}: {
  taskId: string;
  status: TaskStatus;
  requiresApproval: boolean;
}) {
  const [optimistic, setOptimistic] = useState(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    if (optimistic === "awaiting_approval") return;

    setError(null);
    if (optimistic === "pending" && requiresApproval) {
      setOptimistic("awaiting_approval");
      startTransition(async () => {
        const res = await submitTaskForApproval(taskId);
        if (res?.error) {
          setOptimistic("pending");
          setError(res.error);
        }
      });
      return;
    }

    const next: TaskStatus = optimistic === "done" ? "pending" : "done";
    setOptimistic(next);
    startTransition(async () => {
      const res = await toggleTaskStatus(taskId, next === "done");
      if (res?.error) {
        setOptimistic(optimistic);
        setError(res.error);
      }
    });
  }

  if (optimistic === "awaiting_approval") {
    return (
      <span
        title="Эцэг эхийн шалгалт хүлээж байна"
        aria-label="Эцэг эхийн шалгалт хүлээж байна"
        className="flex h-6 w-6 shrink-0 animate-pulse items-center justify-center rounded-md border-2 border-amber-400/50 bg-amber-400/10 text-amber-400"
      >
        <Hourglass className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-label={optimistic === "done" ? "Дуусгаагүй болгох" : "Дууссан болгох"}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
        error
          ? "border-red-400 bg-red-400/20 text-red-400"
          : optimistic === "done"
            ? "border-emerald-400 bg-emerald-400 text-[#0c0a1e]"
            : "border-white/25 text-transparent"
      }`}
    >
      <Check className="h-4 w-4" strokeWidth={3} />
    </button>
  );
}
