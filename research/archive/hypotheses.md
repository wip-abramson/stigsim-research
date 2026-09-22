# Hypothesis register

Framing lives in [`programme.md`](programme.md): stigmergic systems are secured by **bounding the
influence of traces in time and space**, not by identifying agents. Each hypothesis below is tagged
with which influence bound it bears on.

Status: `seed` (from one run, untested) · `testing` · `supported` · `refuted`

Each entry needs a **discriminating test** — a run configuration whose outcome differs depending
on whether the hypothesis holds. "Play more games" is not a test.

> **All five are seeded by a single run**, `velvet-ridge-4071`. That run was a game, not an
> experiment: the player edited doctrine 26 times mid-run, so colony 0 is not a clean control.
> Treat everything here as a question with evidence attached, not a finding.

---

## H1 — Trail parasitism is a trap, not a free ride
**Status:** seed · **Bound:** referential · **Evidence:** `velvet-ridge-4071`

> **Why it matters to the thesis:** colony 1 was a free-rider on colony 0's information, and it was
> punished — with no detection, no exclusion, and no way to tell whose trace was whose. If this
> holds, the environment makes a class of defection unprofitable *endogenously*. That is
> "robust despite defectors" with the enforcement mechanism removed entirely.

The two colonies started identical on *every* doctrine key except one:

| key | colony 0 (player) | colony 1 (bot) |
|---|---|---|
| `forager.follow.searching.food.enemy` | 0 | **3** |

Colony 1 — the one configured to follow enemy food trails — collected 222 food to colony 0's 776
and went extinct. Reading enemy food trails should be free information (topology `read: separable`,
`visible.food: true`, no cost modelled). Instead it appears to be actively harmful: an enemy food
trail points at a source the enemy is *already draining*, so followers arrive late, find it empty,
and pay the full travel energy for nothing. Worse, it is self-reinforcing — the parasite lays its
own food pheromone on the way out, recruiting more of its colony down the same dry path.

**Confound:** colony 0 also received 26 live doctrine edits from the player; colony 1 was static.
This is suggestive, not controlled.

**Test:** mirrored layout, same seed, both colonies static and identical except
`follow.searching.food.enemy ∈ {0, 3}`, no live edits. Repeat across ≥5 seeds. If H1 holds, the
`enemy=3` colony loses the food-share race consistently. Then sweep the weight (0/1/2/3/5) to see
whether there is a benign low-weight regime or whether it is monotonically bad.

---

## H2 — Starvation is an absorbing state entered while food is still abundant
**Status:** seed · **Bound:** throughput · **Evidence:** `velvet-ridge-4071`, colony 1

> **Why it matters to the thesis:** the energy budget is a throughput bound — laying a trace costs
> metabolic work, which rate-limits any agent including a spammer. This run shows the bound has a
> dark side: it is also what makes coordination collapse *irreversible*. Any design-properties list
> that recommends metabolic cost as a defense has to price this in.

Colony 1 died at t=7769 but was functionally dead at **t≈1500**, with 400+ of 1000 food still
in the world. Mechanism, dated from the record:

| t | food left | ants able to depart (energy ≥ `minDepartEnergy` 1120) | food collected |
|---|---|---|---|
| 1200 | 510 | 102 / 103 | 200 |
| 1600 | 398 | **13 / 103** | 200 |
| 2800 | 165 | **0 / 103** | 201 |

Once colony reserve hits 0 and mean ant energy falls below `minDepartEnergy`, ants must wait to
be fed, but nothing can feed them because feeding requires departing. Population froze at exactly
103 for ~2000 ticks — no births, no deaths, no foraging. The colony collected **4 food in 2200
ticks** while a third of the map's supply sat unclaimed.

**Why it matters:** the interesting failure in a stigmergic system here is not losing a fight, it
is a *coordination collapse under an energy budget* — the trail network cannot be rebuilt because
rebuilding it costs the very energy the network was supposed to supply.

**Test:** instrument the crossing point. Sweep `startingAnts` and `loopRate` and record the tick at
which `reserve → 0` and the fraction able to depart. Predict: there is a sharp threshold, not a
gradient, and it is crossed long before any visible symptom in population count.

---

## H3 — Pheromone field mass is a leading indicator of colony death
**Status:** seed · **Bound:** — (observable) · **Evidence:** `velvet-ridge-4071`

> **Why it matters to the thesis:** this is the measurement instrument the other hypotheses need.
> Win/loss is too coarse to detect partial degradation under attack (see H4); Σfield gives a
> continuous health signal computed *from the medium alone*, without inspecting any agent — which
> is fitting, given the thesis.

Summed pheromone across colony 1's grid collapsed **96%** between t=1000 and t=2000
(home 211,036 → 8,255; food 13,826 → 169). Its population did not start falling until t≈3500 —
roughly **1500 ticks later**. Population is a lagging indicator; the trail network dissolves first.

Suggestive detail: at t=1000 colony 1 had *more* than double colony 0's home-trail mass
(211k vs 103k) shortly before collapsing. Over-laying may itself be a symptom — or a cause.

**Test:** compute Σfield per colony per `fields` sample across many runs; check whether
d(Σfield)/dt crossing some negative threshold predicts extinction, and with what lead time.
Cheap to do — `tools/digest.py` already prints the totals.

---

## H4 — "War" mode is a commons race, and the endgame is decided long before it ends
**Status:** seed · **Bound:** — (methodological) · **Evidence:** `velvet-ridge-4071`

> **Why it matters to the thesis:** methodological warning. If the winner is determined at the
> exhaustion tick, then win/loss carries almost no information about robustness, and 58% of every
> run is wasted wall-clock. Score experiments on food-at-exhaustion instead.

The food pool (5 × 200 = 1000) hit zero at **t=3210**, 41% into a 7769-tick run. Neither colony
recorded a single death before then, and at t=2000 the two colonies' ants overlapped on exactly
**1 grid cell** — they barely met. There was no fight. Final food split 776 / 222 ≈ the final
survival margin.

So "winning" meant capturing 78% of a shared finite pool and then starving more slowly than the
opponent. The last 4500 ticks were an uncontested death march — and the player evidently knew it:
their **last doctrine edit was t=3284**, 74 ticks after the pool emptied. They stopped playing when
the game stopped being playable.

**Test:** across runs, does share-of-pool-at-exhaustion predict the winner with ~100% accuracy? If
so, everything after exhaustion is decoration, and run length is mostly wasted wall-clock.

---

## H5 — Trail fidelity and evaporation form a ridge, not two independent knobs
**Status:** tested once, **underpowered — undecided** · **Bound:** temporal
**Evidence:** player behaviour in `velvet-ridge-4071`; `results/surface-evap-follow.json` via `tools/surface.sh`

> **2026-09-22.** The 4 × 11 × 16-seed surface was run. The *fidelity* main effect is large and
> real — median food 57 at n=0.5 → 448 at n=3, saturating around n ≈ 2.5–4, mild decline after. The
> *evaporation* main effect (marginal medians 228 → 358) and the interaction that H5 is actually
> about both sit **inside the within-cell seed spread** (at n=4 the 16 seeds span IQR 40–560 food).
> The instrument cannot resolve a ridge at this n, so H5 is neither supported nor falsified.
>
> **The cause is a design flaw, and it is fixable:** `layout: "random"` means the seed changes
> *where the three food sources are*, so seed variance moves yield more than any parameter being
> swept. Re-run with a fixed food layout across seeds, or with several hundred seeds. Note the
> twin-run impulse design does not have this problem — both twins share a layout, so it cancels by
> construction. Measure differences, not absolutes.
>
> Note also that the capture half of the same plane is *clean* (E9, under H7), so the two knobs are
> already known to be separable **for p_capture**. H5's remaining live claim is only about yield.

> **Why it matters to the thesis:** `evapRate` *is* the time bound — the central security knob. If
> its best value depends on how strongly agents trust traces, then tightening the bound for
> security has a coordination cost, and the exchange rate between the two is measurable. That
> trade-off curve is arguably the headline result this programme could produce.

26 doctrine edits, and essentially all of them moved just two things — and the player *never*
touched the first as a single value: `follow.searching.food.own` and `follow.returning.home.own`
were changed **together, to the same number, every single time**. Call that one knob, *trail
fidelity*. The other was `evapRate`.

Both oscillated rather than converged:

- fidelity: 5 → 7 → 8 → 2 → 1 → 4.5 → 5 → 8 → 5 → 2.5 → 2 → 3.5 → 5.5 → 3.5 → **4**
- evapRate: .005 → .01 → .003 → … → .02 → .011 → .01 → .02 → **.008**

That is the signature of hill-climbing on a ridge: each knob's best value depends on the other, so
moving one alone always feels slightly wrong. Mechanistically plausible — high fidelity with low
evaporation locks the colony onto a *depleted* source, because the trail outlives the food.

**Test:** static 5×5 sweep of fidelity × evapRate against a fixed opponent, single seed first, then
replicated. Plot food-collected-at-exhaustion as a surface. Predict a diagonal ridge, not a peak.

---

## H6 — Place-based reputation without agent identity
**Status:** unseeded · **Bound:** temporal + spatial

The `caut` (cautionary) channel exists in every record and held **zero for the entire run**. A
negative trace channel is the most direct instantiation of the thesis available: you cannot
blacklist an ant, but you can mark a *location* as bad — and the mark decays like any other trace,
so a false accusation is self-limiting in exactly the way a permanent reputation record is not.

**Test:** needs the channel to be reachable at all. First establish what writes `caut` in the
hosted build. Then: under forgery, does a colony that lays caution on depleted or trapped cells
recover faster than one that does not? Compare against `provenance: true` as the identity baseline.

---

## H7 — A lone trace is either ignored entirely or captures the whole colony
**Status:** supported (n=800) — and, after E9, **not an artifact of the choice rule after all.**
**Bound:** temporal + throughput
**Evidence:** `results/impulse-empty-8seeds.json`, `results/impulse-follow-plane.json`, via `tools/impulse.sh`

> **E9 correction (2026-09-22).** We expected the bimodality to be the canonical pitchfork under
> stigsim's Deneubourg rule (`score.ts` computes `Π (pheromone+1)^follow`, k=1, n = the follow
> weight), and therefore to vanish below a critical exponent. **It does not.** Sweeping
> n ∈ {0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 12} × 4 evaporation rates × 16 seeds = 768 twin runs,
> `read` and `captured` remain the same event at **every** exponent — including n = 0.5 and n = 1,
> where the rule is sub-linear or linear and the pitchfork should not exist. Only 9 of 768 runs
> landed in the middle band (9 of the 704 runs at n ≥ 0.5). So the all-or-nothing outcome is **not** produced by the non-linearity,
> and the literature critique's explanation does not hold for this system. See E9 below for what
> *does* move with n.

Two identical simulations from one seed; at t=1500 one receives **a single extra pheromone deposit
in a single cell** on otherwise-quiet ground ~10 cells from the nest. Everything afterwards is the
influence of that one trace. 8 seeds × 4 evaporation rates.

**In all 32 runs, `read` and `captured` were the same event.** There was not one run where an ant
sensed the trace and the effect stayed small:

| outcome | what happened | n |
|---|---|---|
| never read | field reconverges to ~0; **not one ant ever changed course** | 24 |
| read | 50–100% of the colony diverges (median 98%), 17–28 cells, permanently | 8 |

Note this measures the **magnitude** of influence, not harm — see the coin-flip section below.

The 31×31 map means a captured radius of 17–28 cells is most of the world. Non-captured runs
reconverge to *exactly* zero and stay there for thousands of ticks — so the sim is not chaotic, and
divergence only ever follows genuine discovery. The causal chain is clean.

### But the direction is a coin flip

Capture is **not** damage. Across the 8 captured runs, food collected versus control:

| effect on the colony | n | range |
|---|---|---|
| helped | 4 | up to 94 more food |
| hurt | 3 | up to 69 less food |
| neutral | 1 | — |

In the narrated run (`impulse-4`, evap 0.01) the injected lie *doubled* the colony's food, 41 → 85:
it pushed an ant somewhere it would not otherwise have gone, and that direction happened to pay.

> An attacker can reliably **redirect** a stigmergic system but cannot reliably **steer** it. The
> trace controls where agents look; the world controls what they find when they arrive.

This is the referential bound (see the taxonomy in `programme.md`) doing the security work. A false
trace is only a *pointer* — reality adjudicates on arrival, and the attacker does not control
reality. To cause reliable harm the attacker needs the **environment** to supply the harm: a trap, a
dead end, somewhere genuinely costly. Being sent to a random empty cell is about as good as whatever
the ant was doing anyway.

**This is the sharpest follow-up available:** inject a trace pointing somewhere genuinely costly and
see whether the effect becomes reliably negative. That is the difference between an attack that
consumes attention and one that does damage, and it decides how much the referential bound is
really protecting.

### A narrated run

`impulse-4`, evap 0.01, injecting 1000 units of "food" at cell (6,5) — empty ground, 9 cells from
the nest at (1,1), with the nearest real food 18 cells further at (6,23). A pure lie.

| phase | ticks | what happens |
|---|---|---|
| decay | 1500–1954 | `l1` 366 → 18, exactly `0.99^t`. One cell differs. **No ant has read it.** |
| read | 1954 | ant #11, one cell away, turns differently. The trace is down to **~10 of the original 1000 units** — read at the last possible moment. |
| latency | 1954–2100 | still one ant. `l1` → 2. The trace itself is now gone. |
| cascade | 2100–2200 | `l1` 2 → 3030, cells 1 → 48, radius 0 → 24, **ants 1 → 29**. |
| saturation | 2600 | 40/40 ants, 394 cells. |

Note what propagated: the original trace was dead *before* the cascade began. What spread was the
colony's **response** to it — ant #11's own deposits along its new path. The lie was a seed, not a
signal.

### What this does to the thesis

> The medium does **not** bound the magnitude of an individual's influence. It bounds the
> **probability** that an individual's influence takes hold. Robustness here is statistical, not
> mechanical.

That is a real complication, and a more useful one than confirmation would have been. Conditional
on being read, one trace's influence is total: whole-colony and permanent. What protects the colony
is that a given trace is usually never read at all (24/32 here).

The security consequence follows immediately: **an attacker who repeats converts a low per-attempt
probability into near-certainty.** If capture is ~25% per attempt, four attempts is ~68%, ten is
~94%. So the defence cannot rest on decay — it has to rest on the **throughput bound**: how many
traces an agent can lay per unit time, which is set by the ant's tank and its travel cost.
Evaporation governs how long you must wait between attempts, not how much any one attempt can do.

**Design claim:** rate-limit attempts; do not rely on forgetting.

### Secondary observations (weaker — conditional on only 1–3 captures per rate)

- `captureTick` falls monotonically with evaporation: 2750 → 1200 → 233 → 100 ticks as `evapRate`
  goes 0.003 → 0.02. Plausible mechanism: slow decay keeps the colony locked onto established
  trails, so it takes far longer to stumble on anything new. Rigidity delays discovery rather than
  preventing it.
- Capture *rate* did not vary meaningfully with evaporation (2, 1, 3, 2 of 8) — n is far too small
  to claim an effect either way.
- **The D_max prediction is not supported by this experiment** — impulse radius does not track
  1/(8·evapRate), if anything running the other way. D_max is about *sustaining* a trail over
  distance, which is a different measurement (experiments tier 2); this neither confirms nor
  refutes it.

### The three follow-ups that matter

1. **Repeat attempts.** Inject *k* traces and check whether capture follows 1−(1−p)^k. If it does,
   security is entirely a rate-limiting question and the claim above is settled.
2. **Vary the amount.** Does a smaller deposit have lower capture probability, or is there a
   threshold? If probability scales with magnitude, individual magnitude matters after all.
3. **Vary distance from nest.** Capture probability as a function of distance is *the* influence
   -versus-distance curve — the direct measurement of the bound this programme is named after.

---

### E9 — the choice exponent is a latency dial, not a robustness dial

`results/impulse-follow-plane.json`. 768 twin runs, identical conditions to the 8-seed baseline
(which it reproduces seed-for-seed as its n=5 sub-row, so the two are one dataset).

First four columns from `impulse-follow-plane.json` (64 twin runs per row, pooled over the four
evaporation rates). The yield column is from `surface-evap-follow.json`, the same plane run without
the impulse — it is context, not part of the same measurement.

| n | p_capture | time to capture (ticks, conditional) | ants moved (conditional) | median food @5500 |
|---|---|---|---|---|
| 0.5 | 59% | 163 | 100% | 57 |
| 1 | **69%** | 141 | 99% | 120 |
| 1.5 | 63% | 105 | 99% | 233 |
| 2 | 45% | 110 | 92% | 378 |
| 3 | 50% | 300 | 87% | 448 |
| 5 | 47% | 483 | 87% | 385 |
| 8 | 45% | 569 | 95% | 339 |
| 12 | 50% | 566 | 91% | 398 |

Three things fall out, and the first two were not predicted:

1. **There is no threshold.** p_capture is *highest* at low n and settles onto a ~47% plateau for
   n ≥ 2. It decreases with the exponent where the pitchfork predicts it should increase.
2. **The exponent is not a trade-off.** Raising n from 1 to 3 roughly *quadruples* yield
   (120 → 448) while *lowering* capture probability (69% → 50%). Over the useful range the
   non-linearity is free — it buys coordination and robustness together. A colony at n ≈ 1 is not
   a hardened colony; it is a colony with no trail structure to capture, which is why a lone blob
   is the only feature in its field and every ant goes to it.
3. **What n actually buys is time.** Time-to-capture rises monotonically, **141 → 566 ticks**, a
   4× delay from n=1 to n=12, and it is the only measure that moves cleanly with the exponent. A
   high exponent does not prevent a false trace from taking the colony; it makes the colony slow to
   be taken. That is a detection window, and it is the useful security reading of the parameter.

**p_capture is flat in evaporation at every exponent** (e.g. at n=1: 11, 10, 11, 12 of 16 across
evap 0.003–0.02). Combined with the strong n dependence, **`evapRate` and the choice exponent are
separable for capture probability** — which falsifies [H3](#) in its strong form on this axis, and
per `critique-response.md` that is the more useful outcome: latency-based robustness can be bought
without paying in reach.

**n = 0 is a degenerate control, not a data point.** With both follow weights zero, `scoreCell`
skips every channel and returns 1 uniformly — and because odor is added *inside* the power, the ant
cannot smell food either. It is a blind random walk (still 79 food by t=5500 on a 31×31 map). Its
p_capture = 0 is trivially true and says nothing about linear recruitment.

**Still open:** only one distance (10 cells) and one deposit magnitude (1000). The latency finding
is the one to push — does the 4× window scale with distance, and is it long enough to matter?

---

## H8 — Discovery is unbounded; coordination is not (the coordination horizon)
**Status:** supported (n=96) — a *formalisation* of a limit known separately in foraging biology,
ACO and epidemic models, not a new phenomenon. The `D_max` form was wrong: reach scales with the
**passage interval of reinforcing agents**, so colony size belongs in it (E6).
**Bound:** temporal + spatial
**Evidence:** `results/horizon-24seeds.json` · full treatment in [`coordination-horizon.md`](coordination-horizon.md)

One colony, one food source, 24 seeds × 4 evaporation rates, distance measured by BFS and binned.

| distance | found it | exploited it | mean share delivered |
|---|---|---|---|
| 0–14 | 4/4 | 4/4 | 1.00 |
| 15–29 | 20/20 | 20/20 | 0.97 |
| 30–44 | 24/24 | 17/24 | 0.58 |
| 45–59 | 28/28 | 15/28 | 0.37 |
| 60–74 | 16/16 | 5/16 | 0.08 |
| 75–89 | 4/4 | **0/4** | 0.05 |

**All 96 runs found the food, at every distance.** What failed was organising around it. At 75+
cells the colony knew where the food was and could not act on it.

Coordination at distance *D* needs `min(τ_phys, τ_ref) > τ_act(D)`, where τ_act ≈ 8D ticks,
τ_phys ≈ 1/evapRate, and τ_ref is how long the fact stays true. τ_ref is not tunable, so there is a
hard horizon. **τ_ref remains untested** — the `foodPerSource` sweep was confounded and proves
nothing; see the doc.

Evaporation binds only in the middle band (45–59 cells: 6/7, 5/7, 2/7, 2/7 across evap 0.003→0.02).
The `D_max ≈ 1/(8·evapRate)` scaling holds in ordering but underestimates reach 2–4×, because a
trail is sustained by many ants reinforcing, not one deposit decaying.

**Why it matters:** this is the price of H7's robustness. The bound that stops a trace taking hold
is the bound that stops coordination reaching — one mechanism, two sides. "How much security can you
afford" becomes answerable in cells.

---

## Unexplored — the whole adversarial half of the game
`spoilerFraction` and `mimicRate` were **0 for the entire run**, so the `spoiler` role never
deployed and no trail forgery happened; `topology.mimicEnemy` was false, disabling it anyway. Every
hypothesis H1–H5 concerns *foraging under scarcity*, not security. The deception mechanics are
where the thesis actually gets tested, and nothing has touched them.

H1 is the natural bridge: if merely *reading* enemy trails is already self-harming, then *writing*
false ones may be cheap and devastating — or may be equally self-limiting, since a forged food
trail also misdirects whoever follows it toward a place the forger must then defend. Worth
predicting before running.

**Before designing any of this, resolve the tooling gap in [`programme.md`](programme.md#-tooling-gap-that-blocks-this)** —
the local stigsim checkout does not contain these knobs, and it is unconfirmed that the hosted
build wires them to behaviour.
