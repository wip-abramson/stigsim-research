# Archive

Superseded framings, kept because they hold the reasoning and the corrections that got us to
[`../model.md`](../model.md). **Nothing here is current.** Read `model.md` first; come here only to
find out why something was abandoned.

Archived 2026-09-22, when the programme narrowed to one question: *what sets the coordination
horizon?* Everything below either answers a different question or has been absorbed.

| file | what it was | why it is here |
|---|---|---|
| `programme.md` | the original security thesis — stigmergic systems secured by bounding trace influence rather than identifying agents | The framing the work started from. Still the long-term motivation, but it put adversaries first, and the foundation underneath it (what actually sets the bound) was never established. Come back to it once the model is solid. |
| `distance-and-bounded-influence.md` | derivation of `D_max ≈ 1/(8·evapRate)` and the argument that security and reach are one knob | **Absorbed into `model.md`.** The derivation was right in shape and wrong in constant: it followed a single deposit's round trip, and real trails are relays held up by traffic. The one-way form `λ = 1/(4e)` that replaced it is withdrawn too (`model.md`, "What is wrong or unfinished"): no hard horizon has been found, so there is no gap left to explain. |
| `hypotheses.md` | the H1–H8 register | Mostly adversarial or superseded. H8 (the horizon) lives on in `coordination-horizon.md`; H7/E9 data is still in `results/` and indexed in `run-log.md`. The register outgrew what two days of evidence could support. |
| `experiments.md` | tiered list of runs to do | Out of date, and used a numbering scheme that never reconciled with the E1–E9 codes used elsewhere. |
| `one-pager.md` | standalone summary written for external critique | Describes a version of the programme we no longer hold. Rewrite from `model.md` if one is needed again. |
| `critique-response.md` | response to the 2026-09-21 literature critique | Its verdicts still stand and are worth reading — notably that the evaporation-as-exploration dial is standard ACO, and that "critical region" is the right borrowed term. Its *priorities* are obsolete: they ordered the work around adversaries before the foundation existed. |

The external critiques themselves (`../critiques/`) and the literature notes (`../literature/`) are
**not** archived — they are source material, not our framing.

## The correction that caused this

Every adversarial experiment up to 2026-09-22 injected influence with `field.add()`, which bypasses
the ant's deposit tank. That is ~50 deposits' worth of influence delivered instantly by an attacker
that never walked anywhere and paid nothing — the opposite of the thesis being tested, which says
influence is bounded precisely *because* an attacker must walk there and pay what everyone pays.
Those results (`results/impulse-*.json`) are still valid as a **free-attacker control**, and are
not evidence about bounded influence. See `../../log/2026-09-22.md`.
