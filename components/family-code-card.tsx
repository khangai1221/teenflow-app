"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function FamilyCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <div className="card flex items-center justify-between bg-gradient-to-br from-accent/25 to-card-2 p-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted">Гэр бүлийн код</span>
        <span className="text-2xl font-bold tracking-[0.25em]">{code}</span>
        <span className="text-[11px] text-muted">
          Гэр бүлийнхэндээ хуваалцаж урина уу
        </span>
      </div>
      <button
        onClick={copy}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-foreground transition-colors active:scale-95"
        aria-label="Хуулах"
      >
        {copied ? (
          <Check className="h-5 w-5 text-emerald-400" />
        ) : (
          <Copy className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
