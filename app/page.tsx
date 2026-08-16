import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import PhoneFrame from "@/components/phone-frame";
import GoogleSignInButton from "@/components/auth/google-sign-in-button";

const FEATURES = [
  {
    emoji: "🗓️",
    title: "Ухаалаг хуваарь",
    body: "Өдөр бүрийн даалгавар, хичээл, амралтаа нэг дороос төлөвлө.",
  },
  {
    emoji: "⭐",
    title: "Оноо ба шагнал",
    body: "Даалгавраа биелүүлэх бүрт оноо цуглуулж, урам зоригоо өсгө.",
  },
  {
    emoji: "👨‍👩‍👧",
    title: "Гэр бүлээрээ хамтдаа",
    body: "Гэр бүлийн кодоор эцэг эх, хүүхэд холбогдож, зорилгодоо хамт хүрнэ.",
  },
];

export default async function Landing() {
  const { user, profile } = await getSessionProfile();
  if (user && profile) redirect("/home");
  if (user && !profile) redirect("/register");

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col px-6 pb-10 pt-[calc(env(safe-area-inset-top)+3rem)]">
        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-accent-2 text-4xl shadow-[0_10px_40px_rgba(124,92,255,0.5)]">
              🚀
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight">TeenFlow</h1>
              <p className="max-w-[16rem] text-sm text-muted">
                Гэр бүлийн даалгавар, хуваарь, урам зоригийг нэг апп-д.
              </p>
            </div>
          </div>

          <ul className="flex w-full flex-col gap-3 text-left">
            {FEATURES.map((f) => (
              <li key={f.title} className="card flex items-start gap-3 p-4">
                <span className="text-2xl leading-none">{f.emoji}</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{f.title}</span>
                  <span className="text-xs leading-relaxed text-muted">
                    {f.body}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-center gap-3 pt-6">
          <GoogleSignInButton next="/home" />
          <p className="text-center text-[11px] leading-relaxed text-muted">
            Үргэлжлүүлснээр та Үйлчилгээний нөхцөл болон Нууцлалын
            бодлогыг зөвшөөрч байна.
          </p>
        </div>
      </div>
    </PhoneFrame>
  );
}
