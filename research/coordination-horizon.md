# The coordination horizon

> **Historical — this is the day-1 measurement and the argument built on it. Read
> [`model.md`](model.md) for the current account.** What still stands: discovery is 100% at every
> distance (96/96), so a no-trail colony is an honest baseline. What does not:
>
> - **The exploitation decay is a 6000-tick artifact, not a distance limit.** The same colonies given
>   18000 ticks organise at 45–55 cells with the same ~20–30× bonus they show at 35 (`model.md`
>   §4e). Read "horizon" in the tables below as "not yet".
> - **The horizon is not the influence bound.** No hard horizon has been found at all, and the λ /
>   `D_max` formulas below are withdrawn (`model.md`, "What is wrong or unfinished").
> - **"Why this is the centre of the thesis"** argues from a horizon that the re-tests did not find.
>   It is kept as the original motivation, not as a result.
> - Open items 2 (connectivity) and 4 (colony size) have since been run: see `model.md` §3, §3b and
>   §4e.

> **The original claim, now known to be too strong:**
> **The coordination horizon and the influence bound are the same quantity.** One is the benefit,
> the other is the cost, and they are the same number. This is the centre of the programme.

## The concept

Three clocks decide whether a group can organise around something at distance *D*:

| clock | what it measures | whose choice |
|---|---|---|
| **τ_act(D)** | time to act on the information — in stigsim ≈ **8D ticks** (4 ticks/cell, there and back) | the world's geometry |
| **τ_phys** | how long the trace survives — ≈ **1/evapRate** | **the designer's** |
| **τ_ref** | how long the fact stays *true* | the world's |

Coordination at distance *D* is possible only while:

$$\min(\tau_{phys},\ \tau_{ref}) > \tau_{act}(D)$$

τ_ref is not tunable. So there is a **hard horizon** no parameter choice reaches past: beyond it the
information is stale by the time anyone can act on it, and no decay rate, colony size or doctrine
recovers it.

## The finding: discovery is unbounded, coordination is not

One colony, one food source, 24 seeds × 4 evaporation rates, 6000 ticks. The maze layout scatters
food naturally, so rather than placing it at a chosen distance we **measured** the BFS distance each
seed produced and binned. Results in `results/horizon-24seeds.json`, via `tools/horizon.sh`.

| distance (cells) | **found** it at least once | **exploited** it (≥10% of source moved) | mean share delivered |
|---|---|---|---|
| 0–14 | 4/4 | 4/4 | 1.00 |
| 15–29 | 20/20 | 20/20 | 0.97 |
| 30–44 | 24/24 | 17/24 | 0.58 |
| 45–59 | 28/28 | 15/28 | 0.37 |
| 60–74 | 16/16 | 5/16 | 0.08 |
| 75–89 | 4/4 | **0/4** | 0.05 |

**Discovery is 100% everywhere.** All 96 runs found the food, at every distance, at every
evaporation rate. Distance did not make the food harder to *find*.

What collapsed was the ability to **organise around what was found**. At 75+ cells the colony knew
where the food was — an ant had been there and come back — and could not act on it at all.

> The limit is not on finding. It is on acting together on what was found.

That is the coordination horizon, and it is the cleanest thing in this whole programme: a monotone
decay across six bins (1.00 → 0.05) against a perfectly flat discovery control.

## Where the designer's clock shows up

τ_phys only binds in the middle band. At short distance everything works; at long distance nothing
does; in between, the decay rate decides:

| distance | evap 0.003 | evap 0.005 | evap 0.01 | evap 0.02 |
|---|---|---|---|---|
| 15–29 | 5/5 | 5/5 | 5/5 | 5/5 |
| **45–59** | **6/7** | **5/7** | **2/7** | **2/7** |
| 60–74 | 2/4 | 2/4 | 1/4 | 0/4 |

Overall: 18/24, 17/24, 14/24, 12/24 as evaporation rises 0.003 → 0.02. Monotone, and in the
predicted order.

**On the D_max formula** (`D_max ≈ 1/(8·evapRate)`, from
[`archive/distance-and-bounded-influence.md`](archive/distance-and-bounded-influence.md)): the *ordering* is
supported, the *constant* is not. Predicted reach was 42 / 25 / 13 / 6 cells; observed reliable
coordination extends to ~30 cells at every rate, with rates separating only at 45–59. Reach is
roughly 2–4× the prediction, which is expected — the derivation followed a single deposit's
lifetime, and a trail is held up by many ants reinforcing each other. The formula should be read as
a scaling law, not a value.

## τ_ref is still untested — and stigsim cannot currently test it

The sweep over `foodPerSource` (100 / 500 / 2000, `results/horizon-tau-ref.json`) **does not
isolate τ_ref** and should not be read as evidence. Source size is confounded with both the
exploitation threshold (10% of 100 is 10 food; 10% of 2000 is 200) and the fixed time budget. The
apparent result — smaller sources "coordinate better" — is an artifact of the metric.

A real test needs a fact that **stops being true on its own clock, independently of whether anyone
acts on it**: food that expires on a timer rather than by consumption. The war/maze mode does not
expose this. `infinite-mode` has food growth dynamics that may be adaptable.

**This is a concrete upstream contribution:** a food source with an independent lifetime would make
the third clock measurable, and it is the clock that produces the *hard* horizon — the one no
designer can tune away. Worth proposing to stigsim.

## Why this is the centre of the thesis

The security thesis says: bound the influence any trace can have in time and space, and you get
robustness without identity. H7 showed the bound working — most traces are never read at all, and
the medium fully forgets.

The horizon is **what that costs**. The same bound that stops a trace from taking hold is the bound
that stops coordination reaching. They are not two mechanisms in tension; they are one mechanism
seen from two sides:

- A trace that reaches far enough to coordinate at distance *D* is a trace that can influence
  everything within *D*.
- Tighten the bound for safety, and the horizon contracts by exactly as much.

So "how much security can you afford" is answerable **in cells**. That is the exchange rate, and it
is measurable.

### The small-world inversion

This resolves the earlier network argument. In a small-world graph, path length grows like log N:
everything is a few hops from everything. Which means **everything is inside the coordination
horizon** — and therefore everything is inside everyone's influence bound. There is no locality
left to provide robustness, which is exactly why such systems fall back on identity, reputation and
moderation.

> **Reachability is the enemy of stigmergic robustness.** A system where everything is close is a
> system where everything can influence everything.

Designing for stigmergic coordination therefore means deliberately building a space with **high
diameter and low degree** — the opposite of what almost every platform optimises for. And it means
placing the things that must be coordinated *within* the horizon, rather than making everything
reachable and then bolting on defences.

## Open

1. **Make τ_ref measurable** — food with an independent expiry. The hard-horizon claim rests on it.
2. **Connectivity sweep.** *Done — `horizon-loopsweep.json`, `model.md` §3: decisions, not distance, drive success.* `generateMaze(loopRate, …)` — `loopRate` near 0 is a perfect maze (high
   diameter, one path between any two cells); near 1 is an open field. All runs so far are at 0.12.
   Prediction: the horizon extends with connectivity while each trace becomes *less* informative —
   in a maze "this way" is nearly a complete instruction, in an open field a weak hint. If both hold
   there is a sweet spot, and that is the property to design for.
3. **Does the horizon differ by channel?** `caut` warnings may not need the reach that food
   invitations do (H6). If negative information has a shorter horizon, it can be bounded harder, and
   place-based reputation becomes cheap.
4. **Colony size.** *Done — `model.md` §3b, §4e: colony size sets how soon a trail forms, not its reach or its value.* Reach is held up by mutual reinforcement, which is why the D_max constant was
   too small. The horizon should extend with population — making it partly a *budget* question, not
   only a geometry one.
