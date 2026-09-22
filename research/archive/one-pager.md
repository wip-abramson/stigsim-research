# Bounded influence and the coordination horizon in stigmergic systems

*Standalone summary for external critique. Self-contained; no prior context assumed.*

> **Status after first critique (2026-09-21):** H1's horizon is a synthesis of limits already known
> separately in central place foraging theory, grid-search reachability bounds and epidemic
> convergence; H2's evaporation/exploration identification is standard ACO; the bimodal uptake in E1
> is the canonical Deneubourg pitchfork bifurcation. **H3 — that the same parameter sets both
> coordination range and adversarial resistance — was identified as the core contribution, and it
> remains unmeasured.** See `critique-response.md`.

## Question

In a stigmergic system — agents coordinating only by leaving and reading traces in a shared
environment — what sets the maximum distance over which coordination can occur? And is that limit
**the same quantity** as the bound that makes such systems robust to false or stale traces?

## Motivation

Stigmergic systems appear to achieve a kind of security without identity. They do not authenticate
who left a trace and do not try to exclude defectors. Instead the environment bounds how much
influence any single trace can have: traces decay (a time bound), must be physically encountered (a
space bound), and cost metabolic work to lay (a throughput bound). The conjecture under test is
that this robustness is not free, and that its price is exactly the system's coordination range.

## Hypotheses

**H1 — Horizon.** Coordination at distance *D* requires the information to remain valid at least as
long as it takes to act on it. With τ_act(D) the round-trip time, τ_phys the trace's physical
lifetime, and τ_ref the time until the referenced fact changes, coordination is possible only while
`min(τ_phys, τ_ref) > τ_act(D)`. Because τ_ref is a property of the environment and not of the
designer, some distances are unreachable by stigmergic coordination under *any* parameter choice.

**H2 — Discovery ≠ coordination.** The horizon binds on acting collectively, not on finding.
Individual discovery should be roughly distance-independent while collective exploitation falls off
sharply with distance.

**H3 — Identity of bound and horizon.** The bound on individual influence and the coordination
horizon are the same quantity. Tightening the bound to resist false traces contracts the horizon by
the same amount, making "how much robustness you can afford" measurable in units of distance.

**H4 — Rate, not magnitude.** The environment does not bound the *magnitude* of an individual's
influence but the *probability* that it takes hold. Defence therefore rests on throughput limits
(attempts per unit time), not on decay.

## Method

Agent-based simulation: ant-like foragers on a 2D maze grid depositing and following pheromone
channels; deterministic given a seed, which permits exact twin-run comparison.

- **E1 — Impulse response (done, n=32).** Two runs identical except that one receives a single
  extra pheromone deposit in one cell at one tick. Measures the spatial and temporal extent of one
  trace's influence. 8 seeds × 4 decay rates.
- **E2 — Horizon sweep (done, n=96).** One colony, one food source; nest-to-source distance
  measured by breadth-first search and binned across seeds. Separates discovery from sustained
  exploitation, against decay rate. 24 seeds × 4 decay rates.
- **E3 — Independent staleness (proposed).** Resources that expire on their own timer rather than by
  consumption, isolating τ_ref. Required for the "hard horizon" clause of H1.
- **E4 — Connectivity (proposed).** Vary maze loop density from tree-like to open field. Predicts
  the horizon extends with connectivity while per-trace informativeness falls, implying an optimum.
- **E5 — Repeat attempts (proposed).** Inject *k* traces; test whether uptake follows 1−(1−p)^k,
  which would confirm H4.

## Results so far

- **E1: influence is bimodal.** In 24/32 runs no agent ever read the trace and the two worlds stayed
  bit-identical indefinitely. In 8/32 the trace was read and 50–100% of the colony diverged
  permanently. There was no intermediate outcome; reading and capture were the same event in every
  run. The *direction* of effect was near-random (4 beneficial, 3 harmful, 1 neutral): a false trace
  redirects but does not steer, because the world adjudicates on arrival.
- **E2: the horizon is real.** Discovery was 100% at every distance (96/96 runs found the resource),
  while sustained exploitation fell from 100% below ~30 cells to 0% beyond ~75. Decay rate mattered
  only in an intermediate band (~45–59 cells). Strongly supports H2; supports H1 except for the
  τ_ref clause, which remains untested.
- **H3 and H4 are not yet directly tested.**

## Critique sought

1. Does "coordination horizon" already exist under another name? Candidates: central place foraging
   theory, known limits on ant trail length, gossip/epidemic convergence time versus network
   diameter, bounded rationality.
2. Is the identification of evaporation rate with the exploration/exploitation dial standard in ant
   colony optimisation, and has the rule "match trace lifetime to the distance being coordinated
   over" been formalised there?
3. H4 appears to restate Sybil resistance — proof-of-work as a throughput bound substituting for
   identity. Is the stigmergic framing novel, or a rediscovery of Douceur?
4. Is the bimodal, all-or-nothing uptake of a single trace a known phenomenon? Compare
   symmetry-breaking in binary-bridge recruitment experiments, and percolation thresholds.
5. Does "reachability is the enemy of stigmergic robustness" conflict with established results on
   small-world topologies aiding distributed coordination?
6. Is there existing work treating the *same* parameter as simultaneously setting coordination range
   and adversarial resistance? That equivalence (H3) is the claim I am least confident is new.

## Known limitations

Single simulator, 2D grid, one species of agent, modest n per condition. τ_ref untested. H3 rests on
an argument rather than a measurement. Effects of colony size, and of the assumption that trails are
sustained by mutual reinforcement rather than single deposits, are not yet characterised.
