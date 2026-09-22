/**
 * Re-run one experiment configuration and save it as a trace the hosted
 * Maze Simulator can open (https://stigsim.protocol-institute.org/maze/ ->
 * Run panel -> Load trace).
 *
 *   ./tools/export-trace.sh --kind comb --dist 40 --k 12 --ants 10 --seed 3 --lay full --ticks 6000 --out traces/x.trace.json
 *   ./tools/export-trace.sh --kind maze --loop 0.12 --dist 55 --ants 16 --seed 7 --lay none --perSource 50000 --out ...
 *
 * WHY THIS IS NOT JUST "SAVE THE HARNESS RUN". The harnesses change the world
 * in two ways a trace cannot record: `distance.ts` moves the food by writing
 * to the source object, and `junctions.ts` hands the Simulation a hand-built
 * grid. A trace stores only a recipe (seed, loopRate, config) plus commands.
 * So this rebuilds each run from commands alone, all applied at the top of
 * tick 1 before any ant moves:
 *
 *   comb  setFood 0 at the generated food cell (a wall cannot close over food)
 *         setWall on every cell of the 31x31 grid: open iff it is in the comb
 *         setFood perSource at the comb's food cell
 *   maze  setFood 0 at the generated food cell, setFood perSource at the cell
 *         distance.ts would have chosen
 *   both  setAdoption instant, setDoctrine (evap, lay gains, scent off)
 *
 * The food RNG is only used at placement and the ants RNG only by movement,
 * so the rebuilt run should be the harness run exactly. That is CHECKED, not
 * assumed: pass --expect <food delivered> (the number in the results file for
 * the same seed) and the export fails unless it matches. Every export is then
 * replayed from the saved file with the same Replayer the website uses, and
 * fails if any fingerprint diverges.
 */
import { writeFileSync } from "node:fs";
import {
  Simulation, DEFAULT_PARAMS, DEFAULT_DOCTRINE, cloneDoctrine, makeSeeds, COLS, ROWS,
} from "../../../stigsim/packages/sim-core/src/index";
import type { Command } from "../../../stigsim/packages/sim-core/src/index";
import { shortestFromNest, MetricsRecorder } from "../../../stigsim/packages/sim-trace/src/metrics";
import { buildTrace, serializeTrace, parseTrace } from "../../../stigsim/packages/sim-trace/src/trace";
import { Replayer } from "../../../stigsim/packages/sim-trace/src/replay";

const argv = process.argv.slice(2);
const flag = (n: string, d?: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const need = (n: string) => { const v = flag(n); if (v === undefined) throw new Error(`--${n} is required`); return v; };

const kind = need("kind") as "comb" | "maze";
const seedIdx = Number(need("seed"));
const ants = Number(need("ants"));
const lay = (flag("lay", "full")) as "full" | "home" | "none";
const gain = Number(flag("gain", "1"));
const tank = Number(flag("tank", String(DEFAULT_PARAMS.tankMax)));
const evap = Number(flag("evap", "0.005"));
const ticks = Number(flag("ticks", "6000"));
const perSource = Number(flag("perSource", "50000"));
const dist = Number(need("dist"));
const out = need("out");
const expect = flag("expect");
const interval = Number(flag("interval", ticks > 20000 ? "50" : "10"));

/** Same geometry as buildComb() in junctions.ts. Kept in step by the --expect check. */
function combOpen(dist: number, k: number, len: number): { open: Set<number>; food: [number, number] } {
  const open = new Set<number>(); const at = (x: number, y: number) => y * COLS + x;
  const legY = 15, downLen = 14, foodX = 1 + (dist - downLen);
  for (let y = 1; y <= legY; y++) open.add(at(1, y));
  for (let x = 1; x <= foodX; x++) open.add(at(x, legY));
  const slots: number[] = []; for (let x = 3; x <= foodX - 2; x += 2) slots.push(x);
  if (k > slots.length) throw new Error(`k=${k} exceeds ${slots.length} slots`);
  const chosen: number[] = [];
  for (let i = 0; i < k; i++) chosen.push(slots[Math.round(((i + 0.5) * slots.length) / k - 0.5)]);
  chosen.forEach((x, i) => { const up = i % 2 === 0; for (let j = 1; j <= len; j++) open.add(at(x, up ? legY - j : legY + j)); });
  return { open, food: [foodX, legY] };
}

const seedName = kind === "comb" ? `comb-${seedIdx}` : `horizon-${seedIdx}`;
const sim = new Simulation({
  seeds: makeSeeds(seedName), numAnts: ants, params: { ...DEFAULT_PARAMS, tankMax: tank * gain },
  loopRate: kind === "comb" ? 0 : Number(flag("loop", "0.12")),
  numColonies: 1, numFoodSources: 1, foodPerSource: perSource, layout: "random",
});
const c = sim.colonies[0];
const src0 = sim.foodSources[0];
const cmds: Command[] = [{ kind: "setFood", x: src0.x, y: src0.y, amount: 0 }];
let target: [number, number];
if (kind === "comb") {
  const { open, food } = combOpen(dist, Number(need("k")), Number(flag("len", "8")));
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (x === c.nestX && y === c.nestY) continue;
    const want = open.has(y * COLS + x);
    if (sim.occupancy.isOpen(x, y) !== want) cmds.push({ kind: "setWall", x, y, open: want });
  }
  target = food;
} else {
  // Same rule as distance.ts: the reachable cell closest to the requested
  // distance, ties to the lowest index.
  const df = shortestFromNest(sim.occupancy, sim.bounds, c.nestX, c.nestY);
  let best = -1, bestErr = Infinity;
  for (let i = 0; i < df.length; i++) { const d = df[i]; if (d <= 0) continue; const e = Math.abs(d - dist); if (e < bestErr) { bestErr = e; best = i; } }
  target = [best % COLS, Math.floor(best / COLS)];
}
cmds.push({ kind: "setFood", x: target[0], y: target[1], amount: perSource });

const d = cloneDoctrine(DEFAULT_DOCTRINE);
d.evapRate = evap;
d.forager.lay.returning.food.own = gain;
d.forager.lay.searching.home.own = gain;
if (lay === "none" || lay === "home") d.forager.lay.returning.food.own = 0;
if (lay === "none") d.forager.lay.searching.home.own = 0;
cmds.push({ kind: "setAdoption", mode: "instant" }, { kind: "setDoctrine", colony: 0, doctrine: d });

for (const cmd of cmds) if (!sim.enqueue(cmd)) throw new Error(`command refused: ${JSON.stringify(cmd).slice(0, 80)}`);
sim.flushPending();
if (sim.foodSources.length !== 1 || sim.foodSources[0].x !== target[0] || sim.foodSources[0].y !== target[1]) throw new Error("food did not land on the target cell");

const rec = new MetricsRecorder(interval);
for (let i = 0; i < ticks; i++) { sim.step(); rec.maybeSample(sim); }
const delivered = c.foodCollected;
if (expect !== undefined && Number(expect) !== delivered) {
  throw new Error(`MISMATCH: rebuilt run delivered ${delivered}, results file says ${expect}. Not exported.`);
}

const text = serializeTrace(buildTrace(sim, rec));
const parsed = parseTrace(text);
if (!parsed.ok) throw new Error(`the site would reject this trace: ${parsed.error}`);
const r = new Replayer(parsed.trace);
while (r.step()) { /* replay to the end */ }
if (r.divergedAt !== null) throw new Error(`replay diverged at tick ${r.divergedAt}`);
if (r.sim.colonies[0].foodCollected !== delivered) throw new Error("replay delivered a different amount");
writeFileSync(out, text);
console.log(JSON.stringify({ out, delivered, expect: expect === undefined ? null : Number(expect), replay: "ok", bytes: text.length, commands: cmds.length }));
