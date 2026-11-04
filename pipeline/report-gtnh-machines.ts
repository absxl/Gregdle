import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { machineDatasetSchema, VOLTAGE_TIERS } from "./schema";

/**
 * Dataset quality report (PRD §5 P3): entry counts, per-attribute coverage,
 * difficulty split, flagged entries, and the attribute-set recommendation.
 *
 * Usage: pnpm tsx pipeline/report-gtnh-machines.ts
 * Writes: data/gtnh/machines-quality.md
 */

const ROOT = path.resolve(import.meta.dirname, "..");

async function main() {
  const raw = JSON.parse(await readFile(path.join(ROOT, "data", "gtnh", "machines.json"), "utf8"));
  const ds = machineDatasetSchema.parse(raw);
  const n = ds.entries.length;

  const pct = (count: number) => `${((count / n) * 100).toFixed(1)}%`;
  const count = (fn: (e: (typeof ds.entries)[number]) => boolean) => ds.entries.filter(fn).length;

  const tierRows = VOLTAGE_TIERS.map((t) => ({
    tier: t,
    n: count((e) => e.attributes.tier === t),
  })).filter((r) => r.n > 0);

  const flagList = ds.entries
    .filter((e) => e.flagged)
    .map((e) => `- ${e.name} (${e.id})${e.flagReason ? ` — ${e.flagReason}` : ""}`)
    .join("\n");

  const md = `# GTNH machines — dataset quality report

Generated ${new Date().toISOString()} by \`pipeline/report-gtnh-machines.ts\`.
Source: ${ds.source} (${ds.snapshotVersion}); scraped ${ds.scrapedAt}.
Wiki pages parsed: 645 cached; pages with a machine infobox: ${n + 20}; entries: **${n}**.

## Attribute coverage

| Attribute | Coverage | Notes |
|---|---|---|
| Tier | ${pct(n)} | ordered enum incl. Stone/Steam ages |
| Structure | ${pct(n)} | derived: size 1x1x1 = single block |
| Size | ${pct(n)} | ${pct(count((e) => e.flagged))} approximate (wiki gives a range; minimum used) |
| Function category | ${pct(n)} | wiki Machine Type mapped to 12 generic buckets (D19); raw type kept for tooltips |
| Energy hatches | ${pct(count((e) => e.attributes.energyHatches !== null))} | nullable by design (steam machines have none) |
| Extras | ${pct(count((e) => e.attributes.extras.length > 0))} | overclocks + "other" notes |
| Pollution | ${pct(count((e) => e.attributes.pollution !== null))} | numeric when stated |
| Image | ${pct(count((e) => e.image !== null))} | wiki-rendered texture URL |

## Difficulty split (heuristic first pass — needs human review, PRD §4.5)

- easy: ${count((e) => e.difficulty === "easy")} (${pct(count((e) => e.difficulty === "easy"))})
- hard: ${count((e) => e.difficulty === "hard")} (${pct(count((e) => e.difficulty === "hard"))})

## Tier distribution

${tierRows.map((r) => `- ${r.tier}: ${r.n}`).join("\n")}

## Flagged entries (${count((e) => e.flagged)})

${flagList || "none"}

## Excluded pages (infobox present but not a machine — 20)

Items/utility pages (AR Glasses, Vajra, Thaumonomicon, Sleeping Bag, Dolly, …) and machines whose
size genuinely varies ("Varies", "Tier Dependent", "5 x 5 x H"). Full list in the normalizer output.

## Attribute-set recommendation (PRD §4.4 review step)

Keep: tier, structure, size, functionCategory, energyHatches, extras, pollution — all at 100% or
by-design nullable coverage. The comparison engine (lib/game/compare.ts) uses six columns:
TIER, STRUCTURE, SIZE (volume), FUNCTION, ENERGY, EXTRAS. Pollution stays in the data for future
modes but is not a guess column (too sparse/noisy to be fun).
`;

  const out = path.join(ROOT, "data", "gtnh", "machines-quality.md");
  await writeFile(out, md, "utf8");
  console.log(`Wrote ${path.relative(ROOT, out)} (${n} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
