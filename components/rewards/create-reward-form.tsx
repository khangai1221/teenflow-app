"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createReward } from "@/app/(app)/rewards/actions";

export default function CreateRewardForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createReward(formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      setError(null);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3.5 text-sm font-medium text-muted transition-colors hover:bg-surface"
      >
        <Plus className="h-4 w-4" />
        Шинэ шагнал нэмэх
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="card flex flex-col gap-3 p-4"
    >
      <input
        name="title"
        required
        placeholder="Шагналын нэр (жиш: Кино үзэх)"
        autoFocus
        className="w-full rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
      />
      <input
        name="cost"
        type="number"
        min={1}
        inputMode="numeric"
        required
        placeholder="Үнэ (оноогоор)"
        className="w-full rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
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
          {pending ? "Нэмж байна…" : "Нэмэх"}
        </button>
      </div>
    </form>
  );
}
