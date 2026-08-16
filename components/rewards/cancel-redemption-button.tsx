"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { cancelRedemptionRequest } from "@/app/(app)/rewards/actions";

export default function CancelRedemptionButton({
  redemptionId,
}: {
  redemptionId: string;
}) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      await cancelRedemptionRequest(redemptionId);
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface-2 disabled:opacity-50"
    >
      <X className="h-3 w-3" />
      Цуцлах
    </button>
  );
}
