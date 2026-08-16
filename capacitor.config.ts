import type { CapacitorConfig } from "@capacitor/cli";

// TeenFlow uses Next.js server actions, middleware-based Supabase auth, and
// SSR — none of which survive a static export (`next export`). So instead of
// bundling built HTML into the app, the native shell just loads the live
// deployment in its WebView (the same pattern any "wrap my PWA" tool uses).
// That means every native build always reflects whatever is live on
// teenflow.vercel.app; there is no separate "native" build of the web code.
const config: CapacitorConfig = {
  appId: "com.teenflow.app",
  appName: "TeenFlow",
  webDir: "public",
  server: {
    url: "https://teenflow.vercel.app",
    cleartext: false,
    // The WebView blocks top-level navigation to any origin not listed here.
    // Google's OAuth flow (accounts.google.com) and Supabase's own auth
    // domain both need to be reachable for "Google-ээр үргэлжлүүлэх" to work.
    allowNavigation: [
      "accounts.google.com",
      "*.googleusercontent.com",
      "jbwrhvvyhtghfhqfvmpn.supabase.co",
    ],
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
