# What to run

## The reframe: you probably need fewer game traces than you think

Playing a game produces one seed, one opponent, a human editing doctrine mid-run, and no control
condition. That is a fine way to *find* a hypothesis — the whole register came out of one game —
but a poor way to test one.

stigsim already runs headless. `scripts/doctrine-matchup.ts` does preset-vs-default, **across every
topology**, over several seeds, **both ways round so nest position is controlled for**, reporting
deliveries, first-delivery tick and mimic mass received. That is an experimental harness, and it is
the right instrument for almost everything below.

> **Game traces are for studying human play. Headless sweeps are for studying the system.**

Both are worth having, but they answer different questions, and conflating them is how two days
disappear. Keep recording games — the 26-edit oscillation in `velvet-ridge-4071` is genuinely
interesting *as human behaviour* — but do not expect them to settle anything.

---

## Tier 1 — Impulse response ✅ BUILT AND RUN → H7

`tools/impulse.sh`, results in `results/impulse-empty-8seeds.json`. **Outcome: influence is
bimodal.** A lone trace is either never read (24/32 runs, field reconverges to exactly zero, not one
ant changes course) or it captures 50–100% of the colony permanently across most of the map. There
was no middle. See H7 — the consequence is that the medium bounds the *probability* of influence,
not its magnitude, which moves the security weight onto the throughput bound.

Three follow-ups now matter more than anything else here:

1. **Repeat attempts** — inject *k* traces; does capture follow 1−(1−p)^k? If yes, security is
   purely a rate-limiting question. `--amount` and a loop over injection ticks gets most of the way.
2. **Amount sensitivity** — does a smaller deposit lower capture probability, or is there a hard
   threshold? Decides whether individual magnitude matters at all.
3. **Distance sweep** — capture probability vs `--dist` is *the* influence-versus-distance curve,
   the direct measurement this programme is named after. `--dist` already exists.

### Original rationale

**The single highest-value experiment**, because it measures the thesis's central quantity instead
of inferring it from outcomes.

Run a simulation twice from the same `masterSeed`, identical in every way except that run B gets
**one extra unit of pheromone deposited in one cell at one tick**. Then measure where and when the
two runs diverge:

- **spatial extent** — how many cells away do ant trajectories differ?
- **temporal extent** — how many ticks until the runs re-converge (or don't)?

That is *literally* "the influence an individual trace can have on other agents, bounded in space
and time." It yields an **influence radius** and an **influence half-life** as measured quantities.

Cheap and rigorous, because the sim is deterministic and `fingerprint()` already exists to detect
divergence. Sweep `evapRate` and `tankMax` and watch the radius move.

~~Prediction: influence radius scales with `1/evapRate`.~~ **Not supported** — radius did not track
1/(8·evapRate). D_max concerns *sustaining* a trail over distance, which is tier 2 and still open.

Note on method, learned the hard way: inject on **quiet** ground (`--where empty`). Injecting onto
the busiest cell (`--where trail`) adds signal where the gradient already peaks, so nothing turns
and every run reads as null. And define capture by **ants changing course**, not field mass — at
slow evaporation the injected blob alone stays above threshold for the whole run and fakes a hit.

## Tier 2 — The distance frontier

Vary **food distance from nest** against **`evapRate`**, and find where a colony can no longer
sustain a trail.

Distance is controllable: food placement already works in BFS distance from each nest
(`contestedWeight`, `safeWeight` in `sim-core/src/food-layout.ts`), and `shortestFromNest()` gives
the ground truth. Use `safe` sources for a clean single-colony distance sweep.

Observables — all already implemented in `sim-trace/src/metrics.ts`:
- `highwayScore` — does a trail actually form, or is the field diffuse?
- `meanTripRatio` — trip length over shortest path; efficiency *relative to distance*
- first-delivery tick — does exploitation ever bootstrap?

Expect a **frontier, not a gradient**: below D_max a trail locks in fast; above it, foraging never
leaves random search. Single colony, no opponent — this is about the medium, not competition.

## Tier 3 — The topology ladder under forgery

Walk `private → sensing → mimicry → open` with seed, doctrine and rules fixed, then sweep the time
and magnitude bounds within `mimicry` and `open`.

Turn **`provenance: true`** on for these. It costs the ants nothing (they never read it) and gives
you forged-vs-honest mass per colony — the `received[]` array in the fields channel, which
`tools/summarize-run.ts` already reports. Without it you are guessing at how much of a field is
lies.

`open` is the headline condition: one shared anonymous field, forgery allowed, nobody able to tell
whose trail is whose. If coordination survives there, it survives without identity by construction.

Most of this is a parameter change away from `doctrine-matchup.ts`. Extending that script is
probably a better use of an hour than writing a new one — and it is upstreamable.

## Tier 4 — The negative channel

`caut` has been zero in every record. Before designing anything, find what writes it in the current
build; it may be unreachable from the war mode's doctrine surface. If it is reachable, ask whether
warnings need less reach than invitations (question 4 in the distance doc) — that is the cheap
version of place-based reputation.

If it is *not* reachable, say so upstream. A negative stigmergic channel is the most direct
instantiation of "robust despite defectors, without identifying them", and it is sitting there
unused.

---

## Game traces still worth capturing

When you do play, capture with a purpose and note it in `run-log.md`:

1. **A `mimicry` or `open` game.** Every record so far is `Sensing`. One game per topology rung
   costs little and tells you what the mechanics actually feel like — worth doing before designing
   sweeps around them.
2. **A hands-off game.** No doctrine edits at all, so the run is a clean two-doctrine comparison.
   This is the control condition the existing record lacks.
3. **A replay of your own oscillation.** You hill-climbed `evapRate` between 0.003 and 0.02 without
   knowing D_max. Re-run the same seed with the *fitted* D_max value held constant and compare
   against your live play. If the constant beats the oscillation, that is a nice result about
   stigmergic systems needing the right bound more than an attentive operator.

## Method notes

- Score on **food-at-exhaustion** and trail mass, never win/loss (H4).
- Vary **one** thing; the existing record's value came from the colonies differing in exactly one
  doctrine atom, and that was luck.
- Run both ways round — `doctrine-matchup.ts` already does this, because nest position matters.
- Summarise every record with `tools/summarize.sh`; the 8 KB summaries are what you compare and
  share, not the 5.5 MB originals.
