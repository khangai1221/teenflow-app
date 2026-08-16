"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { deleteReward } from "@/app/(app)/rewards/actions";

export default function DeleteRewardButton({ rewardId }: { rewardId: string }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      await deleteReward(rewardId);
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      aria-label="Шагнал устгах"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-red-400 disabled:opacity-50"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
