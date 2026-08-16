export default function Loading() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="h-7 w-32 animate-pulse rounded bg-white/10" />
      <div className="flex justify-between gap-1">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl py-2.5 bg-white/5 flex-1" />
        ))}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-14 animate-pulse rounded-full bg-white/10" />
        ))}
      </div>
      <div className="flex flex-col gap-3 pl-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-white/5" />
            <div className="flex-1 h-10 animate-pulse rounded-xl bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
