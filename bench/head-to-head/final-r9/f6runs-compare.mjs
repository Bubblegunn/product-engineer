#!/usr/bin/env node
// F6-runs (descriptive, docs/FINAL-PROTOCOL-r9.md section 3): each sampled (task, arm) was re-run once on a fresh fixture. Reports how many re-run
// outcome scores fall inside the min-max of that cell's three original run scores. No pass or fail.
// Usage: node f6runs-compare.mjs <orig runs dir> <orig merged grades> <rerun runs dir> <rerun merged grades> <tasks.json> <labels.json>
import { collectRuns, outcomeScore } from "../summarize.mjs";
import { readFileSync } from "node:fs";

const [origRuns, origGrades, reRuns, reGrades, tasksFile, labelsFile] = process.argv.slice(2);
const tasks = JSON.parse(readFileSync(tasksFile, "utf8"));
const labels = JSON.parse(readFileSync(labelsFile, "utf8"));
const group = (runs) => {
  const m = {};
  for (const r of runs) ((m[r.task] ??= {})[r.arm] ??= []).push(outcomeScore(r));
  return m;
};
const orig = group(collectRuns(origRuns, origGrades, tasks, labels));
const re = group(collectRuns(reRuns, reGrades, tasks, labels));
const rows = [];
for (const task of Object.keys(re)) for (const arm of Object.keys(re[task])) {
  const os = orig[task]?.[arm];
  if (!os) continue;
  for (const x of re[task][arm]) rows.push({ task, arm, rerun: x, min: Math.min(...os), max: Math.max(...os), inside: x >= Math.min(...os) - 1e-9 && x <= Math.max(...os) + 1e-9 });
}
const inside = rows.filter((x) => x.inside).length;
console.log(`F6-runs: ${inside} of ${rows.length} re-run scores fall inside the min-max of the cell's three original runs`);
for (const x of rows.filter((x) => !x.inside)) console.log(`  outside: ${x.task} ${x.arm} re-run ${x.rerun} vs original ${x.min}..${x.max}`);
