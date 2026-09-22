# Distance and bounded influence

> The working intuition: *bounded influence* and *distance from goal* are not two topics. They are
> the same knob seen from two sides.

## The claim

A pheromone field is a **distance oracle that the agents build themselves**. The home channel
encodes distance-to-nest, the food channel distance-to-food; following a gradient is descending a
distance function nobody computed centrally. Stigsim makes this explicit — `shortestFromNest()` in
`sim-trace/src/metrics.ts` is a BFS distance field, and food placement is *defined* in terms of
distance (`contestedWeight(d0, d1)` favours cells equidistant from both nests, `safeWeight()`
favours cells close to your own).

Now the tension. Security wants influence **tightly bounded**: a lie should die fast, so evaporate
quickly. Coordination over distance wants influence **to persist**: a trail from nest to food at
distance *D* must survive long enough for ants to walk it and reinforce it. **These are the same
parameter.** `evapRate` sets both the lifetime of a lie and the reach of the truth.

So:

> **You cannot make your medium forget faster than your coordination distance requires.**

A designer choosing a decay rate is simultaneously choosing how long a poisoned trace persists
*and* how far the system can coordinate. That is a hard constraint, it is quantifiable, and it is
the thing worth putting in front of the symposium.

## A falsifiable number

From `packages/sim-core/src/constants.ts`: `V = 4` px/tick, `CELL = 16` px → **4 ticks per cell**.
A round trip over a trail of *D* cells is 2*D* cells ≈ **8*D* ticks**. Pheromone decays by
`(1 - evapRate)` per tick, so a deposit's survival across one round trip is `(1 - evapRate)^(8D)`.

Requiring a deposit to survive one round trip (down to ~1/e) before its layer returns to reinforce:

$$D_{max} \approx \frac{1}{8 \cdot evapRate}\ \text{cells}$$

| `evapRate` | predicted D_max | vs. the 31×31 map |
|---|---|---|
| 0.003 | ~42 cells | whole map, trails outlive their usefulness |
| 0.005 | ~25 cells | map-spanning |
| 0.010 | ~12 cells | mid-range only |
| 0.020 | ~6 cells | nest-local only |

**This is a back-of-envelope prediction, not a finding** — it ignores reinforcement from multiple
ants, the ant's own tank budget, and the gradient's signal-to-noise. Treat the *shape* as the claim
(D_max falls as 1/evapRate) and let the constant be fitted.

It immediately reframes H5. The player oscillated `evapRate` between 0.003 and 0.02 — which is
exactly the span from "coordinate across the whole map" to "coordinate only near the nest." They
were not tuning a security parameter or an efficiency parameter. **They were searching for the
decay rate matched to how far away the food was.** The hill-climb had a target it could not see.

## Why this explains robustness without identity

Here is the part that connects to the security thesis.

In a stigmergic medium, **to poison a trail you must be where the trail is.** The attacker walks
the same cells, pays the same travel cost, and their deposit decays at the same rate as everyone
else's. The attacker's influence is bounded by *exactly the mechanism that bounds everyone's* —
which is why no special defence is needed, and why no one has to work out who the attacker was.

Now contrast a typical digital medium, where influence acts at **unbounded distance and near-zero
marginal cost**: one actor can write anywhere, instantly, as often as they like. That medium has
destroyed the natural bound — and identity-based defence (accounts, reputation, moderation) is what
you are forced to build in its place.

> **Design principle:** if a virtual environment lets influence act at unbounded distance and zero
> cost, you will need identity. If it manufactures distance and cost, you may not.

This is the answer to "what properties should we design for." Physical stigmergy gets distance,
decay and metabolic cost free from physics. A virtual environment has none of them by default —
**it has to manufacture distance**, and the cheapest way to fail at stigmergy is to build a
broadcast medium and then try to bolt robustness on with identity.

## A corollary worth testing: information quality is a function of proximity

Trails converge as they approach a goal, so near the goal they are stronger, fresher and more
frequently reinforced; far away they are weak and stale. Information reliability therefore
*increases with proximity to the thing it describes*.

That aligns influence with investment. A lie told far from the goal is weak. A lie told near the
goal is strong — but requires the liar to have travelled there, paying full cost, and to be exactly
where honest agents are densest. **Deception does not scale, because influence does not scale.**

This also gives H1 its mechanism. The Poacher followed *honest* enemy food trails and still lost:
a strong enemy food trail marks a source being actively drained, so its information is most
compelling precisely when it is about to become false. Proximity buys reliability about the
*present*, and the present is expiring.

## Open questions this frame generates

1. ~~**Is D_max real, and what is the constant?**~~ **Tested — see H8 and
   [`coordination-horizon.md`](coordination-horizon.md).** The scaling law holds in ordering; the
   constant is 2–4× too small because trails are sustained by mutual reinforcement, not by one
   deposit's lifetime. The larger finding: discovery is unbounded at every distance, coordination
   is not.
2. **Does the security/reach trade-off have a sweet spot, or is it monotone?** If tightening the
   time bound always costs reach, "how much security can you afford" is answerable in cells.
3. **Can `tankMax` substitute for the time bound?** Note `tankMax` is the *ant's* pheromone
   reservoir, not a per-cell ceiling — `DenseField.add()` does not clamp, so a cell has no cap. That
   makes it a **per-agent budget**: a direct bound on how much trace one individual can lay before
   refilling. H7 argues this is the bound that actually does the security work.
4. **Does `caut` (the unused negative channel) have a different D_max?** Warnings may not need to
   propagate as far as invitations — a bad place is bad locally. If negative information needs less
   reach, it can be bounded harder, and place-based reputation gets cheap. (See H6.)
5. ~~**What is the influence radius of a single trace?**~~ **Measured — see H7.** The answer turned
   out not to be a radius at all: a lone trace is either never read (24/32 runs) or it captures
   50–100% of the colony across most of the map. Influence is bimodal, so the medium bounds the
   *probability* of influence, not its size. That shifts the weight of this whole programme from
   the time bound onto the **throughput bound** — how many traces an agent can lay per unit time.
