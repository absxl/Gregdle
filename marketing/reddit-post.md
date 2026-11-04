# Gregdle — Reddit launch post (v2, remade 2026-11-04)

Screenshots (retaken with the current UI):

- `marketing/reddit-play.png` — the game board mid-guess (ATTACH AS THE POST IMAGE)
- `marketing/reddit-home.png` — home with the top-10 leaderboard + streak fire

Site: https://gregdle.stranger3012.workers.dev (custom domain gregdle.carletti.work coming)
Repo: https://github.com/absxl/Gregdle (must be public before posting)

## Title options

1. I made a daily guessing game for GregTech — guess the machine from its attributes (like Loldle, but multiblocks)
2. Gregdle — Wordle for GTNH. 209 machines, daily puzzles, streaks with actual Minecraft fire
3. After too many hours in GTNH I built a Loldle for it — free, no ads, open source

## Post body (r/feedthebeast)

Hi r/feedthebeast — long-time GTNH player here. I kept seeing Loldle/Wordle clones for every game
except the one that actually deserved one, so I built **Gregdle**: a daily GregTech machine
guessing game.

**How a round works:** every day at 00:00 UTC one machine is hidden. Type a guess and the grid
tells you how close you are:

- **Tier** — green if right, ▲▼ if the answer is higher/lower in the tech tree
- **Structure / Size** — single block or multiblock, bigger or smaller
- **Function** — 12 buckets (power gen, ore processing, smelting/alloying, fluid/chem…)
- **Energy & extras** — hatches, overclocks and friends

The search helps without spoiling: as you type, every suggestion shows its tier, structure,
size and function (Minedle-style), so you can play from knowledge instead of alt-tabbing to
the wiki.

**What's in it:**

- Daily in **Easy** (everyday machines) and **Hard** (all 209 from the GTNH wiki)
- **Endless mode** for practice
- Hints at 4 and 8 wrong guesses — the second one literally shows you the machine's texture
- Sign in with **Discord** → daily leaderboard (top 10 on the home page), public profiles,
  streaks with a Minecraft fire animation, win distributions
- Share your run as an **emoji grid or a rendered PNG** — spoiler-free either way
- Guess rows show the machine's actual texture from the wiki; tap to enlarge

**The boring-but-nice part:** it's free, there are **no ads**, no pop-ups, no install — it's a
Next.js app on Cloudflare with a Supabase backend, and the whole thing is open source (MIT),
including the scraper and the 209-machine dataset with per-entry links back to the wiki pages:
https://github.com/absxl/Gregdle

All 209 machines and their attributes were scraped from the GTNH wiki (GTNH 2.9 snapshot) —
every result links back to the wiki page of the machine, so losing also teaches you something.

GTCEu datasets are next (the pipeline is already built, it's mostly wiki-formatting work).

Difficulty feedback very welcome — Easy is tuned for people who just reached LV, Hard is
honestly hard. If you win, post your grid.

## Shorter variant (for r/GTNH or Discord)

Made a Loldle-style daily for GTNH: **Gregdle** — one hidden machine per day, guess from
tier/structure/size/function with ▲▼ hints, Easy & Hard dailies, endless mode, Discord login
with leaderboard + profiles, Minecraft-fire streaks, spoiler-free sharing. Free, no ads, open
source (MIT). 209 machines scraped from the wiki, every result links back to its wiki page.
https://gregdle.stranger3012.workers.dev

## Posting checklist

1. Repo PUBLIC first (the post links it), old `m0-setup` branch deleted
2. Image post with `reddit-play.png`, link in body AND first comment
3. r/feedthebeast first (flair: Showcase), then r/GTNH + GTNH Discord hours later
4. Stick around for comments the first 2 hours — reply to every question
5. If someone posts a win grid in the comments, upvote and reply with yours
