"""Digest a stigsim .run.json into a readable summary.

Usage: python3 tools/digest.py games-records/<file>.run.json
Prints setup, trajectory, doctrine edit log, pheromone totals and role/phase mix.
Never load a record into the conversation raw -- they are ~5MB.
"""
import json, sys
d = json.load(open(sys.argv[1]))

def flat(o,pre=""):
    out={}
    if isinstance(o,dict):
        for k,v in o.items(): out.update(flat(v,pre+"."+k if pre else k))
    else: out[pre]=o
    return out

print("=== SETUP ===")
s=d["mode"]["config"]["settings"]
print("seed",s["masterSeed"],"| ants",s["startingAnts"],"| food",s["foodSources"],"x",s["foodPerSource"],"=",s["foodSources"]*s["foodPerSource"])
print("endTick",d["endTick"],"winner",d["outcome"]["data"]["winner"])

print("\n=== TRAJECTORY (every 500t) ===")
print(f"{'t':>6} {'food_left':>9} | {'pop0':>5} {'col0_food':>9} {'res0':>6} {'d0':>5} {'b0':>5} | {'pop1':>5} {'col1_food':>9} {'res1':>6} {'d1':>5} {'b1':>5}")
for smp in d["channels"]["metrics"]["samples"]:
    t=smp["t"]
    if t%500 and t!=10: continue
    m=smp["data"]; c=m["colonies"]
    print(f"{t:>6} {sum(m['foodRemaining']):>9} | {c[0]['population']:>5} {c[0]['foodCollected']:>9} {c[0]['reserve']:>6} {c[0]['deaths']:>5} {c[0]['births']:>5} | {c[1]['population']:>5} {c[1]['foodCollected']:>9} {c[1]['reserve']:>6} {c[1]['deaths']:>5} {c[1]['births']:>5}")

# food exhaustion tick
prev=None
for smp in d["channels"]["metrics"]["samples"]:
    fr=sum(smp["data"]["foodRemaining"])
    if fr==0 and prev!=0: print("\nfood pool hit ZERO at t=",smp["t"])
    prev=fr
# per-source depletion
last=d["channels"]["metrics"]["samples"][-1]["data"]
print("final foodRemaining per source:",last["foodRemaining"])

# colony1 death tick
for smp in d["channels"]["metrics"]["samples"]:
    if smp["data"]["colonies"][1]["population"]==0:
        print("colony1 extinct at t=",smp["t"]); break
print("peak pops:", max(s["data"]["colonies"][0]["population"] for s in d["channels"]["metrics"]["samples"]),
      max(s["data"]["colonies"][1]["population"] for s in d["channels"]["metrics"]["samples"]))

print("\n=== DOCTRINE EDITS (colony 0, player) ===")
base=flat(d["mode"]["config"]["doctrines"][0])
cur=dict(base)
for c in d["commands"]:
    if c["cmd"]["kind"]!="set-doctrine": continue
    new=flat(c["cmd"]["doctrine"])
    diff={k:(cur.get(k),v) for k,v in new.items() if cur.get(k)!=v}
    print(f"t={c['t']:>5} col={c['cmd']['colonyId']} " + ("; ".join(f"{k}: {a}->{b}" for k,(a,b) in diff.items()) or "(no change)"))
    cur=new

print("\n=== PHEROMONE TOTALS (fields, every 1000t) ===")
print(f"{'t':>6} | {'c0.home':>10} {'c0.food':>10} {'c0.caut':>10} | {'c1.home':>10} {'c1.food':>10} {'c1.caut':>10}")
for smp in d["channels"]["fields"]["samples"]:
    if smp["t"]%1000: continue
    c=smp["data"]["colonies"]
    r=[f"{sum(c[i][k]):>10.0f}" for i in (0,1) for k in ("home","food","caut")]
    print(f"{smp['t']:>6} | "+" ".join(r[:3])+" | "+" ".join(r[3:]))

print("\n=== ROLE / PHASE MIX (agents, every 1000t) ===")
for smp in d["channels"]["agents"]["samples"]:
    if smp["t"]%1000: continue
    out=[]
    for col in smp["data"]["colonies"]:
        ants=col["ants"]
        ph={}; ro={}
        for a in ants:
            ph[a["phase"]]=ph.get(a["phase"],0)+1; ro[a["role"]]=ro.get(a["role"],0)+1
        avg=sum(a["energy"] for a in ants)/len(ants) if ants else 0
        out.append(f"c{col['id']}: n={len(ants)} e~{avg:.0f} {ph} {ro}")
    print(f"t={smp['t']:>5} | "+" | ".join(out))
