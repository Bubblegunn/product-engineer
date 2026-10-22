#!/usr/bin/env node
// heldout-summary: outcome-only mean score per task and arm from the grades of a runs directory, and rule B (ours strictly above
// every other arm on every task). Usage: node heldout-summary.mjs <work dir> <labels.json> [--min-runs N]
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function summarise(work, labelsFile) {
  const labels = JSON.parse(readFileSync(labelsFile, "utf8"));
  const gradesDir = join(work, "grades");
  const runOf = existsSync(join(gradesDir, "labels.json")) ? JSON.parse(readFileSync(join(gradesDir, "labels.json"), "utf8")) : {};
  const cells = {};
  for (const f of readdirSync(gradesDir).filter((n) => /^g[0-9a-f]+\.json$/.test(n))) {
    const g = JSON.parse(readFileSync(join(gradesDir, f), "utf8"));
    const m = /^(X\d+)-(.+)-(\d)$/.exec(runOf[g.label] ?? "");
    if (!m) continue;
    const [, task, arm] = m;
    for (const [id, v] of Object.entries(g.grades ?? {})) {
      const key = `${task}.c${id}`;
      const run = (cells[`${task}|${arm}`] ??= {});
      const r = (run[runOf[g.label]] ??= { outcome: 0, all: 0 });
      r.all += v.pass ? 1 : 0;
      if (labels[key]?.label === "outcome" && v.pass) r.outcome += 1;
    }
  }
  const table = {};
  for (const [k, runs] of Object.entries(cells)) {
    const [task, arm] = k.split("|");
    const v = Object.values(runs);
    (table[task] ??= {})[arm] = { n: v.length, outcome: v.reduce((a, r) => a + r.outcome, 0) / v.length, all: v.reduce((a, r) => a + r.all, 0) / v.length, scores: v.map((r) => r.outcome) };
  }
  return table;
}

if (process.argv[1] && process.argv[1].endsWith("heldout-summary.mjs")) {
  const table = summarise(process.argv[2], process.argv[3]);
  let ruleB = true;
  for (const task of Object.keys(table).sort()) {
    const arms = table[task];
    const ours = arms.ours;
    const others = Object.entries(arms).filter(([a]) => a !== "ours");
    const best = others.reduce((b, [a, v]) => (v.outcome > b.v ? { a, v: v.outcome } : b), { a: "-", v: -1 });
    const win = ours && ours.outcome > best.v;
    if (!win) ruleB = false;
    console.log(`${task}: ` + Object.entries(arms).map(([a, v]) => `${a} ${v.outcome.toFixed(2)} [${v.scores.join("/")}] n${v.n}`).join(" | ") + `  => ${win ? "win" : "NOT a win"} (best other ${best.a} ${best.v.toFixed(2)})`);
  }
  console.log(`rule B on these tasks: ${ruleB ? "holds" : "fails"}`);
}
