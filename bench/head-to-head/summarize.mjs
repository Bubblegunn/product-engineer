#!/usr/bin/env node
// Combines the objective and blind grades of every DONE run and applies the win rule
// (docs/HEAD-TO-HEAD.md, "The win rule"). Usage: node summarize.mjs [--runs-dir work/runs] [--markdown] [--allow-partial]
// The gate reads outcome criteria only (labels.json). The full table also shows process criteria, not gated.
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultWorkDir, listRuns, loadTasks, readLabels } from "./grade.mjs";
import { objective } from "./objective.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
// The default minimum of scored runs per cell. A single-model check with one run per cell passes --min-runs 1.
const MIN_RUNS = 3;
const OURS = "ours";

// ---------- files and labels ----------

// The expected tasks come from tasks.json and the expected arms, with their competitor groups, from arms.json.
export function expectedFromFiles() {
  const arms = JSON.parse(readFileSync(join(HERE, "arms.json"), "utf8"));
  const competitorOf = {};
  for (const [name, arm] of Object.entries(arms)) {
    if (arm.competitorOf) competitorOf[name] = arm.competitorOf;
  }
  return { tasks: Object.keys(loadTasks()).sort(), arms: Object.keys(arms), competitorOf, failed: [] };
}

export function loadCriterionLabels(file = join(HERE, "labels.json")) {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
}

// The label of one criterion, "outcome" or "process". A criterion without a label is an error, never a default.
export function criterionLabel(labels, task, id) {
  const entry = labels[`${task}.c${id}`];
  if (!entry || (entry.label !== "outcome" && entry.label !== "process")) {
    throw new Error(`no outcome or process label for ${task}.c${id} in labels.json`);
  }
  return entry.label;
}

// Core tasks are T1..Tn (the gate's first half), home-ground tasks are H1..Hn (the second half).
export function groupOf(task) {
  if (task.startsWith("T")) return "core";
  if (task.startsWith("H")) return "home";
  throw new Error(`task ${task} is neither core (T) nor home-ground (H)`);
}

export const isOutcome = (c) => (c.label ?? "outcome") === "outcome";

// The outcome score of one run: its passed outcome criteria. The table and final-score.mjs both use it.
export const outcomeScore = (run) => run.criteria.filter((c) => c.pass && isOutcome(c)).length;

// ---------- competitor groups ----------

export function rivalOf(arm, competitorOf = {}) {
  return competitorOf[arm] || arm;
}

// The arms that stand for one rival: base stands for itself, a competitor for its plain and invoked arms.
export function armsOfRival(rival, arms, competitorOf = {}) {
  return arms.filter((a) => a !== OURS && rivalOf(a, competitorOf) === rival);
}

// The better arm of a rival on one task: the highest mean among its arms that have scored runs. Null when none has.
export function rivalBest(table, task, rival) {
  let best = null;
  for (const arm of armsOfRival(rival, table.arms, table.competitorOf)) {
    const mean = table.cells[task] ? table.cells[task][arm] : undefined;
    if (mean !== undefined && (best === null || mean > best.mean)) best = { arm, mean };
  }
  return best;
}

const unique = (xs) => [...new Set(xs)];
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const f2 = (n) => (n === null || n === undefined ? "-" : n.toFixed(2));

// ---------- per run ----------

// The criteria of one run. obj: the script's result. llm: the grade. both: the script AND the grade.
// A missing grade for an llm or both criterion counts as a failure and is reported as a warning.
export function combineRun(criteria, objResult, grades) {
  const warnings = [];
  const results = criteria.map((c) => {
    const id = String(c.id);
    const grade = grades && grades[id];
    const gradeKnown = Boolean(grade) && typeof grade.pass === "boolean";
    if (c.kind === "obj") {
      const pass = objResult[id] === true;
      if (objResult[id] === null || objResult[id] === undefined) warnings.push(`criterion ${id} has no objective result`);
      return { id: c.id, kind: c.kind, pass };
    }
    if (c.kind === "llm") {
      if (!gradeKnown) warnings.push(`missing grade for criterion ${id}`);
      return { id: c.id, kind: c.kind, pass: gradeKnown && grade.pass };
    }
    if (c.kind === "both") {
      if (!gradeKnown) warnings.push(`missing grade for criterion ${id}`);
      return { id: c.id, kind: c.kind, pass: objResult[id] === true && gradeKnown && grade.pass };
    }
    throw new Error(`unknown criterion kind ${c.kind} for criterion ${id}`);
  });
  return { criteria: results, warnings, score: results.filter((r) => r.pass).length };
}

// ---------- the table ----------

// A run is {id, task, arm, criteria: [{id, pass, label}], warnings, model, started}. expected is
// {tasks, arms, competitorOf, failed: [{task, arm, rep, reason}]}; a failed run with a reason counts toward "not run".
// Each expected task x arm cell is checked. A cell with no scored run whose present runs all failed with a recorded
// reason, at least minRuns of them, is "not run, reason". Any other cell with fewer than minRuns scored runs is incomplete.
export function summarize(runs, expected = expectedFromFiles()) {
  const minRuns = expected.minRuns ?? MIN_RUNS;
  const warnings = [];
  const armSet = new Set(expected.arms);
  const taskSet = new Set(expected.tasks);
  const scores = {};
  const fullScores = {};
  const maxOutcome = {};
  const failedRuns = {};
  const push = (store, task, arm, value) => {
    store[task] = store[task] || {};
    store[task][arm] = store[task][arm] || [];
    store[task][arm].push(value);
  };
  // Labels are enforced in collectRuns (criterionLabel throws on a missing label); isOutcome's default covers direct callers only.
  for (const run of runs) {
    armSet.add(run.arm);
    taskSet.add(run.task);
    push(scores, run.task, run.arm, outcomeScore(run));
    push(fullScores, run.task, run.arm, run.criteria.filter((c) => c.pass).length);
    maxOutcome[run.task] = Math.max(maxOutcome[run.task] || 0, run.criteria.filter(isOutcome).length);
    for (const w of run.warnings || []) warnings.push(`${run.id}: ${w}`);
  }
  for (const f of expected.failed || []) {
    armSet.add(f.arm);
    taskSet.add(f.task);
    failedRuns[f.task] = failedRuns[f.task] || {};
    const slot = failedRuns[f.task][f.arm] || (failedRuns[f.task][f.arm] = { total: 0, reasoned: 0, reason: null });
    slot.total += 1;
    if (f.reason) {
      slot.reasoned += 1;
      if (slot.reason === null) slot.reason = f.reason;
    }
  }

  const arms = [...armSet].sort((a, b) => {
    if (a === OURS) return -1;
    if (b === OURS) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const tasks = [...taskSet].sort();
  for (const task of tasks) groupOf(task);

  const cells = {};
  const fullCells = {};
  const notRun = {};
  const incomplete = [];
  const ceiling = {};
  for (const task of tasks) {
    cells[task] = {};
    fullCells[task] = {};
    notRun[task] = {};
    for (const arm of arms) {
      const s = (scores[task] && scores[task][arm]) || [];
      const fs = (fullScores[task] && fullScores[task][arm]) || [];
      if (s.length > 0) {
        cells[task][arm] = mean(s);
        fullCells[task][arm] = mean(fs);
      }
      if (s.length < minRuns) {
        const slot = failedRuns[task] && failedRuns[task][arm];
        // Not run: no scored run, and at least minRuns present runs failed, every one with a recorded reason.
        // One or two reasoned failures are not enough: a transient failure must not exclude a rival.
        const notRunHere = s.length === 0 && slot !== undefined && slot.reasoned >= minRuns && slot.reasoned === slot.total;
        if (notRunHere) notRun[task][arm] = slot.reason;
        else incomplete.push({ task, arm, runs: s.length });
      }
    }
    const ours = (scores[task] && scores[task][OURS]) || [];
    ceiling[task] = ours.length > 0 && ours.every((x) => x === maxOutcome[task]);
  }

  const saturated = tasks.filter(
    (task) => arms.length > 0 && arms.every((arm) => cells[task][arm] !== undefined && cells[task][arm] === maxOutcome[task]),
  );
  const models = unique(runs.map((r) => r.model).filter(Boolean));
  const starts = runs.map((r) => r.started).filter(Boolean).sort();
  const table = {
    arms,
    tasks,
    cells,
    fullCells,
    scores,
    fullScores,
    competitorOf: { ...(expected.competitorOf || {}) },
    notRun,
    incomplete,
    ceiling,
    maxOutcome,
    saturated,
    warnings,
    minRuns,
    model: models.join(",") || "unknown",
    date: starts.length > 0 ? starts[0].slice(0, 10) : "unknown date",
  };
  // Rule A totals cover the core tasks only, keyed by rival: ours, base, and each competitor at its better arm per task.
  const core = tasks.filter((t) => groupOf(t) === "core");
  const totals = { [OURS]: core.reduce((sum, t) => sum + (cells[t][OURS] ?? 0), 0) };
  for (const rival of unique(arms.filter((a) => a !== OURS).map((a) => rivalOf(a, table.competitorOf)))) {
    totals[rival] = core.reduce((sum, t) => sum + (rivalBest(table, t, rival)?.mean ?? 0), 0);
  }
  table.totals = totals;
  return table;
}

// Rule B: on a core task ours is strictly above every rival, each at its better arm. Rule B for home-ground tasks
// also passes when ours scores the maximum outcome count in every run (the ceiling). Rule A: ours core total at least
// 1.2 times the strongest other rival's core total. A rival arm that is "not run" is excluded from rule B and the
// home-ground check, is never a win, and is listed in the returned unrunnable list; the PASS verdict then carries
// "verdict conditional on: ...". A rival with no runs and no reason still fails. The verdict is PASS only when all
// hold and every expected cell has minRuns scored runs. A cell with no scored run (and no "not run") gives FAIL. A cell
// with 1 or 2 runs gives FAIL, or PARTIAL with allowPartial. PARTIAL is never PASS.
export function winRule(table, { allowPartial = false } = {}) {
  const { arms, tasks, cells } = table;
  const minRuns = table.minRuns ?? MIN_RUNS;
  const competitorOf = table.competitorOf || {};
  const incomplete = table.incomplete || [];
  const notRun = table.notRun || {};
  const ceiling = table.ceiling || {};
  const rivals = unique(arms.filter((a) => a !== OURS).map((a) => rivalOf(a, competitorOf)));
  const coreFailures = [];
  const homeFailures = [];
  const unrunnable = [];
  const seenUnrunnable = new Set();
  const noteUnrunnable = (rival, arm, reason) => {
    const key = `${arm}\u0000${reason}`;
    if (seenUnrunnable.has(key)) return;
    seenUnrunnable.add(key);
    unrunnable.push({ rival, arm, reason });
  };
  for (const task of tasks) {
    const group = groupOf(task);
    const bucket = group === "core" ? coreFailures : homeFailures;
    const oursMean = cells[task] ? cells[task][OURS] : undefined;
    if (oursMean === undefined) {
      bucket.push({ task, by: ["no ours runs"] });
      continue;
    }
    const by = [];
    let comparable = 0;
    for (const rival of rivals) {
      const rivalArms = armsOfRival(rival, arms, competitorOf);
      const notRunArms = rivalArms.filter((a) => notRun[task] && notRun[task][a]);
      for (const a of notRunArms) noteUnrunnable(rival, a, notRun[task][a]);
      const best = rivalBest(table, task, rival);
      if (best === null) {
        // Excluded when one of its arms is not run; a rival with no runs and no reason is a failure.
        if (notRunArms.length === 0) by.push(`${rival} (no runs)`);
        continue;
      }
      comparable += 1;
      if (best.mean >= oursMean) by.push(rival);
    }
    if (rivals.length > 0 && comparable === 0 && by.length === 0) by.push("no rival could run");
    // The home-ground ceiling excuses a task only when a rival was compared, so it never passes on an empty comparison.
    const excused = group === "home" && ceiling[task] && comparable > 0;
    if (by.length > 0 && !excused) bucket.push({ task, by });
  }
  const coreCount = tasks.filter((t) => groupOf(t) === "core").length;
  const ruleB = { pass: coreFailures.length === 0 && coreCount > 0, failures: coreFailures };
  const ruleHome = { pass: homeFailures.length === 0, failures: homeFailures };

  const totals = table.totals || {};
  const oursTotal = totals[OURS] ?? 0;
  let bestArm = null;
  let best = 0;
  for (const rival of rivals) {
    const total = totals[rival] ?? 0;
    if (bestArm === null || total > best) {
      bestArm = rival;
      best = total;
    }
  }
  const ratio = bestArm === null || best === 0 ? null : oursTotal / best;
  const ruleA = {
    pass: bestArm !== null && best > 0 && oursTotal >= 1.2 * best - 1e-9,
    ours: oursTotal,
    best,
    bestArm,
    ratio,
  };

  const empty = incomplete.filter((c) => c.runs === 0);
  const partial = incomplete.filter((c) => c.runs > 0);
  const conditional = unrunnable.map((u) => `${u.arm} (not run, ${u.reason})`);
  const reasons = [];
  const text = (failures) => failures.map((f) => `${f.task} (${f.by.join(", ")})`).join("; ");
  if (!ruleB.pass) reasons.push(`rule B failed on ${text(ruleB.failures)}`);
  if (!ruleA.pass) reasons.push(`rule A failed: ours ${oursTotal} against strongest other ${best} (${bestArm})`);
  if (!ruleHome.pass) reasons.push(`home-ground failed on ${text(ruleHome.failures)}`);

  let verdict;
  if (empty.length > 0) {
    verdict = `FAIL: incomplete (${empty.length} cells without a scored run)`;
  } else if (!ruleB.pass || !ruleA.pass || !ruleHome.pass) {
    verdict = `FAIL: ${reasons.join("; ")}`;
  } else if (partial.length > 0) {
    verdict = allowPartial
      ? `PARTIAL: ${partial.length} cells with fewer than ${minRuns} scored runs`
      : `FAIL: incomplete (${partial.length} cells with fewer than ${minRuns} scored runs)`;
  } else {
    verdict = conditional.length > 0 ? `PASS (verdict conditional on: ${conditional.join("; ")})` : "PASS";
  }
  return { ruleA, ruleB, ruleHome, unrunnable, pass: verdict.startsWith("PASS"), verdict };
}

// ---------- rendering ----------

// One table cell: the per-run scores, then mean, min, max and n. "-" for a cell with no scored run.
export function formatCell(values) {
  if (!values || values.length === 0) return "-";
  return `${values.join("/")} mean ${mean(values).toFixed(2)} min ${Math.min(...values)} max ${Math.max(...values)} n ${values.length}`;
}

function cellText(table, which, task, arm) {
  const source = which === "full" ? table.fullScores : table.scores;
  const values = source[task] && source[task][arm];
  if (values && values.length > 0) return formatCell(values);
  const reason = table.notRun[task] && table.notRun[task][arm];
  return reason ? `not run, ${reason}` : "-";
}

function renderTable(table, which, markdown) {
  const header = ["task", ...table.arms];
  const rows = table.tasks.map((task) => [task, ...table.arms.map((arm) => cellText(table, which, task, arm))]);
  const means = which === "full" ? table.fullCells : table.cells;
  const coreTasks = table.tasks.filter((t) => groupOf(t) === "core");
  const armTotal = (arm) => f2(coreTasks.reduce((sum, t) => sum + (means[t][arm] ?? 0), 0));
  rows.push(["total (core tasks)", ...table.arms.map(armTotal)]);
  if (markdown) {
    const line = (cells) => `| ${cells.map((c) => String(c).replace(/\|/g, "\\|")).join(" | ")} |`;
    return [line(header), line(header.map(() => "---")), ...rows.map(line)].join("\n");
  }
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join("  ");
  return [line(header), ...rows.map(line)].join("\n");
}

// ---------- reading the runs directory ----------

// Builds the scored runs from the DONE run directories and the grades directory. Every criterion gets its label.
export function collectRuns(runsDir, gradesDir, tasks, labels = loadCriterionLabels()) {
  const anonymous = readLabels(gradesDir);
  const labelOf = new Map(Object.entries(anonymous).map(([label, runId]) => [runId, label]));
  const runs = [];
  for (const id of listRuns(runsDir, null)) {
    const runDir = join(runsDir, id);
    const meta = JSON.parse(readFileSync(join(runDir, "meta.json"), "utf8"));
    const task = tasks[meta.task];
    if (!task) throw new Error(`no task ${meta.task} in tasks.json`);
    const obj = objective(meta.task, runDir);
    const label = labelOf.get(id);
    let grades = null;
    let gradeWarning = null;
    if (label) {
      const file = join(gradesDir, `${label}.json`);
      if (existsSync(file)) {
        const record = JSON.parse(readFileSync(file, "utf8"));
        grades = record.grades || null;
        if (record.error) gradeWarning = `grader error: ${record.error}`;
      }
    }
    const scored = combineRun(task.criteria, obj, grades);
    const criteria = scored.criteria.map((c) => ({ ...c, label: criterionLabel(labels, meta.task, c.id) }));
    const warnings = [...scored.warnings];
    if (gradeWarning) warnings.push(gradeWarning);
    runs.push({ id, task: meta.task, arm: meta.arm, criteria, warnings, model: meta.model, started: meta.started_at, extra: obj.extra ?? null });
  }
  return runs;
}

// The failed runs (FAILED present, DONE absent) with the reason recorded by run.sh.
export function collectFailed(runsDir) {
  if (!existsSync(runsDir)) return [];
  const failed = [];
  for (const name of readdirSync(runsDir).sort()) {
    const dir = join(runsDir, name);
    if (!statSync(dir).isDirectory() || existsSync(join(dir, "DONE")) || !existsSync(join(dir, "FAILED"))) continue;
    const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
    const line = readFileSync(join(dir, "FAILED"), "utf8").split("\n").find((l) => l.startsWith("reason="));
    // A not-run marker (run.sh) writes "not run: <why>"; the table and the verdict already say "not run, ", so the prefix goes.
    const reason = line ? line.slice("reason=".length).replace(/^not run: /, "") : "";
    failed.push({ task: meta.task, arm: meta.arm, rep: meta.rep, model: meta.model, reason });
  }
  return failed;
}

// The H6 runs whose digit numbers the literal rule does not allow, one line per run. Shown after the tables because
// the H6 c2 row is a count, and the numbers are what a reader needs to judge it.
export function extraNumberLines(runs) {
  return runs
    .filter((r) => r.task === "H6" && Array.isArray(r.extra) && r.extra.length > 0)
    .map((r) => `  H6 c2 extra numbers, ${r.id} (${r.arm}): ${r.extra.join(", ")}`);
}

// The scoped sentence of --markdown. The verdict text is passed in, so a conditional PASS shows its conditions.
export function scopedSentence(table, ruleA, verdict) {
  const coreCount = table.tasks.filter((t) => groupOf(t) === "core").length;
  const homeCount = table.tasks.length - coreCount;
  return `On these ${table.tasks.length} tasks (${coreCount} core, ${homeCount} home-ground), with model ${table.model}, on ${table.date}, ` +
    `product-engineer scored ${f2(ruleA.ours)} outcome points in total on the core tasks against ${f2(ruleA.best)} for the strongest other arm, ${ruleA.bestArm ?? "none"}; ` +
    `the win rule verdict is ${verdict}.`;
}

function main() {
  const args = process.argv.slice(2);
  const usage = "usage: node summarize.mjs [--runs-dir work/runs] [--model <id>] [--min-runs N] [--markdown] [--allow-partial]\n";
  let runsDir = join(defaultWorkDir(), "runs");
  let markdown = false;
  let allowPartial = false;
  let model = null;
  let minRuns = MIN_RUNS;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--markdown") markdown = true;
    else if (args[i] === "--allow-partial") allowPartial = true;
    else if (args[i] === "--runs-dir" && args[i + 1]) {
      runsDir = args[i + 1];
      i += 1;
    } else if (args[i] === "--model" && args[i + 1]) {
      model = args[i + 1];
      i += 1;
    } else if (args[i] === "--min-runs" && /^[1-9]\d*$/.test(args[i + 1] ?? "")) {
      minRuns = Number(args[i + 1]);
      i += 1;
    } else {
      process.stderr.write(usage);
      process.exit(2);
    }
  }
  runsDir = resolve(runsDir);
  const gradesDir = join(dirname(runsDir), "grades");
  const tasks = loadTasks();
  const allRuns = collectRuns(runsDir, gradesDir, tasks);
  // Rounds of different models are never averaged together: without --model a mixed directory is refused.
  const modelsSeen = unique(allRuns.map((r) => r.model).filter(Boolean)).sort();
  if (model === null && modelsSeen.length > 1) {
    process.stderr.write(`summarize.mjs: runs of several models in ${runsDir} (${modelsSeen.join(", ")}); pass --model <id> to summarize one\n`);
    process.exit(2);
  }
  const runs = model === null ? allRuns : allRuns.filter((r) => r.model === model);
  if (runs.length === 0) {
    process.stderr.write(
      model === null ? `summarize.mjs: no DONE runs to summarize in ${runsDir}\n` : `summarize.mjs: no DONE runs for model ${model} in ${runsDir}\n`,
    );
    process.exitCode = 1;
    return;
  }
  const expected = expectedFromFiles();
  expected.failed = collectFailed(runsDir).filter((f) => model === null || f.model === model);
  expected.minRuns = minRuns;
  const table = summarize(runs, expected);
  const rule = winRule(table, { allowPartial });
  const homeCount = table.tasks.filter((t) => groupOf(t) === "home").length;
  const verdict = rule.pass && homeCount === 0 ? "FAIL: no home-ground tasks in tasks.json" : rule.verdict;

  const out = [];
  out.push("gate scope: outcome criteria only (the win rule reads this table)");
  out.push(renderTable(table, "outcome", markdown));
  out.push("");
  out.push("full: every criterion, process included (reported, not gated)");
  out.push(renderTable(table, "full", markdown));
  out.push("");
  const rivals = unique(table.arms.filter((a) => a !== OURS).map((a) => rivalOf(a, table.competitorOf)));
  out.push("rivals, the better arm of each on every task:");
  for (const task of table.tasks) {
    for (const rival of rivals) {
      const best = rivalBest(table, task, rival);
      if (best) {
        out.push(`  ${task} ${rival}: ${best.arm} (mean ${f2(best.mean)})`);
      } else {
        const reason = armsOfRival(rival, table.arms, table.competitorOf).map((a) => table.notRun[task] && table.notRun[task][a]).find(Boolean);
        out.push(`  ${task} ${rival}: ${reason ? `not run, ${reason}` : "no scored runs"}`);
      }
    }
  }
  out.push(`saturated (every arm at the maximum): ${table.saturated.length ? table.saturated.join(", ") : "none"}`);
  for (const line of extraNumberLines(runs)) out.push(line);
  if (table.incomplete.length) {
    out.push("incomplete cells:");
    for (const c of table.incomplete) out.push(`  ${c.task} x ${c.arm}: ${c.runs} of ${table.minRuns} scored runs`);
  }
  if (table.warnings.length) {
    out.push("warnings:");
    for (const w of table.warnings) out.push(`  ${w}`);
  }
  out.push("");
  const { ruleA, ruleB, ruleHome } = rule;
  out.push(`core B: ${ruleB.pass ? "PASS" : `FAIL: ${ruleB.failures.map((f) => `${f.task} (${f.by.join(", ")})`).join("; ")}`}`);
  out.push(
    `core A: ${ruleA.pass ? "PASS" : "FAIL"} (ours ${f2(ruleA.ours)} against strongest other ${f2(ruleA.best)}, ${ruleA.bestArm ?? "none"})`,
  );
  out.push(
    `home: ${homeCount === 0 ? "no home-ground tasks" : ruleHome.pass ? "PASS" : `FAIL: ${ruleHome.failures.map((f) => `${f.task} (${f.by.join(", ")})`).join("; ")}`}`,
  );
  if (markdown) {
    out.push("");
    out.push(scopedSentence(table, ruleA, verdict));
  }
  const listed = rule.unrunnable.map((u) => `${u.arm} (not run, ${u.reason})`);
  out.push(`unrunnable: ${listed.length ? listed.join("; ") : "none"}`);
  out.push(`${verdict} [model ${table.model}, min-runs ${table.minRuns}]`);
  process.stdout.write(`${out.join("\n")}\n`);
  if (!verdict.startsWith("PASS")) process.exitCode = 1;
}

const isMain = Boolean(process.argv[1]) && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
if (isMain) main();
