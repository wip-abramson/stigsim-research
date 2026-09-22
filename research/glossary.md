# Glossary — terms, variables, and what they actually mean

Written because we had accumulated **four names for the same number** ("trail fidelity", "choice
exponent", "follow weight", "follow exponent", plus bare *n*) and the notes had become unreadable
to anyone who had not just been inside the code. If you are picking this workspace up cold, read
this before `model.md`.

**Rule for this workspace:** when you introduce a symbol in any doc, define it in one clause on
first use, and add it here. Prefer the plain-English name in prose and keep the symbol for tables
and formulas.

---

## The mental model in one paragraph

A colony is some ants, a 31×31 grid, and a few piles of food. Ants wander, find food, carry it
home, and drip scent ("pheromone") as they go. Other ants are drawn to scent, so a route that works
gets re-walked, re-scented, and becomes a trail. Scent fades on its own. That is the whole system:
**there is no communication between ants except what they leave on the ground**, which is what
makes it *stigmergic*. Our research question is how far that reaches: the distance, if any, beyond
which a colony with scent does no better than the same ants without it (the **coordination
horizon**). The longer-term question — what stops a liar steering everyone when nobody checks
identities — is parked until that foundation is solid.

---

## The knobs we turn

### *n* — trail trust (canonical name: **trail trust**)
**Aliases in older notes:** trail fidelity · choice exponent · follow weight · follow exponent
**Lives at:** `doctrine.forager.follow[state][channel].own` in stigsim · used by `scoreCell()` in
`packages/sim-core/src/score.ts`
**Range:** 0 to 32, in steps of 0.5 (`deterministicPow` throws on anything else)
**stigsim default:** 5 · **real ants:** about 2

When an ant chooses its next cell, it scores each neighbour as `(scent + 1)^n` and then spins a
roulette wheel weighted by those scores. So *n* controls how decisively "more scent" wins:

| *n* | a cell with twice the scent is… | the ant is… |
|---|---|---|
| 0 | equally likely | blind — ignores scent entirely, a pure random walk |
| 1 | 2× as likely | sceptical, exploratory |
| 2 | 4× as likely | roughly biological |
| 5 | 32× as likely | near-fanatical, locks onto trails hard |

We set it on **both legs of the recruitment loop at once** (ants searching follow the food channel,
ants returning follow the home channel), because that is the single slider the game exposes and
what the player in `velvet-ridge-4071` actually moved.

> ⚠ **`n` = 0 is not "no trust", it is blindness.** With the weight at zero, `scoreCell()` skips
> the channel entirely — and because the smell of nearby food is added *inside* the power, the ant
> cannot smell food either. Never treat it as the low end of a trust sweep.

### `evapRate` — how fast scent fades
**Lives at:** `doctrine.evapRate` · **default:** 0.005 · **max:** `MAX_EVAP_RATE`

The fraction of every cell's scent that disappears each tick. It puts a *time limit* on how long
anything one ant did can influence anyone else. The programme began by treating it as the central
knob; measured, it is **a plateau with a cliff**: nothing differs across 0.0005–0.012, and only
0.05 collapses (`model.md` §5).

### `ants` / colony size *N*
How many ants. Once a trail has formed, colony size does **not** change what it is worth: 10 ants
and 160 get the same multiple from the same junctions. What a bigger colony buys is **time** — its
trail forms sooner (`model.md` §3b, §4e). It does not act through the amount of scent laid: more
ants beat louder ants at the same total scent (§4b).

### Doctrine
A colony's whole behaviour policy as one editable object: trail trust per role and phase, how much
scent to drip, `evapRate`, what fraction of ants are saboteurs. Swappable mid-game, which is fun to
play and **ruins controlled comparisons** — prefer static doctrine for experiments.

### Topology
What a colony is *allowed to sense*: can it read the enemy's scent, can it forge the enemy's scent.
The sensing rules of the world, as opposed to the behaviour policy.

---

## The things we measure

### `p_capture` — how often one lie hijacks the colony
The headline number of the impulse experiment. Method: run the same world **twice** from one seed,
identical in every way, then in copy B only, paint a single blob of fake food-scent on one empty
cell. `p_capture` is the fraction of runs where the colony swung onto the fake trail.

Two sub-measures, which in this system turn out to be **the same event almost every time**:

- **read** — at least one ant's path differed from the control. Somebody sensed the lie.
- **captured** — at least 25% of the colony's ants diverged. It spread.

> ⚠ Capture is **magnitude of influence, not harm.** Across captured runs the colony ends up with
> *more* food about as often as less. A lie redirects; it does not reliably damage.

### `p_exploit` — how often the colony successfully works a *real* food pile
The honest counterpart to `p_capture`, from the horizon sweep. Not "did they find it" (they always
find it) but "did they organise a sustained supply line to it".

### time to capture
How many ticks between planting the lie and the colony swinging onto it. Turned out to be the
measure that actually responds to trail trust — see `archive/hypotheses.md` H7/E9.

### The coordination horizon
The distance beyond which a colony does no better than the same ants with no scent — it can still
*find* food but cannot *organise around it*. Our central object. **None has been found**: every
candidate moved outward when the run was given more time, so the limit that exists is the time a
colony needs to form its trail (`model.md` §4e).

### Coordination bonus
Food delivered with scent divided by food delivered by the **no-trail colony** — the same ants, maze
and seed with every lay weight set to 0. 1× means scent bought nothing. The score used throughout.

### Junction (decision)
A cell with three or more open neighbours. An ant senses its four neighbours and drops the one it
just left, so in a corridor it can only go forward and scent does nothing; junctions are the only
place a trail can help. `loopRate` sets how many a random maze has.

### The comb
A hand-built maze (`tools/junctions.ts`): a corridor of set length from nest to food with `--k`
dead-end side branches of `--len` cells. Distance and junction count are set independently, and the
maze is identical in every seed.

### Conveyor ceiling
`N·T/8d` — the most food *N* ants can deliver in *T* ticks over *d* cells if nobody takes a wrong
turn (a round trip is 2*d* cells at 4 ticks per cell). Also tells you in advance which cells will
hit a food cap.

### Take-off
When a colony's trail has formed: the first 1000-tick window delivering at least half the conveyor
ceiling (comb) or several times the no-trail rate (random maze). Take-off time rises with junctions
and falls with colony size.

### `tankMax` — gland size, the influence budget
How much scent an ant can lay before running dry. Refilled only at the nest or on picking up real
food. Default 6400, which at 60 units per cell is 106 cells per leg. The floor for coordination
over distance *d* is `d × 60` (`model.md` §5).

### `D_max` — how far a trail can reach
An estimate of trail reach. **Superseded.** The first form, `1/(8·evapRate)`, came from one scent
drop's round trip and underestimated observed reach 2–4×. Its one-way cousin `λ = 1/(4·evapRate)`
is broken too: λ is only where a mark has faded to 37%, and on empty ground a mark that weak still
wins the ant's choice. Neither is used in the current model.

### τ_ref ("tau-ref") — how fast the world itself goes stale
The rate at which information becomes wrong **on its own**, regardless of whether anyone consumes
it — food rotting rather than food being eaten. One of the three clocks in
`coordination-horizon.md`. **Currently unmeasurable in stigsim**, and the most valuable thing we
could ask for upstream.

---

## Experiment codes

Used in the logs and the run log. Both source docs are now in `archive/`; the codes are kept
here because `results/` filenames and the logs still refer to them.

| code | what it asks |
|---|---|
| E3 | Does information going stale on its own clock create a *hard* horizon? **Blocked** — stigsim can't express it |
| E4 | Do shortcuts in the map widen the region an attacker can influence from? |
| E5 | If you tell the lie *k* times, does success scale like `1-(1-p)^k`? |
| E6 | Does trail reach grow with colony size, as the corrected `D_max` says? **Answered differently:** colony size sets how soon a trail forms, not how far it reaches (`model.md` §4e) |
| E7 | Compare `p_capture` against `p_exploit` at the same distance. The gap between them is the safety margin. **Parked** with the rest of the adversarial work, which needs an attacker that pays the same costs |
| E8 | Does the observed capture rate fit the textbook Deneubourg curve? |
| E9 | **Done 2026-09-22.** Sweep trail trust and find the tipping point. *There wasn't one* |

---

## Names from the literature

- **Deneubourg choice function** — the standard model of how an ant picks between two trails,
  `P_A = (k+A)^n / ((k+A)^n + (k+B)^n)`. stigsim implements exactly this with `k=1` and `n` = trail
  trust, which is why our *n* is directly comparable to published numbers.
- **Stigmergy** — coordination purely through marks left in a shared environment. No messages, no
  identities, no directory.
- **Sematectonic stigmergy** — the strong form, where the trace *is* the work done (a half-built
  wall), so faking a signal costs exactly what contributing costs. Not expressible in stigsim.
- **Critical region** — borrowed from AntNet security work: the set of positions from which an
  attacker is close enough to divert traffic at all. Shortcuts in the map enlarge it.

---

## Reading the units

- **tick** — one simulation step; an ant crosses one cell in 4. Early sweeps ran 4,000–7,000 ticks;
  the re-tests run 6,000, 18,000 or 54,000, because 6,000 cut off colonies still forming trails.
- **cell** — one square of the 31×31 grid. "25 cells" is most of the width of the world.
- **food** — units collected. The score we use, per the working norms, *not* win/loss.
- **seed** — the random-number starting point. Same seed + same settings = bit-identical run.
  A result from fewer than ~16 seeds here has been wrong before; see the day-2 log.
