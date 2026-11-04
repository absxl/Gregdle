import { z } from "zod";
import { getDailyAnswerId, getEndlessAnswerId, machineHint } from "@/lib/game/answers";
import { getEntryById, getMachines } from "@/lib/game/dataset";
import { clientIp, rateLimit } from "@/lib/game/rate-limit";

/**
 * POST /api/hint — hints are computed server-side from the hidden answer
 * (PRD §6.5): index 0 unlocks after 6 wrong guesses (first letter + length),
 * index 1 after 10 (tier + function). The answer itself never leaks.
 */

export const runtime = "nodejs";

const hintRequest = z.object({
  datasetKey: z.literal("gtnh:machines"),
  difficulty: z.enum(["easy", "hard"]),
  mode: z.enum(["daily", "endless"]),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  seed: z.string().min(6).max(64).optional(),
  index: z.union([z.literal(0), z.literal(1)]),
});

export async function POST(req: Request) {
  if (!rateLimit(`hint:${clientIp(req)}`, 30, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = hintRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const { datasetKey, difficulty, mode, date, seed, index } = parsed.data;

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

  return Response.json(machineHint(answer, index));
}
