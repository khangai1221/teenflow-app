"use client";

import { useState, useTransition } from "react";
import { redeemReward } from "@/app/(app)/rewards/actions";

export default function RedeemButton({
  rewardId,
  canAfford,
  isParent,
  alreadyPending,
}: {
  rewardId: string;
  canAfford: boolean;
  isParent: boolean;
  alreadyPending: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await redeemReward(rewardId);
      if (res.error) setError(res.error);
      else if (!isParent) setRequested(true);
    });
  }

  const isPending = alreadyPending || requested;
  const label = pending
    ? "Түр хүлээнэ үү…"
    : isPending
      ? "Хүлээгдэж байна"
      : !canAfford
        ? "Оноо дутуу"
        : isParent
          ? "Авах"
          : "Хүсэлт илгээх";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onClick}
        disabled={pending || !canAfford || isPending}
        className="shrink-0 rounded-full bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-xs font-semibold text-accent-foreground transition-transform active:scale-95 disabled:cursor-not-allowed disabled:from-surface disabled:to-surface disabled:text-muted"
      >
        {label}
      </button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
