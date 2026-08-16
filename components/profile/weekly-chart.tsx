import { WEEKDAYS_SHORT } from "@/lib/date";

export default function WeeklyChart({
  days,
}: {
  days: { date: string; count: number }[];
}) {
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="card flex flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold text-muted">Долоо хоногийн ахиц</h2>
      <div className="flex items-end justify-between gap-2 pt-2" style={{ height: 96 }}>
        {days.map((d, i) => {
          const pct = d.count === 0 ? 0 : Math.max(10, Math.round((d.count / max) * 100));
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-semibold text-foreground/80">
                {d.count > 0 ? d.count : ""}
              </span>
              <div className="flex h-16 w-full items-end">
                <div
                  className={`w-full rounded-full ${d.count > 0 ? "bg-gradient-to-t from-accent to-accent-2" : "bg-surface-2"}`}
                  style={{ height: `${d.count > 0 ? pct : 6}%` }}
                />
              </div>
              <span className="text-[10px] text-muted">{WEEKDAYS_SHORT[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
