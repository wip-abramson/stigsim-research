# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this directory is

A **research workspace** for investigating stigmergic systems, running roughly 2026-09-21 → 09-23,
as part of a collaborative hackathon with fellow researchers. The method began as playing games on
the hosted simulator and mining the run records; it is now mostly headless parameter sweeps, paired
on seed against a no-trail twin, with curated runs exported as traces anyone can watch.

**The research question** (see `research/model.md` — read it first, it is the whole thesis on one
page) is what sets the **coordination horizon**: the distance beyond which a colony does no better
than the same number of agents that don't communicate at all. The current answer: **no such
distance has been found.** A trail's value is set by the junctions on the route (how many, and what
a wrong turn costs), not by distance or colony size; what colony size buys is *time* for the trail
to form. The open question is whether that time ever diverges — a hard horizon in forks per ant.
The earlier model (an influence bound λ ≈ 1/(4·evapRate) cells, multiplied by traffic) is withdrawn.

The longer-term motivation — that stigmergic systems are secured *without identifying agents*, by
bounding influence in time and space — is in `research/archive/programme.md`. It is parked until the
foundation is solid, because every adversarial result so far used an attacker that bypassed the
physics.

- **Simulator (hosted, where games are played):** https://stigsim.protocol-institute.org/multiplayer/
- **Simulator source (sibling checkout):** `/Users/wip/work/protocol-institute/stigsim`
- `log/` — session log, one file per day. **Read the latest before doing anything** (see below)
- `README.md` — the public front page: question, findings in plain English, how to run and watch
- `research/model.md` — **start here.** The four terms, the variables and which are held fixed, what
  is measured vs derived vs guessed, what has been retracted
- `research/coordination-horizon.md` — the day-1 96-run horizon measurement; historical, see its header
- `research/glossary.md` — simulator variables and where each lives in stigsim's source; the
  aliases we used before settling on one name each
- `research/run-log.md` — index of records and headless results: what each varied, what it tests
- `research/archive/` — superseded framings, with a README saying why each was set aside
- `research/critiques/` — external critiques, verbatim, with provenance
- `research/literature/` — related-work reviews and the reference list (checkable citations; verify before citing)
- `tools/junctions.sh` — the comb: fixed maze, junction count and distance set independently (main instrument)
- `tools/distance.sh` — food at a set distance in a random maze, trail and no-trail arms paired
- `tools/export-trace.sh`, `tools/export-curated.py` — one run → a trace the hosted Maze Simulator replays
- `tools/summarize.sh` → `tools/summarize-run.ts` — game record → 8 KB interpreted summary
- `tools/README.md` — every tool, which are parked and why, and the simulator traps that distort results
- `results/` — headless sweep output (the evidence), indexed in `research/run-log.md`
- `traces/` — 20 curated runs, one per experiment, loadable in the hosted Maze Simulator

There is no build, lint, or test setup here — the "code" is analysis scripts over records.

### Working norms

Evidence discipline matters more than volume here. A single run is a **seed** for a hypothesis,
never a result: the colonies differ in more ways than one, the player edits doctrine mid-run, and
n=1 on a seeded stochastic sim says little. When writing a claim into `research/model.md`, state
the confound and give a *discriminating test* — a configuration whose outcome differs depending on
whether the hypothesis holds. Prefer runs that vary one parameter with a static doctrine; live
doctrine editing is fun to play but destroys the comparison.

Score experiments on **food delivered, paired on seed against a no-trail twin** (the coordination
bonus), not win/loss. Before reading any ratio, check it is not censored: that the food cannot run
out (use `--perSource 50000`) and that the run is long enough for small colonies to form trails
(record a series, or run 18000+ ticks). Both censors have produced retracted findings here. Because this is a collaborative hackathon, bias toward artifacts
others can pick up: shared tooling, a consistent capture protocol, and specs worth sending upstream
to `stigsim` beat another private run record.

**Define every symbol on first use, and prefer plain English in prose.** We ended day 1 with four
names for one number. One canonical name per concept, recorded in `research/glossary.md`; symbols
belong in tables and formulas, not in sentences.

**Decode records through sim-core, not by hand.** The semantics are upstream and authoritative:
`packages/sim-core/src/topology.ts` (the four named topologies), `src/topology-choices.ts`
(`choiceFor()` names a topology), `src/doctrine-presets.ts` (six named doctrines), and
`packages/sim-trace/src/replay.ts` (`Replayer` re-runs a record deterministically at full tick
resolution, far beyond the sampled channels). Do not hand-write a JSON Schema — the TypeScript
types already are one, and a copy would drift.

⚠ `topology.provenance` is **not** an ant-facing identity mechanism. Source: *"Keep a
spoiler-colony → target sublayer for spectators and metrics. Ants never read it."* It is the
researcher's measurement instrument for forgery, never a defence agents can use.

## Session protocol

**At the start of every session, read the most recent file in `log/`** before touching anything
else. It carries the current priority, the open blockers, and — most importantly — the list of
corrections already made, so the same wrong turns are not taken twice. Skim the previous entry too
if the latest one is terse.

**At the end of every session, write or update `log/YYYY-MM-DD.md`.** Append to the day's file if
one already exists rather than creating a second. Keep it to these sections:

1. **Start here next session** — the single next action, concrete enough to begin without rereading
   anything. Name the tool and the flag.
2. **What got built** — new tools or docs, one line each.
3. **What we learnt** — findings, with the numbers and the n. Say what is supported and what is
   suggestive.
4. **Corrections made along the way — do not re-make these** — every wrong turn, measurement
   artifact and false start, stated plainly. This is the highest-value section; it is what stops the
   next session repeating a dead end. Include ours *and* any the user corrected.
5. **Open / blocked** — what cannot proceed and what it is waiting on.
6. **Housekeeping** — anything left in an unresolved state, especially uncommitted or unasked
   decisions.

Write it for someone with no memory of the session. Prefer the specific number over the adjective.
Record failures and confounded results as prominently as successes — `results/horizon-tau-ref.json`
is kept precisely because it is confounded, and the log says so.

## Working with run records

Files are large (~5.5 MB each). **Never `cat` or `Read` a whole record** — it will blow out context.
Start with the summarizer, which decodes through stigsim's own vocabulary (topology and doctrines
by name) and computes the derived measures the hypotheses cite:

```bash
./tools/summarize.sh <file>.run.json           # human-readable
./tools/summarize.sh <file>.run.json --json    # 8 KB summary artifact
```

It needs stigsim's toolchain (`pnpm install` in that checkout; override the location with
`STIGSIM_DIR`). For anything finer than the sampled channels, `createWarReplay()` re-runs a record
deterministically at full tick resolution. Ad-hoc extraction:

```bash
# top-level shape
jq 'to_entries | map({(.key): (.value|type)}) | add' <file>.run.json

# outcome only
jq '.outcome.data' <file>.run.json

# every Nth metrics sample, projected
jq -c '.channels.metrics.samples[] | select(.t % 500 == 0)
       | {t, pop: [.data.colonies[].population], food: [.data.colonies[].foodCollected]}' \
   <file>.run.json
```

Filename convention: `stigsim-<mode>-<masterSeed>-<endTick>.run.json`
(e.g. `stigsim-war-velvet-ridge-4071-7769.run.json` → mode `war`, seed `velvet-ridge-4071`, ended tick 7769).

## Record structure

```
format "stigsim-run-record", version, simVersion, createdAt, endTick
mode          { id, version, config: { settings, doctrines[], rules } }
participants  [{ id, kind: player|bot, slot: colony-N }]
commands      [{ t, sequence, source, cmd }]            # ordered input log, replay-driving
fingerprints  [{ t, h }]                                 # state hashes every 500 ticks
channels      { metrics, agents, fields }                # each: { version, interval, capacity, truncated, samples[] }
outcome       { version, data: { winner, tick, colonies[] } }
```

`commands` + `mode.config` + `masterSeed` are the *authoritative* inputs; the three `channels` are
sampled observability traces at different rates and are lossy by design. Check `truncated` before
trusting a channel as complete.

- **metrics** (every 10 ticks) — `{ result, foodRemaining[], colonies[] }`, the per-colony stat block
  (`population, foodCollected, reserve, hatching, searching, carrying, retreating, waiting,
  lowEnergy, births, deaths, doctrineChanged, doctrineAdopted`). Same shape as `outcome.data.colonies`.
- **agents** (every 50 ticks) — per-ant snapshots: pixel `x/y`, cell `cx/cy`, target `tx/ty`,
  `hasFood`, `phase` (searching/returning/…), `energy`, `role` (forager/spoiler), `doctrineVersion`.
- **fields** (every 250 ticks) — pheromone grids per colony, flat row-major arrays of 961 floats
  (**31×31 grid**): `home`, `food`, `caut` (cautionary). Values are clamped to `settings.tankMax`.

## Simulation concepts needed to read a record

- **Doctrine** — a colony's behaviour policy, versioned (`v`) and hot-swappable mid-run via the
  `set-doctrine` command (the only command kind seen so far). Shape:
  `{ forager, spoiler, spoilerFraction, mimicRate, evapRate }`, where each role has
  `follow[phase][field][own|enemy]` (pheromone attraction weights) and
  `lay[phase][field][own|mimic]` (deposition weights), `phase` ∈ `searching|returning`,
  `field` ∈ `home|food`. `mode.config.doctrines[i]` is colony *i*'s starting doctrine; each
  `set-doctrine` in `commands` supersedes it from tick `t` onward.
- **settings** — `masterSeed` (determinism), `startingAnts`, `loopRate`, `foodSources`/`foodPerSource`,
  `tankMax`, `layout` (e.g. `mirrored`), `adoption` (e.g. `instant`), and `topology`
  (`read`, `mimicEnemy`, `visible.{home,food}`, `maxMimicRate`, `provenance`) — the topology block
  decides what a colony can sense and whether it can forge enemy trails.
- **rules** — the energy/reproduction economy (`maxEnergy`, `retreatEnergy`, `minDepartEnergy`,
  `moveEnergyCost`, `waitEnergyCost`, `energyPerFood`, `foodDeliveryValue`, `reproductionCost`,
  `hatchSteps`, …). Ant behaviour in `agents` samples only makes sense against these thresholds.

## Cross-repo work

If a task needs the simulator itself (running a replay, changing the record writer, reproducing a
run), that work belongs in the `stigsim` checkout, which has its own `CLAUDE.md`, `README.md`,
`CONTRIBUTING.md` and `status.md`. Read those there rather than inferring behaviour from records.
