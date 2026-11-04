"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client (publishable key only — public by design).
 *
 * Config resolution: NEXT_PUBLIC_* vars are inlined at build time, which the
 * Cloudflare build environment doesn't have. The server therefore injects
 * `window.__GREGDLE_SUPABASE__` at runtime (see app/layout.tsx); the build-time
 * env is only a local-dev fallback.
 */

declare global {
  interface Window {
    __GREGDLE_SUPABASE__?: { url: string; key: string };
  }
}

function publicConfig(): { url: string; key: string } | null {
  if (typeof window !== "undefined" && window.__GREGDLE_SUPABASE__) {
    return window.__GREGDLE_SUPABASE__;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

let client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  const cfg = publicConfig();
  if (!cfg) return null;
  if (!client) {
    client = createClient(cfg.url, cfg.key, {
      auth: { persistSession: true, autoRefreshToken: true, flowType: "pkce" },
    });
  }
  return client;
}
