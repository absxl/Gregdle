/**
 * Supabase configuration guard.
 *
 * Values come from wrangler.jsonc vars / .env.local. The publishable key is
 * the new name (sb_publishable_...) for the legacy anon key — both env names
 * are accepted. The secret key (sb_secret_..., formerly service_role) is
 * server-only and lives as a Cloudflare dashboard Secret.
 */

export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

/** Server-only. Throws if missing so misuse fails loudly in dev. */
export function getSupabaseSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not set. Add it as a Cloudflare dashboard Secret (never commit it).",
    );
  }
  return key;
}
