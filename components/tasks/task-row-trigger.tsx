"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import TaskDetailDrawer from "@/components/tasks/task-detail-drawer";

/**
 * Wraps any task row markup so clicking it opens the shared detail drawer
 * (timer + photo upload), without dictating that row's visual style — each
 * page keeps its own layout, this just adds the click behavior around it.
 */
export default function TaskRowTrigger({
  task,
  photoUrl = null,
  className,
  children,
}: {
  task: Task;
  photoUrl?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`cursor-pointer ${className ?? ""}`}
      >
        {children}
      </div>

      {open && (
        <TaskDetailDrawer
          task={task}
          photoUrl={photoUrl}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
