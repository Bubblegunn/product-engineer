#!/bin/bash
# Held-out measurement driver (docs/HEAD-TO-HEAD.md, "Deep-round measurement protocol"). Usage: heldout-drive.sh <work dir> <heldout dir> <prep dir>
# Order: task by task X1..X4; within a task the arms ours, base, ce, sp-invoked, 3 runs each (runall.sh, parallel 2).
# Stop rule: no new session once the sessions' cost reaches STOP_USD (default 4.2). Every session's total_cost_usd goes to PE_BENCH_COST_FILE.
set -u
W=$1; HO=$2; PREP=$3
cd "$(dirname "$0")/../.."
export PE_BENCH_WORK_DIR=$W PE_BENCH_PAR=2 PE_BENCH_OURS_COMMIT=$(git rev-parse HEAD) PE_BENCH_HELDOUT_DIR=$HO PE_BENCH_TASKS=$PREP/tasks.json
C=${PE_BENCH_COST_FILE:?set PE_BENCH_COST_FILE}; STOP=${STOP_USD:-4.2}
spent() { node -e '
const fs=require("fs"),p=process.argv[1];let t=0;
for(const d of fs.existsSync(p)?fs.readdirSync(p):[]){try{for(const l of fs.readFileSync(p+"/"+d+"/out.jsonl","utf8").split("\n")){try{const j=JSON.parse(l);if(j.type==="result")t+=j.total_cost_usd||0}catch{}}}catch{}}
console.log(t.toFixed(4))' "$W/runs"; }
logcost() { node -e '
const fs=require("fs"),[p,c]=process.argv.slice(1);const have=new Set(fs.readFileSync(c,"utf8").split("\n").map(l=>l.split("\t")[1]));
let cum=Number(fs.readFileSync(c,"utf8").trim().split("\n").pop().split("\t")[3])||0;
for(const d of fs.readdirSync(p).sort()){const desc="session "+d;if(have.has(desc))continue;let u=null;try{for(const l of fs.readFileSync(p+"/"+d+"/out.jsonl","utf8").split("\n")){try{const j=JSON.parse(l);if(j.type==="result")u=j.total_cost_usd}catch{}}}catch{}
if(u==null)continue;cum+=u;fs.appendFileSync(c,[new Date().toISOString(),desc,u,cum.toFixed(4)].join("\t")+"\n")}' "$W/runs" "$C"; }
echo "start $(date)"
for t in X1 X2 X3 X4; do
  for a in ours base ce sp-invoked; do
    s=$(spent); node -e 'process.exit(Number(process.argv[1])>=Number(process.argv[2])?1:0)' "$s" "$STOP" || { echo "STOP: session cost $s reached $STOP before $t $a"; touch "$W/STOPPED"; break 2; }
    ~/claude-kredi-runs/2026-10-22/spend.sh | awk '{ if ($1+0 > 160) exit 1 }' || { echo "STOP: org spend above 160"; touch "$W/STOPPED"; break 2; }
    PE_BENCH_ONLY_ARMS=$a bash bench/head-to-head/runall.sh --tasks $t; logcost
  done
done
echo "driver done $(date) sessions=$(spent)"; touch "$W/DRIVER_DONE"
