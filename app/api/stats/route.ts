import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/game/rate-limit";

/**
 * POST /api/stats — anonymized global-stat event (D40): one per finished
 * daily, guests included. No user id, no IP stored (IP used only for rate
 * limiting in-memory). Validated hard, inserted with the service key —
 * the anon RLS insert also exists, but the route adds rate limiting.
 */

export const runtime = "nodejs";

const statEvent = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataset: z.literal("gtnh:machines"),
  difficulty: z.enum(["easy", "hard"]),
  won: z.boolean(),
  gaveUp: z.boolean(),
  hintsUsed: z.number().int().min(0).max(10),
  guessCount: z.number().int().min(1).max(200),
});

export async function POST(req: Request) {
  if (!rateLimit(`stats:${clientIp(req)}`, 10, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = statEvent.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const e = parsed.data;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return Response.json({ error: "stats_unavailable" }, { status: 503 });
  }

  const res = await fetch(`${url}/rest/v1/daily_stat_events`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      date: e.date,
      dataset: e.dataset,
      difficulty: e.difficulty,
      won: e.won,
      gave_up: e.gaveUp,
      hints_used: e.hintsUsed,
      guess_count: e.guessCount,
    }),
  });

  if (!res.ok) {
    return Response.json({ error: "insert_failed" }, { status: 502 });
  }
  return Response.json({ ok: true });
}
