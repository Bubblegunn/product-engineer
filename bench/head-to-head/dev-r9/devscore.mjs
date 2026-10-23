#!/usr/bin/env node
// devscore: scores the r9 development gate (docs/DEV-GATE-r9.md section 4 and 7) from joint-grading votes.
// Usage: node devscore.mjs <work dir> <tasks.json> <tasks comma list> [--json]
// A cell is (task, arm, run). Criterion pass = majority of the votes in <work>/grades-vote-*/ (ties fail). Cell score = number of
// passed `outcome` criteria (labels come from the criteria in tasks.json via dev-r9/X*/task.json). Best other arm = the single arm
// with the highest total over the listed tasks. The bootstrap resamples the paired cells (task, run) 10000 times with a fixed seed.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const [work, , taskList] = process.argv.slice(2);
const tasks = taskList.split(",");
const outcomeIds = {};
for (const t of tasks) {
  const tj = JSON.parse(readFileSync(join(HERE, t, "task.json"), "utf8"));
  outcomeIds[t] = tj.criteria.filter((c) => c.label === "outcome").map((c) => String(c.id));
}
const votes = readdirSync(work).filter((d) => d.startsWith("grades-vote-")).sort();
const pass = {}; // cell -> id -> [bool,...]
for (const v of votes) {
  const labels = JSON.parse(readFileSync(join(work, v, "labels.json"), "utf8"));
  for (const [label, cell] of Object.entries(labels)) {
    const f = join(work, v, `${label}.json`);
    if (!existsSync(f)) continue;
    const g = JSON.parse(readFileSync(f, "utf8")).grades;
    for (const [id, r] of Object.entries(g)) {
      ((pass[cell] ??= {})[id] ??= []).push(r.pass === true);
    }
  }
}
const cells = {}; // task -> arm -> run -> score
for (const [cell, ids] of Object.entries(pass)) {
  const m = /^(X\d+)-(.+)-(\d)$/.exec(cell);
  if (!m || !tasks.includes(m[1])) continue;
  const [, task, arm, run] = m;
  let s = 0;
  for (const id of outcomeIds[task]) {
    const vs = ids[id] ?? [];
    if (vs.filter(Boolean).length * 2 > vs.length) s++;
  }
  (((cells[task] ??= {})[arm] ??= {})[run] = s);
}
const arms = [...new Set(tasks.flatMap((t) => Object.keys(cells[t] ?? {})))];
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const taskMean = (t, a) => mean(Object.values(cells[t]?.[a] ?? {}));
const max = (t) => outcomeIds[t].length;
const rows = tasks.map((t) => ({ task: t, max: max(t), ...Object.fromEntries(arms.map((a) => [a, cells[t]?.[a] ? +taskMean(t, a).toFixed(2) : null])) }));
const total = (a) => tasks.reduce((s, t) => s + (cells[t]?.[a] ? taskMean(t, a) : 0), 0);
const others = arms.filter((a) => a !== "ours");
const best = others.reduce((b, a) => (total(a) > total(b) ? a : b), others[0]);
// paired cells: for each task and run index present in both ours and best
const pairs = [];
for (const t of tasks) for (const r of ["1", "2", "3"]) {
  const o = cells[t]?.ours?.[r], b = cells[t]?.[best]?.[r];
  if (o !== undefined && b !== undefined) pairs.push(o - b);
}
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const boots = [];
for (let i = 0; i < 10000; i++) {
  let s = 0;
  for (let j = 0; j < pairs.length; j++) s += pairs[Math.floor(rnd() * pairs.length)];
  boots.push(s / pairs.length);
}
boots.sort((a, b) => a - b);
const lo = boots[Math.floor(0.025 * boots.length)], hi = boots[Math.floor(0.975 * boots.length)];
const point = mean(pairs);
const perTaskDiff = tasks.map((t) => ({ task: t, ours_minus_best: +(taskMean(t, "ours") - taskMean(t, best)).toFixed(2), ours_minus_base: +(taskMean(t, "ours") - taskMean(t, "base")).toFixed(2) }));
const result = {
  votes: votes.length, arms, totals: Object.fromEntries(arms.map((a) => [a, +total(a).toFixed(2)])), bestOther: best,
  pairedCells: pairs.length, meanDiffPerCell: +point.toFixed(3), ci95: [+lo.toFixed(3), +hi.toFixed(3)],
  passes: { ciAboveZero: lo > 0, pointAtLeast0_5: point >= 0.5, noTaskBelowBaseBy034: perTaskDiff.every((d) => d.ours_minus_base >= -0.34) },
  perTaskDiff, rows,
};
if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`votes ${result.votes}; best other arm: ${best}`);
  console.table(rows);
  console.log("totals", result.totals);
  console.log(`paired cells ${pairs.length}; mean ours-best per cell ${result.meanDiffPerCell}; 95% CI [${result.ci95}]`);
  console.log("passes", result.passes);
  console.table(perTaskDiff);
}
