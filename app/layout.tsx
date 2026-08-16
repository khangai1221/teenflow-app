import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import PwaRegister from "@/components/pwa-register";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "TeenFlow",
  description: "Гэр бүлээрээ даалгавраа төлөвлөж, оноо цуглуул.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TeenFlow",
  },
  // Next only emits the modern unprefixed `mobile-web-app-capable` tag by
  // default; older iOS Safari (pre-16.4) only honors the apple-prefixed one,
  // so add it explicitly for broader "Add to Home Screen" support.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0a1e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn">
      <body className={geistSans.className}>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
