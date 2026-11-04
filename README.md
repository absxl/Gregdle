# Gregdle

A Loldle-style daily guessing game for GregTech players. Guess the hidden machine from its
attributes — voltage tier, structure, size, function, energy. New dailies at 00:00 UTC,
endless mode anytime. **Live:** <https://gregdle.carletti.work>

## Features

- **209 GTNH machines** scraped from the [GTNH wiki](https://wiki.gtnewhorizons.com) (2.9
  snapshot) — every result links back to the machine's wiki page
- Daily in **Easy** / **Hard**, plus **endless** practice mode; hints at 4 and 8 wrong guesses
  (the second shows the machine's texture)
- Minedle-style search: each suggestion shows its tier/structure/size/function
- **Sign in with Discord** → daily leaderboard (top 10 on home), public profiles with
  Minecraft-fire streaks, win distributions and guess history
- Community **wallpapers**: submit (auto-compressed to ~500 KB, cropped to 16:9), owner
  approval, 30 s dimmed site-wide carousel, credited + linked to artist profiles
- Spoiler-free sharing: emoji grid or rendered PNG image
- Mobile-first dark UI, VT323/Silkscreen pixel accents, GregTech item icons

## Stack

- **Next.js 16** (App Router, TypeScript strict) + Tailwind v4
- **Cloudflare Workers** via `@opennextjs/cloudflare` — deploys on push to `main`
- **Supabase** — Postgres + RLS, Discord auth, storage (wallpapers), `pg_cron` daily-answer
  generation, SECURITY DEFINER RPCs for anti-cheat result submission and moderation
- **Vitest** (27 tests incl. the anti-spoiler contract) + **Playwright** e2e (4 tests)
- MIT licensed — see `LICENSE`

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # vitest
pnpm lint         # eslint
pnpm e2e          # playwright (build first: pnpm build; needs `pnpm exec playwright install chromium`)
pnpm build        # next build
pnpm build:cf     # OpenNext worker build (works on Windows via the hoisted linker)
```

Copy `.env.example` → `.env.local` and fill the Supabase values. `NEXT_PUBLIC_*` vars are
injected at runtime by the worker (see the bootstrap in `app/layout.tsx`) — the Cloudflare
build environment doesn't need them.

### Data pipeline

```bash
pnpm tsx pipeline/scrape-gtnh-machines.ts     # polite crawl (cached, ~2s/req)
pnpm tsx pipeline/normalize-gtnh-machines.ts  # -> data/gtnh/machines.json (Zod-validated)
pnpm tsx pipeline/report-gtnh-machines.ts     # -> data/gtnh/machines-quality.md
pnpm tsx --env-file=.env.local pipeline/seed-supabase.ts  # upsert entries + regen dailies
```

### Database

Migrations in `supabase/migrations/`; apply with `npx supabase db push --remote --yes`.
RLS keeps `daily_answers` secret; results submit only through server-validated RPCs;
wallpaper moderation is admin-gated (`app_admins`).

## Docs

- `docs/GREGDLE_PRD.md` — product requirements & milestones
- `docs/DECISIONS.md` — every assumption/deviation (start here for "why is X like this")
- `docs/ATTRIBUTION.md` — data/image sources and licenses
