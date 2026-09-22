# Response to the 2026-09-21 critique

Source: [`critiques/2026-09-21-notebooklm.md`](critiques/2026-09-21-notebooklm.md). Its citations do
not resolve and must be chased to real papers before anything here is cited. Treated below as leads.

## What survives, what doesn't

| our claim | verdict | consequence |
|---|---|---|
| Coordination horizon (H1/H8) | **synthesis, not new.** Precedents: central place foraging theory, grid-search reachability bounds (agent lifetime τ, trace duration μ), epidemic convergence vs diameter | Keep, but position as a *formalisation* of a known limit, not a discovery. Chase the μ<2 threshold result. |
| Evaporation = exploration/exploitation dial | **standard in ACO.** Also: ρ drives a phase transition in ACO runtime theory | Drop as a contribution. Cite it. |
| `D_max ≈ 1/(8·evapRate)` | **rediscovery, and our form was wrong** | See below — the literature's form explains our 2–4× error. |
| Bimodal uptake (H7) | **known.** Canonical pitchfork bifurcation under the Deneubourg choice rule, n≈2 | Demote from finding to *replication*. But now we can fit the known model — see below. |
| "Redirects but does not steer" | **known.** Returning traffic gated by actual discovery at the destination | Demote to replication. It does still supply the mechanism for H1/Poacher. |
| Throughput bound over decay (H4) | **meaningful extension** of Douceur, not mere rediscovery — physical work economics rather than cryptographic. But lay-rate λ experiments may already show the effect | Keep, narrow the claim, and check whether E5 is already done. |
| **Bound = horizon (H3)** | **"your core theoretical contribution"** — the dual role is known in two separate literatures, the equivalence is not | **This is the programme. Everything reprioritises around it.** |

## Three things we now know we got wrong

**1. The D_max formula had the wrong denominator.** We derived it from a *single deposit's*
round-trip survival. The literature's form is: trace lifetime must exceed the **passage interval of
reinforcing agents** along the trail. That interval depends on how many agents are on it — so
colony size *N* belongs in the formula, and reach should be roughly **linear in N**. This explains
the 2–4× underestimate in H8 exactly, and it converts open question 4 of
[`coordination-horizon.md`](coordination-horizon.md) into a prediction worth measuring.

**2. H7's bimodality is a pitchfork bifurcation.** The Deneubourg choice rule
`P_A = (k+A)^n / ((k+A)^n + (k+B)^n)` with n>1 produces exactly the all-or-nothing behaviour we
observed, with sub-critical and super-critical branches. Our contribution is not the phenomenon —
it is that we can now **fit the known model to our data**: check stigsim's follow rule for its
effective exponent *n* and sensory threshold *k*, and test whether observed capture probability
matches the predicted form. That is a much stronger claim than "we saw bimodality".

**3. "Critical region" is the right term for the small-world argument.** From AntNet security
analysis: a subverted node can only divert traffic if it lies within the set of nodes whose latency
from the source is ≤ that of the optimal path. Small-world shortcuts **expand the critical region**.
Adopt this language — it is sharper than "reachability is the enemy of robustness" and connects
directly to existing security results.

## The experiment that now matters most

H3 is the contribution and **it has never been measured** — it rests on an argument. It needs a
direct test, and both instruments already exist.

### E7 — The equivalence test

Measure, **under identical parameters**, two curves:

- **p_capture(d)** — probability that a single injected trace at distance *d* from the nest is read
  and cascades. `tools/impulse.sh --dist <d>` (the flag exists).
- **p_exploit(D)** — probability the colony establishes sustained exploitation of a real resource at
  distance *D*. `tools/horizon.sh`.

H3 in its strong form predicts the two curves coincide. Existing data hints they may not: at ~10
cells the horizon sweep gave 100% exploitation while the impulse sweep gave ~25% capture — though
the configurations differed (1 vs 3 food sources, different tick budgets), so this is not yet a
comparison. Matching the conditions is the whole point of E7.

**If they diverge, that is the better result**, and it refines H3 rather than killing it:

> A true signal is **self-reinforcing** — the resource is still there when you arrive, so you lay
> more trail. A one-shot false signal is not. The coordination horizon should therefore *exceed*
> the influence bound, and **the gap between the two curves is the system's safety margin**: the
> range over which it can coordinate but cannot be captured by a single lie.

That would be a sharper and more useful claim than "they are the same number", and it is a direct
measurement rather than an argument. It also gives the critique's "world adjudication" point a
quantity: the margin is what world-adjudication buys you, in cells.

## Revised priorities

0. **E9 (new, now top) — sweep the choice exponent *n*.** stigsim's follow weight *is* the
   Deneubourg exponent (`score.ts`). Sweep n = 1, 2, 3, 5, 8 and locate the bifurcation threshold.
   Biology cannot vary its own exponent; this simulator can, which makes it an apparatus rather than
   a demonstration. Also the cheapest decisive experiment available.
1. **E7 — equivalence / safety margin, now on TWO axes.** `evapRate` governs the horizon; the follow
   exponent *n* governs capture probability. **If they are separable, H3 is false in its strong
   form** — and that is a more useful result than the equivalence, because it means robustness can
   be bought without paying in reach. Sweep both.
2. **E6 (new) — colony size sweep.** Tests the corrected D_max form (reach linear in *N*). Cheap,
   and it resolves a known quantitative error.
3. **E3 — independent staleness (τ_ref).** Critique agrees this is high priority. Still blocked:
   needs resources that expire on their own clock. Upstream feature request to stigsim.
4. **E4 — connectivity sweep.** Now explicitly framed as measuring whether loop density expands the
   **critical region**.
5. **E8 (new) — fit the Deneubourg rule.** Recover *n* and *k* from stigsim's follow rule, then test
   whether p_capture matches the predicted choice function.
6. **E5 — repeat attempts.** Demoted: the direction of the effect may already be established by the
   lay-rate λ experiments. Reframe to test the *functional form* (Weber's law / Poisson) rather than
   whether the effect exists.

## Framing change for the write-up

Lead with H3. Present the horizon as a formalisation of a limit known separately in foraging
biology, ACO and distributed systems, whose contribution is showing that the *same* parameter sets
both coordination range and adversarial resistance — and, if E7 shows a gap, that the difference
between them is a measurable safety margin created by the world adjudicating on arrival.
