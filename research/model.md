# The model

> **Coordination is bounded not by how far a thing is, but by how many choices lie between you and
> it — and by whether each agent can afford to keep marking the way.** Distance is a throughput
> problem the geometry already solves. Decisions are the coordination problem. And what a colony
> pays for a decision is **time to organise**, not a ceiling on what it can organise: almost every
> "horizon" measured here so far moved when the clock was given more room. This page is the whole
> account; everything else is evidence for it.

Revised 2026-09-22 (evening, second pass): the ridge of §4d was a food-cap artifact and is retracted
there; the comb experiment (§3b) measures decisions directly; and §4e shows the far side of the
horizon is a time budget.

Rewritten 2026-09-22 to replace a chronological pile of rungs. Organised by mechanism, not by the
order things were run. Every number here is from `results/`, indexed in [`run-log.md`](run-log.md).

---

## Four terms

| term | means |
|---|---|
| **decision** | a cell with three or more exits. An ant reads only its four orthogonal neighbours and drops the one it just left, so in a corridor it has exactly one option and pheromone is **irrelevant** |
| **influence budget** | how much trail one agent can lay before running dry — `tankMax`, the simulator's *gland size*. Refilled only at the nest or on picking up real food, so it is a rate limit denominated in work, not a lifetime total |
| **coordination horizon** D\* | where a colony does no better than the same number of agents that never communicate |
| **discovery** | finding the thing at all. Here it is random search, and it is *not* the interesting part |

---

## The variables

| variable | controls | in stigsim | status |
|---|---|---|---|
| decision density | how often an ant has a choice | `loopRate` | **swept** 0 → 1.0. The strongest single predictor |
| colony size *N* | traffic, and how much reinforcement a choice gets | `numAnts` | **swept** 10 → 160 |
| influence budget | trail per journey | `tankMax` (gland size) | **swept** 300 → 51 200. Has a geometric floor |
| evaporation *e* | how fast a trace fades | `doctrine.evapRate` | **swept** 0.0005 → 0.05. A cliff, not a curve |
| trail trust *n* | how strongly an ant prefers a stronger cell, `(scent+1)^n` | forager follow weight | swept once; does not gate the result. **Next to look at** |
| agent speed | converts time to distance: 4 ticks/cell | `V`, `CELL` | fixed by the engine |
| deposit rate | **60 units per cell** — 3 deposits × `DEPOSIT_RATE` 20 | `DEPOSITS_PER_CELL` | fixed |

**Operating point for single-variable work:** `loopRate` 0.12, 40 ants, food 40 cells out, 2500
units, 6000 ticks. Runs at 58% of its throughput ceiling — room to improve and room to fail.

---

## 1. Discovery is free. Coordination is not.

96 of 96 runs found the food, at every distance and every decay rate. What collapsed with distance
was organising around it (1.00 → 0.05 delivered across six distance bins).

This is not a fact about stigmergy. `odor()` fires only on the *exact* food cell — there is no
gradient at range — so discovery is pure coverage, and 40 ants over 6000 ticks cover a 31×31 maze
regardless of distance. It is what makes a **no-trail colony** the honest baseline rather than a
strawman.

## 2. Distance is a throughput problem, not a coordination one

In a perfect maze the coordinated and uncoordinated arms deliver *identically* out to 30 cells —
740/740, 370/370, 240/240. Both are pinned to the same physical limit. An ant walking a round trip
of 2*d* cells at 4 ticks each makes `T/8d` deliveries, so a colony manages:

$$\text{ceiling} = \frac{N \cdot T}{8d} = \frac{750N}{d}\ \text{(at } T = 6000)$$

Every cell in the table matches. **One route means nothing to learn, so trails cannot beat the
conveyor belt.** Stigmergy only appears past ~30 cells, where a wanderer starts failing to complete
the round trip at all.

## 3. Decisions are the coordination problem

An ant senses four cells. At `loopRate` 0.12 — where all the early work was run — **76% of cells
offer no choice at all**. `loopRate` is therefore the decision-density dial:

| loopRate | path | decisions | cells per decision |
|---|---|---|---|
| 0 | 136 cells | 5 | 25.8 |
| 0.12 | 44 | 12 | 3.5 |
| 1.0 | 23 | 23 | 1.0 |

Sweeping it decouples distance from decisions (r = −0.14, where within one maze they are nearly
proportional). Holding one and moving the other:

- **at matched distance, decisions swing success 93% → 38%**, monotonically
- **at matched decisions, distance swings it 98% → 71%**, and not monotonically
- decisions carry roughly **twice** the explanatory power (pseudo-R² 0.138 vs 0.070)

At 55 cells a perfect maze has **1** decision and a branchy one **16**. That 16× costs an
uncoordinated colony **13.7×** — close to proportional, and flat across an 8× range of colony size,
so it is a property of the problem. It costs a stigmergic colony **2.9×**.

> **Stigmergy is a mechanism for absorbing decision complexity.** It takes a ~14× penalty down to
> ~3×.

## 3b. Junctions, measured directly — the comb

Every random-maze sweep confounds distance with decision count, and the seed moves the food. The
comb removes both (`tools/junctions.sh`, `results/comb-*.json`, 3,456 runs): a hand-built 40-cell
corridor from nest to food with *k* dead-end side branches of 8 cells, identical across seeds, so the
seed varies only the ants. An ant never reverses in a corridor, so at *k* = 0 a no-trail ant walks
straight there and back; at each T-junction with no scent it flips a coin. Both facts are visible
in the data and act as built-in checks: at *k* = 0 the two arms are **identical at every colony
size** (180/180 … 2880/2880, the conveyor ceiling to within 4%), and the null arm's wrong-turn rate
is **50% in every cell**.

| bonus, 40 cells | N=10 | N=20 | N=40 | N=80 | N=160 |
|---|---|---|---|---|---|
| 0 junctions | 1.00× | 1.00× | 1.00× | 1.00× | 1.00× |
| 2 | 2.32× | 2.30× | 2.31× | 2.30× | 2.29× |
| 4 | 4.13× | 4.10× | 4.20× | 4.35× | 4.22× |
| 6 | *3.35×* | 6.37× | 6.92× | 7.00× | 7.07× |
| 8 | *2.50×* | *7.64×* | 10.2× | 10.4× | 10.5× |
| 12 | *1.12×* | *2.26×* | *11.0×* | 19.2× | 21.3× |

Read across a row: **where the trail is established, the bonus does not depend on colony size at
all.** Ten ants and 160 ants get the same 2.3× from two junctions and the same 4.2× from four. The
trail colony's median round trip is the 80-step straight line in every established cell; the
null's grows 166 → 1207 steps. Read down a column: the bonus grows with junction count, and it grows
with the *cost* of a wrong turn — at six junctions, 3.7× / 4.6× / 6.4× / 8.6× as the dead end
lengthens 2 / 4 / 8 / 12 cells (`comb-branchlen.json`), again identical at 20, 40 and 80 ants.
Distance without junctions is worth nothing, and the same four junctions are worth slightly *less*
on a longer path (4.9× at 30 cells, 4.2× at 40) because they are a smaller share of the trip
(`comb-distance.json`).

The italic cells are where a small colony has **not** established a trail by tick 6000: the wrong
turn rate is 22–42% instead of 2%, and yield sits at 5–43% of ceiling. Given 18000 ticks
(`comb-longrun.json`), every one of them except *k* = 12 at N = 10 reaches ~100% of ceiling in
the final third, with the same late-window bonus as the big colonies (6.4–6.8× at six junctions,
9.6–10× at eight, 16.6–17× at twelve). Slowing evaporation four-fold does not help any of them
(`comb-slowevap.json`: paired wins 8–14, 9–14, 6–18 on the failing cells). **The one cell that
stays marginal at three times the budget is twelve junctions with ten ants**: trails form
transiently in 18 of 24 seeds and never hold; the colony runs at 9% of ceiling to the end.

> **What an extra ant buys is not a bigger bonus. It buys the trail sooner — and, past some
> decisions-per-ant threshold, the trail at all.** Where a trail exists, the value of stigmergy is
> set by the geometry (how many decisions, how much a wrong one costs) and by nothing about the
> colony.

## 4. What colony size does depends on whether there are decisions

| bonus at 55 cells | N=10 | N=20 | N=40 | N=80 | N=160 |
|---|---|---|---|---|---|
| perfect maze | 3.0× | 3.1× | 3.1× | 2.8× | **3.0×** |
| branchy maze | 2.3× | 13.3× | 16.3× | 17.7× | **18.0×** |

In a corridor the walls navigate for you, so trails are worth a flat multiple however many ants you
add. The branchy row *looks* like the value compounds with colony size. **It does not** — §3b shows
the bonus is N-independent wherever the trail is established, and §4e shows the small-colony cells
in this table are censored by the 6000-tick budget, not limited by distance. The 2.3× at N=10 is a
colony that had not finished organising when the run ended.

> Stigmergy's value is the value of **not getting lost at a junction**. Where there are none it is
> worth nothing extra; where there are many, it is worth a multiple set by the junctions — and a
> small colony takes longer to collect it.

Consistent with this: in a branchy maze, food scales as **N^1.99** with stigmergy against **N^1.08**
for the no-trail null — linear returns converted to quadratic. In a perfect maze, reach grows
+23/+37/+44 cells per doubling and the coordinated-vs-null gap stays **flat at ~65 cells**, because
food decays exponentially in distance (`L ≈ 45–52 cells`, R² 0.91–0.997) and a constant multiplier
buys only an additive shift.

## 4b. Headcount is the channel — not pheromone mass

The obvious reading of §4 is that colony size works *through* traffic: more ants, more pheromone per
tick, stronger trail. **That is false, and it was tested directly** (`results/traffic-match.json`,
480 runs paired on seed, via `tools/traffic.sh`).

Arms were built to hold `ants × lay gain` constant, with `tankMax` scaled alongside the gain so
cells-per-leg stayed at 106 — so the comparison is *not* confounded by the influence-budget floor of
§5. The match was verified by measuring standing field mass: pair A matches to within 2%.

| | comparison | result |
|---|---|---|
| **loudness alone** | 40 ants at gain 1 → gain 3 | **perfect null.** Median difference 0 food; 35 seeds better, 35 worse |
| **matched deposition** | 80 quiet ants vs 40 ants twice as loud | bigger colony wins **57 / 19** |
| **matched deposition** | 120 quiet vs 40 ants three times as loud | bigger colony wins **64 / 11** |

At 60–74 cells: making every ant 3× louder takes 32 food to 48. Tripling the *number* of ants takes
32 to 498.

> **Pheromone mass per tick is not the channel colony size acts through.** Tripling every ant's
> output changes nothing; tripling the ants changes everything. What more ants supply is more
> *independent traversals of the junction* — more chances to resolve a branch correctly and more
> agents to reinforce that resolution.

That is why §3 and §4 fit together: coordination is about resolving decisions, and only bodies at
junctions resolve them. Louder shouting at the same junction does not.

## 4c. What it costs a colony with no trails

`results/scaling-exponent.json`, 6,720 runs at 240 seeds. The intended statistic — a power-law
exponent for break-even colony size — **does not survive**: the full arm's exponent moves 1.48 →
1.83 as the target moves 20 → 40 food, so it is not a stable number and the full-vs-null difference
is undefined. Recorded as a failure.

What *is* stable: the **no-trail colony's break-even headcount grows exponentially in distance at
0.032 per cell** (R² 0.98–0.99 at both targets) — a doubling of required headcount every **~22
cells**. That is the cost curve stigmergy is up against.


## 4d. The ridge — retracted

The first version of this section reported that the coordination bonus peaks at a distance that
moves outward with colony size (35 cells at 96 ants, 45 at 192, 55 at 384) and called it a ridge.
**It was the food cap.** `breakeven-b2.json` ran with 2,500 units per source; the conveyor ceiling
`N·T/8d` exceeds that for every colony of 64+ ants at 15 cells and 128+ at 35, and the full arm sat
at the cap in 59–100% of seeds in exactly the cells that formed the "near side" of the ridge. A
capped numerator divided by a growing null is a ratio that falls with N and rises with distance —
the ridge, precisely.

Re-run with 50,000 units so nothing can cap (`results/breakeven-uncapped.json`, 3,520 runs, same
seeds — the two files agree run-for-run in every run whose source was never exhausted; the 117
that differ all sat at 2,147–2,499 in the old file, i.e. ran dry with ants still in transit):

| bonus | N=8 | N=16 | N=24 | N=32 | N=48 | N=64 | N=96 | N=128 | N=192 | N=256 | N=384 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 15 | 31.0× | 23.3× | 23.1× | 29.0× | 26.6× | 24.3× | 25.4× | 27.1× | 27.3× | 28.4× | 28.2× |
| 25 | 21.6× | 23.5× | 25.3× | 25.2× | 29.2× | 27.5× | 30.2× | 28.6× | 28.9× | 28.7× | 30.9× |
| 35 | 25.7× | 25.3× | 26.1× | 28.3× | 28.3× | 29.0× | 33.1× | 31.4× | 31.0× | 29.5× | 32.8× |
| 45 | *1.8×* | *8.7×* | *19.3×* | *9.2×* | *17.1×* | 24.4× | 28.3× | 28.4× | 30.7× | 30.6× | 28.5× |
| 55 | *1.7×* | *2.5×* | *11.2×* | *4.3×* | *17.3×* | *16.7×* | 22.0× | 26.1× | 24.8× | 24.2× | 22.9× |

There is no ridge. From 15 to 35 cells the bonus is a flat **23–33× at every colony size from 8 to
384 ants**, and the column peaks land at 35 cells for nine of eleven colony sizes. The only
structure left is the italic corner — small colonies at 45–55 cells — and §4e shows that corner is
the 6000-tick budget, not the distance. The largest colony still delivers 17,648 units at 15 cells,
92% of its ceiling, so nothing here is censored.

What survives from the retracted section: the failed pooled fit (R² = 0.19, D\* = 346 cells) was
correctly rejected, for the wrong reason. `tools/scaling.py` still reports per-N peaks and refuses
the pooled fit, which is the right behaviour on this data too — the peaks are simply all the same.

## 4c-bis. Loudness, re-tested clean

`results/loudness-uncapped.json` and `results/comb-loudness.json` (1,344 runs, no food cap, 18000
ticks) repeat §4b without its 500-unit cap. The null holds on both instruments: tripling every
ant's deposit (with the tank scaled so the trail stays 106 cells long) leaves delivery unchanged —
median per-seed ratio 1.00–1.05 — except at twelve comb junctions, where it is **worse** (0.65×,
behind on 18 of 23 differing seeds). Three times the ants, laying the same total scent as the loud
colony, beats it in 110 of 112 paired seeds. Louder ants do not take off sooner.

## 4e. The far side of the horizon is a time budget

Every sweep on this page ran for 6000 ticks. `results/horizon-longrun.json` (960 runs, 35–55 cells,
8–48 ants, food that cannot run out, delivery sampled every 1000 ticks) runs the small-colony cells
that read as "beyond the horizon" for three times as long.

| bonus at 55 cells | N=8 | N=16 | N=24 | N=32 | N=48 |
|---|---|---|---|---|---|
| by tick 6000 (the old number) | 1.7× | 2.5× | 11.2× | 4.3× | 17.3× |
| by tick 18000 | 2.1× | 8.7× | 20.2× | 13.5× | 21.0× |
| **ticks 12000–18000 only** | 2.5× | **16×** | **23×** | **22×** | **23×** |

Once established, the bonus at 45 and 55 cells is the same ~20–30× it is at 35 cells, for every
colony of 16 ants or more. What differs is **when**: median take-off at 55 cells is tick 2500 for
48 ants, 4500 for 16, and 16500 for 8 — and the share of seeds taken off keeps climbing with time
(N=8, 55 cells: 16% → 53% from tick 3000 to 18000). Slowing evaporation four-fold does *not* move
any of these cells (`horizon-evap-smallN.json`, paired wins negative in 13 of 15); speeding it up
four-fold breaks them (2–29, 3–29). The default decay rate is already on the plateau.

> **The "horizon" we measured was where the colony had not yet finished coordinating when the run
> ended.** It scales the way an establishment time should — up steeply with distance, down roughly
> with colony size — and not the way a trail-lifetime limit would.

Whether a *hard* limit exists further out, where establishment time diverges, is open. The comb's
twelve-junction/ten-ant cell (§3b) was the last candidate; at 54000 ticks it takes off in 19 of 24
seeds (median tick 22000) and earns the same 17× bonus as 20 ants (`comb-54k.json`).

## 5. The two knobs behave nothing alike

**Evaporation is a cliff.** Across a 24× range (0.0005 → 0.012) performance wanders between 318 and
486 and **not one difference survives a paired test**. Only the extreme is real: 0.005 beats 0.05 on
27 seeds of 32, collapsing to 5% of ceiling. A parameter this programme treated as central is
permissive almost everywhere.

**The influence budget is a geometric floor.** 1200 → 2400 jumps 63 → 550 units, **31 seed-wins of
32**. And the floor is predictable from the physics: an ant lays 60 units per cell, and the gland
refills at the nest *and* at the food, so it never covers a round trip — only one leg.

$$\text{floor} = d \times 60$$

**Replicated on the comb** (`comb-gland.json`), where distance is exact: the plateau begins at
tank 1800 for 30 cells and 2400 for 40, exactly `d × 60`. The comb shows **no** decay at very large
tanks, so the random-maze penalty below is maze-dependent.

**Predicted before the runs, not fitted after.** At 30 and 40 cells the steepest jump in the whole
curve lands exactly in the interval containing the prediction — ×3.07 at 1800 (28/32 seeds) and
×2.41 at 2400 (26/32). At 55 cells there is no step: that colony already runs at ~33% of its
throughput limit, so coordination caps it and the threshold is masked.

Above the floor, a long tolerant plateau, then slow decay — 9600 beats 51 200 on 25 of 27. An
over-supplied ant that never finds anything keeps broadcasting, painting noise into the field the
signal lives in.

---

## Where this leaves the security thesis

The programme began with: *stigmergic systems are secured without identifying agents, by bounding
how much influence any one trace can have.* Six sweeps of foundation later, that argument has
something it lacked — a quantity, and it is not the one we started with.

`evapRate` was the assumed security knob. It turns out to be weak, and it is a property of the
medium that no agent pays for.

The **influence budget** is the real one. It is per-agent, it is denominated in physical work
(refilled only by reaching the nest or genuinely finding food), and **a colony granted an unlimited
budget coordinates worse than one that is rationed.** The bound is not a defence you tolerate for
safety; it is load-bearing for the coordination itself, and the security property falls out of
something the system needs anyway.

And it has a size: **`d × 60`** — the budget a system must grant one agent is set by the distance it
needs to coordinate over. That is the original thesis arriving from the agent's side, with a number.

**Untested:** none of this has been run against an adversary that pays the same costs. The
`subvert.ts` harness exists for exactly that and has only been smoke-tested.

---

## What is wrong or unfinished

| claim | standing |
|---|---|
| λ = 1/(4e) as the influence bound | **broken.** It is an e-folding *convention*; at λ a lone mark on empty ground is still followed 100% of the time. Depending on the threshold it ranges 50 → 376 cells at one decay rate. Probably wants re-deriving in decisions, not cells |
| τ_ref — facts going stale on their own clock | **untestable in stigsim.** Needs food that expires on a timer. Best upstream request we have |
| trail trust *n* | swept once at `loopRate` 0.12; never revisited now that decisions are known to be the currency. A more sceptical colony should have a genuinely shorter influence bound |
| the adversarial half | **not started** under honest physics |
| the ridge (§4d) | **retracted** — a food-cap artifact; see the section |
| a hard horizon | **none found.** The last candidate (12 junctions, 10 ants) takes off in 19/24 seeds by tick 54000, median tick 22000 (`comb-54k.json`); 5/24 never did. Whether take-off time diverges needs more forks per path: a comb with 4-way crossings |
| superlinear returns to scale (N^1.99) | **retracted.** Where trails are established, food scales as N^1.0–1.1 with and without trails (`breakeven-uncapped`, comb). The steep slope was unfinished small colonies |
| the N-dependence of the bonus | **gone** where the trail is established (§3b). What N buys is establishment time, and the threshold below which a trail cannot be held at all. The decisions-per-ant form of that threshold is unmeasured |

---

## Corrections — do not re-make these

- **`DEPOSITS_PER_CELL = 3`, so an ant lays 60 units per cell, not 20.** Crossing a cell takes four
  movement ticks but the last arrives inside `ARRIVE_THRESH`. stigsim shipped this error once and
  left a note; we then made it independently.
- **The impulse harness bypasses the tank.** `field.add()` injects ~50 deposits' worth of influence
  from an attacker that never walked anywhere. It is a *free-attacker control*, not evidence about
  bounded influence.
- **`layout: "random"` means the seed moves the food.** Absolute-yield sweeps are swamped by it.
  Pair every treatment with a control on the same seed — **measure differences, not absolutes**.
- **Filtering to "unsaturated cells only" is biased** when which cells survive depends on the
  variable. Compare at a single point that is clean everywhere instead.
- **Use ≥16 seeds.** The same configuration read 25% on seeds 1–8 and 47% on 1–16.
- **`n = 0` is blindness, not scepticism** — odor is added inside the power, so a zero follow weight
  also blinds the ant to food.
- **The food cap produced the ridge.** At 2500 units the full arm was censored in 59–100% of seeds
  for 15–35 cells at 96+ ants, and the "peak moving outward with N" was the cap sliding down the
  table. Check the share of runs at cap before reading any ratio; the conveyor ceiling `N·T/8d`
  says in advance which cells will hit it.
- **6000 ticks censors small colonies at range.** Every small-N, far-distance cell read as "beyond
  the horizon" was a colony still bootstrapping. Record delivery as a series and read the late
  window, or run 3× longer, before calling anything a limit.
- **Slower evaporation is not a rescue.** Four-fold slower decay changed nothing in 13 of 15
  far-distance cells and nothing in the failing comb cells; the default is already on the plateau.
  Do not reach for `evapRate` to explain a small-colony failure.
- **Verify that an instrument can fail.** A screenshot harness reported "no console errors" for
  several versions while reading a variable that was never set; one missing paren had silently
  killed every chart on the page.
