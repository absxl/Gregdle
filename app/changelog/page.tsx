import type { Metadata } from "next";
import Link from "next/link";
import { RELEASES } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "Changelog — Gregdle",
  description: "Every Gregdle release, from v0.0 to the current version.",
};

export default function ChangelogPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-12">
      <header className="mt-2 flex w-full flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-pixel text-5xl leading-none tracking-wide">CHANGELOG</h1>
          <p className="label mt-1">EVERY RELEASE · NEWEST FIRST</p>
        </div>
        <Link href="/" className="btn">
          Home
        </Link>
      </header>

      {RELEASES.map((r) => (
        <section
          key={r.version}
          aria-label={`Version ${r.version} ${r.codename}`}
          className={`panel ${r.current ? "corners border-accent/60" : ""} p-5`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-mono text-lg font-black tracking-wide">
              v{r.version} <span className="text-accent">{r.codename}</span>
            </h2>
            {r.current && (
              <span className="rounded-[2px] border border-accent/60 px-2 py-px font-mono text-[10px] font-bold text-accent">
                CURRENT
              </span>
            )}
          </div>
          <p className="label mt-1">
            {r.language.toUpperCase()} · {r.date}
          </p>
          <ul className="mt-3 flex flex-col gap-1">
            {r.changes.map((c) => (
              <li key={c} className="flex gap-2 text-sm leading-relaxed">
                <span className="text-accent" aria-hidden="true">
                  ▸
                </span>
                {c}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
