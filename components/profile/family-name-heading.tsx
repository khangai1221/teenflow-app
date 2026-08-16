"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateFamilyName } from "@/app/(app)/profile/actions";

export default function FamilyNameHeading({
  name,
  memberCount,
  isParent,
}: {
  name: string;
  memberCount: number;
  isParent: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateFamilyName(formData);
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
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          name="name"
          defaultValue={name}
          required
          autoFocus
          className="flex-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-50"
        >
          {pending ? "…" : "Хадгалах"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="shrink-0 text-xs text-muted"
        >
          Цуцлах
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <h2 className="text-sm font-semibold text-muted">
        {name} · {memberCount} гишүүн
      </h2>
      {isParent && (
        <button
          onClick={() => setEditing(true)}
          aria-label="Гэр бүлийн нэр засах"
          className="text-muted transition-colors hover:text-foreground"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
