import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, Silkscreen, VT323 } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import { BackgroundLayer } from "@/components/backgrounds/BackgroundLayer";

const pixel = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
});

/** Mono voice for data, buttons and labels (GT Terminal identity). */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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
        __html: `window.__GREGDLE_SUPABASE__=${json};Object.freeze(window.__GREGDLE_SUPABASE__);window.__GREGDLE_SITE_URL__=${JSON.stringify(SITE_URL)}`,
      }}
    />
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pixel.variable} ${silkscreen.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SupabasePublicConfig />
        <BackgroundLayer />
        <div className="texture-layer" aria-hidden="true" />
        <div className="hazard-strip" aria-hidden="true" />
        {children}
        <footer className="mt-auto border-t border-edge/60 bg-surface/70 px-4 py-4 font-mono text-xs text-muted">
          <nav
            aria-label="Footer"
            className="flex flex-wrap justify-center gap-x-5 gap-y-2 font-semibold"
          >
            <Link href="/" className="hover:text-accent">
              HOME
            </Link>
            <Link href="/leaderboard" className="hover:text-accent">
              LEADERBOARD
            </Link>
            <Link href="/machines" className="hover:text-accent">
              MACHINES
            </Link>
            <Link href="/stats" className="hover:text-accent">
              STATS
            </Link>
            <Link href="/faq" className="hover:text-accent">
              FAQ
            </Link>
            <Link href="/about" className="hover:text-accent">
              ABOUT
            </Link>
            <Link href="/privacy" className="hover:text-accent">
              PRIVACY
            </Link>
          </nav>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <p className="tracking-wide">
              SER.NO {new Date().getFullYear()}-1104 ·{" "}
              <a
                href="https://github.com/absxl/Gregdle"
                className="hover:text-accent"
                rel="noreferrer"
                target="_blank"
              >
                OPEN SOURCE
              </a>{" "}
              · OWNER{" "}
              <a
                href="https://github.com/absxl"
                className="hover:text-accent"
                rel="noreferrer"
                target="_blank"
              >
                ABSXL
              </a>{" "}
              · GREGTECH &amp; GTNH BELONG TO THEIR AUTHORS · NOT AFFILIATED
            </p>
            <a
              href="https://ko-fi.com/absxl"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#794bc4] bg-[#794bc4] px-3 py-1.5 font-mono text-xs font-bold text-white transition hover:brightness-110"
              title="Support the project on Ko-fi"
            >
              ☕ SUPPORT ME
            </a>
          </div>
        </footer>
        <AdSenseScript />
      </body>
    </html>
  );
}
