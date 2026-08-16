"use server";

import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";

export type RegisterState = { error?: string };

function mapError(message: string): string {
  if (message.includes("invalid_family_code"))
    return "Гэр бүлийн код олдсонгүй. Дахин шалгана уу.";
  if (message.includes("already_registered"))
    return "Та аль хэдийн бүртгүүлсэн байна.";
  return "Алдаа гарлаа. Дахин оролдоно уу.";
}

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const role = formData.get("role");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const ageRaw = String(formData.get("age") ?? "").trim();
  const age = ageRaw ? parseInt(ageRaw, 10) : null;

  if (!displayName) return { error: "Нэрээ оруулна уу." };
  if (role !== "parent" && role !== "kid")
    return { error: "Төрлөө сонгоно уу." };

  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Нэвтрээгүй байна." };

  const avatar = (user.user_metadata?.avatar_url as string | undefined) ?? null;

  if (role === "parent") {
    const familyName = String(formData.get("family_name") ?? "").trim();
    const { error } = await supabase.rpc("create_family_and_join", {
      p_family_name: familyName,
      p_display_name: displayName,
      p_age: age,
      p_avatar_url: avatar,
    });
    if (error) return { error: mapError(error.message) };
  } else {
    const code = String(formData.get("family_code") ?? "").trim();
    if (!code) return { error: "Гэр бүлийн кодоо оруулна уу." };
    const { error } = await supabase.rpc("join_family", {
      p_code: code,
      p_display_name: displayName,
      p_age: age,
      p_avatar_url: avatar,
    });
    if (error) return { error: mapError(error.message) };
  }

  redirect("/home");
}
