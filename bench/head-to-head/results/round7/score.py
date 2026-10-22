#!/usr/bin/env python3 -I
"""Recompute the development-gate tables of SUMMARY.md from the stored votes. No network, no model calls.
Usage: python3 -I score.py [--check]   (--check compares with the block between the score.py markers in SUMMARY.md)
A criterion passes when at least 2 of 3 votes pass it. Score = passed outcome criteria per run (of 4), mean over 3 runs.
Best published rival value per task (set c: round 6 SUMMARY, all 11 arms; set b: HEAD-TO-HEAD.md deep round, base/ce/sp-invoked)."""
import json, os, glob, sys
HERE = os.path.dirname(os.path.abspath(__file__))
RIVAL = {"c": {"X1": 4.0, "X2": 4.0, "X3": 4.0, "X4": 4.0, "X5": 4.0}, "b": {"X1": 4.0, "X2": 4 / 3, "X3": 2.0, "X4": None}}
out = []
for it in ("1", "2"):
    for s in ("c", "b"):
        labels = json.load(open(f"{HERE}/tasks/set-{s}.labels.json"))
        raw = {}
        for v in sorted(glob.glob(f"{HERE}/grades/iter{it}/set-{s}/vote-*")):
            runof = json.load(open(v + "/labels.json"))
            for f in glob.glob(v + "/g*.json"):
                g = json.load(open(f)); run = runof.get(g["label"])
                if run:
                    for cid, r in g.get("grades", {}).items(): raw.setdefault((run, cid), []).append(bool(r.get("pass")))
        per = {}
        for (run, cid), xs in raw.items():
            t = run.split("-")[0]
            if labels.get(f"{t}.c{cid}", {}).get("label") == "outcome":
                per.setdefault((t, run), 0); per[(t, run)] += 1 if sum(xs) * 2 > len(xs) else 0
        out.append(f"iteration {it}, set {s} (ours x3, outcome mean of 4; best published rival; result)")
        for t in sorted({t for t, _ in per}):
            sc = [per[k] for k in sorted(per) if k[0] == t]; m = sum(sc) / len(sc); rv = RIVAL[s][t]
            res = "no rival data" if rv is None else ("ok" if (m >= 4.0 if rv >= 4.0 else m > rv) else "fails")
            out.append(f"  {t}: {m:.2f} {sc}  rival {rv if rv is None else round(rv, 2)}  {res}")
text = "\n".join(out)
if "--check" in sys.argv:
    s = open(HERE + "/SUMMARY.md").read()
    blk = s.split("<!-- score.py -->")[1].split("<!-- /score.py -->")[0].strip("\n").replace("```\n", "").replace("\n```", "")
    print("SUMMARY.md matches score.py output" if blk.strip() == text.strip() else "MISMATCH"); sys.exit(0 if blk.strip() == text.strip() else 1)
print(text)
