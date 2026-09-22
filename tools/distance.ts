/**
 * The clean experiment: one variable at a time.
 *
 *   ./tools/distance.sh [--dist 10,20,...] [--ants 10,20,40,80,160] [--seeds 24] [--json]
 *
 * Everything is held still except two things: how far the food is, and how many
 * ants there are.
 *
 *   loopRate  0       a PERFECT maze — exactly one route between any two cells,
 *                     ~95% of cells are corridors, so an ant almost never has a
 *                     choice to make. Decision complexity is at its floor,
 *                     which is what makes distance interpretable on its own.
 *   evapRate  0.005   the default
 *   food      1 source, 500 units
 *   ticks     6000
 *
 * Unlike `horizon.ts`, distance here is SET rather than measured. After the
 * maze is built we walk the BFS field out from the nest and MOVE the food to a
 * cell at the requested distance, so the x-axis is a controlled variable and
 * the seed only varies the maze and the ants.
 *
 * Every distance/colony pair runs twice on the same seed:
 *   full  — ordinary stigmergy
 *   none  — no trails laid at all; ants wander and find food by stepping on it
 *
 * The null is the point. "Successful coordination" cannot mean "collected some
 * food", because a random walker collects some food. It means doing better than
 * the same ants would do without any trails, and the coordination horizon is
 * where that advantage runs out.
 */
import {
  Simulation, DEFAULT_PARAMS, DEFAULT_DOCTRINE, cloneDoctrine, makeSeeds,
} from "../../../stigsim/packages/sim-core/src/index";
import { shortestFromNest } from "../../../stigsim/packages/sim-trace/src/metrics";

type Lay = "full" | "none";

function runOne(seed: string, want: number, ants: number, lay: Lay, o: {
  evap: number; perSource: number; ticks: number; loopRate: number; tankMax: number; gain: number;
}) {
  const sim = new Simulation({
    seeds: makeSeeds(seed), numAnts: ants, params: { ...DEFAULT_PARAMS, tankMax: o.tankMax * o.gain }, loopRate: o.loopRate,
    numColonies: 1, numFoodSources: 1, foodPerSource: o.perSource, layout: "random",
  });
  const c = sim.colonies[0];
  const df = shortestFromNest(sim.occupancy, sim.bounds, c.nestX, c.nestY);
  const { cols } = sim.bounds;

  // Move the food to the reachable cell closest to the requested distance.
  // Ties break on the lowest index, so this stays deterministic per seed.
  let best = -1, bestErr = Infinity;
  for (let i = 0; i < df.length; i++) {
    const d = df[i];
    if (d <= 0) continue;
    const err = Math.abs(d - want);
    if (err < bestErr) { bestErr = err; best = i; }
  }
  if (best < 0) return null;
  const src = sim.foodSources[0];
  if (!src) return null;
  src.x = best % cols;
  src.y = (best - (best % cols)) / cols;
  const dist = df[best];

  const d = cloneDoctrine(DEFAULT_DOCTRINE);
  d.evapRate = o.evap;
  // `none` lays nothing at all. Follow weights are left alone: scoreCell()
  // skips a zero-weight channel, and food odor is added inside that power, so
  // zeroing follow would blind the ant to food rather than just denying it trails.
  if (lay === "none") {
    d.forager.lay.returning.food.own = 0;
    d.forager.lay.searching.home.own = 0;
  } else if (o.gain !== 1) {
    // Louder ants. tankMax is scaled by the same factor above, so an ant lays
    // `gain` times as much per cell over the same 106 cells per leg — louder,
    // not shorter-winded. MAX_LAY_GAIN = 3, integers only.
    d.forager.lay.returning.food.own = o.gain;
    d.forager.lay.searching.home.own = o.gain;
  }
  sim.enqueue({ kind: "setAdoption", mode: "instant" });
  sim.enqueue({ kind: "setDoctrine", colony: 0, doctrine: d });
  sim.flushPending();

  let firstDelivery: number | null = null;
  // Food delivered at every 1000th tick, so a long run also contains every
  // shorter run on the same seed and establishment dynamics can be read off.
  const series: number[] = [];
  for (let i = 0; i < o.ticks; i++) {
    sim.step();
    if (firstDelivery === null && c.foodCollected > 0) firstDelivery = sim.tick;
    if (sim.tick % 1000 === 0) series.push(c.foodCollected);
  }
  return {
    series,
    // `dist` is what the maze could actually deliver. When the requested
    // distance is further than any reachable cell, the search above silently
    // returns the FURTHEST cell instead — so several requested distances
    // collapse onto one, and the x-axis quietly stops being a dial. A branchy
    // (loopRate 0.12) 31x31 maze tops out around 77 cells, so anything asked
    // for beyond that is not a measurement. Flagged here so it cannot be read
    // as one.
    clipped: dist !== want,
    seed, want, dist, ants, lay,
    delivered: c.foodCollected,
    share: +(c.foodCollected / o.perSource).toFixed(3),
    firstDelivery,
    exploited: c.foodCollected >= o.perSource * 0.1,
  };
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const v = [...xs].sort((a, b) => a - b), m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

function main() {
  const argv = process.argv.slice(2);
  const flag = (n: string, d: string) => {
    const i = argv.indexOf(`--${n}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
  };
  const list = (n: string, d: string) => flag(n, d).split(",").filter(Boolean).map(Number);
  const asJson = argv.includes("--json");
  const dists = list("dist", "10,20,30,40,60,80,100,120");
  const antCounts = list("ants", "10,20,40,80,160");
  const seeds = Number(flag("seeds", "24"));
  const loopRates = list("loop", "0");
  const evaps = list("evap", "0.005");
  // The ant's pheromone reservoir, refilled only at the nest or on picking up
  // food — so it caps how much trail one trip can lay.
  const tanks = list("tank", String(DEFAULT_PARAMS.tankMax));
  const gains = list("gain", "1");
  const o = {
    perSource: Number(flag("perSource", "500")),
    ticks: Number(flag("ticks", "6000")),
  };

  const runs: any[] = [];
  for (const loopRate of loopRates) for (const evap of evaps) for (const tankMax of tanks) for (const gain of gains)
    for (const want of dists) for (const ants of antCounts) for (const lay of ["full", "none"] as Lay[]) {
      // The no-trail arm lays nothing, so gain cannot touch it: run it once, at gain 1.
      if (lay === "none" && gain !== gains[0]) continue;
      for (let s = 1; s <= seeds; s++) {
        const r = runOne(`horizon-${s}`, want, ants, lay, { ...o, loopRate, evap, tankMax, gain: lay === "none" ? 1 : gain });
        if (r) runs.push({ loopRate, evap, tankMax, gain: lay === "none" ? 1 : gain, ...r });
      }
    }
  // Shout about clipping before anything else: a clipped row looks like a
  // perfectly good data point and is not one.
  const clipped = runs.filter(r => r.clipped);
  if (clipped.length) {
    const byWant = new Map<number, number[]>();
    for (const r of clipped) { const a = byWant.get(r.want) ?? []; a.push(r.dist); byWant.set(r.want, a); }
    const lines = [...byWant.entries()].sort((a, b) => a[0] - b[0]).map(([w, ds]) =>
      `    want ${w} -> actually ${Math.min(...ds)}..${Math.max(...ds)} cells (${ds.length} runs)`);
    console.error(`WARNING: ${clipped.length}/${runs.length} runs could not be placed at the requested distance.`);
    console.error(`The maze has no cell that far from the nest, so the food went to the furthest one instead.`);
    console.error(`These rows are NOT measurements at the requested distance — drop them:`);
    lines.forEach(l => console.error(l));
  }

  if (asJson) { console.log(JSON.stringify({ ...o, loopRates, evaps, tanks, gains, seeds, dists, antCounts, runs }, null, 2)); return; }

  const pick = (want: number, ants: number, lay: Lay) =>
    runs.filter(r => r.loopRate === loopRates[0] && r.evap === evaps[0] && r.tankMax === tanks[0] && r.want === want && r.ants === ants && r.lay === lay);
  const rate = (rs: any[]) => rs.length ? 100 * rs.filter(r => r.exploited).length / rs.length : NaN;

  console.log(`perfect maze (loopRate ${o.loopRate}) — one route between any two cells.`);
  console.log(`evapRate ${evaps[0]}, tankMax ${tanks[0]}, 1 source x ${o.perSource}, ${o.ticks} ticks, ${seeds} seeds. Food placed at the requested distance.\n`);

  const hdr = (t: string) => {
    console.log(`\n${t}`);
    console.log(`${"distance".padEnd(10)}${antCounts.map(n => `N=${n}`.padStart(9)).join("")}`);
  };
  hdr("SUCCESS RATE — share of runs moving >=10% of the source, full stigmergy");
  for (const want of dists) {
    const actual = median(pick(want, antCounts[0], "full").map(r => r.dist));
    console.log(`${`${actual.toFixed(0)} cells`.padEnd(10)}` +
      antCounts.map(n => `${rate(pick(want, n, "full")).toFixed(0)}%`.padStart(9)).join(""));
  }
  hdr("THE NULL — same colonies, no trails at all");
  for (const want of dists) {
    const actual = median(pick(want, antCounts[0], "none").map(r => r.dist));
    console.log(`${`${actual.toFixed(0)} cells`.padEnd(10)}` +
      antCounts.map(n => `${rate(pick(want, n, "none")).toFixed(0)}%`.padStart(9)).join(""));
  }
  hdr("COORDINATION BONUS — median food, full ÷ null. 1.0x means stigmergy buys nothing");
  for (const want of dists) {
    const actual = median(pick(want, antCounts[0], "full").map(r => r.dist));
    console.log(`${`${actual.toFixed(0)} cells`.padEnd(10)}` + antCounts.map(n => {
      const f = median(pick(want, n, "full").map(r => r.delivered));
      const z = median(pick(want, n, "none").map(r => r.delivered));
      return `${(f / Math.max(z, 1)).toFixed(1)}x`.padStart(9);
    }).join(""));
  }

  console.log(`\n\nD* — furthest distance where full stigmergy still succeeds in most runs (>=50%)`);
  console.log(`${"colony".padEnd(10)}${"D*".padStart(11)}${"null still works to".padStart(22)}`);
  for (const n of antCounts) {
    const ok = dists.filter(w => rate(pick(w, n, "full")) >= 50);
    const nul = dists.filter(w => rate(pick(w, n, "none")) >= 50);
    const dOf = (w: number) => median(pick(w, n, "full").map(r => r.dist)).toFixed(0);
    console.log(`${`${n} ants`.padEnd(10)}` +
      `${(ok.length ? `${dOf(Math.max(...ok))} cells` : "—").padStart(11)}` +
      `${(nul.length ? `${dOf(Math.max(...nul))} cells` : "never").padStart(22)}`);
  }
}

main();
