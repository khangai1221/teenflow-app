import { Lock } from "lucide-react";
import { ACHIEVEMENTS, type AchievementStats } from "@/lib/achievements";

export default function AchievementsGrid({ stats }: { stats: AchievementStats }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted">Амжилтууд</h2>
      <div className="grid grid-cols-2 gap-2">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = a.isUnlocked(stats);
          return (
            <div
              key={a.id}
              className={`card flex flex-col items-center gap-1 p-3.5 text-center ${
                unlocked ? "" : "opacity-40"
              }`}
            >
              <span className="relative text-2xl">
                {a.emoji}
                {!unlocked && (
                  <Lock className="absolute -right-2 -top-1 h-3 w-3 text-muted" />
                )}
              </span>
              <span className="text-xs font-semibold">{a.label}</span>
              <span className="text-[10px] leading-snug text-muted">
                {a.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
