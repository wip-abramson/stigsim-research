/**
 * The paying liar, on the comb.
 *
 *   ./tools/liars.sh [--dist 40] [--k 6] [--len 8] [--ants 40] [--liars 0,1,2,4,8]
 *                    [--lie 1] [--mode everywhere,targeted] [--tank 6400]
 *                    [--seeds 24] [--ticks 18000] [--json]
 *
 * Replaces `tools/subvert.ts`, which asked the right question on the wrong
 * instrument (random layout, a 500-unit food cap, 6000 ticks). Here the maze is
 * the comb from `junctions.ts`, identical across seeds, so the seed varies only
 * the ants and every treatment is paired with a no-liar control on the same seed.
 *
 * THE LIAR is an ordinary forager plus one doctrine atom: it lays food-scent
 * while *searching* ("food this way" where it has found nothing). It walks, it
 * spends the same tank, and `_lay()` drains home before food, so it funds each
 * lie out of what its honest home-trail leaves. The tank refills only at the
 * nest or on real food. Liars are the spoiler role with the forager's tables
 * copied in, so a liar with `--lie 0` is a forager in every respect and its run
 * must match the control exactly — the built-in check, reported as `check`.
 *
 * TWO ATTACKERS.
 *   everywhere — the doctrine liar: lies wherever it searches, including along
 *                the true path, where its scent helps the colony.
 *   targeted   — lies only inside dead ends. The harness sets a designated
 *                liar's role to spoiler while it stands in a branch cell and to
 *                forager elsewhere; the two tables differ only in the lie atom,
 *                so this changes where it lies and nothing else. It still pays
 *                from the same tank and still navigates like an honest ant, so
 *                it reaches dead ends only as often as an honest ant would.
 *                Not trace-legal — this is a headless harness mutation.
 *
 * `--tank` is global in stigsim: liars and honest ants always share one budget.
 *
 * Measured per run: delivery (total and every 1000 ticks), wrong turns into a
 * dead end split by honest/liar and searching/returning, and the standing
 * food-scent mass inside dead ends vs along the corridor every 1000 ticks —
 * the lie as it sits in the field.
 */
import {
  Simulation, DEFAULT_PARAMS, DEFAULT_DOCTRINE, cloneDoctrine, makeSeeds, isDoctrine, COLS,
} from "../../../stigsim/packages/sim-core/src/index";
import { buildComb, combWorld, idx, type Comb } from "./junctions";

type Mode = "everywhere" | "targeted";

function runOne(seed: string, comb: Comb, ants: number, liars: number, lie: number, mode: Mode, o: {
  evap: number; perSource: number; ticks: number; tankMax: number;
}) {
  const sim = new Simulation({
    seeds: makeSeeds(seed), numAnts: ants, params: { ...DEFAULT_PARAMS, tankMax: o.tankMax }, loopRate: 0,
    numColonies: 1, numFoodSources: 1, foodPerSource: o.perSource, layout: "random",
  }, { world: combWorld(comb) });
  const c = sim.colonies[0];
  const src = sim.foodSources[0];
  if (!src) throw new Error("no food source placed");
  src.x = comb.food[0]; src.y = comb.food[1];

  const d = cloneDoctrine(DEFAULT_DOCTRINE);
  d.evapRate = o.evap;
  // floor(fraction * ants) is the spoiler count; the half keeps float error from losing one.
  d.spoilerFraction = liars === 0 ? 0 : (liars + 0.5) / ants;
  d.spoiler = JSON.parse(JSON.stringify(d.forager));
  d.spoiler.lay.searching.food.own = lie;
  if (!isDoctrine(d)) throw new Error(`liars=${liars} lie=${lie} is not a legal doctrine`);
  sim.enqueue({ kind: "setAdoption", mode: "instant" });
  sim.enqueue({ kind: "setDoctrine", colony: 0, doctrine: d });
  sim.flushPending();

  const isLiar = c.ants.map(a => a.role === "spoiler");
  const liarCount = isLiar.filter(Boolean).length;
  if (liarCount !== liars) throw new Error(`asked for ${liars} liars, got ${liarCount}`);

  let firstDelivery: number | null = null;
  const series: number[] = [], liesInBranches: number[] = [], scentOnCorridor: number[] = [];
  const wrong = { honestSearching: 0, honestReturning: 0, liarSearching: 0, liarReturning: 0 };
  const passes = { honestSearching: 0, honestReturning: 0, liarSearching: 0, liarReturning: 0 };
  const last = new Int32Array(ants).fill(idx(1, 1));
  const corridor: number[] = [];
  for (let y = 0; y < comb.grid.length; y++) for (let x = 0; x < COLS; x++) {
    if (comb.grid[y][x] && !comb.branchCells.has(idx(x, y))) corridor.push(idx(x, y));
  }
  const foodMass = (cells: Iterable<number>) => {
    let m = 0;
    for (const i of cells) m += c.field.get("food", i % COLS, Math.floor(i / COLS));
    return Math.round(m);
  };

  for (let i = 0; i < o.ticks; i++) {
    if (mode === "targeted") {
      for (let a = 0; a < c.ants.length; a++) {
        if (isLiar[a]) c.ants[a].role = comb.branchCells.has(idx(c.ants[a].cx, c.ants[a].cy)) ? "spoiler" : "forager";
      }
    }
    sim.step();
    for (let a = 0; a < c.ants.length; a++) {
      const ant = c.ants[a];
      const here = idx(ant.cx, ant.cy);
      if (here === last[a]) continue;
      const from = last[a];
      last[a] = here;
      const who = `${isLiar[a] ? "liar" : "honest"}${ant.state === "searching" ? "Searching" : "Returning"}` as keyof typeof wrong;
      if (comb.junctions.has(here) && !comb.branchEntries.has(from)) passes[who]++;
      if (comb.branchEntries.has(here) && comb.junctions.has(from)) wrong[who]++;
    }
    if (firstDelivery === null && c.foodCollected > 0) firstDelivery = sim.tick;
    if (sim.tick % 1000 === 0) {
      series.push(c.foodCollected);
      liesInBranches.push(foodMass(comb.branchCells));
      scentOnCorridor.push(foodMass(corridor));
    }
  }
  return {
    seed, dist: comb.dist, k: comb.k, ants, liars, lie, mode, tankMax: o.tankMax,
    delivered: c.foodCollected, firstDelivery, series, liesInBranches, scentOnCorridor,
    wrong, passes,
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
  const dists = list("dist", "40"), ks = list("k", "6"), lens = list("len", "8");
  const antCounts = list("ants", "40"), liarCounts = list("liars", "0,1,2,4,8");
  const lies = list("lie", "1"), tanks = list("tank", String(DEFAULT_PARAMS.tankMax));
  const modes = flag("mode", "everywhere,targeted").split(",") as Mode[];
  const seeds = Number(flag("seeds", "24"));
  const o = {
    evap: Number(flag("evap", "0.005")),
    perSource: Number(flag("perSource", "50000")),
    ticks: Number(flag("ticks", "18000")),
  };

  const runs: any[] = [];
  const check: any[] = [];
  for (const dist of dists) for (const len of lens) for (const k of ks) {
    const comb = buildComb(dist, k, len);
    for (const tankMax of tanks) for (const ants of antCounts) {
      const oo = { ...o, tankMax };
      for (let s = 1; s <= seeds; s++) {
        const seed = `comb-${s}`;
        const control = runOne(seed, comb, ants, 0, 0, "everywhere", oo);
        runs.push({ len, ...control, mode: "control" });
        // Built-in check, one seed per cell: liars that tell no lie are foragers.
        if (s === 1) for (const liars of liarCounts.filter(n => n > 0)) for (const mode of modes) {
          const zero = runOne(seed, comb, ants, liars, 0, mode, oo);
          check.push({ dist, k, len, tankMax, ants, liars, mode, ok: zero.delivered === control.delivered && zero.series.join() === control.series.join() });
        }
        for (const liars of liarCounts.filter(n => n > 0 && n < ants)) for (const lie of lies) for (const mode of modes) {
          runs.push({ len, ...runOne(seed, comb, ants, liars, lie, mode, oo) });
        }
      }
    }
  }
  const failed = check.filter(c => !c.ok);
  if (failed.length) console.error(`CHECK FAILED: ${failed.length}/${check.length} lie-0 runs differ from control: ${JSON.stringify(failed.slice(0, 3))}`);
  if (asJson) { console.log(JSON.stringify({ ...o, dists, ks, lens, antCounts, liarCounts, lies, tanks, modes, seeds, check, runs })); return; }

  console.log(`check: ${check.length - failed.length}/${check.length} lie-0 runs identical to control`);
  for (const dist of dists) for (const len of lens) for (const k of ks) for (const tankMax of tanks) for (const ants of antCounts) {
    const cell = runs.filter(r => r.dist === dist && r.len === len && r.k === k && r.tankMax === tankMax && r.ants === ants);
    const ctl = new Map(cell.filter(r => r.mode === "control").map(r => [r.seed, r]));
    console.log(`\nCOMB ${dist} cells, k=${k}, ${len}-cell dead ends, tank ${tankMax}, ${ants} ants, ${o.ticks} ticks, ${seeds} seeds`);
    console.log(`  control median delivered ${median([...ctl.values()].map(r => r.delivered))}`);
    console.log(`  ${"mode".padEnd(12)}${"liars".padStart(6)}${"lie".padStart(5)}${"median ratio".padStart(14)}${"worse/better".padStart(14)}${"honest wrong %".padStart(16)}`);
    for (const mode of modes) for (const liars of liarCounts.filter(n => n > 0)) for (const lie of lies) {
      const rs = cell.filter(r => r.mode === mode && r.liars === liars && r.lie === lie);
      if (!rs.length) continue;
      const ratios = rs.map(r => r.delivered / Math.max(ctl.get(r.seed).delivered, 1));
      const worse = rs.filter(r => r.delivered < ctl.get(r.seed).delivered).length;
      const better = rs.filter(r => r.delivered > ctl.get(r.seed).delivered).length;
      const ws = rs.reduce((a, r) => a + r.wrong.honestSearching, 0), ps = rs.reduce((a, r) => a + r.passes.honestSearching, 0);
      console.log(`  ${mode.padEnd(12)}${String(liars).padStart(6)}${String(lie).padStart(5)}${median(ratios).toFixed(3).padStart(14)}${`${worse}/${better}`.padStart(14)}${(100 * ws / Math.max(ps, 1)).toFixed(1).padStart(16)}`);
    }
  }
}

main();
