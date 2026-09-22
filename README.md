# Stigmergy hackathon — what sets the coordination horizon?

A research workspace from a two-day collaborative hackathon (2026-09-21 → 09-23) on **stigmergy**:
coordination through traces left in a shared environment, the way ants coordinate through
pheromone trails. The experiments run on [stigsim](https://stigsim.protocol-institute.org/), an
ant-colony simulator, mostly as headless parameter sweeps.

**The question:** how far can a colony coordinate? Specifically, where is the **coordination
horizon**: the point beyond which a colony that lays trails does no better than the same number of
ants that never communicate?

There is no build, lint or test setup. The code here is analysis and sweep scripts; the evidence
is in `results/`.

## Where to start

1. **[`research/model.md`](research/model.md)** is the whole account on one page. It gives the
   terms, which variables were swept and which held fixed, every finding with its source file, and
   what has been retracted.
2. **[`research/glossary.md`](research/glossary.md)** gives one name per concept and where each
   variable lives in stigsim's source. Read it if a symbol in `model.md` is unfamiliar.
3. **[`traces/`](traces/README.md)** holds 20 real runs you can watch in the browser (see below).
   This is the fastest way to build an intuition for the findings.
4. **[`log/`](log/)** is the session log, one file per day. The latest entry says what to do next
   and lists the mistakes already made, so they are not repeated.

## What we found so far

All numbers are from headless sweeps with at least 16 seeds, paired on seed. See `model.md` for
the tables and caveats.

- **Finding food is easy; organising around it is not.** Every colony found the food at every
  distance tested (96 of 96 runs). What distance slows is organising a route to it: in a
  fixed-length run, far colonies had often not formed a trail by the end.
- **Distance alone needs no coordination.** On a corridor with no side branches, colonies with and
  without trails deliver identically: the walls do the navigating.
- **Junctions are the coordination problem.** A junction is a cell where an ant has a real choice.
  Trails are worth roughly what the junctions would otherwise cost in wrong turns. On a hand-built
  "comb" (a corridor with dead-end side branches), the trail bonus grows from 2.3× at 2 junctions to
  about 17× at 12 once the trail has formed, and grows again as the dead ends get longer.
- **Colony size buys time, not a bigger bonus.** Once a trail forms, 10 ants and 160 ants get the
  same multiple from it. A bigger colony forms the trail sooner.
- **No hard horizon has been found.** Every apparent horizon moved outward when runs were given
  more time. The hardest case tried (12 junctions, 10 ants) formed its trail in 19 of 24 seeds by
  tick 54,000.
- **More ants beat louder ants.** Tripling each ant's pheromone output changes nothing. Tripling the
  number of ants, laying the same total pheromone, wins in 110 of 112 paired seeds. The best
  current reading, not yet tested directly, is that what helps is more ants passing through each
  junction, not a stronger scent.
- **Evaporation barely matters until it is extreme.** Performance is flat across a 24-fold range of
  decay rates, then collapses at 10× the default.
- **Each ant's pheromone supply has a hard minimum.** An ant must carry enough to mark one full leg
  of the trip: **distance × 60 units**, predicted before the runs and confirmed on two instruments.

**Retracted** (kept in `model.md` with the cause): a distance beyond which colonies can find food
but not organise around it; a "ridge" where the trail bonus peaked at a distance that grew with
colony size; and "quadratic returns to colony size". All three came from runs that were cut off
early. For the ridge, the food source ran out; for the other two, small colonies had not finished
forming their trails when the run ended.

**Not yet tested:** any of this against an adversary that pays the same physical costs as an honest
ant. The security motivation that started the project is parked in
[`research/archive/programme.md`](research/archive/programme.md).

## Watching a run

Open the hosted [Maze Simulator](https://stigsim.protocol-institute.org/maze/), find **Load trace**
in the Run panel, and pick a file from `traces/`. Most come in pairs: the same seed and maze, with
scent on and off. [`traces/README.md`](traces/README.md) says what to look for in each.

## Running the tools

The tools run on stigsim's own TypeScript toolchain, so they need a local clone of
[stigsim](https://github.com/Protocol-Institute/stigsim) with its dependencies installed. Point
`STIGSIM_DIR` at that clone.

```bash
# once: clone stigsim anywhere outside this repo and install its dependencies
git clone https://github.com/Protocol-Institute/stigsim.git ~/src/stigsim
(cd ~/src/stigsim && pnpm install)

# then, from this directory, point the tools at it
export STIGSIM_DIR=~/src/stigsim

# the comb: fixed 40-cell path, dial the number of junctions and ants
./tools/junctions.sh --k 0,4,12 --ants 10,40 --seeds 16 --json > results/my-comb.json

# food at a set distance in a random maze, trails vs no trails
./tools/distance.sh --dist 15,35,55 --ants 16,48 --seeds 16 --json > results/my-distance.json
```

[`tools/README.md`](tools/README.md) says which tool serves which part of the model, which two are
parked and why, and several things about the simulator that silently distort results if missed.
[`research/run-log.md`](research/run-log.md) indexes every file in `results/`: what it varied and
what it tests.

## Layout

| path | what it holds |
|---|---|
| `research/model.md` | the current account. **Start here** |
| `research/glossary.md` | one canonical name per concept, with its location in stigsim |
| `research/coordination-horizon.md` | the first 96-run horizon measurement, now partly superseded by `model.md` §4e |
| `research/run-log.md` | index of result files and what each tests |
| `research/critiques/` | external critiques, verbatim |
| `research/literature/` | related work and references (verify before citing) |
| `research/archive/` | earlier framings, with a README saying why each was set aside |
| `tools/` | sweep harnesses, trace exporters and record readers |
| `results/` | raw sweep output (`.json`), with any warnings the run printed (`.warn`) |
| `traces/` | curated runs that the hosted simulator can replay |
| `log/` | daily session log |
| `CLAUDE.md` | working norms and record format notes, written for AI coding assistants but useful to anyone |

## Working norms

The short version of what two days of mistakes taught (the long version is in `model.md` under
"Corrections"):

- **Measure differences, not absolutes.** In a random maze, the seed decides where the food goes.
  Pair every treatment with a control on the same seed.
- **Check for censoring before reading a ratio.** If the food can run out or the clock can stop
  before a colony has organised, the numbers describe the cap, not the colony.
- **One run is a seed for a hypothesis, never a result.** Use 16 or more seeds, and vary one thing
  at a time.
- **Define every symbol on first use**, and add it to the glossary.

## Related

- Simulator: <https://stigsim.protocol-institute.org/> (multiplayer at `/multiplayer/`, maze at
  `/maze/`)
- Simulator source: <https://github.com/Protocol-Institute/stigsim>. Anything that needs the simulator itself changed
  belongs there.
