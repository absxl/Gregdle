import { z } from "zod";
import { FUNCTION_CATEGORIES } from "./function-categories";

/**
 * Canonical dataset schema (PRD §4). The machines schema reflects what the
 * GTNH wiki infobox reliably provides (M1 probe, docs/DECISIONS.md D14):
 * tier / structure / size / function category / energy inputs / extras.
 * Attributes the wiki can't provide reliably are dropped per PRD §4.4-note;
 * see /data/gtnh/machines-quality.md for coverage evidence.
 */

export const VOLTAGE_TIERS = [
  "Stone", // stone-age multiblocks (Coke Oven, Smeltery…)
  "Steam", // steam age (GTNH bronze/steel)
  "ULV",
  "LV",
  "MV",
  "HV",
  "EV",
  "IV",
  "LuV",
  "ZPM",
  "UV",
  "UHV",
  "UEV",
  "UIV",
  "UXV",
  "UMV", // OpV in some forks
  "MAX",
] as const;

export const machineTierSchema = z.enum(VOLTAGE_TIERS);

export const machineEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "kebab-case slug"),
  name: z.string().min(1),
  dataset: z.literal("gtnh:machines"),
  image: z.string().nullable(),
  source_url: z.string().url(),
  difficulty: z.enum(["easy", "hard"]),
  aliases: z.array(z.string()).default([]),
  attributes: z.object({
    /** Voltage tier (ordered enum). */
    tier: machineTierSchema,
    /** single block vs multiblock. */
    structure: z.enum(["single", "multiblock"]),
    /** Dimensions LxWxH; single blocks are 1x1x1. */
    size: z.object({
      l: z.number().int().positive(),
      w: z.number().int().positive(),
      h: z.number().int().positive(),
    }),
    /** Generic function category (D19): the wiki Machine Type mapped onto a
     *  12-value enum — guessable signal instead of 155 distinct strings. */
    functionCategory: z.enum(FUNCTION_CATEGORIES),
    /** The wiki's specific Machine Type, shown as a tooltip (D19). */
    functionTypeRaw: z.string().min(1),
    /** Energy hatch requirements (proxy for energy input). */
    energyHatches: z.string().nullable(),
    /** Extra requirements mentioned by the infobox (overclocks etc.). */
    extras: z.array(z.string()).default([]),
    /** Raw pollution value if stated (per second). */
    pollution: z.number().nullable(),
  }),
  /** Normalizer could not confidently fill a field; needs human review. */
  flagged: z.boolean().default(false),
  flagReason: z.string().optional(),
});

export type MachineEntry = z.infer<typeof machineEntrySchema>;

export const machineDatasetSchema = z.object({
  dataset: z.literal("gtnh:machines"),
  /** GTNH version the wiki rendered at scrape time. */
  snapshotVersion: z.string(),
  scrapedAt: z.string(),
  source: z.string(),
  entries: z.array(machineEntrySchema),
});

export type MachineDataset = z.infer<typeof machineDatasetSchema>;
