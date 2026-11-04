/**
 * Generic function categories for machines (D19, audited in D39).
 *
 * The wiki's "Machine Type" is hyper-specific free text (155 distinct values
 * across 209 machines) — useless as a guessing column. Classification:
 * 1. EXPLICIT_MAP — curated exact raw-type -> category, verified against the
 *    wiki page text (D39 audit; wins over everything).
 * 2. Ordered regex rules — fallback for anything not mapped explicitly.
 * The raw string is kept alongside for tooltips.
 *
 * Re-run `pnpm tsx pipeline/normalize-gtnh-machines.ts` after changes.
 */

export const FUNCTION_CATEGORIES = [
  "power-generation",
  "power-infrastructure",
  "ore-processing",
  "solid-processing",
  "fluid-chemical",
  "smelting-alloying",
  "assembly-crafting",
  "part-fabrication",
  "extraction",
  "farming-breeding",
  "storage-logistics",
  "utility-special",
] as const;

export type FunctionCategory = (typeof FUNCTION_CATEGORIES)[number];

/** Short labels sized for grid cells. */
export const FUNCTION_CATEGORY_LABELS: Record<FunctionCategory, string> = {
  "power-generation": "POWER GEN",
  "power-infrastructure": "POWER INFRA",
  "ore-processing": "ORE PROC",
  "solid-processing": "SOLID PROC",
  "fluid-chemical": "FLUID/CHEM",
  "smelting-alloying": "SMELT/ALLOY",
  "assembly-crafting": "ASSEMBLY",
  "part-fabrication": "PARTS",
  extraction: "EXTRACTION",
  "farming-breeding": "FARMING",
  "storage-logistics": "STORAGE",
  "utility-special": "UTILITY",
};

/**
 * D39 audit — every raw type verified against its wiki page text.
 * Keyed by normalized raw type (see normalize()). Overrides the rules.
 */
const EXPLICIT_MAP: Record<string, FunctionCategory> = {
  // user corrections (D39)
  "molecular transformer": "solid-processing",
  "quantum force transformer": "solid-processing", // transforms matter like the MT
  "geothermal heat pump": "power-generation", // DEHP: geothermal power (user)
  // wiki-verified (D39)
  "stellar forge": "smelting-alloying", // Forge of the Gods: "smelting-related operations"
  "collision chamber": "assembly-crafting", // Target Chamber: engraves doped wafers
  "energy storage": "power-infrastructure", // Lapotronic Supercapacitor: stores power
  "reactor processing unit cold trap": "fluid-chemical", // Nuclear Salt Plant: UF6 condensing
  "packager unpackager": "storage-logistics", // Amazon Warehousing Depot
  "research completer": "utility-special", // Thaumcraft research
  "microwave grinder": "farming-breeding", // grinds mobs
  "dissolution tank": "fluid-chemical", // dilutes rare earth solutions
  "tesla tower": "power-infrastructure", // wireless power transmission
  "quantum computer": "utility-special", // generates computation
  "antimatter forge": "extraction", // SSASS: creates antimatter from protomatter
  chisel: "utility-special", // cosmetic block editing
  scanner: "utility-special", // scanning
  "dyson swarm": "power-generation", // ultimate power project
  "fluid extractor": "fluid-chemical", // squeezes fluids from items
  "grinding machine": "ore-processing", // grinds items to dust
  "bacterial vat": "fluid-chemical", // fermentation vat
};

interface Rule {
  category: Exclude<FunctionCategory, "utility-special">;
  pattern: RegExp;
}

/**
 * Ordered rules — first match wins. Ordering notes:
 * - smelting/alloying before fluid ("Fluid Alloy Cooker" is alloying)
 * - part fabrication before generic solid processing ("Implosion Compressor")
 * - specific machine families before broad catch-alls
 */
const RULES: Rule[] = [
  // ⛏️ Extraction & production of raw materials
  {
    category: "extraction",
    pattern:
      /miner|drill(ing)? rig|pump|quarry|excavat|rock breaker|charcoal pile|prospector|oil field|derric/i,
  },
  // 🌾 Farming & breeding — "breeding" not "breed": a Breeder REACTOR is power.
  {
    category: "farming-breeding",
    pattern:
      /farm|bee|apiary|alveary|fish|breeding|algae|bacterial|crop|tree|greenhouse|incubat|mutat|harvest|seed|spawner/i,
  },
  // ⚡ Power generation — "reactor" must not swallow Chemical/Cracking Reactors.
  {
    category: "power-generation",
    pattern:
      /turbine|generator|engine|(?<!chemical )(?<!cracking )(?<!crack )reactor|boiler|solar|geothermal|discharger|power plant|combustion|diesel|hohlraum/i,
  },
  // 🔌 Power infrastructure (transform, store, move energy)
  {
    category: "power-infrastructure",
    pattern:
      /transformer|battery|capacitor|substation|power node|converter|energy hatch|dynamo|laser pod|coolant tower|heat sink/i,
  },
  // 🔥 Smelting & alloying
  {
    category: "smelting-alloying",
    pattern:
      /furnace|alloy|smelt|coke oven|ebf|microwave|plasma forge|vacuum freezer|essentia|arc|blast/i,
  },
  // 🔧 Assembly & crafting of multi-part items
  {
    category: "assembly-crafting",
    pattern:
      /assembl|circuit|packag|precision|crafter|research station|printer|engraver|nanochip|wafer/i,
  },
  // 🪛 Part fabrication (bender/wiremill/cutter/lathe family)
  {
    category: "part-fabrication",
    pattern:
      /bend|wiremill|cutt|cutter|lathe|extrud|forming press|rolling|foil|implosion|\bpress(es)?\b|punch|machining|grind|coater/i,
  },
  // 📦 Storage & logistics — before fluid so "Fluid Tank"/hatches/buses land here.
  {
    category: "storage-logistics",
    pattern:
      /tank|buffer|chest|storage|bus|hatch|input|output|conveyor|robot|platform|crate|warehous|entangled|condensate|quantum|item|pipe|logistic|mono/i,
  },
  // 🪨 Ore processing chain
  {
    category: "ore-processing",
    pattern:
      /macerat|ore washer|washer|sifter|siev|centrifuge|electromagnetic|ore process|prospecting|purification unit|washing plant|flotation/i,
  },
  // 🧊 Generic solid processing
  {
    category: "solid-processing",
    pattern:
      /compressor|extractor|hammer|crusher|recycler|decompos|pulveriz|shredder|solid process|thermal.*cyc|autoclave|canner|chisel|backfill|concrete/i,
  },
  // 🧪 Fluid & chemical processing
  {
    category: "fluid-chemical",
    pattern:
      /chemical|distill|brew|ferment|electroly|mixer|dissolut|digest|fluid|heat exchang|cracker|crystalliz|polymer|acid|gas|steam.*crack|washing|refin|blender|fuser|steam/i,
  },
];

function normalizeType(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function mapFunctionType(raw: string): { category: FunctionCategory; matched: boolean } {
  const explicit = EXPLICIT_MAP[normalizeType(raw)];
  if (explicit) return { category: explicit, matched: true };
  for (const rule of RULES) {
    if (rule.pattern.test(raw)) return { category: rule.category, matched: true };
  }
  return { category: "utility-special", matched: false };
}
