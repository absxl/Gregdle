import type { Metadata } from "next";
import Link from "next/link";
import { getMachines } from "@/lib/game/dataset";
import { FUNCTION_CATEGORY_LABELS } from "@/pipeline/function-categories";
import { httpsUrl } from "@/lib/urls";
import type { MachineEntry } from "@/pipeline/schema";

/**
 * Machine catalog (D44): every machine in the pool with all attributes,
 * straight from the dataset. Also the SEO-friendly content page.
 */

export const metadata: Metadata = {
  title: "All machines — Gregdle",
  description:
    "All 209 GTNH machines in the Gregdle pool with tier, structure, size, function, energy and extras.",
};

export const dynamic = "force-dynamic";

export default function MachinesPage() {
  const machines = [...getMachines()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 pb-12">
      <header className="mt-2 flex w-full flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-pixel text-5xl leading-none tracking-wide">MACHINE CATALOG</h1>
          <p className="label mt-1">
            {machines.length} MACHINES · SOURCE: GTNH WIKI (
            {machines.length > 0 ? machines[0].dataset.replace(":", " · ") : ""})
          </p>
        </div>
        <Link href="/" className="btn">
          Home
        </Link>
      </header>

      <div className="panel w-full p-2">
        <div className="grid-outer w-full">
          <div
            className="grid-grid"
            style={{
              gridTemplateColumns: "13rem repeat(6, minmax(6rem, 1fr))",
            }}
            role="table"
            aria-label="Machine catalog"
          >
            <div className="grid-head grid-head-name">MACHINE</div>
            <div className="grid-head">TIER</div>
            <div className="grid-head">STRUCTURE</div>
            <div className="grid-head">SIZE</div>
            <div className="grid-head">FUNCTION</div>
            <div className="grid-head">ENERGY</div>
            <div className="grid-head">EXTRAS</div>
            {machines.map((m) => (
              <CatalogRow key={m.id} machine={m} />
            ))}
          </div>
        </div>
        <p className="mt-1 px-2 text-right text-[11px] text-muted sm:hidden">← swipe for more →</p>
      </div>
    </main>
  );
}

function CatalogRow({ machine: m }: { machine: MachineEntry }) {
  const a = m.attributes;
  return (
    <>
      <div className="grid-name">
        {m.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={httpsUrl(m.image)}
            alt=""
            className="h-8 w-8 shrink-0 rounded border border-edge bg-black/30 object-contain p-0.5"
            loading="lazy"
          />
        )}
        <a
          href={m.source_url}
          target="_blank"
          rel="noreferrer"
          className="truncate text-sm font-bold hover:text-accent"
          title={`${m.name} — wiki page`}
        >
          {m.name}
        </a>
      </div>
      <div className="flex items-center justify-center self-center font-mono text-xs font-bold text-accent">
        {a.tier}
      </div>
      <div className="flex items-center justify-center font-mono text-xs font-bold self-center">
        {a.structure === "single" ? "1x1x1" : "MULTI"}
      </div>
      <div className="flex items-center justify-center font-mono text-xs font-bold self-center">
        {formatSize(a.size)}
      </div>
      <div
        className="flex items-center justify-center self-center text-center font-mono text-xs font-bold"
        title={a.functionTypeRaw}
      >
        {FUNCTION_CATEGORY_LABELS[a.functionCategory]}
      </div>
      <div className="flex items-center justify-center self-center font-mono text-xs text-muted">
        {a.energyHatches ?? "N/A"}
      </div>
      <div
        className="flex items-center justify-center self-center truncate font-mono text-xs text-muted"
        title={a.extras.join(", ") || undefined}
      >
        {a.extras.length > 0 ? a.extras.join(", ") : "—"}
      </div>
    </>
  );
}

function formatSize(size: { l: number; w: number; h: number }): string {
  return `${size.l}x${size.w}x${size.h}`;
}
