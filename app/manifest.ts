import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TeenFlow",
    short_name: "TeenFlow",
    description: "Гэр бүлээрээ даалгавраа төлөвлөж, оноо цуглуул.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0a1e",
    theme_color: "#0c0a1e",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
