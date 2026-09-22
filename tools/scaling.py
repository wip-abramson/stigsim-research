#!/usr/bin/env python3
"""
Experiment 1 — how many more ants does it take to go twice as far?

    ./tools/scaling.py results/scaling-exponent.json [--targets 10,20,40]

Pure-stdlib reader over a `horizon.sh --json` dump. No toolchain; it re-reads
an existing sweep rather than re-running one.

THE QUESTION. `model.md` states the value of stigmergy as a ratio of medians —
"40 to 80 ants multiplies food by 7.4x". That number is true and fragile: it
holds at one distance, one map size, one tick budget, and it moves if the food
cap or the time limit moves. This turns it into a growth law instead.

THE MEASURE. Fix a delivery target T. For each distance band and each arm, find
the colony size at which median food delivered first reaches T — the BREAK-EVEN
COLONY SIZE, written N*(D). Then fit

    log N*(D) = alpha * log D + c

and report alpha, the exponent: how fast headcount must grow to hold delivery
fixed as distance grows.

WHY THE NULL ARM IS THE POINT. alpha for the full colony on its own is not
interpretable — a 31x31 grid, an exhaustible 500-unit source and a 6000-tick
budget all bend it. The no-trail arm runs through exactly the same bent world
on exactly the same mazes, so it absorbs those artifacts. The claim is the
DIFFERENCE between the two exponents, and that is what survives.

Feinerman & Korman's ANTS bound (arXiv:1701.02555) gives the theoretical
reference for the null arm: for non-communicating agents at a fixed time
budget, holding performance fixed needs k proportional to D^2, i.e. alpha = 2.
A full colony with alpha below the null's is stigmergy changing the shape of
the curve, not just its height.
"""
import json, sys, math
from statistics import median

def band_of(d, size): return (d // size) * size

def groups_of(runs, d):
    """Distance groups, and how to bucket a run into one.

    Two harnesses feed this. `horizon.ts` MEASURES whatever distance the maze
    happened to produce, so its runs are binned. `distance.ts` SETS the
    distance before the run, so its runs carry `want` and need no binning —
    and that version is the better one, because binning compares mazes that
    differ in more than distance.
    """
    if runs and "want" in runs[0]:
        keyf = lambda r: r["want"]
        return sorted({keyf(r) for r in runs}), keyf, "set", lambda g: str(g)
    bs = d.get("binSize", 15)
    keyf = lambda r: band_of(r["dist"], bs)
    return sorted({keyf(r) for r in runs}), keyf, "binned", lambda g: f"{g}-{g+bs-1}"

def n_at_target(points, target):
    """Colony size at which median delivery first reaches `target`.

    `points` is [(N, median_delivered)] sorted by N. Interpolates in log(N),
    because the colony sizes are a geometric ladder. Returns None if the curve
    never reaches the target inside the swept range — reported, never guessed.
    """
    for i, (n, v) in enumerate(points):
        if v >= target:
            if i == 0:
                return None          # already past target at the smallest N: unresolved below
            n0, v0 = points[i - 1]
            if v == v0:
                return float(n)
            f = (target - v0) / (v - v0)
            return math.exp(math.log(n0) + f * (math.log(n) - math.log(n0)))
    return None                      # never reaches target inside the swept range

def fit_loglog(xs, ys):
    """Least squares on log-log. Returns (slope, r2, n)."""
    lx = [math.log(x) for x in xs]; ly = [math.log(y) for y in ys]
    n = len(lx)
    if n < 2: return (float("nan"), float("nan"), n)
    mx = sum(lx) / n; my = sum(ly) / n
    sxx = sum((v - mx) ** 2 for v in lx)
    sxy = sum((lx[i] - mx) * (ly[i] - my) for i in range(n))
    if sxx == 0: return (float("nan"), float("nan"), n)
    slope = sxy / sxx
    inter = my - slope * mx
    ss_res = sum((ly[i] - (slope * lx[i] + inter)) ** 2 for i in range(n))
    ss_tot = sum((v - my) ** 2 for v in ly)
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else float("nan")
    return (slope, r2, n)

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "results/scaling-exponent.json"
    targets = [int(t) for t in (sys.argv[sys.argv.index("--targets") + 1].split(",")
                                if "--targets" in sys.argv else ["10", "20", "40"])]
    # A band with a handful of seeds gives a median that is mostly noise, and
    # the far bands are always the thin ones because the maze rarely puts food
    # out there. Drop them from the fit rather than letting them set the slope.
    min_n = int(sys.argv[sys.argv.index("--min-band") + 1]) if "--min-band" in sys.argv else 8
    # A clipped run is one the maze could not place at the requested distance,
    # so it is a measurement at some OTHER distance wearing this one's label.
    # Drop the whole distance group if any of its runs is clipped — a partly
    # clipped group is a mixture, which is worse than either.
    keep_clipped = "--keep-clipped" in sys.argv
    d = json.load(open(path))
    runs = d["runs"]
    if not keep_clipped and any("clipped" in r for r in runs):
        bad = {r["want"] for r in runs if r.get("clipped")}
        if bad:
            runs = [r for r in runs if r.get("want") not in bad]
            print(f"Dropped distance groups containing clipped runs: {sorted(bad)} "
                  f"({len(d['runs']) - len(runs)} runs). Pass --keep-clipped to override.")
    arms = d.get("lays") or sorted({r["lay"] for r in runs})
    Ns = sorted(d["antCounts"])
    bands_all, keyf, kind, label = groups_of(runs, d)
    band_n = {b: len([r for r in runs if r["lay"] == arms[0] and r["ants"] == Ns[0]
                      and keyf(r) == b]) for b in bands_all}
    bands = [b for b in bands_all if band_n[b] >= min_n]

    print(f"{path}: {len(runs)} runs, {d['seeds']} seeds, {d['ticks']} ticks, "
          f"evap {d.get('evaps', d.get('evap'))}, loopRate {d.get('loopRates', d.get('loopRate'))}, "
          f"arms {arms}, food {d.get('perSource')}")
    print(f"Distance is {'SET before the run (clean)' if kind=='set' else 'MEASURED then binned (mazes differ across rows)'}.")
    print("Seeds are shared across every arm and colony size, so each column is paired on maze.")
    thin = ", ".join(f"{label(b)}:{band_n[b]}" for b in bands_all if band_n[b] < min_n)
    print(f"Groups with fewer than {min_n} seeds are dropped from the fit: {thin or 'none'}")
    print()

    # --- the raw curves -----------------------------------------------------
    med = {}
    for arm in arms:
        cap = d.get("perSource") or max(r.get("perSource", 0) for r in runs)
        print(f"=== median food delivered (of {cap}), arm = {arm} ===")
        print("dist".ljust(10) + "".join(f"N={n}".rjust(8) for n in Ns) + "    n/band")
        for b in bands:
            row = []
            for n in Ns:
                rs = [r["delivered"] for r in runs
                      if r["lay"] == arm and r["ants"] == n and keyf(r) == b]
                m = median(rs) if rs else float("nan")
                med[(arm, b, n)] = m
                row.append(f"{m:.0f}".rjust(8) if rs else "—".rjust(8))
            cnt = band_n[b]
            print(label(b).ljust(10) + "".join(row) + f"    {cnt}")
        print()

    advantage_decay(med, bands, Ns, label)

    # --- break-even colony size and the exponent ----------------------------
    for target in targets:
        print(f"=== break-even colony size N*: smallest colony whose median delivery reaches {target} food ===")
        print("dist".ljust(10) + "".join(a.rjust(14) for a in arms) + "     none/full")
        rows = {a: ([], []) for a in arms}
        for b in bands:
            cells = []
            for arm in arms:
                pts = [(n, med[(arm, b, n)]) for n in Ns]
                nstar = n_at_target(pts, target)
                if nstar is None:
                    reached = any(v >= target for _, v in pts)
                    cells.append(("<%d" % Ns[0] if reached else ">%d" % Ns[-1]).rjust(14))
                else:
                    cells.append(f"{nstar:.1f}".rjust(14))
                    mid = b if kind == "set" else b + d.get("binSize", 15) / 2
                    rows[arm][0].append(mid); rows[arm][1].append(nstar)
            nf = {}
            for arm in arms:
                v = n_at_target([(n, med[(arm, b, n)]) for n in Ns], target)
                if v is not None: nf[arm] = v
            ratio = (f"{nf['none'] / nf['full']:.2f}x" if "none" in nf and "full" in nf else "—")
            print(label(b).ljust(10) + "".join(cells) + ratio.rjust(14))

        print("\n  none/full is the headcount penalty for not communicating: how many times")
        print("  more ants a no-trail colony needs to match the stigmergic one at that distance.")
        print("  A ratio that GROWS with distance is an advantage that compounds with range;")
        print("  a flat ratio is a constant-factor win that never changes shape.")
        print("\n  TWO models, because a power law is not obviously the right one here.")
        print("    power law     log N* = alpha * log D + c   -> N* grows as D^alpha")
        print("    exponential   log N* = D / L + c           -> N* doubles every L*ln2 cells")
        got = {}
        for arm in arms:
            xs, ys = rows[arm]
            slope, r2, n = fit_loglog(xs, ys)
            eslope, er2, _ = fit_loglog([math.exp(x) for x in xs], ys)  # log N* vs D
            got[arm] = (slope, r2, eslope, er2)
            better = "power law" if r2 >= er2 else "EXPONENTIAL"
            print(f"    {arm.ljust(6)} alpha = {slope:6.2f} (R^2 {r2:5.3f})   "
                  f"1/L = {eslope:7.4f} per cell (R^2 {er2:5.3f})   "
                  f"better fit: {better}   from {n} groups"
                  + ("" if n >= 3 else "   << too few groups, ignore"))
        if "full" in got and "none" in got:
            af, _, ef, _ = got["full"]; an, _, en, _ = got["none"]
            print(f"    power-law exponents: null {an:.2f} vs full {af:.2f}  (difference {an - af:+.2f})")
            print(f"    exponential rates:   null {en:.4f} vs full {ef:.4f} per cell")
            print("    A difference is only meaningful if the SAME model fits both arms and the")
            print("    exponent is stable across targets. Check that before quoting either number.")
        print()

def advantage_decay(med, bands, Ns, label):
    """How the coordination bonus changes with distance, per colony size.

    D* is the distance where a stigmergic colony stops beating the no-trail one,
    so it is a statement about the RATIO of the two arms. Fit that ratio
    directly rather than differencing two separately-fitted exponents, which
    need not even share a set of distances.

    Do it PER COLONY SIZE. Pooling across N assumes one bonus-vs-distance curve,
    and there isn't one: small colonies peak near the nest and large ones far
    out, so the pooled curve fits at R^2 ~ 0.2 and its extrapolated D* is an
    artifact of averaging a ridge.
    """
    print("=== the coordination bonus: median food (full) / (none), matched colony and maze ===")
    print("dist".ljust(8) + "".join(f"N={n}".rjust(9) for n in Ns))
    for b in bands:
        cells = []
        for n in Ns:
            z = med[("none", b, n)]
            r = med[("full", b, n)] / z if z > 0 else float("nan")
            cells.append((f"{r:.1f}x" if r == r else "—").rjust(9))
        print(label(b).ljust(8) + "".join(cells))

    print("\n  peak of each column — where stigmergy is worth most to a colony of that size:")
    row = []
    for n in Ns:
        best, bv = None, -1
        for b in bands:
            z = med[("none", b, n)]
            if z > 0 and med[("full", b, n)] / z > bv:
                bv = med[("full", b, n)] / z; best = b
        row.append(f"{label(best)}".rjust(9))
    print("peak".ljust(8) + "".join(row))
    print("  A peak that moves OUT as the colony grows is the coordination horizon moving out.")
    print("  If every column peaks at the same distance, the horizon does not depend on N.\n")

if __name__ == "__main__":
    main()
