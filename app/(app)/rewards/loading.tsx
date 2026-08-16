export default function Loading() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="h-7 w-20 animate-pulse rounded bg-white/10" />
      <div className="h-32 animate-pulse rounded-[1.25rem] bg-white/5" />
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-[1.25rem] bg-white/5" />
        ))}
      </div>
    </div>
  );
}
