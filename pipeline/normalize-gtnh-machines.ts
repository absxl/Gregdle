import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { machineDatasetSchema, machineTierSchema, type MachineEntry } from "./schema";
import { mapFunctionType } from "./function-categories";

/**
 * GTNH machines normalizer (M1 probe, D14).
 *
 * Parses cached wiki HTML (pipeline/cache/gtnh/pages/*.html) and extracts the
 * Portable Infobox fields: name, image, source, type, tier, size,
 * energyHatches, overclocks, pollution. A page counts as a machine iff its
 * infobox has a `tier` data-source (all machine pages have one; guides/mods
 * pages don't).
 *
 * Human overrides from pipeline/overrides/gtnh-machines.json are applied last
 * (PRD §5 P4) so fixes survive re-scrapes.
 *
 * Usage: pnpm tsx pipeline/normalize-gtnh-machines.ts
 * Writes: data/gtnh/machines.json
 */

const ROOT = path.resolve(import.meta.dirname, "..");
const PAGES_DIR = path.join(ROOT, "pipeline", "cache", "gtnh", "pages");
const OUT_FILE = path.join(ROOT, "data", "gtnh", "machines.json");
const OVERRIDES_FILE = path.join(ROOT, "pipeline", "overrides", "gtnh-machines.json");

const SOURCE_WIKI = "https://wiki.gtnewhorizons.com/wiki/";
const SNAPSHOT_VERSION = "GTNH 2.9 (wiki default render, 2026-11-03)";

interface RawField {
  [key: string]: string | undefined;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract the portable infobox fields as label->value plus data-source map. */
function parseInfobox(html: string): { fields: RawField; bySource: RawField } | null {
  const asideMatch = html.match(/<aside[^>]*portable-infobox[^>]*>([\s\S]*?)<\/aside>/);
  if (!asideMatch) return null;
  const box = asideMatch[1];
  const fields: RawField = {};
  const bySource: RawField = {};

  const itemRe =
    /<div[^>]*class="[^"]*pi-item pi-data[^"]*"[^>]*data-source="([^"]+)"[^>]*>\s*<h3[^>]*pi-data-label[^>]*>([\s\S]*?)<\/h3>\s*<div[^>]*pi-data-value[^>]*>([\s\S]*?)<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(box)) !== null) {
    const source = m[1];
    const label = stripTags(m[2]);
    const value = stripTags(m[3]);
    if (label && value) {
      fields[label] = value;
      bySource[source] = value;
    }
  }

  // Infobox title (may differ from page title).
  const titleMatch = box.match(/<h2[^>]*pi-item[^>]*pi-title[^>]*>([\s\S]*?)<\/h2>/);
  if (titleMatch) bySource.name = stripTags(titleMatch[1]);

  // Image (full-resolution URL from the thumbnail).
  const imgMatch = html.match(
    /<figure[^>]*pi-item[^>]*pi-image[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/,
  );
  if (imgMatch) {
    bySource.__image = imgMatch[1].replace(/\/thumb\//, "/").replace(/\/\d+px-[^/]+$/, "");
  }
  return { fields, bySource };
}

/** Map wiki tier text to the canonical enum. Multi-tier entries use the first. */
function parseTier(value: string | undefined): {
  tier?: MachineEntry["attributes"]["tier"];
  problem?: string;
} {
  if (!value) return { problem: "missing tier" };
  // "HV , EV , LuV" -> first listed (lowest) tier.
  const first = value.split(/[,;/]/)[0]!.trim();
  const direct = first.toUpperCase().replace(/\s+/g, "");
  const aliased: Record<string, string> = {
    STONE: "Stone",
    STONEAGE: "Stone",
    STEAM: "Steam",
    ULV: "ULV",
    LV: "LV",
    MV: "MV",
    HV: "HV",
    EV: "EV",
    IV: "IV",
    LUV: "LuV",
    ZPM: "ZPM",
    UV: "UV",
    UHV: "UHV",
    UEV: "UEV",
    UIV: "UIV",
    UXV: "UXV",
    UMV: "UMV",
    OPV: "UMV",
    MAX: "MAX",
  };
  const mapped = aliased[direct];
  if (!mapped) return { problem: `unrecognized tier "${value}"` };
  const parsed = machineTierSchema.safeParse(mapped);
  return parsed.success ? { tier: parsed.data } : { problem: `tier "${mapped}" out of enum` };
}

/**
 * Size parsing. Fixed "3 x 3 x 4" is exact; ranges ("3 x 5-16 x 4") use the
 * minimum of each range and the entry is flagged approximate.
 */
function parseSize(value: string | undefined): {
  size?: { l: number; w: number; h: number };
  approximate?: boolean;
  problem?: string;
} {
  if (!value) return { problem: "missing size" };
  const num = "(\\d+)(?:\\s*-\\s*\\d+)?"; // single number or range min-max
  const dims = value.match(new RegExp(`^\\s*${num}\\s*[xX×]\\s*${num}\\s*[xX×]\\s*${num}\\s*$`));
  if (!dims) return { problem: `unparseable size "${value}"` };
  const approximate = /-/.test(value);
  return {
    size: { l: Number(dims[1]), w: Number(dims[2]), h: Number(dims[3]) },
    approximate,
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function classifyStructure(
  size: { l: number; w: number; h: number },
  machineType: string,
): "single" | "multiblock" {
  if (size.l === 1 && size.w === 1 && size.h === 1) return "single";
  const singleHints = /single|buffer|upgrade|cover/i;
  if (singleHints.test(machineType) && size.l * size.w * size.h <= 3) return "single";
  return "multiblock";
}

/** Difficulty heuristic first pass (PRD §4.5) — reviewed by a human later. */
function difficultyHeuristic(entry: Omit<MachineEntry, "difficulty">): "easy" | "hard" {
  const tierIndex = ((): number => {
    const order = [
      "ULV",
      "LV",
      "MV",
      "HV",
      "EV",
      "IV",
      "LuV",
      "ZPM",
      "UV",
      "UHV",
      "UEV",
      "UIV",
      "UXV",
      "UMV",
      "MAX",
    ];
    return order.indexOf(entry.attributes.tier);
  })();
  // Early tiers + iconic machines everyone meets => easy candidates.
  const iconic =
    /electric furnace|macerator|compressor|extractor|lathe|hammer|alloy smelter|arc furnace|assembler|centrifuge|electrolyzer|chemi|bath|sifter|washer|thermal centrifuge|ore washer|crusher|rock crusher|cutter|bender|wiremill|plate bender|extruder|fluid solidifier|fluid extractor|mass fabricator/i;
  const iconicName = iconic.test(entry.name);
  if (tierIndex >= 0 && tierIndex <= 5 && iconicName) return "easy";
  if (tierIndex >= 0 && tierIndex <= 3) return "easy";
  return "hard";
}


/**
 * Energy hatch normalization (D47): "N/A" / "n/a" variants become null so
 * they compare equal to machines with no energy hatch at all (steam age).
 */
function normalizeEnergy(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^n\/a$/i.test(trimmed) || /^not applicable$/i.test(trimmed)) return null;
  return trimmed;
}

async function main() {
  const files = (await readdir(PAGES_DIR)).filter((f) => f.endsWith(".html"));
  console.log(`Parsing ${files.length} cached pages…`);

  const entries: MachineEntry[] = [];
  const skipped: { file: string; reason: string }[] = [];
  const flagged: { name: string; reason: string }[] = [];
  const seenIds = new Map<string, string>();

  for (const file of files) {
    const html = await readFile(path.join(PAGES_DIR, file), "utf8");
    const box = parseInfobox(html);
    if (!box) continue; // no infobox -> not a machine page
    const { bySource } = box;
    if (!bySource.tier) continue; // infobox without tier -> not a machine

    const name = bySource.name ?? file.replace(/\.html$/, "").replace(/_/g, " ");
    const pageSlug = file.replace(/\.html$/, "");
    const id = slugify(name);
    if (!id) {
      skipped.push({ file, reason: "empty id" });
      continue;
    }
    if (seenIds.has(id)) {
      skipped.push({ file, reason: `duplicate id "${id}" (first: ${seenIds.get(id)})` });
      continue;
    }
    seenIds.set(id, file);

    const tier = parseTier(bySource.tier);
    const size = parseSize(bySource.size);
    const machineType = bySource.type ?? null;
    const problems: string[] = [];
    if (tier.problem) problems.push(tier.problem);
    if (size.problem) problems.push(size.problem);
    if (!machineType) problems.push("missing machine type");

    if (!tier.tier || !size.size || !machineType) {
      flagged.push({ name, reason: problems.join("; ") });
      continue; // schema-required fields absent -> review list, not dataset
    }

    const structure = classifyStructure(size.size, machineType);
    const approximateSize = size.approximate === true;
    const functionMap = mapFunctionType(machineType);
    const base: Omit<MachineEntry, "difficulty"> = {
      id,
      name,
      dataset: "gtnh:machines",
      image: bySource.__image ?? null,
      source_url: SOURCE_WIKI + pageSlug,
      aliases: [],
      attributes: {
        tier: tier.tier,
        structure,
        size: structure === "single" ? { l: 1, w: 1, h: 1 } : size.size,
        functionCategory: functionMap.category,
        functionTypeRaw: machineType,
        energyHatches: normalizeEnergy(bySource.energyHatches),
        extras: [
          ...(bySource.overclocks ? [`overclocks: ${bySource.overclocks.toLowerCase()}`] : []),
          ...(bySource.other ? [bySource.other.toLowerCase()] : []),
        ],
        pollution: bySource.pollution
          ? Number(bySource.pollution.replace(/[^\d.]/g, "")) || null
          : null,
      },
      flagged: approximateSize,
      ...(approximateSize
        ? { flagReason: `approximate size (wiki states a range, minimum used: ${bySource.size})` }
        : {}),
    };

    entries.push({ ...base, difficulty: difficultyHeuristic(base) });
  }

  // Human overrides (P4) — applied after parsing, before validation.
  type Overrides = { entries?: Record<string, Partial<MachineEntry> & { flagReason?: string }> };
  const overrides: Overrides = JSON.parse(await readFile(OVERRIDES_FILE, "utf8").catch(() => "{}"));
  let overridden = 0;
  for (const [id, patch] of Object.entries(overrides.entries ?? {})) {
    const idx = entries.findIndex((e) => e.id === id);
    if (idx >= 0) {
      entries[idx] = {
        ...entries[idx],
        ...patch,
        attributes: { ...entries[idx].attributes, ...(patch.attributes ?? {}) },
      };
      overridden++;
    }
  }

  const dataset = machineDatasetSchema.parse({
    dataset: "gtnh:machines",
    snapshotVersion: SNAPSHOT_VERSION,
    scrapedAt: new Date().toISOString(),
    source: "https://wiki.gtnewhorizons.com",
    entries,
  });

  await writeFile(OUT_FILE, JSON.stringify(dataset, null, 2) + "\n", "utf8");
  console.log(
    `OK: ${entries.length} machines -> ${path.relative(ROOT, OUT_FILE)} (overrides applied: ${overridden})`,
  );
  console.log(`Flagged for review: ${flagged.length}`);
  for (const f of flagged) console.log(`  ! ${f.name}: ${f.reason}`);
  if (skipped.length) {
    console.log(`Skipped: ${skipped.length}`);
    for (const s of skipped.slice(0, 10)) console.log(`  - ${s.file}: ${s.reason}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
