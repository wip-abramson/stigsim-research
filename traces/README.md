# Traces you can watch

Each file here is one real run from the experiments, saved in the format the hosted Maze Simulator replays.

**To watch one:** open https://stigsim.protocol-institute.org/maze/ , find **Load trace** in the Run panel, and pick a file from this folder. Press play, or drag the replay slider to jump. The page checks the replay against fingerprints stored in the file and says so if it ever diverges.

Files come in pairs where it helps: the same seed, the same maze, the same ants, once with scent and once with it switched off. Load one, watch, exit replay, load the other.

**How these were made.** `tools/export-curated.py` picks the seed closest to the median of each experiment's cell, then `tools/export-trace.sh` rebuilds that run from commands a trace can hold: wall edits for the comb, food moves for set distances. Each export must reproduce the result recorded in `results/` exactly, food for food, and must replay from the saved file without diverging, or it is not written. To export any other run, copy a `command` from `manifest.json` and change the seed or settings.

The comb is built at tick 1 by about 400 wall edits, so a comb trace opens showing the generated maze for one tick before the comb appears.

## Exp 2 — distance alone is worth nothing

- **`exp2-comb-0-junctions-40-ants-scent.trace.json`** — Comb, 0 junctions, 40 ants, with scent. A plain corridor. Ants can only go forward, so the scent is irrelevant. 720 food, the same as scent off.
- **`exp2-comb-0-junctions-40-ants-no-scent.trace.json`** — Comb, 0 junctions, 40 ants, scent off. Exactly the same 720 food.

## Exp 3 — trails are worth what the junctions cost

- **`exp3-comb-4-junctions-40-ants-scent.trace.json`** — Comb, 4 junctions, 40 ants, with scent. By about tick 1,000 the scent colony runs at its ceiling (about 62 food per 500 ticks), walking straight past all four branches. 695 food by tick 6,000.
- **`exp3-comb-4-junctions-40-ants-no-scent.trace.json`** — Comb, 4 junctions, 40 ants, scent off. Ants turn into a branch at half of all forks, all run long. 167 food.
- **`exp3-comb-12-junctions-40-ants-scent.trace.json`** — Comb, 12 junctions, 40 ants, with scent. Twelve branches. Almost nothing arrives for 3,000 ticks (19 food); the trail forms around tick 3,500, then the colony climbs toward its ceiling. 347 food.
- **`exp3-comb-12-junctions-40-ants-no-scent.trace.json`** — Comb, 12 junctions, 40 ants, scent off. Ants wander the dead ends all run. 32 food.

## Exp 4 — a formed trail is worth the same to any colony (and why the ridge was wrong)

- **`exp4-maze-35-cells-48-ants-scent.trace.json`** — Branchy random maze, food 35 cells out, 48 ants, with scent. A single highway forms from nest to food. 711 food.
- **`exp4-maze-35-cells-48-ants-no-scent.trace.json`** — Branchy random maze, food 35 cells out, 48 ants, scent off. Same maze, same food, scent off: ants find the food only by chance. 19 food, about a thirty-seventh as much.
- **`retracted-ridge-15-cells-128-ants-capped-scent.trace.json`** — Why the ridge was wrong: 15 cells, 128 ants, food capped at 2,500, with scent. Watch the food counter: the source is empty at tick 3,060, and the colony delivers nothing after that. Its score is stuck at the 2,500 cap.
- **`retracted-ridge-15-cells-128-ants-capped-no-scent.trace.json`** — Why the ridge was wrong: 15 cells, 128 ants, food capped at 2,500, scent off. The twin keeps delivering all run (156 food). Dividing a capped score by this is what made the fake ridge.

## Exp 5 — what colony size buys is time

- **`exp5-maze-55-cells-16-ants-18000-ticks-scent.trace.json`** — Slow take-off: 55 cells, 16 ants, 18,000 ticks, with scent. Food 55 cells out. Nothing arrives for 3,000 ticks; the trail forms around tick 4,000. At tick 6,000, where earlier runs stopped, it has 68 food. By 18,000 it has 448.
- **`exp5-maze-55-cells-16-ants-18000-ticks-no-scent.trace.json`** — Slow take-off: 55 cells, 16 ants, 18,000 ticks, scent off. The same seed with scent off: 24 food in 18,000 ticks.
- **`exp5-comb-12-junctions-10-ants-54000-ticks-scent.trace.json`** — Hardest comb: 12 junctions, 10 ants, 54,000 ticks, with scent. Ten ants, twelve forks. A trickle for 20,000 ticks (22 food by tick 18,000); the trail holds from about tick 22,000 and then the colony runs near its ceiling. 1,051 food by 54,000. Use the replay slider.

## Exp 6 — louder is not the same as more

- **`exp6-comb-12-junctions-20-ants.trace.json`** — Loudness, 12 junctions: 20 ants, scent ×1. The base colony: 37 food by tick 6,000, trail forming around 7,000, 603 food by 18,000.
- **`exp6-comb-12-junctions-20-ants-3x-louder.trace.json`** — Loudness, 12 junctions: 20 ants, scent ×3. The same 20 ants, each laying three times as much scent. The trail looks stronger but forms later, around tick 11,000. 460 food.
- **`exp6-comb-12-junctions-60-ants.trace.json`** — Loudness, 12 junctions: 60 ants, scent ×1. Three times the ants, the same total scent as the loud colony. Its trail forms by tick 3,000. 2,907 food.

## Exp 7 — evaporation is a plateau with a cliff

- **`exp7-maze-40-cells-evaporation-0.005.trace.json`** — Evaporation 0.005, 40 cells, 40 ants. The default decay rate: a steady trail. 440 food.
- **`exp7-maze-40-cells-evaporation-0.05.trace.json`** — Evaporation 0.05, 40 cells, 40 ants. Ten times faster decay: the trail never holds. 25 food.

## Exp 8 — each ant must be able to mark one leg

- **`exp8-comb-40-cells-gland-1800.trace.json`** — Gland 1,800 on a 40-cell comb, 4 junctions. Enough scent for 30 cells of trail on a 40-cell path, so returning ants run dry 10 cells short of the nest. The colony still works, at 587 food.
- **`exp8-comb-40-cells-gland-2400.trace.json`** — Gland 2,400 on a 40-cell comb, 4 junctions. Enough for exactly 40 cells: the food trail reaches the nest. 703 food, the plateau.
