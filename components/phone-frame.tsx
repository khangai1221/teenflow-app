/**
 * Centered phone-width frame for pages outside the tab shell (onboarding,
 * register). Mirrors MobileShell's dimensions but without the bottom nav.
 */
export default function PhoneFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full justify-center bg-black">
      <div className="app-bg no-scrollbar relative flex min-h-dvh w-full max-w-[430px] flex-col overflow-y-auto shadow-[0_0_60px_rgba(0,0,0,0.6)] sm:my-4 sm:min-h-[calc(100dvh-2rem)] sm:rounded-[2.25rem] sm:border sm:border-border">
        {children}
      </div>
    </div>
  );
}
