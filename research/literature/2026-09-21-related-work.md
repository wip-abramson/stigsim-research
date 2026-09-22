# Related Work & Literature Review

**Source:** NotebookLM, 2026-09-21, produced alongside
[`../critiques/2026-09-21-notebooklm.md`](../critiques/2026-09-21-notebooklm.md).

**Status: external input. Unlike the earlier critique, this one carries a real reference list — so
every claim below is checkable, and should be checked before being cited.** Inline citation markers
and OCR artifacts (`more_horiz`, stray superscript digits) have been stripped for readability; no
wording or claim has been altered, and the reference list is verbatim. The markers were numeric and
the list is alphabetical, so the mapping did not survive the paste — attributions in the prose below
are *unverified* and must be confirmed against the papers.

---

## 2.1 Quantitative Stigmergy & Non-Linear Amplification Dynamics

The concept of stigmergy, first introduced by Pierre-Paul Grassé to explain task coordination in
social insects without direct communication or central administration, distinguishes between
quantitative and qualitative environmental cues. In quantitative stigmergy, agents respond
probabilistically to continuous scalar fields, such as chemical pheromone concentrations. Small
initial fluctuations in trace deposition trigger positive feedback loops — an autocatalytic
"snowball effect" — where accumulating traces increase the probability of subsequent agent
recruitment. Standard models of collective decision-making, such as the Deneubourg binary choice
function

$$P_A = \frac{(k + A)^n}{(k + A)^n + (k + B)^n}$$

(typically parameterized with n ≈ 2), show that non-linear choice rules cause symmetry-breaking
pitchfork bifurcations. Under these dynamics, a swarm rapidly converges onto a single dominant trail
once a critical trace threshold is crossed.

At the individual level, empirical tracking demonstrates that individual ants respond to local
pheromone concentration differences via **proportional Weber's Law turning rules rather than
intrinsically non-linear perceptual functions**. However, when integrated with directional movement
noise over spatial random walks, this proportional individual response mathematically transforms
into a non-linear sigmoidal error function at the collective scale. This pitchfork bifurcation
mechanism directly accounts for the bimodal impulse response observed in single-trace injection
experiments (e.g., E1), where sub-critical traces evaporate without effect, while super-critical
encounters trigger collective path redirection.

## 2.2 Evaporation, Travel Latency, and the Spatial Coordination Horizon

To maintain collective coordination over distance *D*, positive trace reinforcement must outpace
environmental decay. In biological shortcut selection, colonies select shorter paths because the
round-trip travel latency along longer branches causes the **passage interval between reinforcing
foragers to exceed the evaporation latency** of the pheromone, causing the trail to decay before it
can be sustained. In formal mobile agent search theory, exploration reachability and completion
bounds are strictly constrained by the agent lifetime τ and volatile trace duration μ. Beyond a
spatial threshold defined by these temporal parameters, finite agents or evaporating traces prevent
persistent trail establishment.

In artificial swarm algorithms (such as Ant Colony Optimization), trace evaporation functions as a
"forgetting" parameter that prevents premature stagnation and purges obsolete or misleading
environmental state. When resource validity (τ_ref) or trace lifetime (τ_phys) drops below the
round-trip travel latency (τ_act(D)), the autocatalytic loop collapses, establishing a hard upper
bound on spatial reach. This spatial-temporal boundary validates the distinction between
distance-independent individual discovery and distance-bounded collective coordination (H1, H2).

## 2.3 Adversarial Stigmergy & Bounded Spatial Locality

While stigmergic systems provide inherent resilience against single-point failures through
decentralized control, their open interaction medium makes them vulnerable to adversarial
exploitation, such as misleading pheromone trails deposited by malicious "detractors". Early
security analyses of stigmergic routing (e.g., AntNet) demonstrated that an adversary's capacity to
disrupt global traffic via path-tampering attacks is strictly bounded by spatial locality.
Specifically, a subverted node can only successfully divert traffic if it resides within the
**critical region** — defined as the set of nodes whose latency from the source is less than or
equal to the latency of the optimal path. External nodes outside this latency horizon cannot pull
traffic away through environmental modification alone, establishing an explicit spatial bound on
adversarial influence.

Where traditional distributed systems rely on public-key cryptography or centralized identity
verification to resist tampering, physical and robotic swarms frequently employ spatial clustering
algorithms (such as DBSCAN), travel-time estimations (T_actual vs. T_estimate), or cautionary
warning markers to isolate detractors. However, these defense mechanisms introduce explicit
verification layers that depart from pure, unauthenticated stigmergic coordination.

## 2.4 Physical Work Economics, Throughput Bounds, and ID-Free Robustness

An alternative path to adversarial robustness without identity systems relies on bounding trace
deposition throughput (λ) and enforcing physical work economics. In **sematectonic stigmergy**,
communication is mediated directly by physical work accomplished (such as deposited building blocks
or terrain modifications) rather than lightweight artificial markers. Because fabricating a
sematectonic trace requires expending physical energy and time, **faking a signal becomes
identically as expensive as contributing productively to the system.**

In marker-based systems, security can be enforced by restricting the rate or probability (λ) at
which agents can deposit markers. Experiments on detractor attacks demonstrate that when the
probability of laying a trail is made scarce (e.g., increasing the Poisson lay parameter λ from 1 to
12), detractor capture rates collapse toward zero. Because false traces are produced infrequently,
their local concentration remains below the critical threshold required to trigger an autocatalytic
pitchfork bifurcation, allowing benign agents to fall back on safe random walks and site fidelity.
This physical rate-limiting substitutes for cryptographic identity (echoing Sybil resistance
principles), proving that defense can rest on throughput limits and deposition probability rather
than deterministic signal magnitude (H4).

---

## References

Aswale, A., López, A., Ammartayakun, A., & Pinciroli, C. (2022). Hacking the colony: On the
disruptive effect of misleading pheromone and how to defend against it. *Proceedings of the 21st
International Conference on Autonomous Agents and Multiagent Systems (AAMAS)*, 27–34.

Bampas, E., Beauquier, J., Burman, J., & Guy–Obé, W. (2023). Treasure hunt with volatile pheromones.
*HAL Open Science*, hal-04177364.

Deneubourg, J.-L., Aron, S., Goss, S., & Pasteels, J. M. (1990). The self-organizing exploratory
pattern of the Argentine ant. *Journal of Insect Behavior*, 3(2), 159–168.

Donald, B. R. (1995). Information invariants in robotics. *Artificial Intelligence*, 72(1–2),
217–304.

Dorigo, M., Birattari, M., & Stützle, T. (2006). Ant colony optimization. *IEEE Computational
Intelligence Magazine*, 1(4), 28–39.

Goss, S., Aron, S., Deneubourg, J.-L., & Pasteels, J. M. (1989). Self-organized shortcuts in the
Argentine ant. *Naturwissenschaften*, 76(12), 579–581.

Grassé, P.-P. (1959). La reconstruction du nid et les coordinations interindividuelles chez
Bellicositermes natalensis et Cubitermes sp. La théorie de la stigmergie. *Insectes Sociaux*, 6(1),
41–81.

Heylighen, F. (2016). Stigmergy as a universal coordination mechanism I: Definition and components.
*Cognitive Systems Research*, 38, 4–13.

Luna, R., & Lu, Q. (2024). Detection and mitigation of misleading pheromone trails in foraging robot
swarms. *IEEE Conference Proceedings / ScholarWorks @ UTRGV*.

Parunak, H. V. D. (2006). A survey of environments and mechanisms for human-human stigmergy.
*Environments for Multi-Agent Systems II*, Springer, 163–186.

Perna, A., Granovskiy, B., Garnier, S., Nicolis, S. C., Labédan, M., Theraulaz, G., Fourcassié, V.,
& Sumpter, D. J. T. (2012). Individual rules for trail pattern formation in Argentine ants
(*Linepithema humile*). *PLoS Computational Biology*, 8(7), e1002592.

Theraulaz, G., & Bonabeau, E. (1995). Coordination in distributed building. *Science*, 269(5224),
686–688.

Theraulaz, G., & Bonabeau, E. (1999). A brief history of stigmergy. *Artificial Life*, 5(2), 97–116.

Werfel, J., Petersen, K., & Nagpal, R. (2014). Designing collective behavior in a termite-inspired
robot construction team. *Science*, 343(6172), 754–758.

Zhong, W., & Evans, D. (2002). When ants attack: Security issues for stigmergic systems. *University
of Virginia Computer Science Technical Report*.

---

## Reading priority for this programme

| paper | why it matters here |
|---|---|
| **Aswale et al. 2022**, *Hacking the colony* | The closest prior work to our adversarial side. Likely the source of the λ lay-rate result. **Read first** — it may already contain E5. |
| **Zhong & Evans 2002**, *When ants attack* | Origin of the **critical region** bound. The formal precedent for H3's spatial-bound-on-influence claim. |
| **Perna et al. 2012** | Individuals follow *proportional* (Weber) rules; non-linearity is **emergent** from response + movement noise. Decides whether H7/E8 is interesting — see below. |
| **Bampas et al. 2023**, *Treasure hunt with volatile pheromones* | Formal agent-lifetime τ / trace-duration μ reachability bounds. The rigorous version of our coordination horizon. |
| **Goss et al. 1989**, **Deneubourg et al. 1990** | Binary bridge / shortcut selection. The canonical bimodal-uptake experiments. |
| Werfel et al. 2014; Theraulaz & Bonabeau 1995 | Sematectonic stigmergy in practice — the trace *is* the work. |

## Two things in here that change the programme

**1. Sematectonic stigmergy is the strongest form of the thesis.** Where the trace *is* the work —
a deposited block, a modified terrain — faking a signal costs exactly as much as contributing
productively. That is security without identity in its purest form, with no rate-limiting parameter
to tune: the bound is structural. It belongs in the design-properties list as a principle:
**make the trace be the work.** stigsim's pheromone is marker-based, not sematectonic, so this is
not testable here — but it is the sharper design claim.

**2. Perna et al. — RESOLVED against stigsim's source, and it cuts against us.**

`packages/sim-core/src/score.ts`:

```
scoreCell  = Π over (channel, origin) of (read + 1) ^ follow_weight
chooseNext = roulette wheel over those scores
```

For two candidate cells on one channel that is **exactly the Deneubourg choice function**, with
`k = 1` and **n = the doctrine's `follow` weight**. The default doctrine uses **n = 5**; biology is
n ≈ 2.

So stigsim **hard-codes** the non-linearity. It is not emergent from proportional response plus
movement noise, as Perna et al. describe for real ants — and at n=5 it is considerably sharper than
any ant.

**Consequence for H7:** the bimodal all-or-nothing capture is largely a *built-in* consequence of
the choice rule, not a discovered property of stigmergic media. H7 demonstrates that a Deneubourg
system behaves as Deneubourg systems are known to behave. It must be presented that way.

**Consequence that is better than the loss:** *n* is a free, player-tunable parameter (the game
record shows it ranging 1 → 8). Biology cannot vary its own exponent; stigsim can. That makes this
simulator an **apparatus for measuring the bifurcation threshold in n directly** — sweep n from 1
(linear, theory predicts no symmetry-breaking, capture should become graded) upward, and locate the
critical value where all-or-nothing behaviour appears. That is a real contribution and it is one
parameter sweep away.

**Consequence for H5:** completely reframed. The player oscillating
`forager.follow.searching.food.own` between 1 and 8 was not tuning "trail fidelity" — they were
tuning **the non-linearity exponent of the collective choice function**, i.e. how sharply the colony
commits. That maps directly onto the literature.

**Consequence for H3 — potentially fatal to the strong form.** We now have two parameters with
apparently distinct roles:

| parameter | governs | affects |
|---|---|---|
| `evapRate` | τ_phys | the **horizon** — how far coordination reaches |
| `follow` weight *n* | bifurcation sharpness | the **capture probability** — how easily a lone trace takes hold |

If these are separable, then bound and horizon are **not** the same quantity, and H3 is false as
stated — you could buy robustness by lowering *n* without paying for it in reach. That would be a
more useful result for a designer than the equivalence, and it is exactly what E7 must now test:
sweep **both** axes and check whether capture and horizon move together along `evapRate` but apart
along *n*.

**A caveat E2 inherits.** `odor()` gives food and nest a direct beacon at range 0–1 cells,
independent of pheromone. So "discovery" in the horizon sweep is essentially *contact*, which is why
it was 100% at every distance. That strengthens the discovery/coordination split as a finding but
means discovery is not gradient-mediated here.
