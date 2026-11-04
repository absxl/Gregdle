import type { Metadata } from "next";
import Link from "next/link";
import { Silkscreen, VT323 } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const pixel = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
});

/** Blocky face for Minecraft-style numbers (streak badges). */
const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Gregdle — daily GregTech guessing game",
  description:
    "Guess the hidden GregTech machine from its attributes. A new answer every day at 00:00 UTC, for GTNH and GTCEu players.",
};

/** AdSense script loads only when the publisher id is configured. */
function AdSenseScript() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;
  return (
    <Script
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
    />
  );
}

/**
 * Public Supabase config for the browser. NEXT_PUBLIC_* vars are inlined at
 * BUILD time, which the Cloudflare build env doesn't have — so we deliver
 * them from the server at RUNTIME (worker vars) via a tiny bootstrap script.
 */
function SupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const json = JSON.stringify({ url, key });
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__GREGDLE_SUPABASE__=${json};Object.freeze(window.__GREGDLE_SUPABASE__)`,
      }}
    />
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${pixel.variable} ${silkscreen.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SupabasePublicConfig />
        {children}
        <footer className="mt-auto border-t border-edge/60 px-4 py-5 text-center text-sm text-muted">
          <nav
            aria-label="Footer"
            className="flex flex-wrap justify-center gap-x-5 gap-y-2 font-semibold"
          >
            <Link href="/" className="hover:text-accent">
              Home
            </Link>
            <Link href="/leaderboard" className="hover:text-accent">
              Leaderboard
            </Link>
            <Link href="/stats" className="hover:text-accent">
              Stats
            </Link>
            <Link href="/about" className="hover:text-accent">
              About &amp; Credits
            </Link>
            <Link href="/privacy" className="hover:text-accent">
              Privacy
            </Link>
          </nav>
          <p className="mt-2 text-xs">
            <a
              href="https://github.com/absxl/Gregdle"
              className="font-semibold text-muted hover:text-accent"
              rel="noreferrer"
              target="_blank"
            >
              Open source
            </a>{" "}
            · created and owned by{" "}
            <a
              href="https://github.com/absxl"
              className="font-semibold text-muted hover:text-accent"
              rel="noreferrer"
              target="_blank"
            >
              absxl
            </a>{" "}
            · GregTech and GT New Horizons belong to their authors. Not affiliated.
          </p>
        </footer>
        <AdSenseScript />
      </body>
    </html>
  );
}
