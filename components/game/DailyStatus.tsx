"use client";

import { useEffect, useState } from "react";
import type { DatasetKey } from "@/lib/datasets";
import { loadDaily, utcDateToday } from "@/lib/game/local-state";

/** Chip showing today's daily state for a dataset+difficulty (resumable §6.2). */
export function DailyStatus({
  datasetKey,
  difficulty,
}: {
  datasetKey: DatasetKey;
  difficulty: "easy" | "hard";
}) {
  const [state, setState] = useState<"unknown" | "new" | "playing" | "won" | "gave_up">("unknown");

  useEffect(() => {
    const read = () => {
      const g = loadDaily(datasetKey, difficulty, utcDateToday());
      if (!g || g.status === "playing") return setState(g ? "playing" : "new");
      setState(g.status);
    };
    read();
    const onFocus = () => read();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [datasetKey, difficulty]);

  if (state === "unknown") return null;

  const map = {
    new: { text: "New", cls: "border-accent/50 text-accent" },
    playing: { text: "In progress", cls: "border-accent text-accent" },
    won: { text: "Solved ✓", cls: "border-good/60 text-good" },
    gave_up: { text: "Revealed", cls: "border-bad/60 text-bad" },
    unknown: { text: "", cls: "" },
  } as const;

  return <span className={`chip shrink-0 ${map[state].cls}`}>{map[state].text}</span>;
}
