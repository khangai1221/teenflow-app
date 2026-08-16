"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateReward } from "@/app/(app)/rewards/actions";
import DeleteRewardButton from "@/components/rewards/delete-reward-button";
import RedeemButton from "@/components/rewards/redeem-button";
import type { Reward } from "@/lib/types";

export default function RewardRow({
  reward,
  isParent,
  canAfford,
  alreadyPending,
}: {
  reward: Reward;
  isParent: boolean;
  canAfford: boolean;
  alreadyPending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateReward(reward.id, formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      setError(null);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <form onSubmit={onSubmit} className="card flex flex-col gap-2 p-3.5">
        <input
          name="title"
          defaultValue={reward.title}
          required
          autoFocus
          className="w-full rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
        />
        <input
          name="cost"
          type="number"
          min={1}
          inputMode="numeric"
          defaultValue={reward.cost}
          required
          className="w-full rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            className="flex-1 rounded-2xl border border-border py-2.5 text-xs font-semibold text-muted"
          >
            Цуцлах
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-2xl bg-gradient-to-r from-accent to-accent-2 py-2.5 text-xs font-semibold text-accent-foreground disabled:opacity-50"
          >
            {pending ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="card flex items-center gap-3 p-3.5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-xl">
        🎁
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{reward.title}</span>
          {isParent && (
            <>
              <button
                onClick={() => setEditing(true)}
                aria-label="Шагнал засах"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <DeleteRewardButton rewardId={reward.id} />
            </>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-gold">
          ⭐ {reward.cost} оноо
        </span>
      </div>
      <RedeemButton
        rewardId={reward.id}
        canAfford={canAfford}
        isParent={isParent}
        alreadyPending={alreadyPending}
      />
    </div>
  );
}
