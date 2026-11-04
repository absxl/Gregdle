# Gregdle

A Loldle-style daily guessing game for GregTech players. Guess the hidden machine from its
attributes — voltage tier, structure, size, function, and more. New dailies at 00:00 UTC,
endless mode anytime. **Live:** <https://gregdle.stranger3012.workers.dev>

## Stack

- **Next.js 16** (App Router, TypeScript strict) + Tailwind v4, VT323 pixel font
- **Cloudflare Workers** via `@opennextjs/cloudflare` (Workers Builds deploys on push to `main`)
- **Supabase** (Postgres, RLS, `pg_cron` daily-answer generation)
- Data pipeline in TypeScript (`tsx`): wiki scraper → normalizer → Zod validation → JSON + seed
- **Vitest** (21 tests incl. anti-spoiler contract), ESLint, Prettier, GitHub Actions CI

## Datasets

| Dataset                                    | Source                                      | Entries | Status            |
| ------------------------------------------ | ------------------------------------------- | ------- | ----------------- |
| `gtnh:machines`                            | [GTNH wiki](https://wiki.gtnewhorizons.com) | 209     | live              |
| gtnh items, gtceu materials/machines/items | gtwiki.miraheze.org                         | —       | planned (M1 full) |

Quality report: `data/gtnh/machines-quality.md`. Scope decisions: `docs/DECISIONS.md`.

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # vitest (comparison engine, APIs, anti-spoiler)
pnpm lint         # eslint
pnpm build        # next build
pnpm build:cf     # OpenNext worker build (works on Windows via hoisted linker)
pnpm preview:cf   # run the worker locally (wrangler dev)
```

Copy `.env.example` → `.env.local` and fill the Supabase values for DB-backed dailies
(without them, the game falls back to deterministic same-for-everyone answers).

### Data pipeline (refresh dataset)

```bash
pnpm tsx pipeline/scrape-gtnh-machines.ts     # polite crawl (cached, ~2s/req)
pnpm tsx pipeline/normalize-gtnh-machines.ts  # -> data/gtnh/machines.json
pnpm tsx pipeline/report-gtnh-machines.ts     # -> data/gtnh/machines-quality.md
pnpm tsx --env-file=.env.local pipeline/seed-supabase.ts  # upsert entries + regen dailies
```

### Database

Migrations live in `supabase/migrations`; apply with `npx supabase db push --remote --yes`.
RLS keeps `daily_answers` secret; results submit through the server-validated
`submit_daily_result` RPC only.

## Docs

- `docs/GREGDLE_PRD.md` — product requirements & milestones
- `docs/DECISIONS.md` — every assumption/deviation (start here for "why is X like this")
- `docs/ATTRIBUTION.md` — data/image sources and licenses
