import Link from "next/link";

export default async function AuthCodeError({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <div className="flex flex-col items-center gap-4 px-5 pt-[calc(env(safe-area-inset-top)+4rem)] text-center">
      <h1 className="text-2xl font-bold tracking-tight">Нэвтрэхэд алдаа гарлаа</h1>
      <p className="text-sm text-muted">
        Нэвтрэх явцад алдаа гарлаа. Дахин оролдоно уу.
      </p>
      {reason && (
        <p className="max-w-xs rounded-xl border border-border bg-surface px-4 py-3 text-xs text-red-400">
          {reason}
        </p>
      )}
      <Link
        href="/"
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
      >
        Дахин нэвтрэх
      </Link>
    </div>
  );
}
