# Tools

Every tool runs through stigsim's toolchain — `pnpm install` in that checkout first, or set
`STIGSIM_DIR`. Which part of [`../research/model.md`](../research/model.md) each one serves:

| tool | measures | status |
|---|---|---|
| `horizon.sh` | **the coordination horizon, day-1 form.** Distance vs discovery vs sustained exploitation, with distance *measured* after the run and binned. `--ants` sweeps colony size, `--evap` the decay rate, `--loop` the maze's branchiness | **superseded** by `distance.sh` and `junctions.sh` for anything read across distance; still fine for reading down a column (see below) |
| `traffic.sh` | **is colony size interchangeable with trail strength?** Matched-traffic arms: a big quiet colony against a small loud one, laying the same pheromone mass per tick | **superseded** by `--gain` on `distance.sh` and `junctions.sh`, which run uncapped; `traffic-match.json` hit its 500-unit food cap |
| `distance.sh` | **the clean experiment** (`--gain` list for loudness; `series` every 1000 ticks) — distance is *set* before the run, not measured after, so the x-axis is a dial. Full and no-trail arms on the same maze | **current — preferred over `horizon.sh` for anything read across distance** |
| `junctions.sh` → `junctions.ts` | **the junction experiment.** Also takes `--gain` (lay weight, with tankMax scaled by the same factor) and `--tank` lists, and records delivery every 1000 ticks as `series`. A hand-built comb: nest-to-food corridor of set length, `--k` dead-end branches of `--len` cells. Distance and decision count are dialled independently, the maze is identical across seeds, and wrong turns into branches are counted directly, split by ant state | **current — the cleanest instrument here** |
| `export-trace.sh` → `export-trace.ts` | **one run → a trace the hosted Maze Simulator can load** (Run panel → Load trace). Rebuilds comb and set-distance runs from wall and food commands; `--expect` makes it refuse unless the result matches the results file, and every export is replayed against its fingerprints | **current** |
| `export-curated.py` | exports one typical seed per experiment into `traces/`, with `manifest.json` and `README.md`. Notes on what to look for live in `traces/notes.json`, checked against each trace's metrics | **current** |
| `scaling.py` | **the break-even colony size N\*(D) and its exponent.** Pure-stdlib reader over a `horizon.sh` or `distance.sh --json` dump; needs no toolchain. Refuses a fit pooled across colony size | **current**, but the exponent it was built for proved unstable (`model.md` §4c) |
| `summarize.sh` | a `.run.json` game record → 8 KB interpreted summary, decoded through stigsim's own vocabulary | current; no records are kept in this repo |
| `surface.sh` | food collected over (decay rate × trail trust). Also takes `--ants` | works, but see the warning below |
| `impulse.sh` | twin-run response to a single injected pheromone blob | **parked** — measures a *free* attacker, see below |
| `subvert.sh` | twin-run response to a liar that pays for its lies (an ordinary forager that also lays food-scent while searching) | **parked, unvalidated** — built 2026-09-22, smoke-tested only |
| `digest.py` | older raw-JSON record reader | fallback only |

## The comb

`junctions.ts` does not use `generateMaze()` at all. It builds a `DenseGrid` by hand and passes it to
`new Simulation(config, { world })`: a 14-cell down-leg from the nest at (1,1), a horizontal leg
along row 15 to the food, and `k` dead ends of `len` cells hanging off odd columns, alternating up
and down. Two facts about the ant make it a clean instrument: an ant drops the cell it just left,
so in a corridor it never reverses and a no-trail ant walks straight to the food (at `k=0` the two
arms are identical to the unit); and at a T-junction with no scent both options score 1, so the
null arm's wrong-turn rate is exactly 50% by construction — a built-in check that the counter works.

Because the maze is fixed, the seed varies only the ants, and the within-cell spread is ant noise
alone. Expect a tight cluster with the occasional seed that failed to bootstrap.

The leg is 26 cells at `--dist 40`, which gives 12 branch slots; `--dist 30` gives 7. The tool
throws if `k` exceeds the slots or two chosen slots collide.

## Two warnings worth reading before using the parked tools

**`impulse.sh` injects with `field.add()`, which bypasses the ant's deposit tank.** That is ~50
deposits' worth of influence (`DEPOSIT_RATE = 20`) delivered instantly by something that never
walked there and paid nothing. It is a legitimate **free-attacker control** and nothing more; it is
not evidence about bounded influence, which is bounded precisely *because* an agent must travel and
spend. Results in `results/impulse-*.json` should be read that way.

**`surface.sh` measures absolute yield, and `layout: "random"` means the seed moves the food.**
Within-cell seed spread (IQR 40–560 food at 16 seeds) is larger than any difference the sweep
produces, so the surface cannot resolve an interaction. Either fix the food layout across seeds or
use paired runs. The general lesson, which cost us a day: **measure differences, not absolutes** —
pair every treatment with a control on the same seed so food placement cancels.


## The deposit tank is an influence *budget*, not a rate

Worth knowing before designing any experiment that touches deposition, because it is not obvious
from the doctrine schema and it silently breaks the naive version of a matched-traffic design.

An ant's tank refills to `tankMax` (6400) at the nest **and** on picking up food, and drains by
`gain × DEPOSIT_RATE` on each of `DEPOSITS_PER_CELL = 3` frames per cell. At the default gain of 1
that is 60 per cell, so **106 cells per leg** — and a searching ant in a maze routinely walks
further than that before it finds anything, so the tank binds in normal play.

The consequence: **raising the lay gain does not make an ant louder.** It makes it louder over
`106/gain` cells and silent after. At gain 3 a returning ant's food trail stops 35 cells from the
food and never reaches the nest, so recruitment fails for a reason that has nothing to do with
whatever is being tested. `traffic.ts` therefore scales `tankMax` by the same factor as the gain,
which holds cells-per-leg at 106 in every arm.

Two further notes. `MAX_LAY_GAIN = 3` and gains must be **integers**, so 3× is the largest loudness
ratio available and fractional gains are not an option (`isDoctrine` rejects 1.5). And standing
field mass must be sampled **before the source is depleted**: once it is, no ant can refill at food,
a searching ant never re-enters the returning state, and the colony goes dry and stops laying — so
a colony that wins reads as *low* pheromone mass, which is an artifact of winning.


## A set distance is only set if the maze is that big

`distance.ts` places the food at "the reachable cell closest to the requested distance". When the
request exceeds the maze's reach it silently returns the **furthest** cell, so several requested
distances collapse onto one and the x-axis quietly stops being an axis. A branchy
(`loopRate 0.12`) 31x31 maze tops out around **77 cells**, so a sweep asking for 90, 110 and 140
produces three identical rows:

```
want   70 -> median 70.0   min 57   max  70
want   90 -> median 77.0   min 57   max  90
want  110 -> median 77.0   min 57   max 110
want  140 -> median 77.0   min 57   max 140
```

The tool now records `clipped` on every run and prints a loud warning to stderr naming the affected
distances. Check it before reading any set-distance result, and remember the reach depends on
`loopRate` — a perfect maze (`loopRate 0`) reaches ~226 cells on the same map, a branchy one ~77.

## Which distance tool to use

`horizon.sh` measures whatever distance the maze happened to produce and bins it. That is fine for
reading *down* a column (across colony size, across stigmergy level, paired on seed) and wrong for
reading *across* distances, because the bins differ in more than distance. Anything whose answer is
a function of distance should use `distance.sh` instead.
