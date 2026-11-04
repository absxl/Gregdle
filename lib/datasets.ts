/**
 * Dataset metadata: the (version x category) pairs (PRD §4), as amended by
 * the M1 probe: the GTNH wiki has no material pages, so v1 ships five
 * datasets — gtnh:materials is inactive (docs/DECISIONS.md, D12).
 * Shared by the UI, the pipeline and (later) the API routes.
 */

export const VERSIONS = ["gtnh", "gtceu"] as const;
export const CATEGORIES = ["materials", "machines", "items"] as const;

export type Version = (typeof VERSIONS)[number];
export type Category = (typeof CATEGORIES)[number];
export type DatasetKey = `${Version}:${Category}`;

export const VERSION_LABELS: Record<Version, string> = {
  gtnh: "GTNH",
  gtceu: "GTCEu",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  materials: "Materials",
  machines: "Machines",
  items: "Items",
};

export const ALL_DATASET_KEYS: DatasetKey[] = VERSIONS.flatMap((version) =>
  CATEGORIES.map((category) => `${version}:${category}` as DatasetKey),
);

/** Datasets that actually ship in v1. */
export const DATASET_KEYS: DatasetKey[] = ALL_DATASET_KEYS.filter(
  (key) => key !== "gtnh:materials",
);

/** True when a (version, category) pair is known but not shipping in v1. */
export function isDatasetInactive(key: DatasetKey): boolean {
  return key === "gtnh:materials";
}

export function parseDatasetKey(key: string): DatasetKey | null {
  return DATASET_KEYS.includes(key as DatasetKey) ? (key as DatasetKey) : null;
}

/** e.g. "gtnh:materials" -> "GTNH // MATERIALS" */
export function datasetLabel(key: DatasetKey): string {
  const [version, category] = key.split(":") as [Version, Category];
  return `${VERSION_LABELS[version]} // ${CATEGORY_LABELS[category].toUpperCase()}`;
}
