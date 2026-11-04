import { readFile } from "node:fs/promises";
import path from "node:path";
import { machineDatasetSchema } from "./schema";

/**
 * Seeds the entries table from the validated dataset JSON via the Supabase
 * REST API (service key bypasses RLS). Idempotent: upsert on (dataset, id).
 *
 * Usage: pnpm tsx pipeline/seed-supabase.ts
 * Requires SUPABASE_SECRET_KEY + NEXT_PUBLIC_SUPABASE_URL in the environment.
 */

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "gtnh", "machines.json");

interface Row {
  dataset: string;
  id: string;
  name: string;
  aliases: string[];
  image: string | null;
  difficulty: string;
  attributes: unknown;
  source_url: string;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (use .env.local).");
    process.exit(1);
  }

  const raw = JSON.parse(await readFile(DATA_FILE, "utf8"));
  const dataset = machineDatasetSchema.parse(raw);

  const rows: Row[] = dataset.entries.map((e) => ({
    dataset: e.dataset,
    id: e.id,
    name: e.name,
    aliases: e.aliases,
    image: e.image,
    difficulty: e.difficulty,
    attributes: e.attributes,
    source_url: e.source_url,
  }));

  console.log(`Seeding ${rows.length} entries to ${url} …`);

  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const res = await fetch(`${url}/rest/v1/entries`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Batch ${i / batchSize + 1} failed: HTTP ${res.status} ${body.slice(0, 400)}`,
      );
    }
    console.log(`  batch ${i / batchSize + 1}/${Math.ceil(rows.length / batchSize)} ok`);
  }

  // Kick daily answer generation right away (also scheduled via pg_cron).
  const gen = await fetch(`${url}/rest/v1/rpc/generate_daily_answers`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ days_ahead: 30 }),
  });
  const genText = await gen.text();
  console.log(`generate_daily_answers(30): HTTP ${gen.status} -> ${genText.slice(0, 100)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
