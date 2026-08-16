"use client";

import { useState, useTransition } from "react";
import { UserMinus } from "lucide-react";
import { removeFamilyMember } from "@/app/(app)/profile/actions";

export default function RemoveMemberButton({ memberId }: { memberId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const res = await removeFamilyMember(memberId);
      if (res.error) {
        setError(res.error);
      }
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="text-[10px] text-muted">Итгэлтэй байна уу?</span>
        <button
          onClick={onConfirm}
          disabled={pending}
          className="rounded-full bg-red-400 px-2.5 py-1 text-[10px] font-semibold text-[#2a0a0a] disabled:opacity-50"
        >
          Тийм
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted disabled:opacity-50"
        >
          Үгүй
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      aria-label="Гишүүн хасах"
      title={error ?? "Гишүүн хасах"}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 ${error ? "text-red-400" : ""}`}
    >
      <UserMinus className="h-3.5 w-3.5" />
    </button>
  );
}
