#!/usr/bin/env python3 -I
"""Recompute every table of SUMMARY.md from the stored votes. No network, no model calls.

Usage: python3 -I score.py [--check]
  no flag : print the tables
  --check : compare the printed tables with the block between the score.py markers in SUMMARY.md (exit 1 on a difference)

Inputs (relative to this file): tasks/labels.json (criterion -> outcome|process), grades/vote-N/labels.json (anonymous
label -> "<task>-<arm>-<rep>"), grades/vote-N/g<hex>.json (per-criterion pass). A criterion passes when at least 2 of the
votes that graded it pass it. Score = passed outcome criteria per run, mean over the runs of a cell.
Rule B: ours strictly above every other arm on every complete task; where another arm is at the maximum, ours must be at the
maximum too. Rule A: our lost points <= 0.8 x lost points of the best other arm, over the complete tasks.
"""
import json, os, re, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
labels = json.load(open(os.path.join(HERE, "tasks", "labels.json")))
votes = sorted(glob.glob(os.path.join(HERE, "grades", "vote-*")))
EXPECT_ARMS = ["ours", "base", "gwc", "gwc-invoked", "dod", "dod-invoked", "iso", "iso-invoked", "ce", "sp", "sp-invoked"]
REPS = 3

# per (run, criterion): list of pass booleans over votes
raw = {}
dropped = 0
for v in votes:
    runof = json.load(open(os.path.join(v, "labels.json")))
    for f in sorted(glob.glob(os.path.join(v, "g*.json"))):
        if os.path.basename(f) == "labels.json":
            continue
        g = json.load(open(f))
        run = runof.get(g["label"])
        if run is None:
            continue
        for cid, r in g.get("grades", {}).items():
            raw.setdefault((run, cid), []).append(bool(r.get("pass")))

def passes(run, cid):
    xs = raw.get((run, cid), [])
    return None if not xs else sum(xs) * 2 > len(xs)

runs = sorted({r for r, _ in raw})
cells = {}
for run in runs:
    m = re.match(r"^(X\d+)-(.+)-(\d)$", run)
    task, arm, rep = m.group(1), m.group(2), m.group(3)
    out = proc = 0
    for (r, cid), xs in raw.items():
        if r != run:
            continue
        p = passes(run, cid)
        lab = labels.get(f"{task}.c{cid}", {}).get("label")
        if lab == "outcome" and p:
            out += 1
        if lab == "process" and p:
            proc += 1
    cells.setdefault((task, arm), []).append((out, proc))

tasks = sorted({t for t, _ in cells})
maxout = {t: sum(1 for k, v in labels.items() if k.startswith(t + ".") and v["label"] == "outcome") for t in tasks}
complete = [t for t in tasks if all(len(cells.get((t, a), [])) == REPS for a in EXPECT_ARMS)]
mean = lambda t, a, i=0: sum(x[i] for x in cells[(t, a)]) / len(cells[(t, a)])

out = []
P = out.append
P(f"votes read: {len(votes)}; graded runs: {len(runs)}; complete tasks: {', '.join(complete) or 'none'}")
P("")
P("Outcome score per task (mean over runs of passed outcome criteria; runs in brackets):")
P("")
P("| arm | " + " | ".join(tasks) + " | total (complete tasks) |")
P("|---|" + "---|" * (len(tasks) + 1))
for a in EXPECT_ARMS:
    row = []
    for t in tasks:
        c = cells.get((t, a))
        row.append(f"{mean(t, a):.2f} [{'/'.join(str(x[0]) for x in c)}]" if c else "not run")
    tot = sum(mean(t, a) for t in complete) if complete else 0
    P(f"| {a} | " + " | ".join(row) + f" | {tot:.2f} |")
P("")
P("Process criterion (not part of the rules), mean passed per run:")
P("")
P("| arm | " + " | ".join(tasks) + " |")
P("|---|" + "---|" * len(tasks))
for a in EXPECT_ARMS:
    P(f"| {a} | " + " | ".join(f"{mean(t, a, 1):.2f}" if cells.get((t, a)) else "not run" for t in tasks) + " |")
P("")
P("Rule B (ours strictly above every other arm; at the maximum if another arm is):")
P("")
ruleB = True
for t in complete:
    mx = maxout[t]
    o = mean(t, "ours")
    others = {a: mean(t, a) for a in EXPECT_ARMS if a != "ours"}
    best_a = max(others, key=lambda a: others[a])
    best = others[best_a]
    if best >= mx:
        ok = o >= mx
        why = f"ceiling case: best other {best_a} {best:.2f} = max {mx}; ours {o:.2f}"
    else:
        ok = o > best
        why = f"best other {best_a} {best:.2f}; ours {o:.2f}"
    ruleB &= ok
    P(f"- {t}: {'pass' if ok else 'FAIL'} ({why})")
for t in tasks:
    if t not in complete:
        P(f"- {t}: incomplete arm set, not part of the rule")
P(f"- Rule B over complete tasks: {'holds' if ruleB and complete else 'fails'}")
P("")
P("Rule A (our lost points <= 80% of the best other arm's lost points, complete tasks):")
P("")
if complete:
    mx_total = sum(maxout[t] for t in complete)
    ours_lost = mx_total - sum(mean(t, "ours") for t in complete)
    other_lost = {a: mx_total - sum(mean(t, a) for t in complete) for a in EXPECT_ARMS if a != "ours"}
    ba = min(other_lost, key=lambda a: other_lost[a])
    limit = 0.8 * other_lost[ba]
    P(f"- maximum over complete tasks: {mx_total}; ours lost {ours_lost:.2f}; best other arm {ba} lost {other_lost[ba]:.2f}; limit 0.8 x = {limit:.2f}")
    ruleA = ours_lost <= limit
    P(f"- Rule A: {'holds' if ruleA else 'fails'}")
else:
    ruleA = False
    P("- no complete task: Rule A not computed")
P("")
P(f"Gate on this set: {'Rule A and Rule B hold' if (ruleA and ruleB and complete) else 'does not pass'}")
text = "\n".join(out) + "\n"

BEGIN, END = "<!-- score.py output begin -->", "<!-- score.py output end -->"
if "--check" in sys.argv:
    s = open(os.path.join(HERE, "SUMMARY.md")).read()
    block = s.split(BEGIN)[1].split(END)[0].strip("\n") + "\n"
    if block != text:
        sys.stderr.write("SUMMARY.md block differs from score.py output\n")
        sys.exit(1)
    print("SUMMARY.md matches score.py output")
else:
    sys.stdout.write(text)
