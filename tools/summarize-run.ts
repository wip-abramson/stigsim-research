/**
 * Turn a stigsim war run record into a small interpreted summary.
 *
 *   cd ../../stigsim && pnpm exec tsx <abs path>/tools/summarize-run.ts <record.run.json> [--json]
 *   (or just: ./tools/summarize.sh games-records/<file>.run.json)
 *
 * Decodes through stigsim's own vocabulary rather than re-deriving it: topology
 * and doctrines come back by name, and the derived measures are the ones the
 * hypotheses in research/hypotheses.md actually cite.
 *
 * This reads the sampled channels only. For anything finer, createWarReplay()
 * re-runs the record deterministically at full tick resolution.
 */
import { parseWarRunRecord } from "../../../stigsim/src/modes/war/war-run-record";
import { choiceFor } from "../../../stigsim/src/topology-choices";
import { activePresetName } from "../../../stigsim/src/doctrine-presets";
import { doctrineNumbers } from "../../../stigsim/packages/sim-core/src/doctrine";
import { readFileSync } from "node:fs";
import { basename } from "node:path";

type Any = Record<string, any>;

/** Flatten a nested object to dotted paths, so two doctrines can be diffed. */
function flat(o: unknown, pre = "", out: Record<string, number | boolean | string> = {}) {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const [k, v] of Object.entries(o)) flat(v, pre ? `${pre}.${k}` : k, out);
  } else if (typeof o === "number" || typeof o === "boolean" || typeof o === "string") {
    out[pre] = o;
  }
  return out;
}

function diff(a: Any, b: Any) {
  const fa = flat(a), fb = flat(b);
  const changes: Record<string, [unknown, unknown]> = {};
  for (const k of Object.keys(fb)) if (fa[k] !== fb[k]) changes[k] = [fa[k], fb[k]];
  return changes;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const path = args.find(a => !a.startsWith("--"));
  if (!path) { console.error("usage: summarize-run.ts <record.run.json> [--json]"); process.exit(2); }

  const parsed = parseWarRunRecord(readFileSync(path, "utf8"));
  if (!parsed.record) {
    console.error(`not a valid war run record: ${parsed.error ?? "unknown error"}`);
    process.exit(1);
  }
  const rec = parsed.record as Any;
  const cfg = rec.mode.config as Any;
  const settings = cfg.settings as Any;
  const topology = choiceFor(settings.topology);
  const rules = cfg.rules as Any;

  const metrics = (rec.channels?.metrics?.samples ?? []) as Any[];
  const agents = (rec.channels?.agents?.samples ?? []) as Any[];
  const fields = (rec.channels?.fields?.samples ?? []) as Any[];
  const nColonies = cfg.doctrines.length;
  const ids = [...Array(nColonies).keys()];

  // --- exhaustion: the tick the shared pool empties. H4 says this is the real scoreline. ---
  const exhaustion = metrics.find(s => sum(s.data.foodRemaining) === 0);
  const atExhaustion = exhaustion ?? metrics[metrics.length - 1];
  const collectedAt = ids.map(i => atExhaustion?.data.colonies[i].foodCollected ?? 0);
  const totalAt = sum(collectedAt);

  // --- depart capability: the H2 lock. Needs per-ant energy, so it uses the agents channel. ---
  const departSeries = agents.map(s => ({
    t: s.t,
    able: ids.map(i => {
      const ants = s.data.colonies[i]?.ants ?? [];
      return { n: ants.length, able: ants.filter((a: Any) => a.energy >= rules.minDepartEnergy).length };
    }),
  }));
  const lock = ids.map(i => {
    const live = departSeries.filter(d => d.able[i].n > 0);
    const frac = (d: typeof live[number]) => d.able[i].able / d.able[i].n;
    return {
      departCollapseTick: live.find(d => frac(d) < 0.1)?.t ?? null,
      departZeroTick: live.find(d => frac(d) === 0)?.t ?? null,
    };
  });

  // --- pheromone mass, H3's leading indicator. Also surfaces provenance (`received`). ---
  const massSeries = fields.map(s => ({
    t: s.t,
    mass: ids.map(i => {
      const c = s.data.colonies[i];
      if (!c) return { home: 0, food: 0, caut: 0, received: 0 };
      return {
        home: sum(c.home), food: sum(c.food), caut: sum(c.caut),
        // Nonzero only when topology.provenance is on: pheromone this colony
        // received from another, i.e. the forgery ground truth.
        received: sum((c.received ?? []).map((r: Any) => sum(r.home) + sum(r.food) + sum(r.caut))),
      };
    }),
  }));
  const collapse = ids.map(i => {
    let peak = 0, tick: number | null = null;
    for (const s of massSeries) {
      const total = s.mass[i].home + s.mass[i].food;
      peak = Math.max(peak, total);
      if (tick === null && peak > 0 && total < peak * 0.25) tick = s.t;
    }
    return { peakMass: peak, collapseTick: tick };
  });
  const anyProvenance = massSeries.some(s => s.mass.some(m => m.received > 0));

  // --- doctrine edits, collapsed to the atoms that actually moved (H5) ---
  const current = cfg.doctrines.map((d: Any) => d);
  const edits: Any[] = [];
  for (const c of rec.commands as Any[]) {
    if (c.cmd?.kind !== "set-doctrine") continue;
    const i = c.cmd.colonyId;
    const changes = diff(current[i], c.cmd.doctrine);
    current[i] = c.cmd.doctrine;
    if (Object.keys(changes).length) edits.push({ t: c.t, colony: i, changes });
  }

  const summary = {
    record: basename(path).replace(/\.run\.json$/, ""),
    createdAt: rec.createdAt,
    simVersion: rec.simVersion,
    endTick: rec.endTick,
    setup: {
      seed: settings.masterSeed,
      topology: topology.label,
      topologyIsNamed: topology.name !== "custom",
      topologyRaw: settings.topology,
      layout: settings.layout,
      adoption: settings.adoption,
      startingAnts: settings.startingAnts,
      loopRate: settings.loopRate,
      tankMax: settings.tankMax,
      foodTotal: settings.foodSources * settings.foodPerSource,
    },
    colonies: ids.map(i => ({
      id: i,
      participant: (rec.participants as Any[]).find(p => p.slot === `colony-${i}`)?.kind ?? "unknown",
      startDoctrine: activePresetName(cfg.doctrines[i], settings.topology) ?? "custom",
      doctrineEdits: edits.filter(e => e.colony === i).length,
      evapRate: cfg.doctrines[i].evapRate,
      spoilerFraction: cfg.doctrines[i].spoilerFraction,
      mimicRate: cfg.doctrines[i].mimicRate,
    })),
    outcome: {
      winner: rec.outcome?.data?.winner ?? null,
      tick: rec.outcome?.data?.tick ?? rec.endTick,
      colonies: (rec.outcome?.data?.colonies ?? []).map((c: Any) => ({
        population: c.population, foodCollected: c.foodCollected, births: c.births, deaths: c.deaths,
      })),
    },
    derived: {
      exhaustionTick: exhaustion?.t ?? null,
      exhaustionFraction: exhaustion ? +(exhaustion.t / rec.endTick).toFixed(3) : null,
      foodAtExhaustion: collectedAt,
      shareAtExhaustion: collectedAt.map(f => totalAt ? +(f / totalAt).toFixed(3) : 0),
      lock,
      pheromone: collapse,
      provenanceActive: anyProvenance,
      lastCommandTick: edits.length ? edits[edits.length - 1].t : null,
      doctrineEdits: edits,
    },
  };

  if (asJson) { console.log(JSON.stringify(summary, null, 2)); return; }

  const s = summary;
  const pct = (x: number | null) => x === null ? "—" : `${(x * 100).toFixed(0)}%`;
  console.log(`${s.record}\n${"=".repeat(s.record.length)}`);
  console.log(`seed ${s.setup.seed} · topology ${s.setup.topology}${s.setup.topologyIsNamed ? "" : " (non-standard!)"} · layout ${s.setup.layout}`);
  console.log(`${s.setup.startingAnts} ants · ${s.setup.foodTotal} food · tankMax ${s.setup.tankMax} · ends t=${s.endTick}`);
  console.log(`\nwinner: colony ${s.outcome.winner}`);
  console.log(`pool exhausted: t=${s.derived.exhaustionTick ?? "never"} (${pct(s.derived.exhaustionFraction)} of run)`);
  if (s.derived.lastCommandTick !== null) console.log(`last doctrine edit: t=${s.derived.lastCommandTick}`);
  if (s.derived.provenanceActive) console.log(`provenance: ACTIVE — forged/received mass recorded`);
  console.log();
  for (const c of s.colonies) {
    const d = s.derived, o = s.outcome.colonies[c.id] ?? {};
    console.log(`colony ${c.id} (${c.participant}) — doctrine "${c.startDoctrine}", ${c.doctrineEdits} edits`);
    console.log(`  evap ${c.evapRate} · spoilers ${c.spoilerFraction} · mimic ${c.mimicRate}`);
    console.log(`  food ${o.foodCollected} final, ${d.foodAtExhaustion[c.id]} at exhaustion (${pct(d.shareAtExhaustion[c.id])} share)`);
    console.log(`  pop ${o.population} final · ${o.births} births · ${o.deaths} deaths`);
    console.log(`  depart collapse t=${d.lock[c.id].departCollapseTick ?? "—"} · zero t=${d.lock[c.id].departZeroTick ?? "—"}`);
    console.log(`  phero peak ${d.pheromone[c.id].peakMass.toFixed(0)} · collapse t=${d.pheromone[c.id].collapseTick ?? "—"}`);
  }
  if (s.derived.doctrineEdits.length) {
    console.log(`\ndoctrine edits (${s.derived.doctrineEdits.length}):`);
    for (const e of s.derived.doctrineEdits) {
      const parts = Object.entries(e.changes).map(([k, [a, b]]: any) => `${k.replace(/forager\.follow\./, "")} ${a}→${b}`);
      console.log(`  t=${String(e.t).padStart(5)} c${e.colony}  ${parts.join("; ")}`);
    }
  }
}

main();
