# Gregdle — Reddit launch post (v3, updated 2026-11-04)

Screenshots (current UI): `marketing/reddit-play.png` (game board — POST IMAGE),
`marketing/reddit-home.png` (home + top-10 leaderboard).

Site: https://gregdle.carletti.work
Repo: https://github.com/absxl/Gregdle (must be public before posting)

## Title options

1. I made a daily guessing game for GregTech — guess the machine from its attributes (like Loldle, but multiblocks)
2. Gregdle — Wordle for GTNH. 209 machines, daily puzzles, streaks with actual Minecraft fire
3. After too many hours in GTNH I built a Loldle for it — free, no ads, community wallpapers

## Post body (r/feedthebeast)

Hi r/feedthebeast — long-time GTNH player here. I kept seeing Loldle/Wordle clones for every
game except the one that actually deserved one, so I built **Gregdle**: a daily GregTech
machine guessing game.

**How a round works:** every day at 00:00 UTC one machine is hidden. Type a guess and the grid
tells you how close you are:

- **Tier** — green if right, ▲▼ if the answer is higher/lower in the tech tree
- **Structure / Size** — single block or multiblock, bigger or smaller
- **Function** — 12 buckets (power gen, ore processing, smelting/alloying, fluid/chem…)
- **Energy & extras** — hatches, overclocks and friends

The search helps without spoiling: every suggestion shows its tier, structure, size and
function, so you can play from knowledge instead of alt-tabbing to the wiki.

**What's in it:**

- Daily in **Easy** and **Hard**, endless mode for practice, hints at 4 and 8 wrong guesses
  (the second one literally shows you the machine's texture)
- Sign in with **Discord** → daily leaderboard, public profiles with Minecraft-fire streak
  animations, win distributions and full guess history
- **Community wallpapers**: anyone signed in can submit a background (auto-compressed, cropped
  to 16:9) — the site rotates the approved ones every 30 seconds with the artist credited and
  linked
- Share your run as an emoji grid or a rendered PNG — spoiler-free either way
- Free, **no ads**, no pop-ups, mobile-friendly, works on a potato

All 209 machines and attributes were scraped from the GTNH wiki (2.9 snapshot) — every result
links back to the machine's wiki page, so losing also teaches you something. The whole thing
is open source (MIT), scraper and dataset included: https://github.com/absxl/Gregdle

GTCEu datasets are next — the data pipeline is already built.

Difficulty feedback very welcome — Easy is tuned for people who just reached LV, Hard is
honestly hard. If you win, post your grid.

## Shorter variant (r/GTNH or Discord)

Made a Loldle-style daily for GTNH: **Gregdle** — one hidden machine per day, guess from
tier/structure/size/function with ▲▼ hints, Easy & Hard dailies, endless mode, Discord login
with leaderboard + profiles, Minecraft-fire streaks, community wallpapers with approval,
spoiler-free sharing. Free, no ads, open source (MIT). 209 machines scraped from the wiki,
every result links back to its wiki page. https://gregdle.carletti.work

## Posting checklist

1. Repo PUBLIC first (the post links it), old `m0-setup` branch deleted
2. Image post with `reddit-play.png`, link in body AND first comment
3. r/feedthebeast first (flair: Showcase), then r/GTNH + GTNH Discord hours later
4. Stick around for comments the first 2 hours — reply to every question
5. If someone posts a win grid in the comments, upvote and reply with yours
