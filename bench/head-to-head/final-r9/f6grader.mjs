#!/usr/bin/env node
// F6-grader (docs/FINAL-PROTOCOL-r9.md section 3): the sampled cells' ORIGINAL answers re-graded by fresh grader sessions
// (votes f6-vote-*), compared with the consensus of the main grading (<work>/grades). Pass if no sampled cell differs by more than
// 1 outcome point and criterion agreement over the sampled cells is at least 90 percent. Judged criteria only (obj criteria are scripts, not graded).
// Usage: node f6grader.mjs <work dir> <labels.json> <sample.json> <setkey> [--json]
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [work, labelsFile, sampleFile, setKey] = process.argv.slice(2);
const labels = JSON.parse(readFileSync(labelsFile, "utf8"));
const sample = JSON.parse(readFileSync(sampleFile, "utf8"))[setKey];
const isOutcome = (task, id) => labels[`${task}.c${id}`]?.label === "outcome";

function readGrades(dir) {
  const map = JSON.parse(readFileSync(join(dir, "labels.json"), "utf8"));
  const out = {};
  for (const [label, cell] of Object.entries(map)) {
    const f = join(dir, `${label}.json`);
    if (existsSync(f)) out[cell] = JSON.parse(readFileSync(f, "utf8")).grades;
  }
  return out;
}
const original = readGrades(join(work, "grades"));
const voteDirs = readdirSync(work).filter((d) => d.startsWith("f6-vote-")).sort().map((d) => readGrades(join(work, d)));
let agree = 0, total = 0;
const cellDiffs = [];
for (const cell of sample) {
  const task = cell.split("-")[0];
  const orig = original[cell];
  if (!orig) continue;
  let origScore = 0, newScore = 0;
  for (const [id, r] of Object.entries(orig)) {
    if (!isOutcome(task, id) || r.err) continue;
    const votes = voteDirs.map((v) => v[cell]?.[id]?.pass).filter((x) => typeof x === "boolean");
    if (votes.length < 2) continue;
    const consensus = votes.filter(Boolean).length * 2 > votes.length;
    total++;
    if (consensus === (r.pass === true)) agree++;
    if (r.pass === true) origScore++;
    if (consensus) newScore++;
  }
  cellDiffs.push({ cell, original: origScore, regraded: newScore, diff: newScore - origScore });
}
const worst = cellDiffs.reduce((m, c) => Math.max(m, Math.abs(c.diff)), 0);
const rate = total === 0 ? 0 : agree / total;
const result = {
  set: setKey, sampledCells: sample.length, comparedCells: cellDiffs.length, voteSets: voteDirs.length,
  criteriaCompared: total, criterionAgreement: +rate.toFixed(4), maxCellDifference: worst,
  cellsDifferingByMoreThanOne: cellDiffs.filter((c) => Math.abs(c.diff) > 1).map((c) => c.cell),
  cellsDiffering: cellDiffs.filter((c) => c.diff !== 0),
  pass: worst <= 1 && rate >= 0.9,
};
if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`F6-grader ${setKey}: ${result.comparedCells}/${result.sampledCells} sampled cells compared, ${result.voteSets} fresh vote sets`);
  console.log(`criterion agreement ${(rate * 100).toFixed(1)}% over ${total} judged outcome criteria; largest cell difference ${worst} point(s)`);
  console.log(`cells differing: ${result.cellsDiffering.map((c) => `${c.cell} ${c.original}->${c.regraded}`).join(", ") || "none"}`);
  console.log(`F6-grader: ${result.pass ? "PASS" : "FAIL"}`);
}
