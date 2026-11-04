/**
 * Canonical site URL (D26: gregdle.carletti.work). Server-side reads resolve
 * from the worker runtime var; client code should prefer window.location.origin
 * so sharing works on any domain the site is served from.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gregdle.carletti.work";

export function originOrFallback(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return SITE_URL;
}
