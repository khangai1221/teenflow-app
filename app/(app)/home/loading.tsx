export default function Loading() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
          <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
        </div>
      </header>
      <div className="h-40 animate-pulse rounded-[1.25rem] bg-white/5" />
      <div className="h-24 animate-pulse rounded-[1.25rem] bg-white/5" />
      <div className="flex flex-col gap-2">
        <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
        <div className="flex flex-col gap-2 rounded-[1.25rem] bg-white/5 p-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
