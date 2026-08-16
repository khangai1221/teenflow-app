import { ImageResponse } from "next/og";
import { brandIcon } from "@/lib/brand-icon";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(brandIcon(300), { ...size });
}
