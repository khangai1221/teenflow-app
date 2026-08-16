import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task } from "@/lib/types";

/**
 * Signs any task photo paths in a single batched call — photos live in a
 * private bucket, so each needs a signed URL rather than a public one.
 */
export async function signTaskPhotos(
  supabase: SupabaseClient,
  tasks: Pick<Task, "photo_path">[],
): Promise<Record<string, string>> {
  const paths = tasks
    .map((t) => t.photo_path)
    .filter((p): p is string => Boolean(p));
  if (paths.length === 0) return {};

  const { data: signed } = await supabase.storage
    .from("task-photos")
    .createSignedUrls(paths, 3600);

  const map: Record<string, string> = {};
  signed?.forEach((s, i) => {
    if (s.signedUrl) map[paths[i]] = s.signedUrl;
  });
  return map;
}
