#!/usr/bin/env node
// Recomputes the set summary from an evidence folder written by build-evidence.mjs. It reads cells.csv (the scores and outcome
// maxima), cost.csv (the dollar costs) and labels.json (to check the outcome maxima). It makes no network or model calls.
// The table, rules and bootstrap are the functions of final-score.mjs (summarizeCells, renderText), so the numbers match
// `final-score.mjs --set-name` on the same runs.
// Usage: node recompute.mjs <evidence dir> [--write <file> | --check <file>]
//   --write <file>  writes the text; --check <file> exits 1 unless the file equals the recomputed text byte for byte.
// The error-criterion line is not recomputed here (it needs grades/ERRORS.json), so it says so instead of "none".
import { readFileSync, realpathSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderText, summarizeCells } from "../final-score.mjs";

const CELL_COLUMNS = ["set", "task", "arm", "rep", "outcome_score", "outcome_max", "process_score"];
const COST_COLUMNS = ["task", "arm", "rep", "usd", "turns", "duration_ms"];

// Reads a CSV whose fields hold no commas or quotes (the builder writes only such fields). Returns objects keyed by the header.
export function readCsv(text, columns) {
  const lines = text.split("\n").filter((l) => l !== "");
  if (lines.length === 0) throw new Error("empty CSV");
  if (lines[0] !== columns.join(",")) throw new Error(`unexpected header: ${lines[0]}`);
  return lines.slice(1).map((line, i) => {
    if (line.includes('"')) throw new Error(`quoted field on line ${i + 2}: not expected in this format`);
    const values = line.split(",");
    if (values.length !== columns.length) throw new Error(`line ${i + 2} has ${values.length} fields, expected ${columns.length}`);
    return Object.fromEntries(columns.map((c, j) => [c, values[j]]));
  });
}

// The outcome maximum of each task from labels.json: the criteria labelled "outcome" (keys are "<task>.c<id>").
export function outcomeMaxFromLabels(labels) {
  const max = {};
  for (const [key, entry] of Object.entries(labels)) {
    const match = /^(.+)\.c\d+$/.exec(key);
    if (!match) continue;
    if (entry.label === "outcome") max[match[1]] = (max[match[1]] ?? 0) + 1;
  }
  return max;
}

const f2 = (n) => n.toFixed(2);

// The cost section: per arm, from cost.csv. The total is in dollars to the cent; the mean is per run.
export function costSection(costRows) {
  const byArm = new Map();
  for (const row of costRows) {
    const entry = byArm.get(row.arm) ?? { runs: 0, usd: 0, turns: 0, duration: 0 };
    entry.runs += 1;
    entry.usd += Number(row.usd);
    entry.turns += Number(row.turns);
    entry.duration += Number(row.duration_ms);
    byArm.set(row.arm, entry);
  }
  const out = ["cost (cost.csv, total_cost_usd of every run):"];
  const all = { runs: 0, usd: 0, turns: 0, duration: 0 };
  for (const arm of [...byArm.keys()].sort()) {
    const e = byArm.get(arm);
    out.push(
      `  ${arm}: ${e.runs} runs, total $${f2(e.usd)}, mean $${(e.usd / e.runs).toFixed(4)} per run, turns ${e.turns}, wall time ${(e.duration / 1000).toFixed(1)} s`,
    );
    all.runs += e.runs;
    all.usd += e.usd;
    all.turns += e.turns;
    all.duration += e.duration;
  }
  out.push(`  all arms: ${all.runs} runs, total $${f2(all.usd)}, turns ${all.turns}, wall time ${(all.duration / 1000).toFixed(1)} s`);
  return `${out.join("\n")}\n`;
}

// The full text of one evidence folder. Throws when the cells are inconsistent with the labels or with each other.
export function recomputeText(dir) {
  const cells = readCsv(readFileSync(join(dir, "cells.csv"), "utf8"), CELL_COLUMNS);
  const costs = readCsv(readFileSync(join(dir, "cost.csv"), "utf8"), COST_COLUMNS);
  const labels = JSON.parse(readFileSync(join(dir, "labels.json"), "utf8"));
  if (cells.length === 0) throw new Error("cells.csv has no rows");
  const sets = [...new Set(cells.map((r) => r.set))];
  if (sets.length !== 1) throw new Error(`cells.csv holds ${sets.length} sets, expected one`);

  const scoreOf = {};
  const taskMax = {};
  const seen = new Set();
  for (const row of cells) {
    const rep = Number(row.rep);
    const key = `${row.task}|${row.arm}|${rep}`;
    if (seen.has(key)) throw new Error(`two cells for ${row.task} ${row.arm} rep ${rep}`);
    seen.add(key);
    const cell = ((scoreOf[row.task] ??= {})[row.arm] ??= {});
    cell[rep] = Number(row.outcome_score);
    const max = Number(row.outcome_max);
    if (taskMax[row.task] !== undefined && taskMax[row.task] !== max) throw new Error(`outcome_max differs within ${row.task}`);
    taskMax[row.task] = max;
  }
  const fromLabels = outcomeMaxFromLabels(labels);
  for (const task of Object.keys(taskMax)) {
    if (fromLabels[task] !== taskMax[task]) {
      throw new Error(`outcome_max of ${task} is ${taskMax[task]} in cells.csv but ${fromLabels[task] ?? 0} outcome labels in labels.json`);
    }
  }
  const summary = summarizeCells({ scoreOf, taskMax, runCount: cells.length, errRuns: null });
  return renderText(sets[0], summary) + costSection(costs);
}

const isMain = Boolean(process.argv[1]) && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const usage = "usage: node recompute.mjs <evidence dir> [--write <file> | --check <file>]\n";
  const dirArg = args.find((a) => !a.startsWith("--"));
  if (!dirArg) {
    process.stderr.write(usage);
    process.exit(2);
  }
  let mode = null;
  let file = null;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === dirArg) continue;
    if ((args[i] === "--write" || args[i] === "--check") && args[i + 1] !== undefined && mode === null) {
      mode = args[i];
      file = resolve(args[i + 1]);
      i += 1;
    } else {
      process.stderr.write(usage);
      process.exit(2);
    }
  }
  const text = recomputeText(resolve(dirArg));
  if (mode === "--write") {
    writeFileSync(file, text);
    process.stdout.write(`wrote ${file}\n`);
  } else if (mode === "--check") {
    if (!existsSync(file)) {
      process.stderr.write(`check: ${file} does not exist\n`);
      process.exit(1);
    }
    const current = readFileSync(file, "utf8");
    if (current !== text) {
      const a = current.split("\n");
      const b = text.split("\n");
      const at = b.findIndex((line, i) => line !== a[i]);
      process.stderr.write(`check: FAILED, ${file} differs from the recomputed text (first difference at line ${at + 1})\n`);
      process.exit(1);
    }
    process.stdout.write(`check: OK, ${file} matches the recomputed text\n`);
  } else {
    process.stdout.write(text);
  }
}
