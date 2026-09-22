/**
 * The coordination horizon.
 *
 *   ./tools/horizon.sh [--evap 0.003,0.005,0.01,0.02] [--seeds 24] [--perSource 500]
 *
 * A goal at distance D takes about 8D ticks to act on (4 ticks/cell, there and
 * back). Stigmergic coordination needs the information to still be valid when
 * the agent arrives, so three clocks decide whether distance D is reachable:
 *
 *   tau_act(D) = 8D            time to act on the information
 *   tau_phys   ~ 1/evapRate    how long the trace survives  (designer's choice)
 *   tau_ref    = ?             how long the fact stays true (the world's choice)
 *
 * Coordination at D is possible only while min(tau_phys, tau_ref) > tau_act(D).
 * tau_ref is NOT tunable, so there is a hard horizon no parameter choice passes.
 *
 * Method: one colony, one food source, many seeds. Rather than trying to place
 * food at a chosen distance, we let the layout scatter it and MEASURE the BFS
 * distance each seed happened to produce, then bin. Distance comes for free.
 */
import {
  Simulation, DEFAULT_PARAMS, DEFAULT_DOCTRINE, cloneDoctrine, makeSeeds, openNeighbours,
} from "../../../stigsim/packages/sim-core/src/index";
import { shortestFromNest } from "../../../stigsim/packages/sim-trace/src/metrics";

type Lay = "full" | "home" | "none";

interface Run {
  seed: string; evap: number; perSource: number; ants: number; lay: Lay; loopRate: number;
  dist: number; junctions: number; delivered: number; share: number;
  firstDelivery: number | null; depleted: boolean;
  sustained: number; exploited: boolean;
}


/**
 * Decisions, not cells. An ant reads only its four orthogonal neighbours
 * (`DIRS4`) and drops the one it just came from, so in a corridor it has
 * exactly one option and the pheromone is irrelevant. Influence is only ever
 * exercised where a cell has three or more exits.
 *
 * Walks one shortest path back from the food by descending the BFS field and
 * counts the branch points on it. That is the length of the route measured in
 * choices, which is what `loopRate` really varies.
 */
function junctionsOnPath(sim: Simulation, df: Int32Array | number[], sx: number, sy: number): number {
  const { cols } = sim.bounds;
  let x = sx, y = sy, n = 0, guard = 0;
  while (df[y * cols + x] > 0 && guard++ < 10000) {
    if (openNeighbours(sim.occupancy, x, y).length >= 3) n++;
    const here = df[y * cols + x];
    const step = openNeighbours(sim.occupancy, x, y).find(([nx, ny]) => df[ny * cols + nx] === here - 1);
    if (!step) break;
    [x, y] = step;
  }
  return n;
}

function runOne(seed: string, evap: number, perSource: number, ticks: number, loopRate: number, ants: number, lay: Lay): Run | null {
  const sim = new Simulation({
    seeds: makeSeeds(seed), numAnts: ants, params: DEFAULT_PARAMS, loopRate,
    numColonies: 1, numFoodSources: 1, foodPerSource: perSource, layout: "random",
  });
  const d = cloneDoctrine(DEFAULT_DOCTRINE);
  d.evapRate = evap;
  // The two baselines. `full` is the default forager: lays home-scent while
  // searching, food-scent while returning with food.
  //   home — drop the food deposit only. Ants can still navigate home on the
  //          shared home field, but nobody advertises a find. This isolates
  //          RECRUITMENT, which is the coordinating signal.
  //   none — lay nothing at all. A pure random walk out and back, with food
  //          detected only by stepping on it (odor() fires on the exact cell
  //          and nowhere else). No stigmergy of any kind.
  // Follow weights stay at their defaults in every arm: scoreCell() skips a
  // channel whose weight is zero, and food odor is added INSIDE that power, so
  // zeroing follow would blind the ant to food entirely rather than merely
  // depriving it of trails.
  if (lay === "home" || lay === "none") d.forager.lay.returning.food.own = 0;
  if (lay === "none") d.forager.lay.searching.home.own = 0;
  sim.enqueue({ kind: "setAdoption", mode: "instant" });
  sim.enqueue({ kind: "setDoctrine", colony: 0, doctrine: d });
  sim.flushPending();

  const c = sim.colonies[0];
  const src = sim.foodSources[0];
  if (!src) return null;
  const df = shortestFromNest(sim.occupancy, sim.bounds, c.nestX, c.nestY);
  const dist = df[src.y * sim.bounds.cols + src.x];
  if (dist < 0) return null; // unreachable layout, not a horizon effect
  const junctions = junctionsOnPath(sim, df, src.x, src.y);

  let firstDelivery: number | null = null;
  let atCutoff = 0;
  const cutoff = ticks - 2000;
  for (let i = 0; i < ticks; i++) {
    sim.step();
    if (firstDelivery === null && c.foodCollected > 0) firstDelivery = sim.tick;
    if (sim.tick === cutoff) atCutoff = c.foodCollected;
  }
  const delivered = c.foodCollected;
  return {
    seed, ants, lay, loopRate, evap, perSource, dist, junctions, delivered,
    share: +(delivered / perSource).toFixed(3),
    firstDelivery,
    depleted: sim.foodSources[0].remaining <= 0,
    sustained: delivered - atCutoff,
    // A working trail, not one lucky ant: at least a tenth of the source moved.
    exploited: delivered >= perSource * 0.1,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const flag = (n: string, d: string) => {
    const i = argv.indexOf(`--${n}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
  };
  const asJson = argv.includes("--json");
  const evaps = flag("evap", "0.003,0.005,0.01,0.02").split(",").map(Number);
  const perSources = flag("perSource", "500").split(",").map(Number);
  const seeds = Number(flag("seeds", "24"));
  const ticks = Number(flag("ticks", "6000"));
  const loopRates = flag("loop", "0.12").split(",").filter(Boolean).map(Number);
  const binSize = Number(flag("bin", "5"));
  // Colony size. The traffic model says the horizon grows with it and the
  // single-trace model says it cannot; sweeping it is what tells them apart.
  const antCounts = flag("ants", "40").split(",").filter(Boolean).map(Number);
  const lays = flag("lay", "full").split(",").filter(Boolean) as Lay[];

  const runs: Run[] = [];
  for (const perSource of perSources) {
   for (const loopRate of loopRates) {
    for (const evap of evaps) {
      for (const ants of antCounts) {
        for (const lay of lays) {
          for (let s = 1; s <= seeds; s++) {
            const r = runOne(`horizon-${s}`, evap, perSource, ticks, loopRate, ants, lay);
            if (r) runs.push(r);
          }
        }
      }
    }
   }
  }

  if (asJson) { console.log(JSON.stringify({ ticks, loopRates, binSize, antCounts, lays, evaps, seeds, runs }, null, 2)); return; }

  const bin = (d: number) => Math.floor(d / binSize) * binSize;
  const bins = [...new Set(runs.map(r => bin(r.dist)))].sort((a, b) => a - b);

  for (const perSource of perSources) for (const ants of antCounts) for (const lay of lays) {
    console.log(`\nfoodPerSource ${perSource}, ${ants} ants, lay=${lay} — share of runs that established exploitation (>=10% of source moved)`);
    console.log(`${"dist".padEnd(9)}${evaps.map(e => `evap ${e}`.padStart(11)).join("")}${"   predicted D_max per evap".padEnd(10)}`);
    for (const b of bins) {
      const cells: string[] = [];
      for (const evap of evaps) {
        const rs = runs.filter(r => r.perSource === perSource && r.ants === ants && r.lay === lay && r.evap === evap && bin(r.dist) === b);
        cells.push(rs.length ? `${rs.filter(r => r.exploited).length}/${rs.length}`.padStart(11) : "—".padStart(11));
      }
      console.log(`${`${b}-${b + binSize - 1}`.padEnd(9)}${cells.join("")}`);
    }
    console.log(`${"".padEnd(9)}${evaps.map(e => `(D≤${(1 / (8 * e)).toFixed(0)})`.padStart(11)).join("")}`);
  }

  console.log(`\nmean first-delivery tick, by distance (exploited runs only)`);
  console.log(`${"dist".padEnd(9)}${evaps.map(e => `evap ${e}`.padStart(11)).join("")}`);
  for (const b of bins) {
    const cells: string[] = [];
    for (const evap of evaps) {
      const rs = runs.filter(r => r.evap === evap && bin(r.dist) === b && r.exploited && r.firstDelivery !== null);
      const m = rs.length ? rs.reduce((a, r) => a + (r.firstDelivery ?? 0), 0) / rs.length : null;
      cells.push((m === null ? "—" : m.toFixed(0)).padStart(11));
    }
    console.log(`${`${b}-${b + binSize - 1}`.padEnd(9)}${cells.join("")}`);
  }
  console.log(`\nn=${runs.length} runs, ${ticks} ticks each, loopRate ${loopRates.join(",")}.`);
  console.log(`tau_act(D)=8D ticks. Horizon predicts exploitation fails once 8D > min(tau_phys, tau_ref).`);
}

main();
