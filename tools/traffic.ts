/**
 * Experiment 2 — is colony size interchangeable with trail strength?
 *
 *   ./tools/traffic.sh [--seeds 96] [--evap 0.005] [--ticks 6000]
 *
 * `model.md` §2 says "evaporation binds only when traffic is scarce", and
 * treats traffic as the mechanism connecting colony size to reach. Nothing
 * measured so far can tell those two apart: in every sweep to date, colony
 * size and trail strength moved together, because more ants is the only way we
 * have ever made a trail louder.
 *
 * This separates them. Run a big quiet colony against a small loud one, with
 * the SAME total pheromone going into the ground per tick:
 *
 *   arm            ants  lay gain  tankMax   mass laid per ant-cell   colony mass/cell
 *   quiet-120       120         1     6400      3*1*20 =  60             7200
 *   loud-40          40         3    19200      3*3*20 = 180             7200
 *
 * If the two land on top of each other, trail strength is the whole story and
 * headcount never mattered directly — traffic is the sufficient statistic and
 * the field is, in effect, counting the colony for it. If the 120-ant colony
 * still wins at matched traffic, something else scales with headcount (ground
 * covered, independent finders, redundancy) and the traffic story in model.md
 * is incomplete.
 *
 * WHY tankMax MOVES WITH THE GAIN. An ant's deposit tank is an influence
 * BUDGET, not a rate: it refills to tankMax at the nest and on picking up
 * food, and drains by (gain * DEPOSIT_RATE) on each of DEPOSITS_PER_CELL = 3
 * frames per cell. At the default that is 6400 / 60 = 106 cells per leg.
 * Raising the gain alone therefore does NOT make an ant louder — it makes it
 * louder over a third of the route and silent after, so the trail stops short
 * of the nest and recruitment breaks for a reason that has nothing to do with
 * the hypothesis. Scaling tankMax by the same factor holds cells-per-leg at
 * 106 in every arm, so the only thing that changes is loudness.
 *
 * The match is MEASURED, not assumed: `fieldMass` is the colony's total
 * pheromone on the grid, sampled late. Equal deposition under equal
 * evaporation must produce equal standing mass. If the paired arms disagree on
 * fieldMass, they are not matched and nothing below is readable.
 */
import {
  Simulation, DEFAULT_PARAMS, DEFAULT_DOCTRINE, cloneDoctrine, makeSeeds,
} from "../../../stigsim/packages/sim-core/src/index";
import { shortestFromNest } from "../../../stigsim/packages/sim-trace/src/metrics";

interface Arm { label: string; ants: number; gain: number; tankMax: number; }

interface Run {
  seed: string; arm: string; ants: number; gain: number; tankMax: number;
  evap: number; dist: number; delivered: number; share: number;
  exploited: boolean; dryAnts: number;
  /** Standing pheromone and food left, every `massInterval` ticks. */
  massSeries: { t: number; mass: number; remaining: number }[];
}

/** Total pheromone standing on the grid for this colony — the traffic check. */
function fieldMass(sim: Simulation): number {
  const f = sim.colonies[0].field as unknown as { layer?: (ch: string) => Float32Array };
  if (typeof f.layer !== "function") return NaN;
  let m = 0;
  for (const ch of ["home", "food"]) {
    const a = f.layer(ch);
    for (let i = 0; i < a.length; i++) m += a[i];
  }
  return m;
}

function runOne(seed: string, arm: Arm, evap: number, perSource: number, ticks: number, loopRate: number, massInterval: number): Run | null {
  const sim = new Simulation({
    seeds: makeSeeds(seed), numAnts: arm.ants,
    params: { ...DEFAULT_PARAMS, tankMax: arm.tankMax }, loopRate,
    numColonies: 1, numFoodSources: 1, foodPerSource: perSource, layout: "random",
  });
  const d = cloneDoctrine(DEFAULT_DOCTRINE);
  d.evapRate = evap;
  // Both lay atoms scale together: the arm is "each ant is louder", not "each
  // ant advertises differently". Gains are integers 0..MAX_LAY_GAIN = 3.
  d.forager.lay.searching.home.own = arm.gain;
  d.forager.lay.returning.food.own = arm.gain;
  sim.enqueue({ kind: "setAdoption", mode: "instant" });
  sim.enqueue({ kind: "setDoctrine", colony: 0, doctrine: d });
  sim.flushPending();

  const c = sim.colonies[0];
  const src = sim.foodSources[0];
  if (!src) return null;
  const df = shortestFromNest(sim.occupancy, sim.bounds, c.nestX, c.nestY);
  const dist = df[src.y * sim.bounds.cols + src.x];
  if (dist < 0) return null;

  // The standing field must be sampled BEFORE the source runs out. Once it
  // does, no ant can refill at food; a searching ant never re-enters the
  // returning state, so it goes dry at 106 cells and lays nothing for the rest
  // of the run. A colony that depletes the source therefore reads as LOW mass,
  // which is an artifact of winning, not a difference in deposition. Keep the
  // whole series and let the reader pick a window where every arm still has
  // food left.
  const massSeries: { t: number; mass: number; remaining: number }[] = [];
  for (let i = 0; i < ticks; i++) {
    sim.step();
    if (sim.tick % massInterval === 0) {
      massSeries.push({ t: sim.tick, mass: +fieldMass(sim).toFixed(1), remaining: sim.foodSources[0].remaining });
    }
  }
  return {
    seed, arm: arm.label, ants: arm.ants, gain: arm.gain, tankMax: arm.tankMax,
    evap, dist, delivered: c.foodCollected,
    share: +(c.foodCollected / perSource).toFixed(3),
    exploited: c.foodCollected >= perSource * 0.1,
    dryAnts: c.ants.filter(a => a.tank <= 0).length,
    massSeries,
  };
}

/**
 * The arms. Each matched pair holds (ants * gain) constant, which is the
 * colony's deposition per cell-transit, and holds tankMax/gain constant, which
 * is how far one ant can lay before running dry.
 */
const ARMS: Arm[] = [
  { label: "base-40",    ants:  40, gain: 1, tankMax:  6400 },  // control: 40 ants unamplified
  { label: "quiet-80",   ants:  80, gain: 1, tankMax:  6400 },  // pair A, many quiet
  { label: "loud-40x2",  ants:  40, gain: 2, tankMax: 12800 },  // pair A, few loud
  { label: "quiet-120",  ants: 120, gain: 1, tankMax:  6400 },  // pair B, many quiet
  { label: "loud-40x3",  ants:  40, gain: 3, tankMax: 19200 },  // pair B, few loud
];
const PAIRS: [string, string][] = [["quiet-80", "loud-40x2"], ["quiet-120", "loud-40x3"]];

function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function main() {
  const argv = process.argv.slice(2);
  const flag = (n: string, d: string) => {
    const i = argv.indexOf(`--${n}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
  };
  const asJson = argv.includes("--json");
  const evaps = flag("evap", "0.005").split(",").map(Number);
  const seeds = Number(flag("seeds", "96"));
  const ticks = Number(flag("ticks", "6000"));
  const perSource = Number(flag("perSource", "500"));
  const loopRate = Number(flag("loop", "0.12"));
  const binSize = Number(flag("bin", "15"));
  const massInterval = Number(flag("massInterval", "250"));

  const runs: Run[] = [];
  for (const evap of evaps) for (const arm of ARMS) for (let s = 1; s <= seeds; s++) {
    // Same seed names as horizon.ts, so the mazes are shared with that dataset.
    const r = runOne(`horizon-${s}`, arm, evap, perSource, ticks, loopRate, massInterval);
    if (r) runs.push(r);
  }

  if (asJson) {
    console.log(JSON.stringify({ ticks, loopRate, perSource, binSize, massInterval, evaps, seeds, arms: ARMS, pairs: PAIRS, runs }, null, 2));
    return;
  }

  const bin = (d: number) => Math.floor(d / binSize) * binSize;
  const bins = [...new Set(runs.map(r => bin(r.dist)))].sort((a, b) => a - b);

  for (const evap of evaps) {
    // The clean window: the latest sample at which EVERY arm still has most of
    // the source left, so no arm's mass is depressed by having already won.
    const sampleTicks = [...new Set(runs.flatMap(r => r.massSeries.map(m => m.t)))].sort((a, b) => a - b);
    const intact = (t: number) => ARMS.every(a => {
      const rs = runs.filter(r => r.evap === evap && r.arm === a.label);
      return median(rs.map(r => r.massSeries.find(m => m.t === t)?.remaining ?? 0)) >= perSource * 0.5;
    });
    const clean = [...sampleTicks].reverse().find(intact) ?? sampleTicks[0];

    console.log(`\n=== evap ${evap} — is the match real? (standing field mass at t=${clean}, median) ===`);
    console.log(`  clean window: latest sample where every arm still holds >=50% of the source.`);
    console.log(`${"arm".padEnd(12)}${"ants".padStart(6)}${"gain".padStart(6)}${"ants*gain".padStart(11)}${"fieldMass".padStart(12)}${"vs pair".padStart(10)}${"food left".padStart(11)}`);
    for (const a of ARMS) {
      const rs = runs.filter(r => r.evap === evap && r.arm === a.label);
      const at = (r: Run) => r.massSeries.find(m => m.t === clean);
      const m = median(rs.map(r => at(r)?.mass ?? NaN));
      const partner = PAIRS.flatMap(([q, l]) => q === a.label ? [l] : l === a.label ? [q] : [])[0];
      let rel = "—";
      if (partner) {
        const ps = runs.filter(r => r.evap === evap && r.arm === partner);
        const pm = median(ps.map(r => at(r)?.mass ?? NaN));
        rel = `${(m / pm).toFixed(2)}x`;
      }
      console.log(`${a.label.padEnd(12)}${String(a.ants).padStart(6)}${String(a.gain).padStart(6)}${String(a.ants * a.gain).padStart(11)}${m.toFixed(0).padStart(12)}${rel.padStart(10)}${median(rs.map(r => at(r)?.remaining ?? NaN)).toFixed(0).padStart(11)}`);
    }
    console.log(`  dry ants at end (median): ${ARMS.map(a => `${a.label} ${median(runs.filter(r => r.evap === evap && r.arm === a.label).map(r => r.dryAnts)).toFixed(0)}/${a.ants}`).join(", ")}`);

    console.log(`\n=== evap ${evap} — median food delivered, by distance ===`);
    console.log(`${"dist".padEnd(10)}${ARMS.map(a => a.label.padStart(12)).join("")}`);
    for (const b of bins) {
      const cells = ARMS.map(a => {
        const rs = runs.filter(r => r.evap === evap && r.arm === a.label && bin(r.dist) === b);
        return (rs.length ? median(rs.map(r => r.delivered)).toFixed(0) : "—").padStart(12);
      });
      const n = runs.filter(r => r.evap === evap && r.arm === ARMS[0].label && bin(r.dist) === b).length;
      console.log(`${`${b}-${b + binSize - 1}`.padEnd(10)}${cells.join("")}   n=${n}`);
    }

    // The other half of the design, free in the same data: hold HEADCOUNT
    // fixed at 40 and walk the loudness ladder. If loudness were the lever,
    // this is where it would show.
    console.log(`\n=== evap ${evap} — loudness at fixed headcount (all N=40, paired on seed) ===`);
    for (const l of ["loud-40x2", "loud-40x3"]) {
      const bs2 = runs.filter(r => r.evap === evap && r.arm === "base-40");
      const diffs: number[] = [];
      for (const a of bs2) {
        const b = runs.find(r => r.evap === evap && r.arm === l && r.seed === a.seed);
        if (b) diffs.push(b.delivered - a.delivered);
      }
      const up = diffs.filter(d => d > 0).length, down = diffs.filter(d => d < 0).length;
      console.log(`  base-40 -> ${l}: median diff ${median(diffs).toFixed(1)} food` +
        `  (louder ahead on ${up}/${diffs.length} seeds, behind on ${down}, tied on ${diffs.length - up - down})`);
    }

    console.log(`\n=== evap ${evap} — matched-pair verdict (paired on seed, Wilcoxon-style sign count) ===`);
    for (const [q, l] of PAIRS) {
      const qs = runs.filter(r => r.evap === evap && r.arm === q);
      const diffs: number[] = [];
      for (const a of qs) {
        const b = runs.find(r => r.evap === evap && r.arm === l && r.seed === a.seed);
        if (b) diffs.push(a.delivered - b.delivered);
      }
      const wins = diffs.filter(d => d > 0).length, losses = diffs.filter(d => d < 0).length;
      console.log(`${q} vs ${l}: median diff ${median(diffs).toFixed(1)} food` +
        `  (${q} ahead on ${wins}/${diffs.length} seeds, behind on ${losses}, tied on ${diffs.length - wins - losses})`);
    }
  }
  console.log(`\nn=${runs.length} runs, ${ticks} ticks, loopRate ${loopRate}, ${seeds} seeds per arm.`);
}

main();
