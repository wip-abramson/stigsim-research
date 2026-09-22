/**
 * Impulse response of the stigmergic medium.
 *
 *   ./tools/impulse.sh [--evap 0.005] [--follow 5] [--dist 10] [--seeds 3] [--json]
 *
 * --evap and --follow both take comma-separated lists and are swept as an
 * outer product, so one invocation gives the (evaporation x choice exponent)
 * plane. `follow` is the exponent n in stigsim's choice rule: score.ts computes
 * PROD (read+1)^follow and picks by roulette, which is the Deneubourg choice
 * function with k=1 and n = the follow weight. n is what sets the bifurcation.
 *
 * Runs two identical simulations from one seed. At tick t0 one of them gets a
 * single extra pheromone deposit in a single cell. Everything after that is
 * the influence of that one trace.
 *
 * The headline number is GAIN = peak |A-B| field mass / the amount injected.
 * Stigmergy has positive feedback (recruitment: a trace attracts ants that lay
 * more trace) and negative feedback (evaporation). Gain is the ratio between
 * them:
 *
 *   gain ~< 1  the bound wins; one trace stays one trace's worth of influence
 *   gain >> 1  recruitment wins; one trace is amplified into large influence,
 *              and the medium is NOT bounding individual influence at all
 *
 * RADIUS and the reconvergence tick are the spatial and temporal bounds the
 * research thesis is about, measured rather than inferred.
 */
import {
  Simulation, DEFAULT_PARAMS, DEFAULT_DOCTRINE, cloneDoctrine, makeSeeds, isDoctrine,
} from "../../../stigsim/packages/sim-core/src/index";
import type { Channel } from "../../../stigsim/packages/sim-core/src/types";
import { shortestFromNest } from "../../../stigsim/packages/sim-trace/src/metrics";

const CHANNELS: Channel[] = ["home", "food", "caut"];
const EPS = 1e-3;

interface Opts {
  seed: string; evap: number; follow: number; t0: number; ticks: number; amount: number;
  channel: Channel; dist: number; where: "trail" | "empty"; ants: number; foodSources: number;
  foodPerSource: number; loopRate: number; sample: number;
}

function build(o: Opts): Simulation {
  const sim = new Simulation({
    seeds: makeSeeds(o.seed), numAnts: o.ants, params: DEFAULT_PARAMS,
    loopRate: o.loopRate, numColonies: 1, numFoodSources: o.foodSources,
    foodPerSource: o.foodPerSource, layout: "random",
  });
  const d = cloneDoctrine(DEFAULT_DOCTRINE);
  d.evapRate = o.evap;
  // The forager's two steering exponents, set together: searching ants steer by
  // food, returning ants by home, and the recruitment loop runs through both. A
  // half-step is stigsim's whole domain for these (deterministicPow throws
  // otherwise) and 0 means 'ignore the trail entirely', i.e. a random walker.
  d.forager.follow.searching.food.own = o.follow;
  d.forager.follow.returning.home.own = o.follow;
  if (!isDoctrine(d)) throw new Error(`follow=${o.follow} is not a legal doctrine weight`);
  sim.enqueue({ kind: "setAdoption", mode: "instant" });
  sim.enqueue({ kind: "setDoctrine", colony: 0, doctrine: d });
  sim.flushPending();
  return sim;
}

/**
 * Where to inject. `trail` finds the busiest cell near `dist` from the nest —
 * a trace nobody visits measures nothing. `empty` finds a quiet one at the
 * same distance, which is the deception question instead: can a lone false
 * trace recruit anyone at all?
 */
function impulseCell(sim: Simulation, dist: number, where: "trail" | "empty") {
  const c = sim.colonies[0];
  const df = shortestFromNest(sim.occupancy, sim.bounds, c.nestX, c.nestY);
  const { cols } = sim.bounds;
  const band: { cx: number; cy: number; d: number; phero: number }[] = [];
  let bestErr = Infinity;
  for (let i = 0; i < df.length; i++) {
    if (df[i] < 0) continue;
    bestErr = Math.min(bestErr, Math.abs(df[i] - dist));
  }
  for (let i = 0; i < df.length; i++) {
    const d = df[i];
    if (d < 0 || Math.abs(d - dist) > bestErr + 1) continue;
    const cx = i % cols, cy = (i - (i % cols)) / cols;
    band.push({ cx, cy, d, phero: c.field.get("home", cx, cy) + c.field.get("food", cx, cy) });
  }
  band.sort((a, b) => where === "trail" ? b.phero - a.phero : a.phero - b.phero);
  const pick = band[0] ?? { cx: c.nestX, cy: c.nestY, d: 0, phero: 0 };
  return { cx: pick.cx, cy: pick.cy, actual: pick.d, localPhero: Math.round(pick.phero) };
}

/** L1 difference between the two colonies' fields, and how far it has spread. */
function delta(a: Simulation, b: Simulation, at: { cx: number; cy: number }) {
  const fa = a.colonies[0].field, fb = b.colonies[0].field;
  const { cols, rows } = a.bounds;
  let l1 = 0, maxDist = 0, cells = 0;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      let cellDiff = 0;
      for (const ch of CHANNELS) cellDiff += Math.abs(fa.get(ch, cx, cy) - fb.get(ch, cx, cy));
      if (cellDiff <= EPS) continue;
      l1 += cellDiff;
      cells++;
      // Chebyshev distance in cells from the injected cell.
      const d = Math.max(Math.abs(cx - at.cx), Math.abs(cy - at.cy));
      if (d > maxDist) maxDist = d;
    }
  }
  return { l1, maxDist, cells };
}

function antsDiverged(a: Simulation, b: Simulation) {
  const aa = a.colonies[0].ants, bb = b.colonies[0].ants;
  if (aa.length !== bb.length) return Math.max(aa.length, bb.length);
  let n = 0;
  for (let i = 0; i < aa.length; i++) if (aa[i].x !== bb[i].x || aa[i].y !== bb[i].y) n++;
  return n;
}

function runOne(o: Opts) {
  const A = build(o), B = build(o);
  for (let i = 0; i < o.t0; i++) { A.step(); B.step(); }

  const antsAtStart = A.colonies[0].ants.length;
  const at = impulseCell(A, o.dist, o.where);
  const pre = delta(A, B, at);
  if (pre.l1 > EPS) throw new Error(`runs differed before the impulse (l1=${pre.l1}) — not deterministic`);

  B.colonies[0].field.add(o.channel, at.cx, at.cy, o.amount);

  const series: { t: number; l1: number; radius: number; cells: number; ants: number }[] = [];
  let peak = { l1: 0, t: o.t0 }, peakRadius = 0, reconverged: number | null = null;
  let halfLife: number | null = null, captureTick: number | null = null;

  for (let i = 0; i < o.ticks; i++) {
    A.step(); B.step();
    if ((i + 1) % o.sample && i !== o.ticks - 1) continue;
    const d = delta(A, B, at);
    const t = A.tick;
    series.push({ t, l1: +d.l1.toFixed(2), radius: d.maxDist, cells: d.cells, ants: antsDiverged(A, B) });
    if (d.l1 > peak.l1) peak = { l1: d.l1, t };
    if (d.maxDist > peakRadius) peakRadius = d.maxDist;
    if (halfLife === null && d.l1 < o.amount / 2 && t > o.t0) halfLife = t - o.t0;
    if (reconverged === null && d.l1 <= EPS) reconverged = t - o.t0;
    // The trace was read by somebody: the first tick any ant's path differs.
    if (captureTick === null && antsDiverged(A, B) > 0) captureTick = t - o.t0;
  }

  return {
    seed: o.seed,
    impulse: { cell: [at.cx, at.cy], distFromNest: at.actual, localPhero: at.localPhero, where: o.where, channel: o.channel, amount: o.amount, t0: o.t0 },
    // "read" = some ant's path changed, i.e. somebody actually sensed the trace.
    // "captured" = it propagated to a large share of the colony rather than
    // one ant wobbling. Decided on ants, not field mass: at slow evaporation the
    // injected blob alone stays above EPS for the whole run and would fake a capture.
    read: captureTick !== null,
    captured: series.length > 0 && series[series.length - 1].ants >= antsAtStart * 0.25,
    antsAtEnd: series.length > 0 ? series[series.length - 1].ants : 0,
    antsAtStart,
    captureTick,
    gain: +(peak.l1 / o.amount).toFixed(2),
    peakL1: +peak.l1.toFixed(1),
    peakTick: peak.t,
    ticksToPeak: peak.t - o.t0,
    radius: peakRadius,
    halfLife,
    reconverged,
    foodDelta: A.colonies[0].foodCollected - B.colonies[0].foodCollected,
    series,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const flag = (n: string, d: string) => {
    const i = argv.indexOf(`--${n}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
  };
  const asJson = argv.includes("--json");
  const seeds = Number(flag("seeds", "3"));
  const list = (n: string) => flag(n, "").split(",").filter(Boolean).map(Number);
  const evaps = list("evap");
  const follows = list("follow");

  const base: Omit<Opts, "seed" | "evap" | "follow"> = {
    t0: Number(flag("t0", "1500")),
    ticks: Number(flag("ticks", "2000")),
    amount: Number(flag("amount", "1000")),
    channel: flag("channel", "food") as Channel,
    dist: Number(flag("dist", "10")),
    where: (flag("where", "trail") as "trail" | "empty"),
    ants: Number(flag("ants", "40")),
    foodSources: Number(flag("food", "3")),
    foodPerSource: Number(flag("perSource", "500")),
    loopRate: Number(flag("loop", "0.12")),
    sample: Number(flag("sample", "25")),
  };

  const rates = evaps.length ? evaps : [0.003, 0.005, 0.01, 0.02];
  // The stigsim default. Biology's measured exponent is ~2, so the default
  // colony is already far into the super-critical branch.
  const exponents = follows.length ? follows : [5];
  const results: any[] = [];
  for (const evap of rates) {
    for (const follow of exponents) {
      for (let s = 1; s <= seeds; s++) {
        results.push({ evap, follow, ...runOne({ ...base, evap, follow, seed: `impulse-${s}` }) });
      }
    }
  }

  if (asJson) { console.log(JSON.stringify({ base, results }, null, 2)); return; }

  console.log(`impulse: ${base.amount} units of "${base.channel}" on the ${base.where === "trail" ? "busiest" : "quietest"} cell ~${base.dist} cells from nest, t0=${base.t0}, +${base.ticks} ticks, ${seeds} seeds\n`);
  console.log(`${"evap".padEnd(7)}${"n".padStart(5)}${"read".padStart(7)}${"captured".padStart(10)}${"radius|cap".padStart(11)}${"ants%|cap".padStart(11)}${"captureTick".padStart(13)}   D_max`);
  const byCell = new Map<string, any[]>();
  for (const r of results) {
    const k = `${r.evap}|${r.follow}`;
    byCell.set(k, [...(byCell.get(k) ?? []), r]);
  }
  for (const [key, rs] of byCell) {
    const [evap, follow] = key.split("|").map(Number);
    const readRs = rs.filter(r => r.read);
    const caught = rs.filter(r => r.captured);
    const avg = (xs: (number | null)[]) => {
      const vs = xs.filter((v): v is number => v !== null && Number.isFinite(v));
      return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
    };
    const fmt = (v: number | null, d = 1) => v === null ? "\u2014" : v.toFixed(d);
    console.log(
      `${String(evap).padEnd(7)}${String(follow).padStart(5)}${`${readRs.length}/${rs.length}`.padStart(7)}` +
      `${`${caught.length}/${rs.length}`.padStart(10)}` +
      `${fmt(avg(caught.map(r => r.radius)), 1).padStart(11)}` +
      `${fmt(avg(caught.map(r => 100 * r.antsAtEnd / r.antsAtStart)), 0).padStart(11)}` +
      `${fmt(avg(caught.map(r => r.captureTick)), 0).padStart(13)}` +
      `   ${(1 / (8 * evap)).toFixed(1)}`,
    );
  }
  console.log(`\nread = a single ant's path changed. captured = >=25% of the colony diverged.`);
  console.log(`n = the choice exponent (forager follow weight). n<=1 is linear-or-below recruitment;`);
  console.log(`the Deneubourg rule bifurcates above n=1, so p_capture(n) should have a threshold.`);
  console.log(`gain/radius/captureTick are conditional on capture \u2014 the outcome is bimodal, so means over`);
  console.log(`all seeds are meaningless. Uncaptured runs reconverge to exactly zero and stay there.`);
}

main();
