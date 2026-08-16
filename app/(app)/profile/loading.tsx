export default function Loading() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="h-20 w-20 animate-pulse rounded-full bg-white/10" />
        <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
      </div>
      <div className="h-16 animate-pulse rounded-[1.25rem] bg-white/5" />
      <div className="flex flex-col divide-y divide-white/5 rounded-[1.25rem] bg-white/5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse bg-transparent" />
        ))}
      </div>
      <div className="h-12 w-full animate-pulse rounded-[1.25rem] bg-white/10" />
    </div>
  );
}
