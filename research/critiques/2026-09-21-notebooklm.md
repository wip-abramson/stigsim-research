# Critique — NotebookLM against the literature, 2026-09-21

**Source:** NotebookLM, prompted with [`../one-pager.md`](../one-pager.md).
**Status: external input, preserved verbatim below. Treat as data, not as verified fact.**

The inline citation markers (`1`, `23`, `more_horiz`, …) do not resolve to anything we hold — the
reference list did not come across with the text. Several claims are specific and empirical (the
swarm-robotics lay-rate experiments, the AntNet "critical region" analysis, the ACO phase-transition
result) and **must be chased to actual papers before any of them is relied on or cited.** Until then
they are leads, not evidence.

Our response and what we changed because of it: [`../critique-response.md`](../critique-response.md).

---

Here is a detailed, point-by-point critique of your six hypotheses and experimental findings, grounded in the literature on stigmergy, ant colony optimization (ACO), distributed systems, and swarm security.

## 1. Does "coordination horizon" exist under another name?

The concept of a maximum operational range for stigmergic communication appears across several disciplines under different names, but your framing of a "coordination horizon" as an explicit spatial-temporal boundary (min(τ_phys, τ_ref) > τ_act(D)) captures a unique operational threshold:

**Central Place Foraging Theory (CPFT) & Insect Biology:** In behavioral ecology, the spatial reach of trail recruitment is recognized as being bounded by pheromone evaporation. When the round-trip travel time between the nest and a resource exceeds the evaporation latency of the trace, the interval between passing foragers becomes too long, positive feedback fails, and the trail collapses.

**Mobile Agent Search Models:** In formal grid-search theory for artificial swarms, this is framed as a reachability or exploration bound governed by agent lifetime τ and trace duration μ. If μ < 2 (evaporation is faster than the round-trip dispatch interval), standard trail-following mechanisms fail to extend search boundaries unless specialized signaling roles are introduced.

**Gossip / Epidemic Convergence vs. Network Diameter:** In epidemic models, convergence time scales with network diameter. However, epidemic models assume persistent node state or constant transmission probability per contact. Stigmergic systems differ because the medium itself actively decays (τ_phys), making distance a hard spatial filter rather than just a latency delay.

**Verdict:** While CPFT describes the energetic/biological limit and search theory proves spatial reachability bounds, "coordination horizon" is a valuable synthesis. It formally defines the precise distance D where the rate of trace decay outpaces the rate of autocatalytic reinforcement.

## 2. Is evaporation rate as the exploration/exploitation dial standard in ACO, and has matching trace lifetime to distance been formalised?

**The Exploration/Exploitation Dial:** Yes, this is standard in ACO and stigmergy theory. Evaporation is explicitly formalized as the "forgetting" parameter that prevents premature convergence (stagnation) and enables adaptation to dynamic environments. High evaporation rates force agents into random exploration, while low evaporation rates lock the system into exploiting established trails. In ACO runtime theory, evaporation rate ρ acts as a control parameter that drives a sharp phase transition from exponential to polynomial search time.

**Formalizing "Match trace lifetime to distance":** In standard ACO (e.g., Travelling Salesperson Problem solvers), trace decay is matched to graph depth or iteration length. In spatial agent models, this rule has been formalized in grid-exploration proofs: to sustain a trail over distance D, trace lifetime μ must be greater than or equal to the passage interval of reinforcing agents along D.

## 3. Is H4 a rediscovery of Douceur (Sybil resistance), or is the stigmergic framing novel?

H4 states that defense rests on throughput limits (attempts per unit time), not on decay or magnitude.

**Relation to Douceur (2002):** John Douceur's Sybil attack theorem proves that without a trusted central identity authority, distributed systems can only resist identity fabrication if entities are bounded by resource/work expenditure (e.g., Proof-of-Work or rate limits).

**Novelty of the Stigmergic Framing:** Applying this to stigmergy is a meaningful extension rather than a simple rediscovery. In traditional computer security, Sybil defenses bound computational or cryptographic work per virtual identity. In stigmergic systems, defense relies on physical work economics and deposition lay-rates (λ).

**Supporting Evidence:** In swarm robotics foraging experiments under misleading pheromone attacks, increasing the lay-rate parameter λ (making trace creation probabilistic and scarce) causes detractor capture rates to collapse to near 0%, forcing foragers back onto safe random walks. The environment filters out detractors by making continuous signal maintenance metabolically or rate-wise expensive, achieving identity-free robustness.

## 4. Is the bimodal, all-or-nothing uptake of a single trace a known phenomenon?

Yes. This is the canonical signature of quantitative stigmergy undergoing a pitchfork bifurcation.

**Mechanism:** Quantitative choice functions (such as the Deneubourg choice rule P_A = (k + A)^n / ((k + A)^n + (k + B)^n) with non-linearity exponent n ≈ 2) dictate that individual decision-making is probabilistic, but collective outcomes are strongly non-linear.

**Why E1 was Bimodal:** A single injected trace deposit exists near the sensory detection threshold k.
- In 24/32 runs (Sub-critical): No agent encountered the trace before it evaporated, or the directional noise of passing agents smoothed it out, leaving the two worlds bit-identical.
- In 8/32 runs (Super-critical): A passing agent read the trace and reinforced it. Because n > 1, this initial read triggered a symmetry-breaking pitchfork bifurcation, initiating an autocatalytic "snowball effect" that locked 50–100% of the colony onto the new path.

**World Adjudication:** Your observation that a false trace redirects but does not steer matches army ant and foraging models: returning traffic—and long-term trail persistence—is strictly gated by actual resource discovery at the destination.

## 5. Does "reachability is the enemy of stigmergic robustness" conflict with small-world topology results?

There is a genuine tension here, but they do not conflict; rather, they represent a fundamental security–efficiency trade-off:

**Small-World Topologies:** Small-world shortcuts minimize network diameter, maximizing the speed of information convergence and resource discovery.

**Stigmergic Locality & Security:** In adversarial settings, high reachability allows malicious or misleading traces to spread globally without physical verification. In security analyses of stigmergic routing (e.g., AntNet), a subverted node can only successfully divert traffic if it lies within the critical region—defined as the set of nodes whose latency from the source is less than or equal to the latency of the optimal path.

**Resolution:** Small-world shortcuts expand the critical region, making larger portions of the network vulnerable to tampering. Spatial locality acts as an implicit firewall: unconstrained reachability is indeed the enemy of robustness in unauthenticated media.

## 6. Is treating the same parameter as setting range and adversarial resistance (H3) novel?

This is the claim you expressed the least confidence in, and your caution is justified: the dual role of evaporation/decay is recognized across separate literatures, but explicitly unifying them into a single equivalence equation is your core theoretical contribution.

- **In ACO & Biology:** Evaporation (μ) sets the coordination range / spatial horizon.
- **In Swarm Security:** Evaporation (μ) is the primary mechanism for purging stale and false traces.
- **The Bridge (H3):** While security researchers treat decay as an attack mitigation parameter and ACO designers treat it as an optimization parameter, framing them as the exact same quantity—where tightening security contracts the spatial coordination horizon by a measurable unit of distance—is a clean, elegant synthesis.

## Critique of Proposed Next Experiments (E3, E4, E5)

- **E3 — Independent Staleness (τ_ref):** High priority. This is directly needed to validate the min(τ_phys, τ_ref) clause of H1.
- **E4 — Connectivity Sweep:** Excellent design. It will explicitly test Question 5 by showing whether increasing loop density expands reachability at the expense of lowering local trace concentration and increasing vulnerability.
- **E5 — Repeat Attempts (k traces):** Tests H4. Measure whether agent response follows Weber's Law / Poisson choice rules, demonstrating that uptake probability scales with attempt frequency k rather than deterministic magnitude.
