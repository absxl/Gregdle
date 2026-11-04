import Link from "next/link";

export const metadata = {
  title: "About & Credits — Gregdle",
  description: "What Gregdle is, where the data comes from, and who to thank.",
};

async function backgroundArtists(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const qs = new URLSearchParams({
      select: "author_name",
      status: "eq.approved",
      order: "author_name.asc",
    });
    const res = await fetch(`${url}/rest/v1/background_submissions?${qs}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as { author_name: string }[];
    return [...new Set(rows.map((r) => r.author_name))];
  } catch {
    return [];
  }
}

export default async function AboutPage() {
  const artists = await backgroundArtists();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 pb-12">
      <header className="mt-2 flex w-full items-baseline justify-between">
        <h1 className="font-pixel text-5xl leading-none tracking-wide">ABOUT</h1>
        <Link href="/" className="btn">
          Home
        </Link>
      </header>

      <section className="panel p-5 text-sm leading-relaxed">
        <p className="label label-accent mb-2">SECTION // 01</p>
        <h2 className="mb-2 text-base font-black">What is this?</h2>
        <p>
          Gregdle is a Loldle-style daily guessing game for GregTech players. Each day one machine
          is hidden: type guesses, and the grid tells you how each attribute compares — voltage
          tier, structure, size, function and more. Green = correct, amber = partial overlap, arrows
          = the answer is higher/lower. A new daily unlocks at 00:00 UTC; endless mode picks a
          random machine anytime.
        </p>
      </section>

      {artists.length > 0 && (
        <section className="panel p-5 text-sm leading-relaxed">
          <p className="label label-accent mb-2">SECTION // 03</p>
          <h2 className="mb-2 text-base font-black">Background artists</h2>
          <p>
            The rotating site backgrounds come from the community and the GTNH homepage showcase —
            thanks to{" "}
            {artists.map((a, i) => (
              <span key={a}>
                {i > 0 && ", "}
                <span className="font-bold">{a}</span>
              </span>
            ))}
            . Submit yours with the backgrounds button (top left).
          </p>
        </section>
      )}

      <section className="panel p-5 text-sm leading-relaxed">
        <p className="label label-accent mb-2">SECTION // 04</p>
        <h2 className="mb-2 text-base font-black">Contact</h2>
        <p className="flex flex-wrap gap-x-6 gap-y-2">
          <span>
            Discord: <span className="font-bold text-foreground">@amidnightgospel</span>
          </span>
          <span>
            GitHub:{" "}
            <a
              href="https://github.com/absxl"
              className="font-semibold text-accent hover:underline"
              rel="noreferrer"
              target="_blank"
            >
              absxl
            </a>
          </span>
          <span>
            Email:{" "}
            <a
              href="mailto:marcello@carletti.work"
              className="font-semibold text-accent hover:underline"
            >
              marcello@carletti.work
            </a>
          </span>
        </p>
      </section>

      <section className="panel p-5 text-sm leading-relaxed">
        <p className="label label-accent mb-2">SECTION // 02</p>
        <h2 className="mb-2 text-base font-black">Open source</h2>
        <p>
          Gregdle is open source — created and owned by{" "}
          <a
            href="https://github.com/absxl"
            className="font-semibold text-accent hover:underline"
            rel="noreferrer"
            target="_blank"
          >
            absxl
          </a>
          . The full code, data pipeline and datasets live on{" "}
          <a
            href="https://github.com/absxl/Gregdle"
            className="font-semibold text-accent hover:underline"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          : found a wrong attribute on a machine? A bug? An idea for a new mode? Open an issue or
          send a pull request — contributions welcome.
        </p>
      </section>

      <section className="panel p-5 text-sm leading-relaxed">
        <h2 className="mb-2 text-base font-black text-accent">Data &amp; credits</h2>
        <p className="mb-2">
          Machine data comes from the{" "}
          <a
            href="https://wiki.gtnewhorizons.com"
            className="font-semibold text-accent hover:underline"
            rel="noreferrer"
            target="_blank"
          >
            GT New Horizons Wiki
          </a>{" "}
          (snapshot of the GTNH 2.9 render, November 2026). Every entry links back to its wiki page
          from the daily results. Textures are hot-linked from the wiki and belong to the GTNH
          project and their authors.
        </p>
        <p className="mb-2">
          Gregdle is a fan project and is not affiliated with GT New Horizons, GregTech CEu, or any
          mod author. Game concept inspired by Loldle and Wordle.
        </p>
        <p>
          Typeface: <span className="font-semibold">VT323</span> (SIL OFL 1.1). Full attribution
          details live in the repository&apos;s <code>docs/ATTRIBUTION.md</code>.
        </p>
      </section>
    </main>
  );
}
