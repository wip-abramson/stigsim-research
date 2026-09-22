/**
 * The influence bound, measured with a liar that pays for its lies.
 *
 *   ./tools/subvert.sh [--frac 0.025,0.05,0.1,0.2,0.4] [--evap 0.005] [--seeds 40] [--json]
 *
 * THE POINT. `tools/impulse.sh` injects a blob of pheromone straight into the
 * field with `field.add()`, which bypasses the ant's tank. That is 50 deposits'
 * worth of influence (DEPOSIT_RATE = 20) delivered instantly, by an attacker
 * that never walked there and paid nothing. It measures the *unbounded* medium
 * — useful as a control, but the opposite of this programme's thesis, which
 * says influence is bounded because "to poison a trail you must be where the
 * trail is, and pay what everyone pays".
 *
 * So here the liar is an ordinary ant. It walks, it burns energy, it forages
 * honestly — and it does ONE extra thing: while *searching* it lays food-scent,
 * which means "food this way" at a place where it has found nothing. Honest
 * ants lay food-scent only while *returning* with food.
 *
 *   forager: lay.returning.food.own = 1     truth, paid for by having found food
 *   liar:    lay.searching.food.own  = N     a lie, paid for out of the same tank
 *
 * The lie costs what the truth costs. `_lay()` drains one tank in a fixed order
 * (home before food), so a liar funds its lie out of what is left after its own
 * honest home-trail, and when the tank is empty it lies no more. The tank
 * refills ONLY at the nest or on picking up real food — so lying throughput is
 * capped by round trips, and a liar working far from home can afford fewer
 * lies. The influence bound is a function of distance for free.
 *
 * DESIGN. Every treatment run is paired with a control on the same seed, so the
 * food lands in the same place in both and seed variance cancels. Measure
 * differences, not absolutes — the lesson from `surface-evap-follow.json`.
 * Treatment and control differ in exactly one doctrine atom.
 *
 * PREDICTION. A true trail is autocatalytic: ants that follow it find food and
 * lay more food-scent on the way back, so it reinforces itself. A false trail
 * is not — ants that follow it find nothing and return foodless, laying no food
 * scent (`_lay` charges the tank for a foodless return but deposits nothing).
 * So the lie has a linear source (the liars) and no positive feedback, while
 * the truth has both. The lie should therefore have a SHORTER horizon than the
 * truth, and the gap between the two curves is the safety margin the world
 * grants for free by adjudicating on arrival.
 *
 * Binning and the exploitation threshold match `tools/horizon.ts` exactly, so
 * p_subvert(D) here and p_exploit(D) there are on one axis and compose.
 */
import {
  Simulation, DEFAULT_PARAMS, DEFAULT_DOCTRINE, cloneDoctrine, makeSeeds, isDoctrine,
} from "../../../stigsim/packages/sim-core/src/index";
import { shortestFromNest } from "../../../stigsim/packages/sim-trace/src/metrics";

interface Arm {
  dist: number; delivered: number; share: number;
  firstDelivery: number | null; exploited: boolean; liars: number;
}

function runOne(
  seed: string, evap: number, frac: number, lie: number,
  perSource: number, ticks: number, loopRate: number, ants: number,
): Arm | null {
  const sim = new Simulation({
    seeds: makeSeeds(seed), numAnts: ants, params: DEFAULT_PARAMS, loopRate,
    numColonies: 1, numFoodSources: 1, foodPerSource: perSource, layout: "random",
  });
  const d = cloneDoctrine(DEFAULT_DOCTRINE);
  d.evapRate = evap;
  d.spoilerFraction = frac;
  // The liar is a forager plus one atom. Copying the forager table first is what
  // makes this a single-atom A/B: without it the default spoiler is a different
  // animal (it chases the enemy nest) and nothing would be controlled.
  d.spoiler = JSON.parse(JSON.stringify(d.forager));
  d.spoiler.lay.searching.food.own = lie;
  if (!isDoctrine(d)) throw new Error(`frac=${frac} lie=${lie} is not a legal doctrine`);
  sim.enqueue({ kind: "setAdoption", mode: "instant" });
  sim.enqueue({ kind: "setDoctrine", colony: 0, doctrine: d });
  sim.flushPending();

  const c = sim.colonies[0];
  const src = sim.foodSources[0];
  const df = shortestFromNest(sim.occupancy, sim.bounds, c.nestX, c.nestY);
  const dist = df[src.y * sim.bounds.cols + src.x];
  if (dist < 0) return null; // walled off from the nest; not a distance question

  let firstDelivery: number | null = null;
  for (let i = 0; i < ticks; i++) {
    sim.step();
    if (firstDelivery === null && c.foodCollected > 0) firstDelivery = sim.tick;
  }
  return {
    dist,
    delivered: c.foodCollected,
    share: +(c.foodCollected / perSource).toFixed(3),
    firstDelivery,
    exploited: c.foodCollected >= perSource * 0.1, // same threshold as horizon.ts
    liars: c.ants.filter(a => a.role === "spoiler").length,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const flag = (n: string, d: string) => {
    const i = argv.indexOf(`--${n}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
  };
  const list = (n: string, d: string) => flag(n, d).split(",").filter(Boolean).map(Number);
  const asJson = argv.includes("--json");

  const seeds = Number(flag("seeds", "40"));
  const fracs = list("frac", "0.025,0.05,0.1,0.2,0.4");
  const evaps = list("evap", "0.005");
  const lie = Number(flag("lie", "1"));
  const perSource = Number(flag("perSource", "500"));
  const ticks = Number(flag("ticks", "6000"));
  const loopRate = Number(flag("loop", "0.12"));
  const ants = Number(flag("ants", "40"));

  const pairs: any[] = [];
  for (const evap of evaps) {
    for (let s = 1; s <= seeds; s++) {
      const seed = `horizon-${s}`;
      const control = runOne(seed, evap, 0, lie, perSource, ticks, loopRate, ants);
      if (!control) continue;
      for (const frac of fracs) {
        const treat = runOne(seed, evap, frac, lie, perSource, ticks, loopRate, ants);
        if (!treat) continue;
        pairs.push({ seed, evap, frac, control, treat });
      }
    }
  }

  if (asJson) {
    console.log(JSON.stringify({ seeds, fracs, evaps, lie, perSource, ticks, ants, pairs }, null, 2));
    return;
  }

  // Same bins as horizon.ts, so the two curves lie on one axis.
  const bin = (d: number) => `${Math.floor(d / 15) * 15}-${Math.floor(d / 15) * 15 + 14}`;
  const bins = [...new Set(pairs.map(p => bin(p.control.dist)))].sort(
    (a, b) => Number(a.split("-")[0]) - Number(b.split("-")[0]));

  console.log(`liar = an ordinary forager that also lays food-scent while searching (gain ${lie}).`);
  console.log(`Paired with a control on the same seed; ${ants} ants, 1 source x ${perSource}, ${ticks} ticks, evap ${evaps.join(",")}.\n`);

  console.log(`p_exploit — share of runs that still moved >=10% of the source\n`);
  console.log(`${"distance".padEnd(11)}${"n".padStart(4)}${"control".padStart(10)}${fracs.map(f => `${Math.round(f * ants)} liars`.padStart(10)).join("")}`);
  for (const b of bins) {
    const inBin = pairs.filter(p => bin(p.control.dist) === b);
    const ctl = [...new Map(inBin.map(p => [p.seed, p.control])).values()];
    const cells = fracs.map(f => {
      const rs = inBin.filter(p => p.frac === f);
      return rs.length ? `${rs.filter(p => p.treat.exploited).length}/${rs.length}`.padStart(10) : "—".padStart(10);
    });
    console.log(`${b.padEnd(11)}${String(ctl.length).padStart(4)}` +
      `${`${ctl.filter(c => c.exploited).length}/${ctl.length}`.padStart(10)}${cells.join("")}`);
  }

  console.log(`\nharm — median paired loss in food delivered, (control - liars) / control\n`);
  console.log(`${"distance".padEnd(11)}${fracs.map(f => `${Math.round(f * ants)} liars`.padStart(10)).join("")}`);
  const median = (xs: number[]) => {
    if (!xs.length) return null;
    const v = [...xs].sort((a, b) => a - b), m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  };
  for (const b of bins) {
    const cells = fracs.map(f => {
      const rs = pairs.filter(p => bin(p.control.dist) === b && p.frac === f && p.control.delivered > 0);
      const m = median(rs.map(p => (p.control.delivered - p.treat.delivered) / p.control.delivered));
      return m === null ? "—".padStart(10) : `${(100 * m).toFixed(0)}%`.padStart(10);
    });
    console.log(`${b.padEnd(11)}${cells.join("")}`);
  }

  console.log(`\nEvery liar walks, burns energy and refills its tank only at the nest or on real food,`);
  console.log(`so its lying throughput is capped by round trips. Compare p_exploit here against`);
  console.log(`tools/horizon.sh on the same axis: the gap is the safety margin.`);
}

main();
