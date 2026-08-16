export default function Loading() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="h-7 w-24 animate-pulse rounded bg-white/10" />
      <div className="flex gap-2 rounded-2xl bg-white/5 p-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 animate-pulse rounded-xl py-2.5 bg-white/10" />
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-[1.25rem] bg-white/5" />
        ))}
      </div>
    </div>
  );
}
