"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Pencil, X } from "lucide-react";
import { updateProfile } from "@/app/(app)/profile/actions";
import type { Profile } from "@/lib/types";

export default function EditProfileSheet({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    setError(null);
    setPreview(null);
  }

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateProfile(formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      close();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Профайл засах"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute inset-0 z-40 flex items-end">
          <button
            aria-label="Хаах"
            onClick={close}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="no-scrollbar relative max-h-[88%] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-card px-5 pb-8 pt-4">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/20" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Профайл засах</h2>
              <button onClick={close} className="text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-accent text-2xl font-bold text-accent-foreground"
                >
                  {preview || profile.avatar_url ? (
                    <Image
                      src={preview ?? profile.avatar_url!}
                      alt=""
                      width={80}
                      height={80}
                      unoptimized={Boolean(preview)}
                      className="h-20 w-20 object-cover"
                    />
                  ) : (
                    profile.display_name[0]?.toUpperCase()
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-medium opacity-0 transition-opacity hover:opacity-100">
                    Солих
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  name="avatar"
                  accept="image/*"
                  onChange={onPickAvatar}
                  className="hidden"
                />
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Нэр</span>
                <input
                  name="display_name"
                  defaultValue={profile.display_name}
                  required
                  placeholder="Таны нэр"
                  className="edit-fld w-full rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">
                  Нас (заавал биш)
                </span>
                <input
                  name="age"
                  type="number"
                  min={1}
                  max={120}
                  inputMode="numeric"
                  defaultValue={profile.age ?? ""}
                  placeholder="Жишээ: 14"
                  className="edit-fld w-full rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                />
              </label>

              {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="mt-1 rounded-2xl bg-gradient-to-r from-accent to-accent-2 px-5 py-3.5 text-sm font-semibold text-accent-foreground shadow-[0_8px_30px_rgba(124,92,255,0.4)] transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {pending ? "Хадгалж байна…" : "Хадгалах"}
              </button>
            </form>

            <style>{`.edit-fld::placeholder { color: var(--muted); }`}</style>
          </div>
        </div>
      )}
    </>
  );
}
