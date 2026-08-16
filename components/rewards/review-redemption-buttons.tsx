"use client";

import { useState, useTransition } from "react";
import { reviewRedemption } from "@/app/(app)/rewards/actions";

export default function ReviewRedemptionButtons({
  redemptionId,
}: {
  redemptionId: string;
}) {
  const [confirmReject, setConfirmReject] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function review(approve: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await reviewRedemption(redemptionId, approve);
      if (res.error) setError(res.error);
    });
  }

  if (confirmReject) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted">Итгэлтэй байна уу?</span>
          <button
            onClick={() => review(false)}
            disabled={pending}
            className="rounded-full bg-red-400 px-3 py-1.5 text-[11px] font-semibold text-[#2a0a0a] disabled:opacity-50"
          >
            Тийм
          </button>
          <button
            onClick={() => setConfirmReject(false)}
            disabled={pending}
            className="rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted disabled:opacity-50"
          >
            Цуцлах
          </button>
        </div>
        {error && <span className="text-[10px] text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <button
          onClick={() => review(true)}
          disabled={pending}
          className="rounded-full bg-gradient-to-r from-accent to-accent-2 px-3 py-1.5 text-[11px] font-semibold text-accent-foreground disabled:opacity-50"
        >
          Батлах
        </button>
        <button
          onClick={() => setConfirmReject(true)}
          disabled={pending}
          className="rounded-full border border-red-400/40 bg-red-400/10 px-3 py-1.5 text-[11px] font-semibold text-red-400 disabled:opacity-50"
        >
          Татгалзах
        </button>
      </div>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
