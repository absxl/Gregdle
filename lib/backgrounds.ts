"use client";

/**
 * Community backgrounds (D28): approved list from Supabase REST with a short
 * localStorage cache, public storage URLs, and the pin/shuffle preference.
 */

export interface Background {
  id: string;
  url: string;
  author: string;
  title?: string | null;
  description?: string | null;
}

const CACHE_KEY = "gregdle:v1:bg-list";
const CACHE_TTL_MS = 5 * 60 * 1000;
const PIN_KEY = "gregdle:v1:bg-pin";

interface CacheShape {
  at: number;
  items: Background[];
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

export function imageUrl(cfg: { url: string }, storagePath: string): string {
  return `${cfg.url}/storage/v1/object/public/backgrounds/${storagePath}`;
}

/** Approved backgrounds, cached ~5 min. Empty array when none/unavailable. */
export async function fetchApprovedBackgrounds(force = false): Promise<Background[]> {
  if (typeof window === "undefined") return [];
  try {
    if (!force) {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cache = JSON.parse(raw) as CacheShape;
        if (Date.now() - cache.at < CACHE_TTL_MS) return cache.items;
      }
    }
  } catch {
    /* fall through to network */
  }

  const cfg = publicConfig();
  if (!cfg) return [];
  try {
    const qs = new URLSearchParams({
      select: "id,storage_path,author_name,title,description",
      status: "eq.approved",
      order: "created_at.asc",
      limit: "100",
    });
    const res = await fetch(`${cfg.url}/rest/v1/background_submissions?${qs}`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as {
      id: string;
      storage_path: string;
      author_name: string;
      title: string | null;
      description: string | null;
    }[];
    const items: Background[] = rows.map((r) => ({
      id: r.id,
      url: imageUrl(cfg, r.storage_path),
      author: r.author_name,
      title: r.title,
      description: r.description,
    }));
    try {
      window.localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ at: Date.now(), items } satisfies CacheShape),
      );
    } catch {
      /* storage full — cache is best-effort */
    }
    return items;
  } catch {
    return [];
  }
}

/** Pinned background id, or null for carousel mode. */
export function getPinnedBackgroundId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
}

export function pinBackground(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id === null) window.localStorage.removeItem(PIN_KEY);
    else window.localStorage.setItem(PIN_KEY, id);
  } catch {
    /* best-effort */
  }
}
