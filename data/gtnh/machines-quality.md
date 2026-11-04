# GTNH machines — dataset quality report

Generated 2026-11-04T09:02:40.309Z by `pipeline/report-gtnh-machines.ts`.
Source: https://wiki.gtnewhorizons.com (GTNH 2.9 (wiki default render, 2026-11-03)); scraped 2026-11-04T09:02:39.416Z.
Wiki pages parsed: 645 cached; pages with a machine infobox: 229; entries: **209**.

## Attribute coverage

| Attribute | Coverage | Notes |
|---|---|---|
| Tier | 100.0% | ordered enum incl. Stone/Steam ages |
| Structure | 100.0% | derived: size 1x1x1 = single block |
| Size | 100.0% | 13.9% approximate (wiki gives a range; minimum used) |
| Function category | 100.0% | wiki Machine Type mapped to 12 generic buckets (D19); raw type kept for tooltips |
| Energy hatches | 90.4% | nullable by design (steam machines have none) |
| Extras | 100.0% | overclocks + "other" notes |
| Pollution | 27.8% | numeric when stated |
| Image | 100.0% | wiki-rendered texture URL |

## Difficulty split (heuristic first pass — needs human review, PRD §4.5)

- easy: 43 (20.6%)
- hard: 166 (79.4%)

## Tier distribution

- Stone: 5
- Steam: 15
- LV: 3
- MV: 10
- HV: 19
- EV: 27
- IV: 46
- LuV: 23
- ZPM: 18
- UV: 18
- UHV: 5
- UEV: 6
- UIV: 12
- UXV: 1
- UMV: 1

## Flagged entries (29)

- Advanced Assembly Line (advanced-assembly-line) — approximate size (wiki states a range, minimum used: 3 x 5-16 x 4)
- Assembly Line (assembly-line) — approximate size (wiki states a range, minimum used: 3 x 5-16 x 4)
- Charcoal Pile Igniter (charcoal-pile-igniter) — approximate size (wiki states a range, minimum used: 3-13 x 3-13 x 3-7)
- Circuit Assembly Line (circuit-assembly-line) — approximate size (wiki states a range, minimum used: 3 x 2-7 x 3)
- Cleanroom (cleanroom) — approximate size (wiki states a range, minimum used: 3-15 x 3-15 x 4-15)
- Dangote Distillus (dangote-distillus) — approximate size (wiki states a range, minimum used: 3 x 3 x 3-12)
- Distillation Tower (distillation-tower) — approximate size (wiki states a range, minimum used: 3 x 3 x 3-12)
- Draconic Reactor (draconic-reactor) — approximate size (wiki states a range, minimum used: 9-17 x 9-17 x 9-17)
- Ender Quarry (ender-quarry) — approximate size (wiki states a range, minimum used: 1-3 x 1-3 x 1-3)
- Fluid Shaper (fluid-shaper) — approximate size (wiki states a range, minimum used: 5 x 9-33 x 5)
- Industrial Coke Oven (industrial-coke-oven) — approximate size (wiki states a range, minimum used: 5 x 6-36 x 7)
- Industrial Farm (industrial-farm) — approximate size (wiki states a range, minimum used: 3-14 x 5 x 4)
- Lapotronic Supercapacitor (lapotronic-supercapacitor) — approximate size (wiki states a range, minimum used: 5 x 5 x 4-50)
- Large Essentia Smeltery (large-essentia-smeltery) — approximate size (wiki states a range, minimum used: 5-9 x 5 x 5)
- Linear Accelerator (linear-accelerator) — approximate size (wiki states a range, minimum used: 19-83 x 7 x 7)
- Mega Distillation Tower (mega-distillation-tower) — approximate size (wiki states a range, minimum used: 9 x 15 x 30-54)
- Multifarm (multifarm) — approximate size (wiki states a range, minimum used: 3-5 x 3-5 x 4)
- Nuclear Reactor (nuclear-reactor) — approximate size (wiki states a range, minimum used: 1-3 x 1-3 x 1-3)
- Quantum Computer (quantum-computer) — approximate size (wiki states a range, minimum used: 5-16 x 2 x 4)
- RC Boiler (rc-boiler) — approximate size (wiki states a range, minimum used: 1-3 x 1-3 x 2-5)
- RC Tank (rc-tank) — approximate size (wiki states a range, minimum used: 3-9 x 3-9 x 4-8)
- Research Completer (research-completer) — approximate size (wiki states a range, minimum used: 3-13 x 3 x 3)
- Smeltery (smeltery) — approximate size (wiki states a range, minimum used: 3-11 x 3-11 x 2-11)
- Solar Tower (solar-tower) — approximate size (wiki states a range, minimum used: 28 x 15-31 x 15-31)
- Space Elevator (space-elevator) — approximate size (wiki states a range, minimum used: 35-47 x 35-47 x 48)
- TFFT (tfft) — approximate size (wiki states a range, minimum used: 5-15 x 5 x 5)
- Vacuum Reactor (vacuum-reactor) — approximate size (wiki states a range, minimum used: 1-3 x 1-3 x 1-3)
- Void Miner (void-miner) — approximate size (wiki states a range, minimum used: 7-9 x 7-9 x 9-16)
- YOTTank (yottank) — approximate size (wiki states a range, minimum used: 5 x 5 x 5-19)

## Excluded pages (infobox present but not a machine — 20)

Items/utility pages (AR Glasses, Vajra, Thaumonomicon, Sleeping Bag, Dolly, …) and machines whose
size genuinely varies ("Varies", "Tier Dependent", "5 x 5 x H"). Full list in the normalizer output.

## Attribute-set recommendation (PRD §4.4 review step)

Keep: tier, structure, size, functionCategory, energyHatches, extras, pollution — all at 100% or
by-design nullable coverage. The comparison engine (lib/game/compare.ts) uses six columns:
TIER, STRUCTURE, SIZE (volume), FUNCTION, ENERGY, EXTRAS. Pollution stays in the data for future
modes but is not a guess column (too sparse/noisy to be fun).
