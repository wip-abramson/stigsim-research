#!/usr/bin/env python3
"""
Export one typical run per experiment as traces for the hosted Maze Simulator.

    ./tools/export-curated.py            # writes traces/*.trace.json and traces/manifest.json

"Typical" is chosen by rule, not by eye: the seed whose with-scent result is
closest to the median of its cell (or, for take-off experiments, whose take-off
tick is closest to the median). Every export is re-run from commands and must
reproduce the results file exactly — see tools/export-trace.ts.
"""
import json, subprocess, os, sys
from statistics import median
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE); OUT=os.path.join(ROOT,"traces")
def load(f): return json.load(open(os.path.join(ROOT,"results",f)))["runs"]
def seedno(s): return int(s.split("-")[-1])
def typical(rows, key=lambda r: r["delivered"]):
    m=median(key(r) for r in rows); return min(rows, key=lambda r:(abs(key(r)-m), seedno(r["seed"])))
def win(r): s=r["series"]; return [s[0]]+[s[i]-s[i-1] for i in range(1,len(s))]
def takeoff(r, thr):
    return next(((i+1)*1000 for i,x in enumerate(win(r)) if x>=thr), None)

jobs=[]  # (file, experiment, title, look_for, exporter args, expected)
def add(name, exp, title, look, args, expect): jobs.append(dict(file=f"{name}.trace.json", experiment=exp, title=title, look_for=look, args=args, expect=expect))

# --- exp 2 and 3: the comb at 0, 4, 12 junctions, 40 ants, 6000 ticks
R=load("comb-junctions.json")
for k,exp in ((0,"2"),(4,"3"),(12,"3")):
    cell=lambda lay:[r for r in R if r["k"]==k and r["ants"]==40 and r["lay"]==lay]
    s=typical(cell("full"))["seed"]
    for lay in ("full","none"):
        r=[x for x in cell(lay) if x["seed"]==s][0]
        add(f"exp{exp}-comb-{k}-junctions-40-ants-{'scent' if lay=='full' else 'no-scent'}", exp,
            f"Comb, {k} junctions, 40 ants, {'with scent' if lay=='full' else 'scent off'}",
            {0:"Both versions deliver the same amount: in a corridor ants can only go forward.",
             4:"With scent, ants stop entering the side branches within the first few hundred ticks. Without it, about half of them turn into every branch.",
             12:"Twelve branches. The scent colony needs a while longer to form its trail; the no-scent colony wanders into dead ends all run."}[k],
            ["--kind","comb","--dist","40","--k",str(k),"--ants","40","--seed",str(seedno(s)),"--lay",lay,"--ticks","6000"], r["delivered"])

# --- exp 4: random branchy maze, 35 cells, 48 ants, unlimited food
R=load("breakeven-uncapped.json")
cell=lambda lay:[r for r in R if r["want"]==35 and r["ants"]==48 and r["lay"]==lay]
s=typical(cell("full"))["seed"]
for lay in ("full","none"):
    r=[x for x in cell(lay) if x["seed"]==s][0]
    add(f"exp4-maze-35-cells-48-ants-{'scent' if lay=='full' else 'no-scent'}","4",
        f"Branchy random maze, food 35 cells out, 48 ants, {'with scent' if lay=='full' else 'scent off'}",
        "Same maze and food in both. With scent a single highway forms; without it ants find the food by chance and deliver about a twenty-eighth as much.",
        ["--kind","maze","--dist","35","--ants","48","--seed",str(seedno(s)),"--lay",lay,"--perSource","50000","--ticks","6000"], r["delivered"])

# --- retracted ridge: same kind of run with the 2,500 cap, 15 cells, 128 ants
R=load("breakeven-b2.json")
cell=lambda lay:[r for r in R if r["want"]==15 and r["ants"]==128 and r["lay"]==lay]
s=typical(cell("full"))["seed"]
for lay in ("full","none"):
    r=[x for x in cell(lay) if x["seed"]==s][0]
    add(f"retracted-ridge-15-cells-128-ants-capped-{'scent' if lay=='full' else 'no-scent'}","4",
        f"Why the ridge was wrong: 15 cells, 128 ants, food capped at 2,500, {'with scent' if lay=='full' else 'scent off'}",
        "Watch the food counter: the scent colony empties the source early and then delivers nothing, so its score stops at 2,500 while the no-scent twin keeps rising.",
        ["--kind","maze","--dist","15","--ants","128","--seed",str(seedno(s)),"--lay",lay,"--perSource","2500","--ticks","6000"], r["delivered"])

# --- exp 5: slow take-off in the random maze, 55 cells, 16 ants, 18000 ticks
R=load("horizon-longrun.json")
F=[r for r in R if r["want"]==55 and r["ants"]==16 and r["lay"]=="full"]
Z=[r for r in R if r["want"]==55 and r["ants"]==16 and r["lay"]=="none"]
thr=max(5,5*max(median([x for r in Z for x in win(r)]),1))
took=[r for r in F if takeoff(r,thr)]
s=typical(took, key=lambda r: takeoff(r,thr))["seed"]; tk=takeoff([r for r in F if r["seed"]==s][0],thr)
for lay,rows in (("full",F),("none",Z)):
    r=[x for x in rows if x["seed"]==s][0]
    add(f"exp5-maze-55-cells-16-ants-18000-ticks-{'scent' if lay=='full' else 'no-scent'}","5",
        f"Slow take-off: 55 cells, 16 ants, 18,000 ticks, {'with scent' if lay=='full' else 'scent off'}",
        f"For thousands of ticks the scent colony looks no better than its twin. Its trail forms around tick {tk:,}; seek past 6,000, where every earlier run stopped, to see it.",
        ["--kind","maze","--dist","55","--ants","16","--seed",str(seedno(s)),"--lay",lay,"--perSource","50000","--ticks","18000"], r["delivered"])

# --- exp 5: hardest comb, 12 junctions, 10 ants, 54000 ticks
R=load("comb-54k.json")
F=[r for r in R if r["k"]==12 and r["ants"]==10 and r["lay"]=="full"]
thr=0.5*10*1000/320
took=[r for r in F if takeoff(r,thr)]
s=typical(took, key=lambda r: takeoff(r,thr))["seed"]; tk=takeoff([r for r in F if r["seed"]==s][0],thr)
r=[x for x in F if x["seed"]==s][0]
add("exp5-comb-12-junctions-10-ants-54000-ticks-scent","5","Hardest comb: 12 junctions, 10 ants, 54,000 ticks, with scent",
    f"Ten ants and twelve forks. Trails form and fall apart for a long time; this seed's trail holds from around tick {tk:,}. Use the replay slider.",
    ["--kind","comb","--dist","40","--k","12","--ants","10","--seed",str(seedno(s)),"--lay","full","--ticks","54000"], r["delivered"])

# --- exp 6: loudness on the comb, 12 junctions, 18000 ticks
R=load("comb-loudness.json")
def cellL(n,g): return {r["seed"]:r for r in R if r["k"]==12 and r["ants"]==n and r["gain"]==g and r["lay"]=="full"}
b,l,m=cellL(20,1),cellL(20,3),cellL(60,1)
mb,ml,mm=[median(x["delivered"] for x in c.values()) for c in (b,l,m)]
s=min(b, key=lambda s:(abs(b[s]["delivered"]-mb)/mb+abs(l[s]["delivered"]-ml)/ml+abs(m[s]["delivered"]-mm)/mm, seedno(s)))
for tag,c,n,g,txt in (("20-ants","base",20,1,"The base colony."),("20-ants-3x-louder","loud",20,3,"Same 20 ants, each laying three times as much scent. The trail looks brighter; the colony does no better."),("60-ants","more",60,1,"Three times the ants, same total scent as the loud colony. Its trail forms far sooner.")):
    r={"base":b,"loud":l,"more":m}[c][s]
    add(f"exp6-comb-12-junctions-{tag}","6",f"Loudness, 12 junctions: {n} ants, scent ×{g}",txt,
        ["--kind","comb","--dist","40","--k","12","--ants",str(n),"--gain",str(g),"--seed",str(seedno(s)),"--lay","full","--ticks","18000"], r["delivered"])

# --- exp 7: evaporation 0.005 vs 0.05, random maze 40 cells, 40 ants, cap 2500
R=load("sweep-evaporation.json")
cell=lambda e:{r["seed"]:r for r in R if r["evap"]==e and r["lay"]=="full"}
a,c=cell(0.005),cell(0.05)
s=typical(list(a.values()))["seed"]
for e,rows in ((0.005,a),(0.05,c)):
    add(f"exp7-maze-40-cells-evaporation-{e}","7",f"Evaporation {e}, 40 cells, 40 ants",
        "The default rate: a steady trail." if e==0.005 else "Ten times faster decay: the trail fades before the next ant arrives and never holds.",
        ["--kind","maze","--dist","40","--ants","40","--seed",str(seedno(s)),"--lay","full","--evap",str(e),"--perSource","2500","--ticks","6000"], rows[s]["delivered"])

# --- exp 8: gland 1800 vs 2400 on the 40-cell comb
R=load("comb-gland.json")
cell=lambda t:{r["seed"]:r for r in R if r["dist"]==40 and r["tankMax"]==t and r["lay"]=="full"}
a,c=cell(1800),cell(2400)
s=typical(list(c.values()))["seed"]
for t,rows in ((1800,a),(2400,c)):
    add(f"exp8-comb-40-cells-gland-{t}","8",f"Gland {t:,} on a 40-cell comb, 4 junctions",
        "Enough scent for 30 cells: returning ants run dry 10 cells short of the nest, so the food trail never reaches home." if t==1800 else "Enough for exactly 40 cells: the food trail reaches the nest and the colony hits its plateau.",
        ["--kind","comb","--dist","40","--k","4","--ants","40","--tank",str(t),"--seed",str(seedno(s)),"--lay","full","--ticks","6000"], rows[s]["delivered"])

os.makedirs(OUT, exist_ok=True)
manifest=[]
for j in jobs:
    path=os.path.join(OUT,j["file"])
    res=subprocess.run([os.path.join(HERE,"export-trace.sh"),*j["args"],"--out",path,"--expect",str(j["expect"])],capture_output=True,text=True)
    line=(res.stdout.strip().splitlines() or [""])[-1]
    if res.returncode!=0 or '"replay":"ok"' not in line:
        print("FAILED",j["file"],res.stderr[-400:]); sys.exit(1)
    info=json.loads(line); print(f"ok  {j['file']:70s} delivered {info['delivered']:>6}  {info['bytes']//1024} KB")
    manifest.append({k:j[k] for k in ("file","experiment","title","look_for","expect")}|{"command":"./tools/export-trace.sh "+" ".join(j["args"])})
# The notes are checked by hand against each trace's own metrics and kept in
# traces/notes.json, so a regeneration does not silently revert to guesses.
notes=json.load(open(os.path.join(OUT,"notes.json"))) if os.path.exists(os.path.join(OUT,"notes.json")) else {}
for e in manifest: e["look_for"]=notes.get(e["file"], e["look_for"])
json.dump(manifest,open(os.path.join(OUT,"manifest.json"),"w"),indent=1)
print(len(manifest),"traces exported and verified")
