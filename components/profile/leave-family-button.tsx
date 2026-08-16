"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { leaveFamily } from "@/app/(app)/profile/actions";

export default function LeaveFamilyButton() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      // leaveFamily() redirect()s on success (throws internally), so any
      // res we get back here is necessarily an error case.
      const res = await leaveFamily();
      if (res?.error) {
        setError(res.error);
        setConfirming(false);
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex w-full flex-col gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3.5">
        <span className="text-center text-sm text-red-400">
          Гэр бүлээс гарахдаа итгэлтэй байна уу?
        </span>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={pending}
            className="flex-1 rounded-xl bg-red-400 px-4 py-2 text-sm font-semibold text-[#2a0a0a] disabled:opacity-50"
          >
            {pending ? "Гарч байна…" : "Тийм, гарах"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted disabled:opacity-50"
          >
            Цуцлах
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <button
        onClick={() => setConfirming(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 py-3.5 text-sm font-semibold text-red-400 transition-colors hover:bg-surface-2"
      >
        <LogOut className="h-4 w-4" />
        Гэр бүлээс гарах
      </button>
      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
