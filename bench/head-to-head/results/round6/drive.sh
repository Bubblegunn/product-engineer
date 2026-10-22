#!/bin/bash
# Round 6 held-out driver. Usage: drive.sh <work dir> <heldout dir> <prep dir> <ours commit>
# Task by task X1..X5, all arms, 3 runs, parallel 3. Stops when session cost >= STOP_USD (19.0), or when a session shows
# the credit guard (exit 3), HTTP 429 or an authentication error.
set -u
W=$1; HO=$2; PREP=$3; OC=$4
cd <REPO>
export PE_BENCH_ONLY_ARMS=ours,base,gwc,gwc-invoked,dod,dod-invoked,iso,iso-invoked,ce,sp,sp-invoked PE_BENCH_WORK_DIR=$W PE_BENCH_PAR=3 PE_BENCH_OURS_COMMIT=$OC PE_BENCH_HELDOUT_DIR=$HO PE_BENCH_TASKS=$PREP/tasks.json
STOP=${STOP_USD:-19.0}
spent() { node -e '
const fs=require("fs"),p=process.argv[1];let t=0;
for(const d of fs.existsSync(p)?fs.readdirSync(p):[]){try{for(const l of fs.readFileSync(p+"/"+d+"/out.jsonl","utf8").split("\n")){try{const j=JSON.parse(l);if(j.type==="result")t+=j.total_cost_usd||0}catch{}}}catch{}}
console.log(t.toFixed(4))' "$W/runs"; }
bad() { grep -l -E 'credit guard|api_error_status.{0,4}(429|401|403)|authentication_error|rate_limit_error|weekly limit' "$W"/runs/*/stderr.log "$W"/runs/*/out.jsonl 2>/dev/null | head -3; }
echo "start $(date)"
for t in X1 X2 X3 X4 X5; do
  s=$(spent); node -e 'process.exit(Number(process.argv[1])>=Number(process.argv[2])?1:0)' "$s" "$STOP" || { echo "STOP: session cost $s reached $STOP before $t"; touch "$W/STOPPED"; break; }
  bash bench/head-to-head/runall.sh --tasks $t
  b=$(bad); [ -z "$b" ] || { echo "STOP: guard/429/auth seen in: $b"; touch "$W/STOPPED"; break; }
  echo "task $t done $(date) sessions=$(spent)"
done
echo "driver done $(date) sessions=$(spent)"; touch "$W/DRIVER_DONE"
