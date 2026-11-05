import { notFound } from "next/navigation";
import { GameBoard } from "@/components/game/GameBoard";
import { getMachines } from "@/lib/game/dataset";
import { machineColumns } from "@/lib/game/compare";
import { FUNCTION_CATEGORY_LABELS } from "@/pipeline/function-categories";
import { DATASET_KEYS, parseDatasetKey } from "@/lib/datasets";

/**
 * Play route: /play/gtnh-machines/easy?mode=daily|endless
 * The server passes ONLY (id, name, aliases) per entry to the client —
 * attributes travel exclusively through the guess API (anti-spoiler §7.3).
 */

export default async function PlayPage(props: {
  params: Promise<{ dataset: string; difficulty: string }>;
  searchParams: Promise<{ mode?: string; seed?: string }>;
}) {
  const { dataset, difficulty } = await props.params;
  const { mode, seed } = await props.searchParams;

  const datasetKey = parseDatasetKey(dataset.replace("-", ":").replace("machines", "machines"));
  if (!datasetKey || !DATASET_KEYS.includes(datasetKey)) notFound();

  // Puzzle routes: /play/gtnh-machines/puzzle-single|puzzle-multi (D45).
  const isPuzzle = difficulty === "puzzle-single" || difficulty === "puzzle-multi";
  if (!isPuzzle && difficulty !== "easy" && difficulty !== "hard") notFound();

  const gameMode = isPuzzle ? "puzzle" : mode === "endless" ? "endless" : "daily";

  // Autocomplete pool (D20). Attributes are public wiki knowledge shown per
  // suggestion Minedle-style — nothing here identifies the hidden answer;
  // the answer itself is only ever resolved server-side.
  const pool = getMachines().map((e) => ({
    id: e.id,
    name: e.name,
    aliases: e.aliases,
    image: e.image ? (e.image.startsWith("//") ? `https:${e.image}` : e.image) : null,
    info: {
      tier: e.attributes.tier,
      structure: e.attributes.structure === "single" ? "1x1x1" : "Multi",
      size: `${e.attributes.size.l}x${e.attributes.size.w}x${e.attributes.size.h}`,
      func: FUNCTION_CATEGORY_LABELS[e.attributes.functionCategory],
    },
  }));

  return (
    <GameBoard
      datasetKey={datasetKey}
      puzzleKind={isPuzzle ? (difficulty === "puzzle-single" ? "single" : "multi") : undefined}
      difficulty={difficulty}
      mode={gameMode}
      initialSeed={gameMode === "endless" ? (seed ?? null) : null}
      pool={pool}
      columns={machineColumns.map((c) => c.label)}
    />
  );
}
