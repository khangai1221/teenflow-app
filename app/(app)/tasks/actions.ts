"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase/server";
import { getActionProfile } from "@/lib/auth";
import { recurrenceDates } from "@/lib/date";
import { sendPushToProfiles } from "@/lib/push";
import type { RecurrenceRule } from "@/lib/types";

export type TaskActionState = { ok?: boolean; error?: string };

function revalidateAll() {
  revalidatePath("/home");
  revalidatePath("/schedule");
  revalidatePath("/tasks");
  revalidatePath("/rewards");
}

export async function createTask(formData: FormData): Promise<TaskActionState> {
  const supabase = await serverClient();
  const { user, profile } = await getActionProfile(supabase);
  if (!user) return { error: "Нэвтрээгүй байна." };
  if (!profile?.family_id) return { error: "Гэр бүл олдсонгүй." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Даалгаврын нэрээ оруулна уу." };

  const description = String(formData.get("description") ?? "").trim();
  const pointsRaw = String(formData.get("points") ?? "").trim();
  const durationRaw = String(formData.get("duration_min") ?? "").trim();
  const time = String(formData.get("scheduled_time") ?? "").trim();
  const date =
    String(formData.get("scheduled_date") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

  // Kids can only assign tasks to themselves.
  let assignedTo = String(formData.get("assigned_to") ?? "").trim();
  if (profile.role === "kid" || !assignedTo) assignedTo = profile.id;

  // Only parents can require approval — meaningless (and unreachable via the
  // kid-facing UI, which never renders the toggle) for a kid's own tasks.
  const requiresApproval =
    profile.role === "parent" && formData.get("requires_approval") === "on";

  const base = {
    family_id: profile.family_id,
    title,
    description: description || null,
    category: String(formData.get("category") ?? "other"),
    priority: String(formData.get("priority") ?? "med"),
    points: pointsRaw ? parseInt(pointsRaw, 10) : 0,
    scheduled_time: time || null,
    duration_min: durationRaw ? parseInt(durationRaw, 10) : null,
    assigned_to: assignedTo,
    created_by: profile.id,
    requires_approval: requiresApproval,
  };

  const repeatRaw = String(formData.get("repeat") ?? "none");
  const repeat: RecurrenceRule | "none" =
    repeatRaw === "daily" || repeatRaw === "weekdays" || repeatRaw === "weekly"
      ? repeatRaw
      : "none";
  const repeatCountRaw = parseInt(String(formData.get("repeat_count") ?? ""), 10);
  const repeatCount = Math.min(
    52,
    Math.max(1, Number.isFinite(repeatCountRaw) ? repeatCountRaw : 8),
  );

  if (repeat === "none" || repeatCount <= 1) {
    const { error } = await supabase
      .from("tasks")
      .insert({ ...base, scheduled_date: date });
    if (error) {
      console.error("createTask insert failed:", error);
      return { error: "Даалгавар нэмэхэд алдаа гарлаа." };
    }
  } else {
    const recurrenceId = randomUUID();
    const rows = recurrenceDates(date, repeat, repeatCount).map((d) => ({
      ...base,
      scheduled_date: d,
      recurrence_id: recurrenceId,
      recurrence_rule: repeat,
    }));
    const { error } = await supabase.from("tasks").insert(rows);
    if (error) {
      console.error("createTask recurring insert failed:", error);
      return { error: "Даалгавар нэмэхэд алдаа гарлаа." };
    }
  }

  revalidateAll();
  return { ok: true };
}

export async function updateTask(
  taskId: string,
  formData: FormData,
): Promise<TaskActionState> {
  const supabase = await serverClient();
  const { user, profile } = await getActionProfile(supabase);
  if (!user) return { error: "Нэвтрээгүй байна." };
  if (!profile?.family_id) return { error: "Гэр бүл олдсонгүй." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Даалгаврын нэрээ оруулна уу." };

  const description = String(formData.get("description") ?? "").trim();
  const pointsRaw = String(formData.get("points") ?? "").trim();
  const durationRaw = String(formData.get("duration_min") ?? "").trim();
  const time = String(formData.get("scheduled_time") ?? "").trim();
  const date = String(formData.get("scheduled_date") ?? "").trim();
  const scope = formData.get("scope") === "series" ? "series" : "one";

  const patch: Record<string, unknown> = {
    title,
    description: description || null,
    category: String(formData.get("category") ?? "other"),
    priority: String(formData.get("priority") ?? "med"),
    points: pointsRaw ? parseInt(pointsRaw, 10) : 0,
    scheduled_time: time || null,
    duration_min: durationRaw ? parseInt(durationRaw, 10) : null,
  };

  // Only parents may reassign a task, change its date, or toggle approval.
  if (profile.role === "parent") {
    const assignedTo = String(formData.get("assigned_to") ?? "").trim();
    if (assignedTo) patch.assigned_to = assignedTo;
    if (formData.has("requires_approval")) {
      patch.requires_approval = formData.get("requires_approval") === "on";
    }
  }

  if (scope === "one") {
    if (date) patch.scheduled_date = date;
    const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
    if (error) {
      console.error("updateTask failed:", error);
      return { error: "Хадгалахад алдаа гарлаа." };
    }
  } else {
    // "Энэ болон дараах бүгд": apply to every occurrence of the series from
    // this one's date onward. Each occurrence keeps its own date, so
    // scheduled_date/assigned_to are deliberately excluded from the bulk patch.
    const { data: current } = await supabase
      .from("tasks")
      .select("recurrence_id, scheduled_date")
      .eq("id", taskId)
      .maybeSingle();
    if (!current?.recurrence_id) {
      return { error: "Давтагдах цуврал олдсонгүй." };
    }
    delete patch.assigned_to;
    const { error } = await supabase
      .from("tasks")
      .update(patch)
      .eq("recurrence_id", current.recurrence_id)
      .gte("scheduled_date", current.scheduled_date);
    if (error) {
      console.error("updateTask series failed:", error);
      return { error: "Хадгалахад алдаа гарлаа." };
    }
  }

  revalidateAll();
  return { ok: true };
}

export async function toggleTaskStatus(taskId: string, done: boolean) {
  const supabase = await serverClient();
  const { error } = await supabase.rpc("set_task_status", {
    p_task_id: taskId,
    p_done: done,
  });
  if (error) return { error: "Төлөв шинэчлэхэд алдаа гарлаа." };
  revalidateAll();
  return { ok: true };
}

/** A kid submits a requires_approval task for parent review (no points yet). */
export async function submitTaskForApproval(
  taskId: string,
): Promise<TaskActionState> {
  const supabase = await serverClient();
  const { user, profile } = await getActionProfile(supabase);

  const { data: task } = await supabase
    .from("tasks")
    .select("title, family_id")
    .eq("id", taskId)
    .maybeSingle();

  const { error } = await supabase.rpc("submit_task_for_approval", {
    p_task_id: taskId,
  });
  if (error) return { error: "Илгээхэд алдаа гарлаа." };
  revalidateAll();

  if (user && task?.family_id) {
    const { data: parents } = await supabase
      .from("profiles")
      .select("id")
      .eq("family_id", task.family_id)
      .eq("role", "parent");
    const parentIds = (parents ?? []).map((p) => p.id).filter((id) => id !== user.id);
    if (parentIds.length > 0) {
      await sendPushToProfiles(supabase, parentIds, {
        title: "Шалгуулахаар илгээв",
        body: `${profile?.display_name ?? "Гишүүн"} «${task.title}» даалгаврыг шалгуулахаар илгээлээ`,
        url: "/tasks",
      });
    }
  }

  return { ok: true };
}

/** A parent approves (awards points/streak) or rejects (back to pending). */
export async function reviewTask(
  taskId: string,
  approve: boolean,
): Promise<TaskActionState> {
  const supabase = await serverClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("title, points, assigned_to")
    .eq("id", taskId)
    .maybeSingle();

  const { error } = await supabase.rpc("review_task", {
    p_task_id: taskId,
    p_approve: approve,
  });
  if (error) return { error: "Шалгахад алдаа гарлаа." };
  revalidateAll();

  if (task?.assigned_to) {
    await sendPushToProfiles(supabase, [task.assigned_to], {
      title: approve ? "Даалгавар батлагдлаа" : "Даалгавар буцаагдлаа",
      body: approve
        ? `«${task.title}» батлагдаж, ${task.points} оноо нэмэгдлээ`
        : `«${task.title}» дахин хийхээр буцаагдлаа`,
      url: "/tasks",
    });
  }

  return { ok: true };
}

export async function uploadTaskPhoto(
  formData: FormData,
): Promise<TaskActionState> {
  const supabase = await serverClient();
  const { user, profile } = await getActionProfile(supabase);
  if (!user) return { error: "Нэвтрээгүй байна." };
  if (!profile?.family_id) return { error: "Гэр бүл олдсонгүй." };

  const taskId = String(formData.get("taskId") ?? "");
  const photo = formData.get("photo");
  if (!taskId || !(photo instanceof File) || photo.size === 0) {
    return { error: "Зураг сонгоно уу." };
  }
  if (!photo.type.startsWith("image/")) {
    return { error: "Зөвхөн зураг оруулна уу." };
  }
  if (photo.size > 8 * 1024 * 1024) {
    return { error: "Зураг хэт том байна (дээд тал нь 8МБ)." };
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("id, family_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task || task.family_id !== profile.family_id) {
    return { error: "Даалгавар олдсонгүй." };
  }

  const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${profile.family_id}/${taskId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("task-photos")
    .upload(path, photo, { contentType: photo.type, upsert: true });
  if (uploadError) return { error: "Зураг хуулахад алдаа гарлаа." };

  const { error: updateError } = await supabase
    .from("tasks")
    .update({ photo_path: path })
    .eq("id", taskId);
  if (updateError) return { error: "Зураг хадгалахад алдаа гарлаа." };

  revalidateAll();
  return { ok: true };
}

export async function deleteTask(taskId: string): Promise<TaskActionState> {
  const supabase = await serverClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { error: "Устгахад алдаа гарлаа." };
  revalidateAll();
  return { ok: true };
}

/** Deletes this occurrence and every future one in the same repeat series. */
export async function deleteTaskSeries(
  recurrenceId: string,
  fromDate: string,
): Promise<TaskActionState> {
  const supabase = await serverClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("recurrence_id", recurrenceId)
    .gte("scheduled_date", fromDate);
  if (error) return { error: "Устгахад алдаа гарлаа." };
  revalidateAll();
  return { ok: true };
}
