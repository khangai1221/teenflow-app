"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellRing, Send } from "lucide-react";
import { subscribeToPush, unsubscribeFromPush, sendTestPush } from "@/app/(app)/profile/actions";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Status = "loading" | "unsupported" | "denied" | "off" | "on";

export default function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, []);

  function enable() {
    setError(null);
    startTransition(async () => {
      try {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) throw new Error("no_vapid_key");

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "off");
          return;
        }

        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
        const res = await subscribeToPush(sub.toJSON());
        if (res.error) {
          setError(res.error);
          return;
        }
        setStatus("on");
      } catch {
        setError("Мэдэгдэл идэвхжүүлэхэд алдаа гарлаа.");
      }
    });
  }

  function disable() {
    setError(null);
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await unsubscribeFromPush(sub.endpoint);
          await sub.unsubscribe();
        }
        setStatus("off");
      } catch {
        setError("Идэвхгүй болгоход алдаа гарлаа.");
      }
    });
  }

  function test() {
    setSent(false);
    startTransition(async () => {
      await sendTestPush();
      setSent(true);
    });
  }

  if (status === "loading" || status === "unsupported") return null;

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-2">
          {status === "on" ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </div>
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-semibold">Push мэдэгдэл</span>
          <span className="text-xs text-muted">
            {status === "denied"
              ? "Хөтчийн тохиргооноос зөвшөөрөл олгоно уу."
              : status === "on"
                ? "Энэ төхөөрөмж дээр идэвхтэй байна."
                : "Даалгавар, шагналын мэдэгдэл авах."}
          </span>
        </div>
        {status !== "denied" && (
          <button
            onClick={status === "on" ? disable : enable}
            disabled={pending}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
              status === "on"
                ? "border border-border text-muted hover:bg-surface-2"
                : "bg-gradient-to-r from-accent to-accent-2 text-accent-foreground"
            }`}
          >
            {pending ? "…" : status === "on" ? "Унтраах" : "Идэвхжүүлэх"}
          </button>
        )}
      </div>

      {status === "on" && (
        <button
          onClick={test}
          disabled={pending}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-2 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {sent ? "Илгээлээ ✓" : "Туршилтын мэдэгдэл илгээх"}
        </button>
      )}

      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
