import { ImageResponse } from "next/og";
import { brandIcon } from "@/lib/brand-icon";

// A second, smaller fixed-size icon purely for the web manifest's 192x192
// entry (Android/Chrome installability) — not part of Next's icon.tsx
// convention, just a plain PNG route at /icon-192.
export async function GET() {
  return new ImageResponse(brandIcon(110), { width: 192, height: 192 });
}
