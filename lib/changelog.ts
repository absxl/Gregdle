/**
 * Release history (D44). Old versions are codenamed "one" in a different
 * language (v0.0–v0.7); the current release is v1.0 "Uno". Newest first.
 */

export interface Release {
  version: string;
  codename: string;
  language: string;
  date: string;
  current?: boolean;
  changes: string[];
}

export const CURRENT_VERSION = "1.0";

export const RELEASES: Release[] = [
  {
    version: "1.0",
    codename: "Uno",
    language: "Spanish",
    date: "2026-11-04",
    current: true,
    changes: [
      "GT Terminal theme — gunmetal HUD, corner brackets, scanline + grid texture, mono data voice",
      "Community wallpapers: submit with title, owner approval, 30 s random carousel with artist credits",
      "Public profiles with Discord avatars, bios, social links and wallpaper galleries",
      "Global daily stats — every player counts, guests included (win rate, give-ups, hints, averages)",
      "Ko-fi support button in the footer",
    ],
  },
  {
    version: "0.7",
    codename: "Egy",
    language: "Hungarian",
    date: "2026-11-04",
    changes: [
      "Machine catalog page — all 209 machines with every attribute and wiki links",
      "FAQ page explaining every grid column and how machines are categorized",
      "Give-up and same-guess counters, home and in-game",
      "De-vibe polish pass: SVG icons, unified wording, no more popups",
    ],
  },
  {
    version: "0.6",
    codename: "Jeden",
    language: "Polish",
    date: "2026-11-04",
    changes: [
      "Category audit: 21 machines re-classified against their wiki pages",
      "Explicit curated mapping for machine functions (no more regex guesswork)",
      "Share PNG made spoiler-safe: guess numbers and icons only",
      "Leaderboard win rate now blank when nobody has solved the daily",
    ],
  },
  {
    version: "0.5",
    codename: "Un",
    language: "French",
    date: "2026-11-04",
    changes: [
      "Guess-to-wiki linking in the result popup",
      "Customizable profile label and admin flair",
      "Profile edit RPC disambiguated (profile saving works again)",
      "Win rate display, global stats backfill from real results",
    ],
  },
  {
    version: "0.4",
    codename: "Un",
    language: "French",
    date: "2026-11-04",
    changes: [
      "Discord sign-in, avatars and immutable operator names",
      "Leaderboard with ranks, medals and profile pages",
      "Guest progress migration on first sign-in",
      "Anti-cheat: server-validated result submission",
    ],
  },
  {
    version: "0.3",
    codename: "Ένα",
    language: "Greek",
    date: "2026-11-03",
    changes: [
      "Hard mode: no hints, no suggestions — vague auto-correction only",
      "Name-only partial suggestions survive in Hard after all (your call)",
      "21 machines verified against wiki text and re-classified",
      "Share PNG redesign",
    ],
  },
  {
    version: "0.2",
    codename: "Unus",
    language: "Latin",
    date: "2026-11-03",
    changes: [
      "Daily and endless modes with 00:00 UTC reset",
      "Guess API built so the answer never leaves the server",
      "Hints at 4 and 8 wrong guesses",
      "Spoiler-free emoji sharing",
    ],
  },
  {
    version: "0.1",
    codename: "One",
    language: "English",
    date: "2026-11-03",
    changes: [
      "The comparison grid: tier, structure, size, function, energy, extras",
      "Autocomplete search with fuzzy matching",
      "Guest progress saved locally",
      "First playable loop, zero accounts",
    ],
  },
  {
    version: "0.0",
    codename: "One",
    language: "English",
    date: "2026-11-03",
    changes: [
      "GTNH wiki scraped: 209 machines, every attribute",
      "Pipeline built: scrape → normalize → validate → seed",
      "Next.js on Cloudflare Workers, Supabase provisioned",
      "This changelog is born. It all starts with one.",
    ],
  },
];
