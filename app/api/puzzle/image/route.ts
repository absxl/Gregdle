import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/game/rate-limit";
import { levelCount } from "@/lib/game/puzzle";
import PUZZLES from "@/data/gtnh/puzzles.json";

/**
 * GET /api/puzzle/image?date&kind&level (D45): streams the puzzle crop for
 * the current level. The answer is resolved server-side; the client never
 * learns storage paths, and full images only flow once the final level is
 * reached (which is a legitimate reveal).
 */

export const runtime = "nodejs";

const queryShape = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["single", "multi"]),
  level: z.coerce.number().int().min(0),
});

export async function GET(req: Request) {
  if (!rateLimit(`puzzle-img:${clientIp(req)}`, 60, 60_000)) {
    return new Response("rate limited", { status: 429 });
  }

  const url = new URL(req.url);
  const parsed = queryShape.safeParse({
    date: url.searchParams.get("date"),
    kind: url.searchParams.get("kind"),
    level: url.searchParams.get("level"),
  });
  if (!parsed.success) {
    return new Response("bad request", { status: 400 });
  }
  const { date, kind, level } = parsed.data;

  const svcUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svcKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svcUrl || !svcKey) {
    return new Response("puzzle unavailable", { status: 503 });
  }
  const H = { apikey: svcKey, Authorization: `Bearer ${svcKey}` };

  // 1) Resolve the puzzle answer server-side.
  const res = await fetch(
    `${svcUrl}/rest/v1/puzzle_answers?select=entry_id&date=eq.${date}&dataset=eq.gtnh:machines&kind=eq.${kind}&limit=1`,
    { headers: H, next: { revalidate: 60 } },
  );
  if (!res.ok) return new Response("puzzle unavailable", { status: 502 });
  const rows = (await res.json()) as { entry_id: string }[];
  const entryId = rows[0]?.entry_id;
  if (!entryId) return new Response("no puzzle today", { status: 404 });

  // 2) The crop base path for this machine (uuid map committed by the pipeline).
  const entry = PUZZLES[entryId as keyof typeof PUZZLES];
  if (!entry) return new Response("no crops for this machine", { status: 404 });

  // 3) Clamp and stream the level crop.
  const n = Math.min(level, levelCount(kind) - 1);
  const img = await fetch(`${svcUrl}/storage/v1/object/puzzles/puzzles/${entry.uuid}/L${n}.png`, {
    headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}` },
    cache: "no-store",
  });
  if (!img.ok) return new Response("crop unavailable", { status: 404 });

  return new Response(img.body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "X-Puzzle-Level": String(n),
    },
  });
}
