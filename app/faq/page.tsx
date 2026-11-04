import Link from "next/link";

export const metadata = {
  title: "FAQ — Gregdle",
  description:
    "How Gregdle works: hints, difficulty modes and how every machine attribute (tier, structure, size, function, energy, extras) is compared.",
};

const COLUMNS: { name: string; how: string; values: string }[] = [
  {
    name: "TIER",
    how: "The voltage tier where the machine is used. Ordered — the arrows point from your guess toward the answer.",
    values:
      "Stone → Steam → ULV → LV → MV → HV → EV → IV → LuV → ZPM → UV → UHV → UEV → UIV → UXV → UMV → MAX",
  },
  {
    name: "STRUCTURE",
    how: "Whether the machine is a single block or a multiblock you have to build. Derived from its dimensions: anything larger than 1×1×1 is a multiblock.",
    values: "1x1x1 (single) · MULTI",
  },
  {
    name: "SIZE",
    how: "The multiblock dimensions in blocks, compared by total volume (L × W × H). The arrow tells you if the answer is bigger or smaller overall — a 4×4×4 (64) beats a 3×6×3 (54) even though the 3×6×3 is wider and longer.",
    values: "LxWxH · compared by volume · ▲ answer is bigger / ▼ smaller",
  },
  {
    name: "FUNCTION",
    how: "What the machine actually does, grouped into 12 generic categories from the wiki's Machine Type. Hover a cell to see the specific machine type it came from.",
    values:
      "POWER GEN · POWER INFRA · ORE PROC · SOLID PROC · FLUID/CHEM · SMELT/ALLOY · ASSEMBLY · PARTS · EXTRACTION · FARMING · STORAGE · UTILITY",
  },
  {
    name: "ENERGY",
    how: "What kind of energy hatch the machine takes, straight from the wiki infobox (Regular, Any, Dynamo, …). Steam-age machines show N/A — they need no electricity.",
    values: "Regular · Any · Dynamo · N/A",
  },
  {
    name: "EXTRAS",
    how: "Everything else the infobox mentions: overclock behaviour, cleanroom requirements, mufflers, special mechanics. Amber means you and the answer share at least one extra.",
    values: "overclocks · cleanroom · special mechanics — compared as an overlap set",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I play?",
    a: "Every day at 00:00 UTC one machine is hidden. Type any machine from the 209 in the pool and submit — the grid compares your guess with the answer attribute by attribute. Green = exact match, amber = partial overlap, arrows = the answer is higher/lower (or bigger/smaller). Win by guessing the exact machine in as few tries as you can.",
  },
  {
    q: "What's the difference between Easy and Hard?",
    a: "Easy uses a friendlier pool of everyday machines, gives you a search box with suggestions, and unlocks hints after 4 and 8 wrong guesses (the first hint shows the machine's texture). Hard draws from all machines, hides hints entirely, and has no suggestion list — type a name and it's auto-corrected to the closest match if you're close enough.",
  },
  {
    q: "How are the machine categories decided?",
    a: "Every machine's attributes come from its GTNH wiki page. The Function column groups the wiki's hyper-specific Machine Type into 12 buckets (for example both Gas Turbines and Nuclear Reactors are POWER GEN; Macerators and Ore Washers are ORE PROC). Hovering a cell always shows the raw wiki type.",
  },
  {
    q: "Does my run count if I'm not signed in?",
    a: "Your guesses and streaks are always saved on your device. Sign in with Discord to additionally appear on the leaderboard, keep a public profile, and sync results across devices — your guest progress migrates automatically on your first sign-in.",
  },
  {
    q: "What do the global stats count?",
    a: "The leaderboard page shows anonymized, aggregated stats for every finished daily — guests included. We count games played, win rate, how many gave up, how many used hints, and the average number of guesses. No personal data is attached to any of it.",
  },
  {
    q: "Is it free? Any ads?",
    a: "Free, no account required, no pop-ups. If you want to support hosting costs there's a Ko-fi link in the footer.",
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 pb-12">
      <header className="mt-2 flex w-full items-baseline justify-between">
        <h1 className="font-pixel text-5xl leading-none tracking-wide">FAQ</h1>
        <Link href="/" className="btn">
          Home
        </Link>
      </header>

      <section className="panel corners p-5">
        <p className="label label-accent mb-3">THE GUESS GRID // COLUMN BY COLUMN</p>
        <div className="flex flex-col gap-4">
          {COLUMNS.map((c) => (
            <div key={c.name}>
              <h2 className="font-mono text-sm font-black tracking-wide">{c.name}</h2>
              <p className="text-sm leading-relaxed">{c.how}</p>
              <p className="mt-1 font-mono text-xs text-muted">{c.values}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5">
        <p className="label label-accent mb-3">COMMON QUESTIONS</p>
        <div className="flex flex-col gap-4">
          {FAQS.map((f) => (
            <div key={f.q}>
              <h2 className="text-sm font-black">{f.q}</h2>
              <p className="text-sm leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
