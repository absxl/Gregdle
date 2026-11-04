"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { DailyGame } from "./local-state";

/**
 * Guest -> account migration (PRD §7.2): pushes locally-played dailies to
 * the server-validated migrate_guest_results RPC on first sign-in. Runs once
 * per browser (flag); results played AFTER signing in are submitted live by
 * the game itself. The server re-validates every claimed win and never
 * overwrites existing rows — safe to retry.
 */

const FLAG_KEY = "gregdle:v1:guest-migrated";

export async function migrateGuestResults(): Promise<void> {
  if (typeof window === "undefined") return;
  const supabase = getSupabaseBrowser();
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  try {
    if (window.localStorage.getItem(FLAG_KEY)) return;

    const index = JSON.parse(
      window.localStorage.getItem("gregdle:v1:index:daily") ?? "{}",
    ) as Record<string, DailyGame>;
    const finished = Object.values(index).filter(
      (g) => g.datasetKey && g.difficulty && g.date && g.status !== "playing",
    );

    await supabase.rpc("migrate_guest_results", {
      p_results: finished.map((g) => ({
        date: g.date,
        dataset: g.datasetKey,
        difficulty: g.difficulty,
        guesses: g.rows.map((r) => r.guessId),
        won: g.status === "won",
        hints_used: g.hintsUsed ?? 0,
        finished_at: new Date().toISOString(),
      })),
    });
  } catch {
    // Migration is best-effort; retried on the next sign-in.
    return;
  }
  window.localStorage.setItem(FLAG_KEY, "1");
}
