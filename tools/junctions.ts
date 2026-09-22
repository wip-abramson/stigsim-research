/**
 * The junction experiment: hold distance fixed, dial the number of decisions.
 *
 *   ./tools/junctions.sh [--dist 40] [--k 0,2,4,6,8,12] [--len 8] [--ants 10,20,40,80]
 *                        [--seeds 16] [--ticks 6000] [--lay full,none] [--json]
 *
 * Every random-maze sweep so far confounds distance with decision count: a
 * longer path in a branchy maze also has more junctions. This harness builds
 * the maze by hand instead — a COMB:
 *
 *     nest (1,1)
 *       |                      down-leg, 14 cells
 *       |
 *       +----+----+----+----+---- food      horizontal leg, dist-14 cells
 *            |    |    |    |
 *            |    |    |    |               k dead-end branches, `len` cells
 *                                            each, alternating up/down
 *
 * The nest-to-food path length is `dist` in every arm; `k` sets how many
 * T-junctions lie on it. An ant never reverses in a corridor (it drops the
 * cell it just left), so with k = 0 a no-trail ant walks straight to the food
 * and straight back — the perfect-maze result. Every junction is a coin flip
 * for it: enter the dead end (cost 2·len steps) or carry on. And an ant coming
 * back OUT of a dead end has forgotten which way it was going, so the null
 * degrades faster than the coin flip alone suggests.
 *
 * The seed varies only the ants. The maze is identical across seeds, so the
 * within-cell spread is ant noise and nothing else — the layout confound that
 * swamped every absolute-yield surface is gone.
 *
 * Wrong turns are counted directly: an ant stepping from a corridor cell into
 * the first cell of a branch, split by whether it was searching or returning.
 */
import {
  Simulation, DEFAULT_PARAMS, DEFAULT_DOCTRINE, cloneDoctrine, makeSeeds,
  DenseGrid, DenseField, COLS, ROWS,
} from "../../../stigsim/packages/sim-core/src/index";
import type { CellType, WorldSpec } from "../../../stigsim/packages/sim-core/src/index";

type Lay = "full" | "home" | "none";

interface Comb {
  grid: CellType[][];
  food: [number, number];
  dist: number;
  k: number;
  branchEntries: Set<number>;   // idx of the first cell of every branch
  junctions: Set<number>;       // idx of corridor cells that have a branch
}

const idx = (x: number, y: number) => y * COLS + x;

function buildComb(dist: number, k: number, len: number): Comb {
  const grid: CellType[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0) as CellType[]);
  const open = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) throw new Error(`comb out of bounds at ${x},${y}`);
    grid[y][x] = 1;
  };
  const legY = 15, downLen = 14;
  if (dist < downLen + 2) throw new Error(`dist must be >= ${downLen + 2}`);
  const h = dist - downLen;
  const foodX = 1 + h;
  if (foodX > COLS - 2) throw new Error(`dist ${dist} does not fit: food would be at x=${foodX}`);
  for (let y = 1; y <= legY; y++) open(1, y);
  for (let x = 1; x <= foodX; x++) open(x, legY);

  // Branch slots: odd x from 3 to foodX-2, so branches never touch the down-leg
  // (wall column x=2) or the food cell, and adjacent branches are separated by
  // a wall column.
  const slots: number[] = [];
  for (let x = 3; x <= foodX - 2; x += 2) slots.push(x);
  if (k > slots.length) throw new Error(`k=${k} exceeds the ${slots.length} slots on a ${h}-cell leg`);
  const chosen: number[] = [];
  for (let i = 0; i < k; i++) chosen.push(slots[Math.round(((i + 0.5) * slots.length) / k - 0.5)]);
  if (new Set(chosen).size !== chosen.length) throw new Error(`k=${k}: slot collision, choose a k that divides the leg`);
  if (legY - len < 1 || legY + len > ROWS - 2) throw new Error(`len ${len} does not fit`);

  const branchEntries = new Set<number>(), junctions = new Set<number>();
  chosen.forEach((x, i) => {
    const up = i % 2 === 0;
    for (let j = 1; j <= len; j++) open(x, up ? legY - j : legY + j);
    branchEntries.add(idx(x, up ? legY - 1 : legY + 1));
    junctions.add(idx(x, legY));
  });
  return { grid, food: [foodX, legY], dist, k, branchEntries, junctions };
}

function combWorld(c: Comb): WorldSpec {
  return {
    occupancy: new DenseGrid(c.grid.map(r => [...r] as CellType[])),
    nests: [[1, 1]],
    createField: () => new DenseField(COLS, ROWS),
  };
}

function runOne(seed: string, comb: Comb, ants: number, lay: Lay, o: {
  evap: number; perSource: number; ticks: number; tankMax: number; gain: number;
}) {
  const sim = new Simulation({
    seeds: makeSeeds(seed), numAnts: ants, params: { ...DEFAULT_PARAMS, tankMax: o.tankMax * o.gain }, loopRate: 0,
    numColonies: 1, numFoodSources: 1, foodPerSource: o.perSource, layout: "random",
  }, { world: combWorld(comb) });
  const c = sim.colonies[0];
  const src = sim.foodSources[0];
  if (!src) throw new Error("no food source placed");
  src.x = comb.food[0]; src.y = comb.food[1];

  const d = cloneDoctrine(DEFAULT_DOCTRINE);
  d.evapRate = o.evap;
  // Louder ants: lay weight and tankMax both scaled by `gain`, so cells per leg stay at 106.
  d.forager.lay.returning.food.own = o.gain;
  d.forager.lay.searching.home.own = o.gain;
  if (lay === "none" || lay === "home") d.forager.lay.returning.food.own = 0;
  if (lay === "none") d.forager.lay.searching.home.own = 0;
  sim.enqueue({ kind: "setAdoption", mode: "instant" });
  sim.enqueue({ kind: "setDoctrine", colony: 0, doctrine: d });
  sim.flushPending();

  let firstDelivery: number | null = null;
  const series: number[] = [];
  const wrong = { searching: 0, returning: 0 };
  const passes = { searching: 0, returning: 0 };
  const last = new Int32Array(ants).fill(idx(1, 1));
  for (let i = 0; i < o.ticks; i++) {
    sim.step();
    for (let a = 0; a < c.ants.length; a++) {
      const ant = c.ants[a];
      const here = idx(ant.cx, ant.cy);
      if (here === last[a]) continue;
      const from = last[a];
      last[a] = here;
      // Entering a junction cell from the corridor is a "pass"; the next move
      // decides whether it was a wrong turn. Counting entries into the branch
      // from the junction cell gives wrong turns directly.
      if (comb.junctions.has(here) && !comb.branchEntries.has(from)) passes[ant.state]++;
      if (comb.branchEntries.has(here) && comb.junctions.has(from)) wrong[ant.state]++;
    }
    if (firstDelivery === null && c.foodCollected > 0) firstDelivery = sim.tick;
    if (sim.tick % 1000 === 0) series.push(c.foodCollected);
  }
  const trips = c.recentTrips.map(t => t.steps).sort((a, b) => a - b);
  const tripMedian = trips.length ? trips[trips.length >> 1] : null;
  return {
    seed, dist: comb.dist, k: comb.k, ants, lay,
    delivered: c.foodCollected, firstDelivery, series,
    wrongSearching: wrong.searching, wrongReturning: wrong.returning,
    passesSearching: passes.searching, passesReturning: passes.returning,
    tripMedian,
  };
}

const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const v = [...xs].sort((a, b) => a - b), m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

function main() {
  const argv = process.argv.slice(2);
  const flag = (n: string, d: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
  const list = (n: string, d: string) => flag(n, d).split(",").filter(Boolean).map(Number);
  const asJson = argv.includes("--json");
  const dists = list("dist", "40");
  const ks = list("k", "0,2,4,6,8,12");
  const lens = list("len", "8");
  const antCounts = list("ants", "10,20,40,80");
  const seeds = Number(flag("seeds", "16"));
  const lays = flag("lay", "full,none").split(",") as Lay[];
  const o = {
    evap: Number(flag("evap", "0.005")),
    perSource: Number(flag("perSource", "50000")),
    ticks: Number(flag("ticks", "6000")),
    tankMax: Number(flag("tank", String(DEFAULT_PARAMS.tankMax))),
  };
  const gains = list("gain", "1");
  const tanks = list("tank", String(DEFAULT_PARAMS.tankMax));

  const runs: any[] = [];
  for (const dist of dists) for (const len of lens) for (const k of ks) {
    const comb = buildComb(dist, k, len);
    for (const tankMax of tanks) for (const gain of gains) for (const ants of antCounts) for (const lay of lays) {
      if (lay === "none" && (gain !== gains[0] || tankMax !== tanks[0])) continue;   // nothing laid: gain and tank are moot
      const g = lay === "none" ? 1 : gain;
      const oo = { ...o, tankMax, gain: g };
      for (let s = 1; s <= seeds; s++) runs.push({ len, ...oo, ...runOne(`comb-${s}`, comb, ants, lay, oo) });
    }
  }
  if (asJson) { console.log(JSON.stringify({ ...o, gains, tanks, lens, dists, ks, antCounts, lays, seeds, runs }, null, 2)); return; }

  for (const dist of dists) for (const len of lens) {
    const pick = (dist: number, k: number, ants: number, lay: Lay) =>
      runs.filter(r => r.dist === dist && r.len === len && r.k === k && r.ants === ants && r.lay === lay);
    console.log(`\nCOMB — nest to food ${dist} cells, ${len}-cell dead ends, evap ${o.evap}, ${o.ticks} ticks, ${seeds} seeds`);
    console.log(`conveyor ceiling N·T/8d at k=0: ${antCounts.map(n => `N=${n}: ${(n * o.ticks / (8 * dist)).toFixed(0)}`).join("   ")}`);
    for (const lay of lays) {
      console.log(`\n  median food delivered — ${lay}`);
      console.log(`  ${"junctions".padEnd(10)}${antCounts.map(n => `N=${n}`.padStart(9)).join("")}`);
      for (const k of ks) console.log(`  ${String(k).padEnd(10)}${antCounts.map(n => median(pick(dist, k, n, lay).map(r => r.delivered)).toFixed(0).padStart(9)).join("")}`);
    }
    if (lays.includes("full") && lays.includes("none")) {
      console.log(`\n  coordination bonus — median full ÷ median none`);
      console.log(`  ${"junctions".padEnd(10)}${antCounts.map(n => `N=${n}`.padStart(9)).join("")}`);
      for (const k of ks) console.log(`  ${String(k).padEnd(10)}${antCounts.map(n => {
        const f = median(pick(dist, k, n, "full").map(r => r.delivered)), z = median(pick(dist, k, n, "none").map(r => r.delivered));
        return `${(f / Math.max(z, 1)).toFixed(2)}x`.padStart(9);
      }).join("")}`);
    }
    for (const lay of lays) {
      console.log(`\n  wrong turns per junction pass (%) — ${lay}, searching | returning`);
      console.log(`  ${"junctions".padEnd(10)}${antCounts.map(n => `N=${n}`.padStart(14)).join("")}`);
      for (const k of ks) {
        if (k === 0) continue;
        console.log(`  ${String(k).padEnd(10)}${antCounts.map(n => {
          const rs = pick(dist, k, n, lay);
          const ws = rs.reduce((a, r) => a + r.wrongSearching, 0), ps = rs.reduce((a, r) => a + r.passesSearching, 0);
          const wr = rs.reduce((a, r) => a + r.wrongReturning, 0), pr = rs.reduce((a, r) => a + r.passesReturning, 0);
          return `${(100 * ws / Math.max(ps, 1)).toFixed(0)}% | ${(100 * wr / Math.max(pr, 1)).toFixed(0)}%`.padStart(14);
        }).join("")}`);
      }
    }
    for (const lay of lays) {
      console.log(`\n  median round-trip steps (last 50 trips; straight line is ${2 * dist}) — ${lay}`);
      console.log(`  ${"junctions".padEnd(10)}${antCounts.map(n => `N=${n}`.padStart(9)).join("")}`);
      for (const k of ks) console.log(`  ${String(k).padEnd(10)}${antCounts.map(n => {
        const v = pick(dist, k, n, lay).map(r => r.tripMedian).filter((x): x is number => x !== null);
        return (v.length ? median(v).toFixed(0) : "—").padStart(9);
      }).join("")}`);
    }
  }
}

main();
