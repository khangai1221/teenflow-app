"use client";

import { useActionState, useState } from "react";
import { registerAction, type RegisterState } from "./actions";
import type { Role } from "@/lib/types";

export default function RegisterForm({ defaultName }: { defaultName: string }) {
  const [role, setRole] = useState<Role | null>(null);
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    registerAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="role" value={role ?? ""} />

      {/* Role picker */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-muted">
          Та хэн бэ?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <RoleCard
            active={role === "parent"}
            onClick={() => setRole("parent")}
            emoji="👨‍👩‍👧"
            title="Эцэг эх"
            subtitle="Гэр бүл үүсгэнэ"
          />
          <RoleCard
            active={role === "kid"}
            onClick={() => setRole("kid")}
            emoji="🧒"
            title="Хүүхэд"
            subtitle="Кодоор нэгдэнэ"
          />
        </div>
      </div>

      {role && (
        <div className="flex flex-col gap-4">
          <Field label="Нэр">
            <input
              name="display_name"
              defaultValue={defaultName}
              required
              placeholder="Таны нэр"
              className="input"
            />
          </Field>

          <Field label="Нас (заавал биш)">
            <input
              name="age"
              type="number"
              min={1}
              max={120}
              inputMode="numeric"
              placeholder="Жишээ: 14"
              className="input"
            />
          </Field>

          {role === "parent" ? (
            <Field label="Гэр бүлийн нэр (заавал биш)">
              <input
                name="family_name"
                placeholder="Жишээ: Батын гэр бүл"
                className="input"
              />
            </Field>
          ) : (
            <Field label="Гэр бүлийн код">
              <input
                name="family_code"
                required
                autoCapitalize="characters"
                placeholder="6 оронтой код"
                className="input tracking-[0.3em] uppercase"
              />
            </Field>
          )}
        </div>
      )}

      {state.error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={!role || pending}
        className="rounded-2xl bg-gradient-to-r from-accent to-accent-2 px-5 py-3.5 text-sm font-semibold text-accent-foreground shadow-[0_8px_30px_rgba(124,92,255,0.4)] transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {pending
          ? "Түр хүлээнэ үү…"
          : role === "kid"
            ? "Гэр бүлд нэгдэх"
            : "Бүртгэлээ дуусгах"}
      </button>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.9rem;
          border: 1px solid var(--border);
          background: var(--surface);
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          color: var(--foreground);
          outline: none;
        }
        .input::placeholder { color: var(--muted); }
        .input:focus { border-color: var(--accent); }
      `}</style>
    </form>
  );
}

function RoleCard({
  active,
  onClick,
  emoji,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-center transition-colors ${
        active
          ? "border-accent bg-accent/15"
          : "border-border bg-surface hover:bg-surface-2"
      }`}
    >
      <span className="text-3xl">{emoji}</span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-[11px] text-muted">{subtitle}</span>
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
