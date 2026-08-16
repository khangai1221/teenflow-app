import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import PhoneFrame from "@/components/phone-frame";
import RegisterForm from "./register-form";

export default async function RegisterPage() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) redirect("/home");

  const defaultName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    "";

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col gap-8 px-6 pb-10 pt-[calc(env(safe-area-inset-top)+3rem)]">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Бүртгэл үүсгэх</h1>
          <p className="text-sm text-muted">
            Хэдхэн алхмаар TeenFlow-г ашиглаж эхлээрэй.
          </p>
        </header>
        <RegisterForm defaultName={defaultName} />
      </div>
    </PhoneFrame>
  );
}
