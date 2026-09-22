/**
 * Performance surface over (evaporation rate x choice exponent).
 *
 *   ./tools/surface.sh [--evap 0.003,0.005] [--follow 1,2,5] [--ants 40] [--seeds 16] [--json]
 *
 * H5 claims these two are a ridge rather than two independent knobs: that the
 * best evaporation rate depends on how strongly ants trust a trace, because
 * high fidelity with slow evaporation locks a colony onto a source the trail
 * has outlived. The test is a surface, not a line — a ridge shows as an
 * interaction, a diagonal of optima rather than one peak with separable
 * margins.
 *
 * `follow` is the exponent n in stigsim's choice rule (score.ts computes
 * PROD (read+1)^follow, the Deneubourg function with k=1), set on both legs of
 * the recruitment loop at once, which is exactly the single "trail fidelity"
 * knob the player in velvet-ridge-4071 moved.
 *
 * Scored on food collected, per the working norms — not win/loss. Single
 * colony, so there is no opponent to confound it.
 */
import {
  Simulation, DEFAULT_PARAMS, DEFAULT_DOCTRINE, cloneDoctrine, makeSeeds, isDoctrine,
} from "../../../stigsim/packages/sim-core/src/index";

interface Opts {
  seed: string; evap: number; follow: number; ticks: number; ants: number;
  foodSources: number; foodPerSource: number; loopRate: number;
}

function runOne(o: Opts) {
  const sim = new Simulation({
    seeds: makeSeeds(o.seed), numAnts: o.ants, params: DEFAULT_PARAMS,
    loopRate: o.loopRate, numColonies: 1, numFoodSources: o.foodSources,
    foodPerSource: o.foodPerSource, layout: "random",
  });
  const d = cloneDoctrine(DEFAULT_DOCTRINE);
  d.evapRate = o.evap;
  d.forager.follow.searching.food.own = o.follow;
  d.forager.follow.returning.home.own = o.follow;
  if (!isDoctrine(d)) throw new Error(`evap=${o.evap} follow=${o.follow} is not a legal doctrine`);
  sim.enqueue({ kind: "setAdoption", mode: "instant" });
  sim.enqueue({ kind: "setDoctrine", colony: 0, doctrine: d });
  sim.flushPending();

  const total = o.foodSources * o.foodPerSource;
  let exhausted: number | null = null;
  for (let i = 0; i < o.ticks; i++) {
    sim.step();
    if (exhausted === null && sim.foodSources.every(s => s.remaining <= 0)) exhausted = sim.tick;
  }
  const c = sim.colonies[0];
  return {
    seed: o.seed,
    food: c.foodCollected,
    // Share of what was on the map, so the number survives a change of budget.
    yield: +(c.foodCollected / total).toFixed(3),
    population: c.ants.length,
    exhausted,
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
  const seeds = Number(flag("seeds", "16"));
  const evaps = list("evap", "0.003,0.005,0.01,0.02");
  const follows = list("follow", "0.5,1,1.5,2,2.5,3,4,5,6,8,12");

  const base: Omit<Opts, "seed" | "evap" | "follow"> = {
    ticks: Number(flag("ticks", "5500")),
    ants: Number(flag("ants", "40")),
    foodSources: Number(flag("food", "3")),
    foodPerSource: Number(flag("perSource", "500")),
    loopRate: Number(flag("loop", "0.12")),
  };

  const results: any[] = [];
  for (const evap of evaps) {
    for (const follow of follows) {
      for (let s = 1; s <= seeds; s++) {
        results.push({ evap, follow, ...runOne({ ...base, evap, follow, seed: `impulse-${s}` }) });
      }
    }
  }

  if (asJson) { console.log(JSON.stringify({ base, seeds, results }, null, 2)); return; }

  const cell = new Map<string, number[]>();
  for (const r of results) {
    const k = `${r.evap}|${r.follow}`;
    cell.set(k, [...(cell.get(k) ?? []), r.food]);
  }
  // The distribution is heavy-tailed across seeds (one seed collects ~1 food at
  // every setting, another ~600), so the median is the honest centre here.
  const median = (xs: number[]) => {
    const v = [...xs].sort((a, b) => a - b), m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  };

  console.log(`food collected by tick ${base.ticks}, median of ${seeds} seeds, ${base.ants} ants, ${base.foodSources}x${base.foodPerSource} on the map\n`);
  console.log(`${"n \\ evap".padEnd(9)}${evaps.map(e => String(e).padStart(8)).join("")}    best`);
  for (const follow of follows) {
    const row = evaps.map(e => median(cell.get(`${e}|${follow}`) ?? [0]));
    const best = evaps[row.indexOf(Math.max(...row))];
    console.log(`${String(follow).padEnd(9)}${row.map(v => v.toFixed(0).padStart(8)).join("")}${String(best).padStart(8)}`);
  }
  console.log(`\n"best" is the evaporation rate maximising yield at that exponent. H5 (a ridge)`);
  console.log(`predicts it moves down the column; two independent knobs predict it stays put.`);
}

main();
