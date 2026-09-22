# Research programme — bounded influence as a security primitive

## The thesis

Stigmergic systems can be secured **without identifying individual agents**. Instead of
authenticating who laid a trace, they bound — in time and space — how much influence any trace can
have on anyone else. The aim is not to eliminate defectors but to remain functional despite them.

The corollary question: **what properties should a virtual environment have to support stigmergic
coordination?** Physical stigmergy gets decay, locality and metabolic cost for free from physics.
A virtual environment has to choose them deliberately, and can choose wrongly.

## Why this frame is the interesting one

Conventional security accumulates: identity, reputation, credentials, audit logs. Each new
interaction adds state, and the defense is *exclusion* — decide who is bad, keep them out. It
requires that agents be identifiable and that the identification be trustworthy, which is expensive
and, in open systems, usually impossible.

Stigmergic security **forgets**. Evaporation degrades a poisoned trace and an honest one at exactly
the same rate — which is precisely why it needs no identity. The bound is uniform, so it never has
to decide which is which. *Forgetting is the security primitive*, and it is cheap, local and
unfalsifiable. That inversion is the thing worth arguing at the symposium.

**The simulator is already committed to this thesis by construction.** `topology.provenance` is not
an ant-facing defence — sim-core documents it as *"Keep a spoiler-colony → target sublayer for
spectators and metrics. **Ants never read it.**"* Agents are never given identity under any setting.
Provenance is the **measurement instrument**: it lets the researcher see which deposits were forged
while the ants themselves remain unable to discriminate. That is the ideal experimental setup for
this thesis — ground truth for us, anonymity for them.

## A taxonomy of influence bounds

Each row is a distinct way to limit what one agent's traces can do to another, and each maps to
something the simulator exposes.

| bound | limits | sim knob | attack it blunts |
|---|---|---|---|
| **temporal** | how long a trace persists | `evapRate` | poisoned or stale trails persisting |
| **magnitude** | how much trace one agent carries | `tankMax` (6400) — the *ant's* reservoir, not a per-cell cap | one agent flooding a trail |
| **spatial** | who can perceive a trace at all | grid locality (31×31), read radius | remote or broadcast influence |
| **throughput** | how fast one agent can lay | `moveEnergyCost`, `energyPerFood`, `minDepartEnergy` | high-volume spam |
| **referential** | whether a trace stays *true* | food depletion coupling | amplified deception, self-limiting |

The last row is the one I had not expected and it came out of the data (see H1). A food trail's
truth decays as the resource it points at is consumed. The environment couples signal validity to
world state, so a stale signal is self-invalidating — and an agent that amplifies someone else's
food trail eventually amplifies a lie, at its own cost. **No detector is involved.** That is the
thesis in miniature.

Note the asymmetry worth testing: temporal and magnitude bounds are *uniform* (they hit everyone
equally), while throughput and referential bounds are *endogenous* (a defector's own costs scale
with their defection). Uniform bounds need no identity by construction. Endogenous bounds need no
identity because the defector pays their own bill. Both routes avoid identity — differently.

## The design space is already named upstream

`packages/sim-core/src/topology.ts` defines four topologies, and they form a **ladder of
attribution** — precisely the axis this thesis cares about:

| topology | `read` | forgery | what an agent can tell |
|---|---|---|---|
| **private** | `private` | no | nothing — colonies meet only through food and walls |
| **sensing** | `separable` | no | whose trail is whose. *"Nobody can fake anything."* |
| **mimicry** | `separable` | yes (≤0.5) | channels stay separable but the enemy can write into yours |
| **open** | `shared` | yes (≤0.5) | **nothing** — one summed food field, *"nobody can tell whose trail is whose"* |

**`open` is the purest instantiation of the thesis.** A single anonymous shared medium that anyone
may write to, including liars, with no attribution available to anyone. If coordination survives
there, it survives without identity — by construction, not by tuning. Note that `conformDoctrine`
zeroes every `follow.*.enemy` weight under `read: "shared"`, because there is no enemy channel to
follow; there is only the field.

Also worth noting: `mimicry` is described in source as *"the spec's recommendation"*, and it is the
only preset shipping `provenance: true` — i.e. the topology whose designers expected you to want
forgery ground-truth.

### The central experiment

> Walk the ladder — `private` → `sensing` → `mimicry` → `open` — holding seed, doctrine and rules
> fixed. Where does coordination degrade, and does it degrade *at all* at `open`?

Then, within `open` and `mimicry`, sweep the time bound (`evapRate`) and magnitude bound (`tankMax`)
to find whether bounded influence alone restores performance under forgery. Use `provenance: true`
to measure how much forged pheromone is actually in the field, and score on
food-collected-at-exhaustion plus the trail-mass indicator (H3), never win/loss (H4).

**Your existing run was exactly `TOPOLOGY_SENSING`** — `read: separable`, `mimicEnemy: false`,
both channels visible, `provenance: false`. It is the second rung. So H1 is sharper than first
written: under a topology where *nobody can fake anything*, merely reading the opponent's **honest**
trails was still self-harming. That is a finding about true information being a trap, with no
deception involved at all.

## The interpretation layer — read records through sim-core, not by hand

*(Resolved 2026-09-21: stigsim now updated to `main`. The knobs are all live —
`topology-choices.ts`, `doctrine-presets.ts`, `packages/sim-core`, `packages/sim-trace`. The
earlier inertness question is moot; `fingerprint()` in sim-core already implements that test.)*

The records are not actually opaque — the vocabulary to read them is upstream, and re-deriving it
in ad-hoc scripts is what made them feel that way. Decode through the source of truth:

| raw in the record | decoded by |
|---|---|
| 5 topology booleans | `choiceFor(topology)` → `"Sensing"` (`src/topology-choices.ts`) |
| a wall of doctrine atoms | the 6 named presets — Default, Highway, Scout, Volatile, Saboteur, **Poacher** (`src/doctrine-presets.ts`) |
| sampled channels only | `Replayer` (`packages/sim-trace/src/replay.ts`) |
| `fingerprints[]` | `fingerprint()` (`packages/sim-core`) |

`Replayer` matters most. `tools/digest.py` can only see what was sampled — metrics every 10 ticks,
agents every 50, fields every 250. The replayer re-runs a record deterministically from
`masterSeed` + `commands`, checking fingerprints as it goes, which gives **full tick-resolution
access to any state**. Anything the sampled channels missed is recoverable.

So the analysis layer should be **TypeScript against `@stigsim/sim-trace`**, not Python against raw
JSON. A hand-written JSON Schema would be a second source of truth that immediately drifts; the
TypeScript types in `sim-core` already *are* the schema, and they are maintained by the people
changing the format.

### The unit to build: an interpreted run summary

One small artifact per record — a couple of KB rather than 5.5 MB — carrying what the hypotheses
actually cite:

- topology **by name**, doctrines **by preset name** (or the diff from the nearest preset)
- exhaustion tick, food share at exhaustion (H4's real scoreline)
- per-colony lock tick — first tick where reserve is 0 and no ant can depart (H2)
- Σfield trajectory per channel, and its collapse point (H3)
- doctrine-edit timeline, collapsed to the knobs that actually moved (H5)
- for forgery runs: forged-vs-honest pheromone mass, via `provenance: true`

Being small, these are diffable, comparable across runs, and shareable with collaborators without
moving 5.5 MB files around. That is the step back — the record stops being a blob and becomes a row.

Package it as a skill **after** it works, not before: a skill is the right wrapper for "any
researcher's Claude session can read a stigsim record correctly", but it should wrap a proven tool
rather than a guess at one. Both the tool and the summary format are strong upstream contributions.

## Open directions

**Stigmergic reputation attaches to places, not agents.** The `caut` (cautionary) pheromone channel
exists in every record and was **all zeros for the entire run** — completely unused. A negative
trace channel is how you would build reputation without identity: you cannot blacklist an ant, but
you can mark a location as bad, and that mark decays like everything else. This may be the sharpest
available instantiation of the thesis, and nothing has touched it.

**What is the honest failure mode?** H2 found a colony that died with a third of the map's food
unclaimed, and no defector was involved. Bounded influence protects against malice; it does not
protect against a coordination collapse under an energy budget. A design-properties list that only
covers adversaries is incomplete — the environment also has to make recovery possible. Worth asking
whether any of the five bounds trade off *against* recoverability.

**Do the bounds compose or conflict?** H5 suggests `evapRate` and trail fidelity form a ridge rather
than independent knobs. If the temporal bound interacts with how strongly agents trust traces, then
"tune evaporation for security" is not a free action — it has a coordination cost, and the exchange
rate is measurable.

## Collaboration and contribution notes

This is a collaborative hackathon, so bias toward artifacts other researchers can pick up:

- **The run-record format is documented nowhere** — not in the hosted build's source as far as we
  can see, not in the local checkout. `CLAUDE.md` here now has a working spec derived from a real
  record. That belongs upstream.
- `tools/digest.py` turns a 5.5 MB record into a readable page. Generalising it and contributing it
  to stigsim would save every researcher the same afternoon.
- A shared run-record corpus with a consistent capture protocol (`research/run-log.md`) is worth
  more than any individual's runs, because most hypotheses here need n > 1 across seeds.
