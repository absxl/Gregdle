# Gregdle — Decision Log

Record of every assumption or deviation from the PRD (§13 requires this). Newest last.

## D1 — Hosting: Cloudflare instead of Vercel (2026-11-03, session 1)

**PRD §2** locks "Vercel + Supabase free tiers". User chose **Cloudflare** for hosting.

- Deploy target: Cloudflare Workers via **`@opennextjs/cloudflare`** (OpenNext) — Cloudflare's
  currently recommended path for Next.js; full feature support (route handlers, ISR/PPR, Node APIs
  via `nodejs_compat`), no per-route Edge-runtime constraint.
- Free tier headroom is fine for a daily guessing game (100k req/day).
- CI runs `next build` only for now; the OpenNext worker build is verified locally and will join
  CI once the production deploy is live (M6).
- Consequence for M3: daily-answer generation will use **Supabase `pg_cron`** instead of
  Vercel cron jobs.

## D2 — Supabase provisioned later; M0–M2 run without a live database (2026-11-03, session 1)

User will create the Supabase project later. Datasets are static JSON committed to the repo;
endless mode (M2) picks answers server-side from that static data. A live DB first becomes
necessary in M3 (`daily_answers`) — auth/stats arrive in M4. `/supabase/migrations` holds the
schema skeleton from PRD §7.1 until then; `/lib/supabase` exposes config guards, not clients.

## D3 — "GTCEu" ecosystem means GregTech CEu **Modern (1.20.1)** (2026-11-03, session 1)

The PRD's "GTCEu (modern GregTech CEu)" is ambiguous between CEu Modern (1.20.1) and
CEu Unofficial (1.12.2). User picked **CEu Modern**. Its documentation is a static site
(gregtechceu.github.io/GregTech-Modern/1.20.1, with a downloadable offline copy) — the scraper
for that dataset parses static HTML/markdown, not MediaWiki.

## D4 — M1 de-risked by a one-dataset probe: GTNH materials first (2026-11-03, session 1)

Before committing to all six datasets, the pipeline runs end-to-end on **GTNH materials**
(MediaWiki 1.46.2 at `wiki.gtnewhorizons.com`): enumerate → scrape → normalize → validate →
quality report. Gate after the probe: review attribute coverage, decide the final attribute
set (PRD §12.3) and dataset curation size before the full M1 run.

Scraper etiquette (from the wiki's robots.txt): rendered `/wiki/` pages only (API query actions
are disallowed for crawlers), ~1 request / 2 s, identified `User-Agent: GregdleBot/0.1`,
raw HTML cached under `/pipeline/cache` so re-runs never re-hit the site.

## D5 — Wiki image licensing: no deep-dive (2026-11-03, session 1)

User decision: treat Gregdle as a fan project; use wiki-sourced images/text without a license
investigation. `/docs/ATTRIBUTION.md` still records per-entry source URLs (cheap, and the PRD
mandates an attribution page).

## D6 — Hint policy on the leaderboard: hinted wins rank below unhinted (2026-11-03, session 1)

PRD §12.2 default confirmed by user. Implementation lands in M4.

## D7 — Pixel font: VT323 (2026-11-03, session 1)

VT323 (OFL, via `next/font/google`) for both headings and grid data — legible at small sizes,
terminal/machine feel. Revisit with mockups in M2 if density becomes a problem.

## D8 — Repo: private GitHub, one branch per milestone (2026-11-03, session 1)

`N:\gregdle` local git + private GitHub remote; branches `m0-setup`, `m1-data`, … merged to
`main` at each accepted milestone gate.

## D9 — Tooling choices (2026-11-03, session 1)

pnpm (detected on machine, pinned via `packageManager`), Vitest + Testing Library (per Next.js
docs guide), Prettier, Zod (pipeline + app validation), tsx (running pipeline scripts).
Playwright arrives with M2/M6 per the PRD.

## D10 — pnpm `nodeLinker: hoisted` so OpenNext worker builds run on Windows (2026-11-03, session 1)

`opennextjs-cloudflare build` copies `node_modules` into the server bundle; with pnpm's default
symlinked virtual store, esbuild on Windows fails with "Cannot read directory … Access is
denied" on the junctions. Setting `nodeLinker: hoisted` in `pnpm-workspace.yaml` (pnpm 12
ignores `.npmrc` for this) produces a flat, junction-free layout and the worker build succeeds
natively on Windows. Trade-off: slightly larger/slower installs — acceptable at this project
size. Verified: `pnpm build:cf` → `.open-next/worker.js`, exit 0.

## D11 — Cloudflare deployment via Workers Builds (git-connected) (2026-11-03, session 1)

Repo: `github.com/absxl/Gregdle` (private). Workers Builds commands:
build `npx opennextjs-cloudflare build`, deploy `npx wrangler deploy` (wrangler.jsonc already
points at the OpenNext artifacts), preview `npx wrangler versions upload` (`wrangler preview`
does not exist in wrangler 4). GitHub Actions CI (lint/test/build) runs on every push/PR as a
second gate.

**Open item (parked by user, 2026-11-03):** the deployed worker returns HTTP 500 at runtime
while building and deploying cleanly. Prime suspects: `incrementalCache: "dummy"` interacting
with Next 16 `cacheComponents`, or the external-middleware path. Fix with a KV-backed cache or
cacheComponents disable; reproduce locally via `pnpm preview:cf` first.

## D12 — v1 ships FIVE datasets: gtnh:materials dropped (2026-11-03, session 1, user decision)

The M1 probe found the GTNH wiki (1140 URLs in sitemap) has **no material pages at all** —
Category:Materials is empty, and none of the classic materials (Steel, Aluminium, Neutronium,
…) have pages. Alternatives were considered (GT5u source parsing, community spreadsheets) and
the user chose to **drop gtnh:materials in v1** rather than leave the wiki-scraping constraint
(PRD §2 "no game dump"). Active datasets (5): gtnh:machines, gtnh:items, gtceu:materials,
gtceu:machines, gtceu:items. `lib/datasets.ts` keeps the full 3×2 type matrix with
`isDatasetInactive()` marking the dropped pair, so it can return later (e.g. via GT5u source
parsing) without a type-system rework.

## D13 — GTCEu datasets source: gtwiki.miraheze.org (2026-11-03, session 1, user decision)

The official CEu Modern docs (gregtechceu.github.io, D3) turned out to be developer
documentation with no gameplay data (materials/machines lists don't exist there). The user
picked the community wiki **gtwiki.miraheze.org** (covers CEu Modern + Unofficial, content
CC BY-SA 4.0). Caveat for full M1: its material pages are prose — structured attributes must
come from its tables (e.g. Voltage Tiers (Modern)) and category listings, with prose-only
entries flagged for manual review.

## D14 — M1 probe target re-aimed: GTNH machines (2026-11-03, session 1, user decision)

The probe originally targeted gtnh:materials; after D12 it validates **gtnh:machines**
instead. Evidence collected: ~645 candidate article pages; machine pages carry a consistent
infobox (Source, Machine Type, Tier, Size LxWxH, Energy Hatches, Overclocks, Pollution) that
maps onto PRD §4.3 attributes; the wiki's voltage-tier pages (LV…MAX) provide the ordered
tier enum. Wiki pages render the GTNH 2.9 version by default — dataset metadata records the
snapshot version + scrape date.

## D15 — v1 game architecture: stateless API + DB dailies + guest localStorage (2026-11-03, night build)

- **Guesses are stateless**: the client sends (dataset, difficulty, mode, date|seed, guessId)
  to `POST /api/guess`; the server resolves the answer (Supabase `daily_answers` first,
  deterministic seeded fallback if the DB is unreachable — same answer for everyone on a date)
  and returns only comparison cells. No session storage, no answer leakage (tested).
- **Endless**: client-generated seed; server seeded-picks from the pool. Not persisted.
- **Guest progress**: localStorage (resumable dailies, streaks, distribution, endless stats);
  structured for M4 account migration.
- **Tier enum** extended with Stone/Steam in front of ULV (GTNH steam-age machines).
- **Range sizes** ("3 x 5-16 x 4") use the range minimum and the entry is flagged approximate.
- **Anti-cheat**: per-isolate rate limiting on guess/hint APIs; leaderboard writes only via
  the `submit_daily_result` SECURITY DEFINER RPC that verifies the claimed win against the
  hidden answer. Leaderboard UI itself lands in M4.
- **Pollution** kept in data, not a guess column (27.8% coverage — not fun as a column).

## D16 —

_(D16 numbering retired; removed before the repository went public.)_

## D17 — Cloudflare 500 root cause: Next 16 `cacheComponents` (2026-11-03, night build)

The deployed worker returned 500 on every request while building cleanly. Reproduced locally
via `pnpm preview:cf`; cause: the create-next-app defaults `cacheComponents: true` +
`partialPrefetching: true` require a real incremental cache at runtime, which the OpenNext
"dummy" cache cannot serve. Both flags disabled in `next.config.ts`; worker serves 200.
A KV-backed cache can re-enable them later if ISR is ever needed.

## D18 — UI revamp v2 + easier difficulty + image hints (2026-11-04, user decision)

User feedback: v1 GUI mimicry "looks too forced", unreadable on mobile, cell colors hard to
distinguish, game too hard. Changes:

- **Design system v2**: dark industrial palette, VT323 only as display accent (headings,
  countdown, stat numbers), bold sans for all data; bevels/hazard stripes removed. Sticky
  guess column + horizontal scroll for attribute cells on phones; always-visible legend.
- **Cell semantics**: green ✓ / amber-striped ◐ / red ✕ / blue ▲▼ with dark ink text for
  contrast; icons and aria labels on every cell (color never the only signal).
- **Difficulty**: hints unlock at **4 / 8** wrong guesses (was 6/10, PRD §6.5 amended by
  owner); hint 1 = the machine's image, hint 2 = first letter + length (swapped on
  2026-11-04 per user request — the image is now the early hint).
- **Images**: wiki textures in the autocomplete dropdown, guess rows, results modal, hint 2,
  and the home hero.
- **Win animation**: badge pop + cell wave + row glow + CSS confetti in the results modal
  (disabled under prefers-reduced-motion).
- **Home**: Loldle-style mode directory — hero + one card per mode (Easy/Hard daily with
  status chip, Endless), future datasets as dimmed "coming soon" cards.

## D28 — Community backgrounds: rotating carousel, Discord-gated submissions, owner approval (2026-11-04, user decision)

Free + in-site (no external drive): Supabase Storage public bucket `backgrounds` under
`submissions/{user_id}/` (unguessable paths). Discord login required to submit (credit = immutable
profile name). Owner (app_admins, seeded from the amidnightgospel profile) approves via RPCs —
approval only flips status, files never move. Site-wide dimmed carousel (30 s crossfade, blur,
dark veil; reduced-motion = static; pin-a-favorite via localStorage). Header button top-left on
home + play opens the panel (gallery / submit / approve). Rejected files remain in storage but are
never listed — acceptable at this scale.
