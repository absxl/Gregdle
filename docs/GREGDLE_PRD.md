# Gregdle — Product Requirements & Execution Plan

> Orchestrator input. Read fully before starting. Work milestone by milestone; do not start a milestone until the previous one's acceptance criteria pass.

## 1. Vision

Gregdle is a Loldle/Minedle-style daily guessing game themed on **GregTech** (the Minecraft mod). Players guess an entry (material, machine or item); after each guess they see a grid comparing the guess's attributes with the hidden answer (correct / partial / wrong, plus higher/lower arrows for ordered attributes). Goal: guess the answer in as few tries as possible.

Audience: GregTech / GTNH players, from newcomers to veterans. Language: **English only**. Name: **Gregdle**.

## 2. Scope decisions (locked)

| Topic | Decision |
|---|---|
| Ecosystems | Two datasets the player can switch between: **GTNH** (GregTech New Horizons) and **GTCEu** (modern GregTech CEu) |
| Categories | **Materials**, **Machines**, **Items**, each its own game mode |
| Game mode in v1 | **Classic attribute grid only** (recipe, pixel-zoom, tooltip modes are out of scope, see §11) |
| Dailies | **6 independent dailies**: each (version x category) pair has its own daily answer, chosen by the player in a menu |
| Endless | Endless/practice mode for every (version x category) pair |
| Difficulty | **Tiered difficulty modes** (Easy / Hard) with different answer pools. Guessing is always allowed against the full dataset |
| Hints | Extra hint unlocked after N wrong guesses (see §6.5) |
| Images | Item/material/machine textures sourced from the wikis, with attribution |
| Accounts | Email + OAuth login, streaks + stats, leaderboard, guest play with migration |
| Stack | Next.js + Supabase, deployed on free tiers (Vercel + Supabase) |
| Style | GregTech GUI look (grey machine panel, pixel font, hazard stripes, circuit accents) |
| Data source | **Scraping the wikis** (no game dump) |

## 3. Architecture overview

- **Frontend/app**: Next.js (App Router, TypeScript), Tailwind. Deployed on Vercel.
- **Backend**: Supabase (Postgres, Auth, Row Level Security). Server logic via Next.js route handlers / server actions and Supabase edge functions where needed.
- **Data pipeline (offline, run by developer)**: scripts in `/pipeline` that scrape wikis, normalize into a canonical schema, validate, and output JSON + SQL seed. Results are committed/seeded, not scraped at runtime.
- **Daily answer selection**: deterministic and **server-side**. The client must never receive the answer for a daily before the game ends (see §7.3).
- **Guest play**: state in localStorage; on signup/login, merge into the account.

Suggested repo layout:

```
/app            Next.js routes and UI
/components     UI components (GUI-styled)
/lib            game logic (compare, daily selection), supabase clients
/pipeline       scrapers, normalizers, validators
/data           generated JSON per dataset (gtnh|gtceu)/(materials|machines|items)
/supabase       migrations, seed, RLS policies
/docs           this file, data schema, attribution
```

## 4. Datasets

Six datasets: `{gtnh, gtceu} x {materials, machines, items}`.

### 4.1 Common entry fields

- `id` (stable slug), `name`, `dataset`, `image` (path/URL), `source_url` (wiki page), `difficulty` (`easy | hard`), `aliases[]` (for search, e.g. abbreviations).

### 4.2 Materials attributes

| Attribute | Type | Comparison |
|---|---|---|
| Formula / elements | set of element symbols (+ formula string) | exact match = correct; overlap of elements = partial |
| Tier | ordered enum (first voltage tier/stage where it becomes available) | correct / higher / lower |
| Color | color family enum | correct / wrong |
| Material type | enum (element, alloy, gem, polymer, ...) | correct / wrong |
| Forms | set (ingot, dust, plate, fluid, gas, ...) | exact / partial overlap / none |
| Obtained via | set of enums (mining, mechanical process, chemistry, farming, drops, ...) | exact / partial / none |
| Usage | set of enums (fuel, component/crafting, food, tool material, ...) | exact / partial / none |

### 4.3 Machines attributes

| Attribute | Type | Comparison |
|---|---|---|
| Voltage tier | ordered enum (LV, MV, HV, EV, IV, LuV, ZPM, UV, ...) | correct / higher / lower |
| Structure | enum single block / multiblock | correct / wrong |
| Size | dimensions (for multiblocks; single = 1x1x1) | correct / bigger / smaller (by volume) |
| Function category | enum (smelting, chemistry, power generation, processing, storage, ...) | correct / wrong |
| Inputs | set (items, fluids, energy, ...) | exact / partial / none |
| Required extras | set (coils, cleanroom, muffler, maintenance, ...) | exact / partial / none (empty = "none") |

### 4.4 Items attributes

| Attribute | Type | Comparison |
|---|---|---|
| Tier | ordered enum | correct / higher / lower |
| Category | enum (circuit, component, tool, armor, cover, ...) | correct / wrong |
| Crafting method | enum (crafting table, assembler, forming press, ...) + ingredient count | method: correct / wrong; count: correct / higher / lower |
| Main material | material reference or enum | correct / wrong |
| Usage | set (what it's used for) | exact / partial / none |
| Stackable | boolean + stack size | correct / higher / lower |
| Durability / charge | numeric or "n/a" | correct / higher / lower |

> The attribute lists above are the **starting set**. M1 includes a review step: drop or merge any attribute whose values cannot be scraped reliably.

### 4.5 Difficulty tagging

- Each entry gets `difficulty`: `easy` = commonly encountered/early-mid progression; `hard` = everything else.
- Heuristic for initial tagging (to be reviewed manually): wiki page length / number of inbound links / progression tier. The orchestrator produces the first pass; the human (Marcello) reviews a diff list.
- Easy mode daily answer is drawn from `easy` only; Hard mode from the full set.

## 5. Data pipeline requirements (wiki scraping)

- **P1**: Scrapers per source (GTNH wiki, GTCEu wiki). Respect `robots.txt`, rate limit requests, identify with a user agent, cache raw HTML locally so re-runs don't re-hit the sites.
- **P2**: Output raw -> normalized -> validated JSON. Validation with a schema (Zod or JSON Schema): required fields present, enums valid, no duplicate ids.
- **P3**: A quality report per dataset: entry count, missing-attribute counts, entries flagged for manual review.
- **P4**: Manual-override file (`/pipeline/overrides/*.json`) that patches values after normalization, so human fixes survive re-scrapes.
- **P5**: Image fetching with attribution record (source URL + license note) stored per entry. **Verify each wiki's content/asset license before publishing**; if unclear, ship text-only placeholder icons for that dataset and flag it in `/docs/ATTRIBUTION.md`.
- **P6**: Minimum dataset size to be considered playable: >= 80 entries per dataset (target 150+).

## 6. Game rules (Classic mode)

### 6.1 Core loop
1. Player selects version + category + (daily | endless) + difficulty.
2. Types in a search box with autocomplete (matches name + aliases, fuzzy, keyboard navigable).
3. Submits a guess; a new row appears: entry icon/name + one cell per attribute.
4. Cell states: **correct** (green), **partial** (yellow, for sets with overlap), **wrong** (red); ordered/numeric attributes show **higher/lower arrows**.
5. Win when the guess equals the answer. No hard guess cap (stats track the count). Entries already guessed are excluded from autocomplete.

### 6.2 Daily
- 6 independent dailies (version x category), each with Easy and Hard variants -> **12 daily answers per day**.
- Daily resets at **00:00 UTC** (show countdown).
- One daily attempt per user per (version, category, difficulty, date); progress is persisted and resumable.

### 6.3 Endless
- Random answer per run, chosen server-side, any (version, category, difficulty). Not counted for streaks or the leaderboard; counted in separate "endless" stats.

### 6.4 Share
- Emoji-grid share text (copy to clipboard) without spoilers: the colored squares per row plus guess count, version/category and date.

### 6.5 Hints
- After **6 wrong guesses**: reveal one hint (e.g. first letter, or the wiki category). After **10**: reveal a second hint (e.g. the first element for materials / the voltage tier for machines). Hints are fetched from the server, so the answer stays hidden.
- Using hints is recorded; leaderboard marks hinted wins separately or ranks them lower (decide in M4 and document).

## 7. Backend requirements

### 7.1 Data model (Postgres, minimal)
- `entries` (dataset, id, name, aliases, image, difficulty, attributes JSONB, source_url)
- `daily_answers` (date, dataset, difficulty, entry_id) — generated ahead of time by a scheduled job; **RLS: not readable by clients**
- `profiles` (user_id, display_name, created_at)
- `game_results` (user_id, date, dataset, difficulty, mode `daily|endless`, guesses[], won, hints_used, finished_at)
- `streaks` / derived stats view or table per user per dataset
- `leaderboard` view or materialized view per (date, dataset, difficulty)

### 7.2 Auth
- Supabase Auth: email magic link + OAuth (Google and Discord).
- Guests play without account; on first login, merge local progress into `game_results` without duplicating dailies already played (account wins on conflict).

### 7.3 Anti-spoiler / anti-cheat
- The answer is never sent to the client during play. Each guess is sent to the server (`POST /api/guess`) which returns the comparison result (per-attribute states). On win/give-up the server reveals the answer.
- Guest dailies use the same endpoint (no auth required, rate limited by IP/fingerprint-light token).
- Rate limiting on guess endpoints. Leaderboard submissions only from server-validated game sessions.
- Daily answers are pre-generated with a seeded random selection avoiding repeats within a configurable window (e.g. 60 days).

### 7.4 Free-tier constraints
- Stay within Supabase and Vercel free limits: avoid unnecessary realtime subscriptions, cache dataset JSON statically (ISR/static assets) since it only changes on deploy, and keep per-guess queries cheap.

## 8. Frontend / UX requirements

- **Style**: GregTech GUI look — grey machine-panel frames, pixel/bitmap font, hazard-stripe and circuit-trace accents, slot-style icon frames. Original artwork in that style; do **not** copy copyrighted GUI texture files directly unless the license allows.
- Responsive (mobile-first), keyboard accessible, color-blind friendly (cell states must also have icon/pattern, not only color).
- Screens: home (version/category/difficulty picker + daily status), game, results modal with share, stats page, leaderboard, login, about/credits (attribution page is mandatory).
- Light animation on row reveal (cell flip), respecting `prefers-reduced-motion`.

## 9. Non-functional requirements

- TypeScript strict; ESLint + Prettier; unit tests for comparison logic and daily selection; e2e smoke test (Playwright) for a full guess-to-win flow.
- Lighthouse performance >= 90 on mobile for the game page.
- No answer leakage: automated test that network responses during play never contain the answer id before game end.
- Basic analytics optional, privacy-friendly only (no invasive tracking).

## 10. Milestones and acceptance criteria

### M0 — Project setup
Tasks: init Next.js + TS + Tailwind, Supabase project config, lint/test tooling, CI (lint + test), repo layout from §3, `/docs` folder with this PRD.
**Acceptance**: `npm run dev`, `npm test`, `npm run lint` pass in CI; deploys a placeholder page to Vercel preview.

### M1 — Data pipeline and datasets
Tasks: scrapers for GTNH and GTCEu wikis (P1), normalization + schema validation (P2), quality report (P3), overrides (P4), attribute review (§4.4 note), difficulty first pass (§4.5), image + attribution handling (P5).
**Acceptance**: six validated JSON datasets each meeting P6; quality report shows < 5% entries with missing required attributes; `ATTRIBUTION.md` generated; human review list of flagged entries delivered to Marcello.

### M2 — Core game engine (no accounts)
Tasks: comparison engine (all attribute types in §4), autocomplete, game UI with GUI style, guess API that hides the answer, endless mode, guest localStorage state, version/category/difficulty selector.
**Acceptance**: unit tests cover every comparison type (correct/partial/wrong/higher/lower, empty sets); an endless game is fully playable for all 6 datasets x 2 difficulties; leak test passes; mobile layout verified.

### M3 — Daily system
Tasks: `daily_answers` generation job (seeded, no repeats in window), 00:00 UTC reset and countdown, resumable daily progress, share text.
**Acceptance**: 12 dailies/day generated 30 days ahead; same answer for all players on a date; refreshing the page resumes progress; share output contains no spoilers.

### M4 — Accounts, stats, leaderboard
Tasks: Supabase Auth (magic link, Google, Discord), guest -> account migration, `game_results`, streaks and stats page, leaderboard (hint policy from §6.5), RLS policies.
**Acceptance**: RLS tests prove users can't read other users' unfinished games or `daily_answers`; migrating guest progress never duplicates or loses a daily; streak logic tested around UTC midnight and missed days.

### M5 — Hints and polish
Tasks: hint system, animations, accessibility pass (color-blind patterns, reduced motion), credits page, SEO/OG images, error/empty states.
**Acceptance**: Lighthouse >= 90 mobile; accessibility audit has no critical issues; hint endpoint never reveals more than specified.

### M6 — Launch readiness
Tasks: Playwright e2e, rate limiting verification, free-tier usage review, README with setup + data refresh instructions, domain/deploy to production.
**Acceptance**: e2e green in CI; production deploy live; checklist in `/docs/LAUNCH.md` completed.

## 11. Out of scope for v1 (future)

Recipe-guess mode, pixel/zoom icon mode, tooltip/quote mode, sound mode, progression ladder (higher/lower) mini game, additional language translations, friend challenges, ads/monetization.

## 12. Open questions for the human (do not block; use defaults)

1. **Wiki licenses** for text and images: verify before M1 image import (default: text-only fallback if unclear).
2. **Hint policy on leaderboard** (default: hinted wins ranked below unhinted).
3. **Final attribute lists** after M1 review (default: §4 lists, minus anything unreliable to scrape).
4. **GTNH/GTCEu content scope**: which GTNH version and GTCEu release to snapshot (default: latest stable of each at scrape time; record version in dataset metadata).

## 13. Instructions for the orchestrator

- Treat §2 as locked; propose changes instead of silently deviating.
- Each task must end with its acceptance criteria verified; report what passed.
- Keep a `/docs/DECISIONS.md` log of any assumption made.
- Prefer small, reviewable commits per task; one milestone per branch/PR.
