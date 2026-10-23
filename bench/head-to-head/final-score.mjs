#!/usr/bin/env node
// Final score of one set of runs, from the merged grades of mergevotes.mjs: per task and arm means, arm totals, the best other
// arm, Rules A, B and B-prime, and the paired bootstrap of ours minus the best other arm (claim I1).
// Usage: node final-score.mjs --runs-dir <work>/runs --grades <merged grades dir> --tasks <tasks.json> --labels <labels.json>
//          --set-name <name> [--tasks-list T1,T2,...] [--json]
// Scores come from collectRuns and outcomeScore in summarize.mjs, the code summarize.mjs itself uses.
// Lost points of an arm = sum over the set's tasks of (the task's maximum outcome count - the arm's mean on that task).
// Rule A: lost points of ours <= 0.8 x lost points of the best other arm.
// Rule B (per task): ours strictly above every other arm, or ours and the highest other arm both at the task maximum.
// Rule B-prime: Rule B, except that ours may sit up to 0.34 below the best other arm on at most one task.
// Bootstrap: the paired (task, run) cells of ours minus the best other arm, resampled 10000 times with a fixed LCG seed.
// I1 holds when the 2.5% bound of that interval is above zero.
import { readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readGradeFile, readLabels, loadTasks } from "./grade.mjs";
import { collectRuns, isOutcome, loadCriterionLabels, outcomeScore } from "./summarize.mjs";

export const OURS = "ours";
export const RULE_A_RATIO = 0.8;
export const CLOSE_MARGIN = 0.34;
export const BOOT_RESAMPLES = 10000;
export const BOOT_SEED = 12345;

const asId = (text) => (/^\d+$/.test(text) ? Number(text) : text);
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const isNatural = (arm) => !arm.endsWith("-invoked");

// Paired bootstrap of the mean of diffs: resamples with replacement, fixed-seed LCG (the same generator as dev-r9/devscore.mjs).
export function pairedBootstrap(diffs, resamples = BOOT_RESAMPLES, seed = BOOT_SEED) {
  if (diffs.length === 0) return { mean: null, lo: null, hi: null };
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const means = [];
  for (let i = 0; i < resamples; i += 1) {
    let sum = 0;
    for (let j = 0; j < diffs.length; j += 1) sum += diffs[Math.floor(next() * diffs.length)];
    means.push(sum / diffs.length);
  }
  means.sort((a, b) => a - b);
  return {
    mean: diffs.reduce((a, b) => a + b, 0) / diffs.length,
    lo: means[Math.floor(0.025 * resamples)],
    hi: means[Math.floor(0.975 * resamples)],
  };
}

// The best arm of a list by total: the first one with the highest total, in the order given. Null for an empty list.
function bestByTotal(arms, totals) {
  let best = null;
  for (const arm of arms) {
    if (best === null || totals[arm] > totals[best]) best = arm;
  }
  return best;
}

// Scores one set of runs. Throws when ours is absent or when a (task, arm, rep) cell has two runs.
export function scoreSet({ runsDir, gradesDir, tasks, labels, taskList = null }) {
  const runs = collectRuns(runsDir, gradesDir, tasks, labels).filter((r) => taskList === null || taskList.includes(r.task));
  if (runs.length === 0) throw new Error("no DONE runs in the set");
  const labelOf = new Map(Object.entries(readLabels(gradesDir)).map(([label, runId]) => [runId, label]));
  const scoreOf = {}; // task -> arm -> rep -> outcome score
  const taskMax = {};
  const errRuns = [];
  for (const run of runs) {
    const meta = readJson(join(runsDir, run.id, "meta.json"));
    const rep = Number(meta.rep);
    const cell = ((scoreOf[run.task] ??= {})[run.arm] ??= {});
    if (cell[rep] !== undefined) throw new Error(`two runs for ${run.task} ${run.arm} rep ${rep} in the set`);
    cell[rep] = outcomeScore(run);
    taskMax[run.task] = Math.max(taskMax[run.task] ?? 0, run.criteria.filter(isOutcome).length);
    const label = labelOf.get(run.id);
    const record = label ? readGradeFile(join(gradesDir, `${label}.json`)) : null;
    const errIds = Object.entries(record?.grades ?? {})
      .filter(([, g]) => g && g.err === true)
      .map(([id]) => asId(id));
    if (errIds.length > 0) errRuns.push({ run: run.id, task: run.task, arm: run.arm, criteria: errIds });
  }
  return summarizeCells({ scoreOf, taskMax, runCount: runs.length, errRuns });
}

// The table, the rules and the bootstrap from per-cell scores: scoreOf[task][arm][rep] = outcome score, taskMax[task] = outcome maximum.
// recompute.mjs calls this with the cells of cells.csv, so both paths share one set of numbers.
export function summarizeCells({ scoreOf, taskMax, runCount, errRuns = [] }) {
  const tasksInSet = Object.keys(scoreOf).sort();
  const armsSeen = [...new Set(tasksInSet.flatMap((t) => Object.keys(scoreOf[t])))].sort();
  if (!armsSeen.includes(OURS)) throw new Error(`no ${OURS} runs in the set`);
  const arms = [OURS, ...armsSeen.filter((a) => a !== OURS)];
  const others = arms.filter((a) => a !== OURS);

  const meanOf = (task, arm) => {
    const values = scoreOf[task]?.[arm] ? Object.values(scoreOf[task][arm]) : [];
    return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
  };
  const cells = {};
  const missing = [];
  for (const task of tasksInSet) {
    cells[task] = {};
    for (const arm of arms) {
      cells[task][arm] = meanOf(task, arm);
      if (cells[task][arm] === null) missing.push({ task, arm });
    }
  }
  const maxSum = tasksInSet.reduce((sum, t) => sum + taskMax[t], 0);
  const totals = Object.fromEntries(arms.map((arm) => [arm, tasksInSet.reduce((sum, t) => sum + (cells[t][arm] ?? 0), 0)]));
  const lost = Object.fromEntries(arms.map((arm) => [arm, maxSum - totals[arm]]));
  const bestOther = bestByTotal(others, totals);
  const naturalOthers = others.filter(isNatural);
  const bestNatural = bestByTotal(naturalOthers, totals);

  // Rule A
  const ruleA = {
    pass: bestOther !== null && lost[OURS] <= RULE_A_RATIO * lost[bestOther],
    oursLost: lost[OURS],
    bestOther,
    bestLost: bestOther === null ? null : lost[bestOther],
  };

  // Rule B and B-prime, per task
  const perTask = tasksInSet.map((task) => {
    const ours = cells[task][OURS];
    const otherMeans = others.map((a) => cells[task][a]).filter((x) => x !== null);
    const maxOther = otherMeans.length === 0 ? null : Math.max(...otherMeans);
    const maxOtherArm = others.find((a) => cells[task][a] === maxOther) ?? null;
    const bestOtherMean = bestOther === null ? null : cells[task][bestOther];
    const ceiling = taskMax[task];
    const strictlyAbove = ours !== null && (maxOther === null || ours > maxOther);
    const bothAtCeiling = ours !== null && ours === ceiling && maxOther !== null && maxOther === ceiling;
    const b = strictlyAbove || bothAtCeiling;
    return { task, ours, taskMax: ceiling, maxOther, maxOtherArm, bestOtherMean, b };
  });
  const ruleBFailures = perTask.filter((t) => !t.b).map((t) => t.task);
  const ruleB = { pass: ruleBFailures.length === 0, failures: ruleBFailures };
  const failing = perTask.filter((t) => !t.b);
  const exceptionTask = failing.length === 1 ? failing[0] : null;
  const withinMargin =
    exceptionTask !== null &&
    exceptionTask.ours !== null &&
    exceptionTask.maxOther !== null &&
    exceptionTask.ours >= exceptionTask.maxOther - CLOSE_MARGIN - 1e-9;
  const ruleBPrime = { pass: failing.length === 0 || withinMargin, exception: withinMargin ? exceptionTask.task : null };

  // I1: paired cells (task, rep) of ours minus the best other arm
  const diffs = [];
  if (bestOther !== null) {
    for (const task of tasksInSet) {
      const oursCells = scoreOf[task][OURS] ?? {};
      const otherCells = scoreOf[task][bestOther] ?? {};
      const reps = [...new Set([...Object.keys(oursCells), ...Object.keys(otherCells)])].map(Number).sort((a, b) => a - b);
      for (const rep of reps) {
        if (oursCells[rep] !== undefined && otherCells[rep] !== undefined) diffs.push(oursCells[rep] - otherCells[rep]);
      }
    }
  }
  const boot = pairedBootstrap(diffs);
  const bootstrap = {
    pairs: diffs.length,
    mean: boot.mean,
    ci95: [boot.lo, boot.hi],
    resamples: BOOT_RESAMPLES,
    seed: BOOT_SEED,
    bestOther,
    i1: boot.lo !== null && boot.lo > 0,
  };

  return {
    tasks: tasksInSet,
    arms,
    runs: runCount,
    cells,
    taskMax,
    totals,
    lost,
    missing,
    bestOther: bestOther === null ? null : { arm: bestOther, total: totals[bestOther] },
    bestNatural: bestNatural === null ? null : { arm: bestNatural, total: totals[bestNatural] },
    ruleA,
    ruleB,
    ruleBPrime,
    perTask,
    bootstrap,
    errRuns,
  };
}

const f2 = (n) => (n === null || n === undefined ? "-" : n.toFixed(2));

export function renderText(setName, s) {
  const out = [];
  out.push(`set ${setName}: ${s.runs} DONE runs on ${s.tasks.join(", ")}`);
  const header = ["task", ...s.arms, "max"];
  const rows = s.tasks.map((t) => [t, ...s.arms.map((a) => f2(s.cells[t][a])), String(s.taskMax[t])]);
  rows.push(["total", ...s.arms.map((a) => f2(s.totals[a])), String(Object.values(s.taskMax).reduce((a, b) => a + b, 0))]);
  rows.push(["lost", ...s.arms.map((a) => f2(s.lost[a])), ""]);
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join("  ");
  out.push(line(header));
  for (const r of rows) out.push(line(r));
  out.push(`best other arm: ${s.bestOther ? `${s.bestOther.arm} (total ${f2(s.bestOther.total)})` : "none"}`);
  if (s.bestNatural) {
    const note = s.bestOther && s.bestOther.arm !== s.bestNatural.arm ? "" : " (same as the best other arm)";
    out.push(`best natural other arm (not -invoked): ${s.bestNatural.arm} (total ${f2(s.bestNatural.total)})${note}`);
  } else out.push("best natural other arm (not -invoked): none");
  out.push(`Rule A: ${s.ruleA.pass ? "PASS" : "FAIL"} (ours lost ${f2(s.ruleA.oursLost)} against ${f2(s.ruleA.bestLost)} for ${s.ruleA.bestOther ?? "none"}, limit 0.8 x)`);
  out.push("per task (Rule B, Rule B-prime):");
  for (const t of s.perTask) {
    out.push(
      `  ${t.task}: ours ${f2(t.ours)}, best other ${t.maxOtherArm ?? "none"} ${f2(t.maxOther)}, max ${t.taskMax}, B ${t.b ? "pass" : "FAIL"}`,
    );
  }
  out.push(`Rule B: ${s.ruleB.pass ? "PASS" : `FAIL: ${s.ruleB.failures.join(", ")}`}`);
  out.push(`Rule B-prime: ${s.ruleBPrime.pass ? "PASS" : "FAIL"}${s.ruleBPrime.exception ? ` (exception on ${s.ruleBPrime.exception})` : ""}`);
  const [lo, hi] = s.bootstrap.ci95;
  out.push(
    `bootstrap: ${s.bootstrap.pairs} paired cells, ours minus ${s.bootstrap.bestOther ?? "none"}: mean ${f2(s.bootstrap.mean)}, 95% interval [${f2(lo)}, ${f2(hi)}] (${s.bootstrap.resamples} resamples, seed ${s.bootstrap.seed})`,
  );
  out.push(`I1: ${s.bootstrap.i1 ? "HOLDS" : "does not hold"} (interval lower bound ${s.bootstrap.i1 ? "above" : "not above"} zero)`);
  if (s.missing.length) out.push(`missing cells: ${s.missing.map((m) => `${m.task} ${m.arm}`).join("; ")}`);
  // errRuns null: the caller has no grade files (recompute.mjs reads only cells.csv), so the line says so.
  if (s.errRuns === null) out.push("runs with an error criterion: not recomputed here (see grades/ERRORS.json)");
  else {
    out.push(`runs with an error criterion: ${s.errRuns.length === 0 ? "none" : ""}`);
    for (const e of s.errRuns) out.push(`  ${e.run} (${e.task} ${e.arm}): criteria ${e.criteria.join(", ")}`);
  }
  return `${out.join("\n")}\n`;
}

const isMain = Boolean(process.argv[1]) && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const usage =
    "usage: node final-score.mjs --runs-dir <work>/runs --grades <merged grades dir> --tasks <tasks.json> --labels <labels.json> --set-name <name> [--tasks-list T1,T2,...] [--json]\n";
  const opts = { json: false, taskList: null };
  const keys = { "--runs-dir": "runsDir", "--grades": "grades", "--tasks": "tasks", "--labels": "labels", "--set-name": "setName", "--tasks-list": "tasksList" };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--json") opts.json = true;
    else if (keys[args[i]] && args[i + 1] !== undefined) {
      opts[keys[args[i]]] = args[i + 1];
      i += 1;
    } else {
      process.stderr.write(usage);
      process.exit(2);
    }
  }
  for (const required of ["runsDir", "grades", "setName"]) {
    if (!opts[required]) {
      process.stderr.write(usage);
      process.exit(2);
    }
  }
  const tasks = opts.tasks ? JSON.parse(readFileSync(resolve(opts.tasks), "utf8")) : loadTasks();
  const labels = loadCriterionLabels(opts.labels ? resolve(opts.labels) : undefined);
  const taskList = opts.tasksList ? opts.tasksList.split(",").map((t) => t.trim()).filter(Boolean) : null;
  const result = scoreSet({ runsDir: resolve(opts.runsDir), gradesDir: resolve(opts.grades), tasks, labels, taskList });
  if (opts.json) process.stdout.write(`${JSON.stringify({ set: opts.setName, ...result }, null, 2)}\n`);
  else process.stdout.write(renderText(opts.setName, result));
}
