// Seed the GTNH homepage showcase as approved wallpapers (D33).
// Images and credits from https://www.gtnewhorizons.com/ — see ATTRIBUTION.md.
// Processing mirrors the client compressor: center-crop 16:9, <=1920px wide,
// JPEG within ~500 KB.
//
// Usage: node --env-file=.env.local pipeline/seed-wallpapers.mjs

import sharp from "sharp";

const SITE = "https://www.gtnewhorizons.com";
const OWNER_USER_ID = "f9241990-61fb-46c2-a8f2-0785f9885ba5"; // uploader of record (amidnightgospel)

const MANIFEST = [
  { file: "/_astro/1.B23n7rRr_Z1zTpU6.png", title: "Mountain", author: "iLex" },
  { file: "/_astro/2.C2F1b6zx_2uMTj5.png", title: "Steam Engineering", author: "Li Muli" },
  { file: "/_astro/3.VrBP0RDy_2uQ6re.png", title: "Rocket Museum", author: "Audacter" },
  {
    file: "/_astro/4.DMNRUDxl_IFulV.png",
    title: "GoodVibes™ Stargate Base",
    author: "Salsa, MimiKe & duck",
  },
  {
    file: "/_astro/5.B8m8dkO2_Zfs7QF.png",
    title: "Light of the New Age",
    author: "Semetix, Bl1nkle, Tbone, lui993 & P_A_JN",
  },
  { file: "/_astro/6.C7mHtkFQ_1W8IAf.png", title: "Indescribable Tentacle", author: "Suber" },
  { file: "/_astro/7.D_9XjKhR_21QYWK.png", title: "ZPM Base", author: "Flaxo" },
  { file: "/_astro/8.Bz3yDbhO_Z1Ipgcg.png", title: "Forge Of The Gods", author: "Qian Jia" },
  { file: "/_astro/9.DJIXf7vN_ZleVyq.png", title: "Stargate", author: "Repeating Cat" },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env (use --env-file=.env.local).");
  process.exit(1);
}

const TARGET = 500 * 1024;
const STEPS = [85, 78, 70, 60]; // sharp uses integer quality

async function processImage(buffer) {
  let img = sharp(buffer).rotate();
  const meta = await img.metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;
  // center-crop to 16:9
  let cw = w;
  let ch = h;
  if (w / h > 16 / 9) cw = Math.round(h * (16 / 9));
  else ch = Math.round(w / (16 / 9));
  const scale = Math.min(1, 1920 / cw);
  const outW = Math.max(1, Math.round(cw * scale));
  const outH = Math.max(1, Math.round(ch * scale));
  const base = img.extract({
    left: Math.round((w - cw) / 2),
    top: Math.round((h - ch) / 2),
    width: cw,
    height: ch,
  });
  let best = await base.resize(outW, outH).jpeg({ quality: STEPS[0] }).toBuffer();
  for (const q of STEPS) {
    const cand = await base.resize(outW, outH).jpeg({ quality: q }).toBuffer();
    if (cand.length <= TARGET) return cand;
    if (cand.length < best.length) best = cand;
  }
  return best;
}

let n = 0;
for (const item of MANIFEST) {
  n += 1;
  const res = await fetch(SITE + item.file, {
    headers: { "User-Agent": "GregdleBot/0.1 (https://gregdle.party)" },
  });
  if (!res.ok) {
    console.error(`skip ${item.title}: HTTP ${res.status}`);
    continue;
  }
  const raw = Buffer.from(await res.arrayBuffer());
  const jpeg = await processImage(raw);
  const path = `seed/gtnh-showcase-${n}.jpg`;

  const up = await fetch(`${url}/storage/v1/object/backgrounds/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "image/jpeg",
      "x-upsert": "true",
    },
    body: new Uint8Array(jpeg),
  });
  if (!up.ok) {
    console.error(`upload failed ${item.title}: HTTP ${up.status}`);
    continue;
  }

  const insert = await fetch(`${url}/rest/v1/background_submissions`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      user_id: OWNER_USER_ID,
      author_name: item.author,
      storage_path: path,
      status: "approved",
      decided_at: new Date().toISOString(),
      title: item.title,
      description: `From the GTNH homepage showcase — by ${item.author}.`,
      source_url: SITE,
    }),
  });
  console.log(
    `${item.title.padEnd(28)} ${(raw.length / 1024).toFixed(0)}KB -> ${(jpeg.length / 1024).toFixed(0)}KB  row:${insert.status}`,
  );
}
console.log("done");
