import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";
import { FamilyProvider } from "@/lib/family-context";
import BottomNav from "@/components/bottom-nav";
import CreateTaskFab from "@/components/tasks/create-task-fab";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getSessionProfile is React.cache()-deduped, so pages under this layout
  // that also call it reuse this same result instead of refetching.
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/");
  if (!profile) redirect("/register");

  const supabase = await serverClient();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("family_id", profile.family_id)
    .order("role", { ascending: true });

  return (
    <div className="flex min-h-dvh w-full justify-center bg-black">
      <div className="app-bg relative flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)] sm:my-4 sm:min-h-[calc(100dvh-2rem)] sm:rounded-[2.25rem] sm:border sm:border-border">
        <FamilyProvider
          members={members ?? []}
          currentId={profile.id}
          isParent={profile.role === "parent"}
        >
          <main className="no-scrollbar flex-1 overflow-y-auto pb-28">
            {children}
          </main>
          <CreateTaskFab
            members={members ?? []}
            currentId={profile.id}
            isParent={profile.role === "parent"}
          />
        </FamilyProvider>
        <BottomNav />
      </div>
    </div>
  );
}
