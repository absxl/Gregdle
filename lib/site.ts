/**
 * Canonical site URL (D26: gregdle.carletti.work). Server-side reads resolve
 * from the worker runtime var; client code should prefer window.location.origin
 * so sharing works on any domain the site is served from.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gregdle.carletti.work";

declare global {
  interface Window {
    __GREGDLE_SITE_URL__?: string;
  }
}

/**
 * Canonical URL for auth redirects: always the real domain (gregdle.carletti.work),
 * even when the player started on the workers.dev URL. Delivered at runtime by
 * the server bootstrap (same mechanism as the Supabase config).
 */
export function canonicalSiteUrl(): string {
  if (typeof window !== "undefined" && window.__GREGDLE_SITE_URL__) {
    return window.__GREGDLE_SITE_URL__;
  }
  return SITE_URL;
}

export function originOrFallback(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return SITE_URL;
}
