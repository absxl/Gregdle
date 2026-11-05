// Generate puzzle crop levels for both kinds (D45):
//  - single: 16×16 sprites, centered crops [3,4,5,6,7,8,10,12,14,16] px, ×16 nearest upscale
//  - multi:  structure renders, centered fraction crops of min dimension [6%..100%]
// Uploads to the PRIVATE `puzzles` bucket under puzzles/{uuid}/L{n}.png.
// Stable per-machine UUIDs persist in data/gtnh/puzzles.json.
//
// Usage: node --env-file=.env.local pipeline/generate-puzzles.mjs [--limit N]

import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATASET = JSON.parse(readFileSync(path.join(ROOT, "data/gtnh/machines.json"), "utf8"));
const PUZZLES_FILE = path.join(ROOT, "data/gtnh/puzzles.json");
const CACHE_DIR = path.join(ROOT, "pipeline/cache/puzzles");
const SITE = "https://www.gtnewhorizons.com"; // not used; sprites come from wikitide URLs in dataset

const SINGLE_LEVELS = [3, 4, 5, 6, 7, 8, 10, 12, 14, 16];
const MULTI_FRACTIONS = [0.06, 0.09, 0.12, 0.16, 0.2, 0.25, 0.35, 0.5, 1];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env (use --env-file=.env.local).");
  process.exit(1);
}
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const limitArg = process.argv.includes("--limit")
  ? Number(process.argv[process.argv.indexOf("--limit") + 1])
  : Infinity;

// Stable uuid map
let puzzles = existsSync(PUZZLES_FILE)
  ? JSON.parse(readFileSync(PUZZLES_FILE, "utf8"))
  : {};

function uuidFor(machineId) {
  if (!puzzles[machineId]) {
    puzzles[machineId] = { uuid: randomUUID(), name: "" };
  }
  return puzzles[machineId].uuid;
}

mkdirSync(CACHE_DIR, { recursive: true });

async function fetchSprite(machine) {
  const img = machine.image;
  if (!img) return null;
  const full = img.startsWith("//") ? `https:${img}` : img;
  const cacheFile = path.join(CACHE_DIR, `${machine.id}.png`);
  if (existsSync(cacheFile)) return readFileSync(cacheFile);
  const res = await fetch(full, {
    headers: { "User-Agent": "GregdleBot/0.1 (https://gregdle.carletti.work)" },
  });
  if (!res.ok) throw new Error(`sprite fetch ${machine.name}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(cacheFile, buf);
  return buf;
}

async function generateLevels(buf, kind) {
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 16;
  const h = meta.height ?? 16;
  const out = [];

  if (kind === "single") {
    const base = sharp(buf);
    for (const px of SINGLE_LEVELS) {
      const cw = Math.min(px, w);
      const ch = Math.min(px, h);
      const left = Math.round((w - cw) / 2);
      const top = Math.round((h - ch) / 2);
      const png = await base
        .clone()
        .extract({ left, top, width: cw, height: ch })
        .resize(cw * 16, ch * 16, { kernel: "nearest" })
        .png()
        .toBuffer();
      out.push(png);
    }
  } else {
    for (const f of MULTI_FRACTIONS) {
      const cw = Math.max(8, Math.round(w * f));
      const ch = Math.max(8, Math.round(h * f));
      const left = Math.round((w - cw) / 2);
      const top = Math.round((h - ch) / 2);
      const png = await sharp(buf)
        .extract({ left, top, width: cw, height: ch })
        .resize(512, 512, { fit: "cover", kernel: "nearest" })
        .png()
        .toBuffer();
      out.push(png);
    }
  }
  return out;
}

async function upload(path, body) {
  const res = await fetch(`${url}/storage/v1/object/puzzles/${path}`, {
    method: "POST",
    headers: { ...H, "x-upsert": "true" },
    body: new Uint8Array(body),
  });
  if (!res.ok) throw new Error(`upload ${path}: HTTP ${res.status} ${await res.text()}`);
}

const machines = DATASET.entries.filter((e) => e.image);
const singles = machines.filter((m) => m.attributes.structure === "single");
const multis = machines.filter((m) => m.attributes.structure === "multiblock");
console.log(`singles: ${singles.length}, multiblocks: ${multis.length}`);

let done = 0;
let errors = 0;

for (const kind of ["single", "multi"]) {
  const pool = kind === "single" ? singles : multis;
  for (const m of pool.slice(0, limitArg === Infinity ? undefined : limitArg)) {
    try {
      const buf = await fetchSprite(m);
      if (!buf) throw new Error("no image");
      const levels = await generateLevels(buf, kind);
      const uuid = uuidFor(m.id);
      puzzles[m.id].name = m.name;
      for (let i = 0; i < levels.length; i++) {
        await upload(`puzzles/${uuid}/L${i}.png`, levels[i]);
      }
      done++;
      if (done % 20 === 0) {
        writeFileSync(PUZZLES_FILE, JSON.stringify(puzzles, null, 2) + "\n");
        console.log(`  progress: ${done} processed (${kind} batch in progress)`);
      }
    } catch (err) {
      errors++;
      console.error(`FAILED ${m.name}: ${err.message}`);
    }
  }
}

writeFileSync(PUZZLES_FILE, JSON.stringify(puzzles, null, 2) + "\n");
console.log(`done: ${done} machines processed, ${errors} errors`);
