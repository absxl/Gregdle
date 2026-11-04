import { z } from "zod";
import { compareMachine } from "@/lib/game/compare";
import { getDailyAnswerId, getEndlessAnswerId } from "@/lib/game/answers";
import { getEntryById, getMachines } from "@/lib/game/dataset";
import { clientIp, rateLimit } from "@/lib/game/rate-limit";

/**
 * POST /api/guess — the only place comparisons happen (PRD §7.3).
 * The answer id/name never appears in the response unless the game ends
 * (win or explicit give-up).
 */

export const runtime = "nodejs";

const guessRequest = z.object({
  datasetKey: z.literal("gtnh:machines"),
  difficulty: z.enum(["easy", "hard"]),
  mode: z.enum(["daily", "endless"]),
  /** UTC date (YYYY-MM-DD) for dailies. */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** Client-generated seed for endless runs. */
  seed: z.string().min(6).max(64).optional(),
  guessId: z.string().min(1).max(120),
  giveUp: z.boolean().optional(),
});

export async function POST(req: Request) {
  if (!rateLimit(`guess:${clientIp(req)}`, 120, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = guessRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const { datasetKey, difficulty, mode, date, seed, guessId, giveUp } = parsed.data;

  if (mode === "daily" && !date) {
    return Response.json({ error: "date_required" }, { status: 400 });
  }
  if (mode === "endless" && !seed) {
    return Response.json({ error: "seed_required" }, { status: 400 });
  }

  const entries = getMachines();
  let answerId: string;
  try {
    answerId =
      mode === "daily"
        ? (await getDailyAnswerId(entries, datasetKey, difficulty, date!)).id
        : getEndlessAnswerId(entries, datasetKey, difficulty, seed!);
  } catch {
    return Response.json({ error: "no_answer_available" }, { status: 503 });
  }

  const answer = getEntryById(answerId);
  if (!answer) {
    return Response.json({ error: "answer_missing_from_dataset" }, { status: 500 });
  }

  if (giveUp) {
    return Response.json({
      gaveUp: true,
      answer: { id: answer.id, name: answer.name, image: answer.image },
    });
  }

  const guess = getEntryById(guessId);
  if (!guess) {
    return Response.json({ error: "unknown_guess_id" }, { status: 404 });
  }

  const result = compareMachine(guess, answer);

  // Same-guess counter (D41): record the daily guess anonymously and return
  // how many players used it today (including this one).
  let sameGuessCount: number | null = null;
  if (mode === "daily") {
    const svcUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svcKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (svcUrl && svcKey) {
      try {
        const H = {
          apikey: svcKey,
          Authorization: `Bearer ${svcKey}`,
          "Content-Type": "application/json",
        };
        await fetch(`${svcUrl}/rest/v1/guess_events`, {
          method: "POST",
          headers: H,
          body: JSON.stringify({ date, dataset: datasetKey, difficulty, guess_id: guessId }),
        });
        const cnt = await fetch(
          `${svcUrl}/rest/v1/guess_events?select=guess_id&date=eq.${date}&dataset=eq.${datasetKey}&difficulty=eq.${difficulty}&guess_id=eq.${guessId}`,
          { headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}` } },
        );
        const rows = (await cnt.json()) as unknown[];
        sameGuessCount = rows.length;
      } catch {
        sameGuessCount = null; // counter is cosmetic — never block a guess
      }
    }
  }

  if (result.won) {
    // Game over: reveal the answer alongside the winning row.
    return Response.json({
      result,
      sameGuessCount,
      answer: { id: answer.id, name: answer.name, image: answer.image },
    });
  }

  // Anti-spoiler: the comparison row only, nothing about the answer.
  return Response.json({ result, sameGuessCount });
}
