'use client';

import { Clock, Star, AlertCircle } from "lucide-react";
import { CATEGORIES, PRIORITIES } from "@/lib/constants";
import { formatTime, isOverdue } from "@/lib/date";
import type { TaskWithAssignee } from "@/lib/types";
import TaskCheckbox from "@/components/tasks/task-checkbox";
import TaskRowTrigger from "@/components/tasks/task-row-trigger";

export default function TaskCard({
  task,
  showAssignee = false,
  photoUrl = null,
}: {
  task: TaskWithAssignee;
  showAssignee?: boolean;
  photoUrl?: string | null;
}) {
  const cat = CATEGORIES[task.category];
  const prio = PRIORITIES[task.priority];
  const done = task.status === "done";
  const overdue = isOverdue(task.scheduled_date, task.status);

  return (
    <TaskRowTrigger
      task={task}
      photoUrl={photoUrl}
      className={`card flex items-center gap-3 p-3.5 ${overdue ? "border-red-400/40 bg-red-400/5" : ""}`}
    >
      {/* Priority dot */}
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: prio.color }}
        title={prio.label}
      />

      {/* Category icon tile */}
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
        style={{ background: `${cat.color}22` }}
      >
        {cat.emoji}
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={`truncate text-sm font-semibold ${done ? "text-muted line-through" : ""}`}
        >
          {task.title}
        </span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          {overdue && (
            <span className="inline-flex items-center gap-1 font-medium text-red-400">
              <AlertCircle className="h-3 w-3" />
              Хугацаа хэтэрсэн
            </span>
          )}
          {task.scheduled_time && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(task.scheduled_time)}
            </span>
          )}
          {task.duration_min != null && <span>{task.duration_min} мин</span>}
          {task.points > 0 && (
            <span className="inline-flex items-center gap-0.5 text-gold">
              <Star className="h-3 w-3 fill-gold" />
              +{task.points}
            </span>
          )}
          {showAssignee && task.assignee && (
            <span className="text-accent-2">{task.assignee.display_name}</span>
          )}
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <TaskCheckbox
          taskId={task.id}
          status={task.status}
          requiresApproval={task.requires_approval}
        />
      </div>
    </TaskRowTrigger>
  );
}
