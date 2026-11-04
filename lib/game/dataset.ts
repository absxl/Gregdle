import machinesDataset from "@/data/gtnh/machines.json";
import type { MachineEntry } from "@/pipeline/schema";

/**
 * Server-side dataset loading. The JSON is bundled at build time (it only
 * changes on deploy, PRD §7.4).
 */

// The JSON is schema-validated by the pipeline before it is committed;
// the cast keeps the app-side types honest without a runtime parse cost.
const machines = machinesDataset as unknown as {
  dataset: "gtnh:machines";
  snapshotVersion: string;
  scrapedAt: string;
  entries: MachineEntry[];
};

export function getMachines(): MachineEntry[] {
  return machines.entries;
}

export function getEntryById(id: string): MachineEntry | undefined {
  return machines.entries.find((e) => e.id === id);
}
