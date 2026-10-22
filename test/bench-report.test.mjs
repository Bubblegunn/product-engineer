// The head-to-head reporting: labels.json, summarize.mjs (per-run lines, outcome gate, competitor groups, not-run,
// home-ground ceiling), grade.mjs (the saved grader prompt), publish.sh and rerun.sh. Every run here is synthetic:
// a stub replaces claude, and no test touches the network or the committed results directory.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectFailed,
  collectRuns,
  extraNumberLines,
  formatCell,
  rivalBest,
  scopedSentence,
  summarize,
  winRule,
} from "../bench/head-to-head/summarize.mjs";
import { readGradeFile } from "../bench/head-to-head/grade.mjs";
import { ownerEmail, redactOwnerEmail } from "../bench/head-to-head/owner-email.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bench = join(root, "bench", "head-to-head");
const tasks = JSON.parse(readFileSync(join(bench, "tasks.json"), "utf8"));
const labelsFile = join(bench, "labels.json");
const publishSh = join(bench, "publish.sh");
const rerunSh = join(bench, "rerun.sh");
const fetchSh = join(bench, "fetch-arms.sh");
const summarizeMjs = join(bench, "summarize.mjs");
const gradeMjs = join(bench, "grade.mjs");
const mkSh = join(bench, "mk.sh");

const scratch = mkdtempSync(join(tmpdir(), "h2h-report-"));
// rerun.sh here runs runall.sh, which builds a read-only copy of the ours arm (ours.sh) in the scratch directory.
after(() => {
  spawnSync("chmod", ["-R", "u+w", scratch]);
  rmSync(scratch, { recursive: true, force: true });
});
// The CLI runs below only have T1 runs, so they read a tasks file with T1 alone. The real tasks.json lists H1..H7 too.
const T1_TASKS = join(scratch, "tasks-t1.json");
writeFileSync(T1_TASKS, `${JSON.stringify({ T1: tasks.T1 }, null, 2)}\n`);

// Child processes: no GIT_*, no PE_BENCH_*, no NODE_TEST_CONTEXT (it would make a nested node --test misreport).
function childEnv(extra = {}) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("GIT_") || key.startsWith("PE_BENCH_") || key === "NODE_TEST_CONTEXT") delete env[key];
  }
  return { ...env, ...extra };
}

// The label tests skip only when labels.json is absent AND PE_BENCH_NO_LABELS=1. Otherwise a missing file fails.
const labelSkip = !existsSync(labelsFile) && process.env.PE_BENCH_NO_LABELS === "1" ? "PE_BENCH_NO_LABELS=1" : false;

test("labels.json exists (the label tests skip only with PE_BENCH_NO_LABELS=1 and no file)", { skip: labelSkip }, () => {
  assert.equal(existsSync(labelsFile), true, "labels.json is missing");
});

test("every criterion in tasks.json has an outcome or process label with a reason", { skip: labelSkip }, () => {
  const labels = JSON.parse(readFileSync(labelsFile, "utf8"));
  for (const [id, task] of Object.entries(tasks)) {
    for (const c of task.criteria) {
      const key = `${id}.c${c.id}`;
      const entry = labels[key];
      assert.ok(entry, `${key} has no label`);
      assert.ok(entry.label === "outcome" || entry.label === "process", `${key} label is ${entry.label}`);
      assert.equal(typeof entry.reason, "string", key);
      assert.notEqual(entry.reason.trim(), "", `${key} has an empty reason`);
    }
  }
});

test("no T label is orphaned, and every key has the shape T<n>.c<n> or H<n>.c<n>", { skip: labelSkip }, () => {
  const labels = JSON.parse(readFileSync(labelsFile, "utf8"));
  const criteria = new Set();
  for (const [id, task] of Object.entries(tasks)) for (const c of task.criteria) criteria.add(`${id}.c${c.id}`);
  for (const key of Object.keys(labels)) {
    assert.match(key, /^[TH]\d+\.c\d+$/, key);
    // H labels may name tasks that Task 10 adds to tasks.json, so only T labels are checked against it.
    if (key.startsWith("T")) assert.ok(criteria.has(key), `orphan label ${key}`);
  }
});

// ---------- synthetic runs for the table logic ----------

// One run with its criteria labelled. c1 is a process criterion; c2..c5 are outcome criteria, the first
// outcomeCount of them passing.
function labelled(task, arm, outcomeCount, processPass, rep = 1) {
  const criteria = [{ id: 1, kind: "obj", pass: processPass, label: "process" }];
  [2, 3, 4, 5].forEach((id, i) => criteria.push({ id, kind: "llm", pass: i < outcomeCount, label: "outcome" }));
  return { id: `${task}-${arm}-${rep}`, task, arm, criteria, warnings: [] };
}
const threeRuns = (task, arm, outcomeCount, processPass = false) =>
  [1, 2, 3].map((rep) => labelled(task, arm, outcomeCount, processPass, rep));
const TWO = { tasks: ["T1"], arms: ["ours", "base"] };

test("formatCell prints the per-run scores, the mean, the min, the max and n", () => {
  assert.equal(formatCell([2, 3, 3]), "2/3/3 mean 2.67 min 2 max 3 n 3");
  assert.equal(formatCell([]), "-");
});

test("the outcome gate ignores a process-only difference, and the full table shows it", () => {
  const withProcess = summarize([...threeRuns("T1", "ours", 4, false), ...threeRuns("T1", "base", 3, true)], TWO);
  const withoutProcess = summarize([...threeRuns("T1", "ours", 4, true), ...threeRuns("T1", "base", 3, false)], TWO);
  assert.equal(winRule(withProcess).verdict, "PASS");
  assert.equal(winRule(withoutProcess).verdict, "PASS");
  assert.equal(withProcess.cells.T1.ours, 4, "outcome mean ignores c1");
  assert.equal(withProcess.fullCells.T1.ours, 4, "full mean without c1");
  assert.equal(withProcess.fullCells.T1.base, 4, "full mean with c1, a tie that the gate does not read");
});

test("a competitor counts with its better arm on each task, so a tie with that arm fails rule B", () => {
  const arms = ["ours", "dod", "dod-invoked"];
  const expected = { tasks: ["T1"], arms, competitorOf: { dod: "dod", "dod-invoked": "dod" } };
  const runs = [...threeRuns("T1", "ours", 4), ...threeRuns("T1", "dod", 3), ...threeRuns("T1", "dod-invoked", 4)];
  const table = summarize(runs, expected);
  assert.equal(rivalBest(table, "T1", "dod").arm, "dod-invoked");
  const rule = winRule(table);
  assert.deepEqual(rule.ruleB.failures, [{ task: "T1", by: ["dod"] }]);
  assert.equal(rule.pass, false);
});

test("the better of two competitor arms is the one with the higher mean", () => {
  const expected = { tasks: ["T1"], arms: ["ours", "dod", "dod-invoked"], competitorOf: { dod: "dod", "dod-invoked": "dod" } };
  const table = summarize([...threeRuns("T1", "ours", 4), ...threeRuns("T1", "dod", 2), ...threeRuns("T1", "dod-invoked", 3)], expected);
  assert.equal(rivalBest(table, "T1", "dod").arm, "dod-invoked");
  assert.equal(winRule(table).ruleB.pass, true);
});

test("a competitor whose every present run failed with a reason is not run: excluded, never a win, verdict conditional", () => {
  const failed = [1, 2, 3].map((rep) => ({ task: "T1", arm: "dod", rep, reason: "plugin did not load" }));
  const table = summarize([...threeRuns("T1", "ours", 4), ...threeRuns("T1", "base", 3)], {
    tasks: ["T1"],
    arms: ["ours", "base", "dod"],
    competitorOf: { dod: "dod" },
    failed,
  });
  assert.equal(table.notRun.T1.dod, "plugin did not load");
  assert.equal(table.incomplete.some((c) => c.arm === "dod"), false, "not run is not an incomplete cell");
  const rule = winRule(table);
  assert.deepEqual(rule.ruleB.failures, [], "a not-run rival does not fail rule B");
  assert.deepEqual(rule.unrunnable, [{ rival: "dod", arm: "dod", reason: "plugin did not load" }]);
  assert.equal(rule.pass, true);
  assert.equal(rule.verdict, "PASS (verdict conditional on: dod (not run, plugin did not load))");
});

test("a not-run marker from run.sh: the reason has no doubled prefix and the verdict says conditional on the not-run arm", () => {
  const work = newWork();
  const runsDir = join(work, "runs");
  for (const rep of [1, 2, 3]) {
    const dir = join(runsDir, `T1-dod-${rep}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "meta.json"), `${JSON.stringify({ task: "T1", arm: "dod", rep, model: "claude-sonnet-5-5", outcome: "not-run" }, null, 2)}\n`);
    writeFileSync(join(dir, "FAILED"), "exit_status=0\nreason=not run: needs bash >= 4 and GNU find (this machine has bash 3.2 and BSD find); install bash and findutils to run it\n");
  }
  const failed = collectFailed(runsDir);
  assert.equal(failed.length, 3);
  assert.equal(failed[0].reason, "needs bash >= 4 and GNU find (this machine has bash 3.2 and BSD find); install bash and findutils to run it");
  const table = summarize([...threeRuns("T1", "ours", 4), ...threeRuns("T1", "base", 3)], {
    tasks: ["T1"],
    arms: ["ours", "base", "dod"],
    competitorOf: { dod: "dod" },
    failed,
  });
  const rule = winRule(table);
  assert.equal(rule.pass, true);
  assert.match(rule.verdict, /^PASS \(verdict conditional on: dod \(not run, needs bash >= 4 and GNU find /);
  assert.doesNotMatch(rule.verdict, /not run, not run/);
});

test("a not-run competitor cannot be a win for ours, and the home-ground check skips it too", () => {
  // ours (4) ties base (4) on T1, so base still blocks; dod is not run and must not add a failure of its own.
  const failed = [1, 2, 3].map((rep) => ({ task: "T1", arm: "dod", rep, reason: "no login" }));
  const table = summarize([...threeRuns("T1", "ours", 4), ...threeRuns("T1", "base", 4)], {
    tasks: ["T1"],
    arms: ["ours", "base", "dod"],
    competitorOf: { dod: "dod" },
    failed,
  });
  const rule = winRule(table);
  assert.deepEqual(rule.ruleB.failures, [{ task: "T1", by: ["base"] }]);
  assert.equal(rule.pass, false);
});

test("one arm of a rival runnable and one not run: the runnable arm is compared, the not-run arm is named", () => {
  const failed = [1, 2, 3].map((rep) => ({ task: "T1", arm: "dod-invoked", rep, reason: "invoked plugin crashed" }));
  const expected = {
    tasks: ["T1"],
    arms: ["ours", "dod", "dod-invoked"],
    competitorOf: { dod: "dod", "dod-invoked": "dod" },
    failed,
  };
  const table = summarize([...threeRuns("T1", "ours", 4), ...threeRuns("T1", "dod", 2)], expected);
  assert.equal(rivalBest(table, "T1", "dod").arm, "dod", "the runnable arm is the rival's best");
  const rule = winRule(table);
  assert.equal(rule.ruleB.pass, true);
  assert.deepEqual(rule.unrunnable, [{ rival: "dod", arm: "dod-invoked", reason: "invoked plugin crashed" }]);
  assert.equal(rule.verdict, "PASS (verdict conditional on: dod-invoked (not run, invoked plugin crashed))");
  // A tie with the runnable arm still fails: the not-run arm does not lift the rival out of the comparison.
  const tie = summarize([...threeRuns("T1", "ours", 2), ...threeRuns("T1", "dod", 2)], expected);
  assert.equal(winRule(tie).ruleB.pass, false);
});

test("a competitor with missing runs and no recorded reason is incomplete, which still fails", () => {
  const failed = [{ task: "T1", arm: "dod", rep: 1, reason: "" }];
  const table = summarize([...threeRuns("T1", "ours", 4), ...threeRuns("T1", "base", 3)], {
    tasks: ["T1"],
    arms: ["ours", "base", "dod"],
    competitorOf: { dod: "dod" },
    failed,
  });
  assert.deepEqual(table.incomplete.filter((c) => c.arm === "dod"), [{ task: "T1", arm: "dod", runs: 0 }]);
  assert.equal(table.notRun.T1 && table.notRun.T1.dod, undefined);
  assert.match(winRule(table).verdict, /^FAIL: incomplete/);
});

test("a competitor with one run failed without a reason, and two with reasons, is not run: it stays incomplete", () => {
  const failed = [
    { task: "T1", arm: "dod", rep: 1, reason: "crash" },
    { task: "T1", arm: "dod", rep: 2, reason: "crash" },
    { task: "T1", arm: "dod", rep: 3, reason: "" },
  ];
  const table = summarize([...threeRuns("T1", "ours", 4), ...threeRuns("T1", "base", 3)], {
    tasks: ["T1"],
    arms: ["ours", "base", "dod"],
    competitorOf: { dod: "dod" },
    failed,
  });
  assert.equal(table.notRun.T1 && table.notRun.T1.dod, undefined);
  assert.match(winRule(table).verdict, /^FAIL: incomplete/);
});

test("one or two reasoned failures are not enough for not run: the rival stays incomplete and FAILs", () => {
  for (const reasoned of [1, 2]) {
    const failed = [];
    for (let rep = 1; rep <= reasoned; rep += 1) failed.push({ task: "T1", arm: "dod", rep, reason: "rate limited" });
    const table = summarize([...threeRuns("T1", "ours", 4), ...threeRuns("T1", "base", 3)], {
      tasks: ["T1"],
      arms: ["ours", "base", "dod"],
      competitorOf: { dod: "dod" },
      failed,
    });
    assert.equal(table.notRun.T1 && table.notRun.T1.dod, undefined, `${reasoned} reasoned failure(s) is not not-run`);
    assert.deepEqual(table.incomplete.filter((c) => c.arm === "dod"), [{ task: "T1", arm: "dod", runs: 0 }]);
    const rule = winRule(table);
    assert.equal(rule.pass, false);
    assert.match(rule.verdict, /^FAIL: incomplete/);
  }
});

test("a home-ground task at the ceiling passes only with at least one comparable rival", () => {
  // Ours scores the maximum (4) in every run; the only rival, base, was not run. Nothing is comparable.
  const failed = [1, 2, 3].map((rep) => ({ task: "H1", arm: "base", rep, reason: "no base run" }));
  const table = summarize([...threeRuns("H1", "ours", 4)], { tasks: ["H1"], arms: ["ours", "base"], failed });
  assert.equal(table.ceiling.H1, true);
  const rule = winRule(table);
  assert.equal(rule.ruleHome.pass, false, "the ceiling does not excuse a task with no comparable rival");
  assert.deepEqual(rule.ruleHome.failures, [{ task: "H1", by: ["no rival could run"] }]);
});

test("the unrunnable line is printed on a FAIL verdict too, and names none when nothing is excluded", () => {
  const work = newWork();
  for (const rep of [1, 2, 3]) makeRun(work, "T1", "ours", rep);
  makeRun(work, "T1", "base", 1, { failed: "no base run" });
  makeRun(work, "T1", "base", 2, { failed: "no base run" });
  makeRun(work, "T1", "base", 3, { failed: "no base run" });
  writeGrades(work, [1, 2, 3].map((rep) => ({ runId: `T1-ours-${rep}`, grades: grade({ 2: true, 3: true, 4: true, 5: true }) })));
  const r = spawnSync("node", [summarizeMjs, "--runs-dir", join(work, "runs")], { encoding: "utf8", env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_TASKS: T1_TASKS, ...fakeRealEnv() }) });
  assert.match(r.stdout, /^unrunnable: base \(not run, no base run\)$/m);
  assert.match(r.stdout.trim().split("\n").at(-1), /^FAIL/);
});

test("when every rival is not run on a task, the verdict is FAIL", () => {
  const failed = [1, 2, 3].map((rep) => ({ task: "T1", arm: "base", rep, reason: "no base run" }));
  const table = summarize([...threeRuns("T1", "ours", 4)], { tasks: ["T1"], arms: ["ours", "base"], failed });
  const rule = winRule(table);
  assert.deepEqual(rule.ruleB.failures, [{ task: "T1", by: ["no rival could run"] }]);
  assert.equal(rule.ruleA.pass, false);
  assert.match(rule.verdict, /^FAIL/);
  assert.equal(rule.pass, false);
});

test("a home-ground tie below the ceiling fails, and a tie at the ceiling passes", () => {
  // The maximum outcome count of this task is 4 (c2..c5), so 3 is below the ceiling and 4 is at it.
  const below = summarize([...threeRuns("H1", "ours", 3), ...threeRuns("H1", "base", 3)], { tasks: ["H1"], arms: ["ours", "base"] });
  assert.equal(below.maxOutcome.H1, 4);
  assert.equal(below.ceiling.H1, false);
  assert.equal(winRule(below).ruleHome.pass, false, "a tie below the ceiling fails");

  const atCeiling = summarize([...threeRuns("H1", "ours", 4), ...threeRuns("H1", "base", 4)], { tasks: ["H1"], arms: ["ours", "base"] });
  assert.equal(atCeiling.ceiling.H1, true);
  assert.equal(winRule(atCeiling).ruleHome.pass, true, "ours at the maximum in every run passes");
});

test("rule A never passes on a zero rival total, so an empty rival cannot make ours look strong", () => {
  const table = { arms: ["ours", "base"], tasks: ["T1"], cells: { T1: { ours: 5, base: undefined } }, totals: { ours: 5, base: 0 } };
  const rule = winRule(table);
  assert.equal(rule.ruleA.pass, false);
  assert.equal(rule.ruleA.best, 0);
});

test("a task whose id is neither T nor H is refused, not silently graded", () => {
  assert.throws(() => summarize([labelled("X1", "ours", 4)], { tasks: ["X1"], arms: ["ours"] }), /neither core/);
});

// ---------- files on disk ----------

let counter = 0;
const newWork = () => join(scratch, `work-${(counter += 1)}`);

// A run directory the way run.sh leaves it: runs/<task>-<arm>-<rep>/ with repo, meta.json and DONE, or FAILED.
function makeRun(work, task, arm, rep, { failed = null, model = "sonnet" } = {}) {
  const runDir = join(work, "runs", `${task}-${arm}-${rep}`);
  mkdirSync(runDir, { recursive: true });
  const meta = { task, arm, rep, model, started_at: "2026-10-21T10:00:00Z" };
  if (failed) {
    writeFileSync(join(runDir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
    writeFileSync(join(runDir, "FAILED"), `exit_status=1\nreason=${failed}\n`);
    return runDir;
  }
  const r = spawnSync("bash", [mkSh, join(runDir, "repo"), tasks[task].variant], { encoding: "utf8", env: childEnv() });
  assert.equal(r.status, 0, r.stderr);
  writeFileSync(join(runDir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
  writeFileSync(join(runDir, "out.jsonl"), "");
  writeFileSync(join(runDir, "DONE"), "");
  return runDir;
}

// The grades directory with anonymous labels: one {label}.json per run, and labels.json from label to run id.
function writeGrades(work, entries) {
  const gradesDir = join(work, "grades");
  mkdirSync(gradesDir, { recursive: true });
  const labels = {};
  entries.forEach(({ runId, grades }, i) => {
    const label = `g${String(i + 1).padStart(6, "0")}`;
    labels[label] = runId;
    writeFileSync(join(gradesDir, `${label}.json`), `${JSON.stringify({ label, ids: Object.keys(grades), grades }, null, 2)}\n`);
    writeFileSync(join(gradesDir, `${label}.prompt.txt`), "prompt for the test\n");
  });
  writeFileSync(join(gradesDir, "labels.json"), `${JSON.stringify(labels, null, 2)}\n`);
  return gradesDir;
}

const grade = (passes) => Object.fromEntries(Object.entries(passes).map(([id, pass]) => [id, { pass, why: "test" }]));

test("collectRuns labels every criterion from labels.json and refuses a criterion with no label", () => {
  const work = newWork();
  makeRun(work, "T1", "ours", 1);
  const gradesDir = writeGrades(work, [{ runId: "T1-ours-1", grades: grade({ 2: true, 3: true, 4: true, 5: false }) }]);
  const runs = collectRuns(join(work, "runs"), gradesDir, tasks);
  assert.deepEqual(runs[0].criteria.map((c) => c.label), ["outcome", "outcome", "outcome", "outcome", "outcome"]);
  const t2 = newWork();
  makeRun(t2, "T2", "ours", 1);
  const gradesT2 = writeGrades(t2, [{ runId: "T2-ours-1", grades: grade({ 2: true, 3: true, 4: true, 5: true }) }]);
  assert.equal(collectRuns(join(t2, "runs"), gradesT2, tasks)[0].criteria[0].label, "process", "T2 c1 is process");
  assert.throws(() => collectRuns(join(work, "runs"), gradesDir, tasks, {}), /no outcome or process label for T1\.c1/);
});

test("summarize.mjs prints per-run lines, both tables, rivals and the verdict, and exits 1 on a failing verdict", () => {
  const work = newWork();
  const ids = [];
  for (const rep of [1, 2, 3]) {
    makeRun(work, "T1", "ours", rep);
    ids.push({ runId: `T1-ours-${rep}`, grades: grade({ 2: true, 3: true, 4: true, 5: rep === 1 }) });
  }
  makeRun(work, "T1", "base", 1, { failed: "no base run" });
  makeRun(work, "T1", "base", 2, { failed: "no base run" });
  makeRun(work, "T1", "base", 3, { failed: "no base run" });
  const gradesDir = writeGrades(work, ids);
  const r = spawnSync("node", [summarizeMjs, "--runs-dir", join(work, "runs")], { encoding: "utf8", env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_TASKS: T1_TASKS }) });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^gate scope: outcome criteria only/m);
  assert.match(r.stdout, /^full: every criterion/m);
  assert.match(r.stdout, /^T1\s+\d\/\d\/\d mean \d\.\d\d min \d max \d n 3/m, "per-run line with mean, min, max and n");
  assert.match(r.stdout, /task\s+ours/);
  assert.match(r.stdout, /^  T1 base: not run, no base run$/m);
  assert.match(r.stdout, /^core B: FAIL: T1 \(dod \(no runs\), /m, "the rival with no runs and no reason still fails");
  assert.doesNotMatch(r.stdout.split("\n").find((l) => l.startsWith("core B:")), /base/, "the not-run base is excluded");
  assert.match(r.stdout, /^core A: /m);
  assert.match(r.stdout, /^home: no home-ground tasks$/m);
  assert.match(r.stdout.trim().split("\n").at(-1), /^FAIL/);
  assert.ok(existsSync(gradesDir));
});

test("summarize.mjs --markdown adds the scoped sentence with the model and the date", () => {
  const work = newWork();
  for (const rep of [1, 2, 3]) makeRun(work, "T1", "ours", rep, { model: "sonnet" });
  writeGrades(work, [1, 2, 3].map((rep) => ({ runId: `T1-ours-${rep}`, grades: grade({ 2: true, 3: true, 4: true, 5: true }) })));
  const r = spawnSync("node", [summarizeMjs, "--runs-dir", join(work, "runs"), "--markdown"], { encoding: "utf8", env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_TASKS: T1_TASKS }) });
  assert.match(r.stdout, /\| task \| ours \|/);
  assert.match(r.stdout, /^On these \d+ tasks \(\d+ core, 0 home-ground\), with model sonnet, on 2026-10-21, /m);
  assert.doesNotMatch(r.stdout, /\bbest\b|beats every/i);
});

test("the --markdown sentence and the verdict name the not-run competitor when the PASS is conditional", () => {
  const failed = [1, 2, 3].map((rep) => ({ task: "T1", arm: "dod", rep, reason: "plugin did not load" }));
  const table = summarize([...threeRuns("T1", "ours", 4), ...threeRuns("T1", "base", 3)], {
    tasks: ["T1"],
    arms: ["ours", "base", "dod"],
    competitorOf: { dod: "dod" },
    failed,
  });
  const rule = winRule(table);
  const sentence = scopedSentence(table, rule.ruleA, rule.verdict);
  assert.match(sentence, /the win rule verdict is PASS \(verdict conditional on: dod \(not run, plugin did not load\)\)\.$/);
  assert.match(sentence, /^On these 1 tasks \(1 core, 0 home-ground\)/);
});

test("grade.mjs saves the exact grader prompt next to each grade", () => {
  const work = newWork();
  for (const rep of [1, 2, 3]) makeRun(work, "T1", "ours", rep);
  const stub = join(scratch, "grader-stub.sh");
  writeFileSync(
    stub,
    [
      "#!/bin/sh",
      "cat > /dev/null",
      `printf '%s' '{"2":{"pass":true,"why":"ok"},"3":{"pass":true,"why":"ok"},"4":{"pass":true,"why":"ok"},"5":{"pass":false,"why":"no"}}'`,
      "",
    ].join("\n"),
  );
  chmodSync(stub, 0o755);
  const r = spawnSync("node", [gradeMjs, "--runs-dir", join(work, "runs")], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_CLAUDE: stub, PE_BENCH_ARMS_DIR: join(scratch, "no-arms"), ...fakeRealEnv() }),
  });
  assert.equal(r.status, 0, r.stderr);
  const gradesDir = join(work, "grades");
  const labels = Object.keys(JSON.parse(readFileSync(join(gradesDir, "labels.json"), "utf8")));
  assert.equal(labels.length, 3);
  for (const label of labels) {
    const prompt = readFileSync(join(gradesDir, `${label}.prompt.txt`), "utf8");
    assert.match(prompt, /Reply with one JSON object/);
    assert.match(prompt, /--- material \(stdin\) ---/);
  }
});

// ---------- isolation of the grader ----------

// A fake real home for the grader tests. The real one is never named.
const fakeRealDir = join(scratch, "grade-real-home");
mkdirSync(join(fakeRealDir, ".claude"), { recursive: true });
writeFileSync(join(fakeRealDir, ".claude.json"), `${JSON.stringify({ oauthAccount: { emailAddress: "real.owner@example.org" }, userID: "u", mcpServers: {} })}\n`);
writeFileSync(join(fakeRealDir, ".claude", "settings.json"), '{"hooks":{}}\n');
function fakeRealEnv() {
  return {
    REAL_HOME: fakeRealDir,
    PE_BENCH_REAL_SETTINGS: join(fakeRealDir, ".claude", "settings.json"),
    PE_BENCH_REAL_CLAUDE_JSON: join(fakeRealDir, ".claude.json"),
  };
}
const GOOD_GRADE = '{"2":{"pass":true,"why":"ok"},"3":{"pass":true,"why":"ok"},"4":{"pass":true,"why":"ok"},"5":{"pass":false,"why":"no"}}';

test("grade.mjs calls the grader with HOME set to the work home and --settings naming the work settings file", () => {
  const work = newWork();
  for (const rep of [1, 2, 3]) makeRun(work, "T1", "ours", rep);
  const record = join(scratch, "grader-record.txt");
  const stubRec = join(scratch, "grader-stub-rec.sh");
  writeFileSync(
    stubRec,
    ["#!/bin/sh", "cat > /dev/null", `{ printf 'home=%s\\n' "$HOME"; for a in "$@"; do printf 'arg=%s\\n' "$a"; done; } >> '${record}'`, `printf '%s' '${GOOD_GRADE}'`, ""].join("\n"),
  );
  chmodSync(stubRec, 0o755);
  const r = spawnSync("node", [gradeMjs, "--runs-dir", join(work, "runs")], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_CLAUDE: stubRec, PE_BENCH_ARMS_DIR: join(scratch, "no-arms"), ...fakeRealEnv() }),
  });
  assert.equal(r.status, 0, r.stderr);
  const lines = readFileSync(record, "utf8").split("\n");
  const homeLine = lines.find((l) => l.startsWith("home="));
  const realWork = work; // grade.mjs keeps the path it was given
  assert.equal(homeLine, `home=${join(realWork, "home")}`);
  assert.notEqual(homeLine, `home=${fakeRealDir}`);
  const i = lines.indexOf(`arg=--settings`);
  assert.ok(i >= 0, "--settings is passed");
  assert.equal(lines[i + 1], `arg=${join(realWork, "settings.json")}`);
  assert.equal(existsSync(join(realWork, "home", ".claude.json")), true);
});

test("the grader does not see CLAUDE_CONFIG_DIR or XDG_CONFIG_HOME from the owner's shell", () => {
  const work = newWork();
  for (const rep of [1, 2, 3]) makeRun(work, "T1", "ours", rep);
  const record = join(scratch, "grader-config-rec.txt");
  const stubCfg = join(scratch, "grader-config-stub.sh");
  writeFileSync(
    stubCfg,
    ["#!/bin/sh", "cat > /dev/null", `printf '%s|%s\\n' "\${CLAUDE_CONFIG_DIR-__UNSET__}" "\${XDG_CONFIG_HOME-__UNSET__}" >> '${record}'`, `printf '%s' '${GOOD_GRADE}'`, ""].join("\n"),
  );
  chmodSync(stubCfg, 0o755);
  const r = spawnSync("node", [gradeMjs, "--runs-dir", join(work, "runs")], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_CLAUDE: stubCfg, PE_BENCH_ARMS_DIR: join(scratch, "no-arms"), ...fakeRealEnv(), CLAUDE_CONFIG_DIR: "/owner/config", XDG_CONFIG_HOME: "/owner/xdg" }),
  });
  assert.equal(r.status, 0, r.stderr);
  const lines = readFileSync(record, "utf8").trim().split("\n");
  assert.ok(lines.length >= 1);
  for (const line of lines) assert.equal(line, "__UNSET__|__UNSET__");
});

test("a settings change during grading stops grade.mjs with exit 3 and writes no grade", () => {
  const work = newWork();
  for (const rep of [1, 2, 3]) makeRun(work, "T1", "ours", rep);
  const stubMut = join(scratch, "grader-mutate.sh");
  writeFileSync(
    stubMut,
    ["#!/bin/sh", "cat > /dev/null", `printf '{"hooks":{"Stop":[{"changed":true}]}}' > '${fakeRealDir}/.claude/settings.json'`, `printf '%s' '${GOOD_GRADE}'`, ""].join("\n"),
  );
  chmodSync(stubMut, 0o755);
  const r = spawnSync("node", [gradeMjs, "--runs-dir", join(work, "runs")], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_CLAUDE: stubMut, PE_BENCH_ARMS_DIR: join(scratch, "no-arms"), ...fakeRealEnv() }),
  });
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stderr, /hooks/);
  const gradesDir = join(work, "grades");
  const graded = existsSync(gradesDir) ? readdirSync(gradesDir).filter((f) => /^g[0-9a-f]+\.json$/.test(f)) : [];
  assert.deepEqual(graded, [], "a grade made after the change is not written");
});

// ---------- publish and rerun ----------

// A small finished work directory: one T1 run and one T3 run whose repo has the PR.md the task names.
function publishableWork() {
  const work = newWork();
  for (const rep of [1, 2, 3]) makeRun(work, "T1", "ours", rep);
  const t3 = makeRun(work, "T3", "ours", 1);
  writeFileSync(join(t3, "repo", "PR.md"), "# Export change\n");
  const entries = [1, 2, 3].map((rep) => ({ runId: `T1-ours-${rep}`, grades: grade({ 2: true, 3: true, 4: true, 5: true }) }));
  entries.push({ runId: "T3-ours-1", grades: grade({ 2: true, 3: true, 4: true, 5: true }) });
  writeGrades(work, entries);
  return work;
}

test("publish.sh copies runs, grades, the three bench files and SUMMARY.md, and skips the run repositories", () => {
  const work = publishableWork();
  const results = join(scratch, "results-ok");
  const r = spawnSync("bash", [publishSh, "round-test"], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_RESULTS_DIR: results }),
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const out = join(results, "round-test");
  for (const file of ["tasks.json", "arms.json", "labels.json", "SUMMARY.md", "grades/labels.json", "grades/g000001.json", "grades/g000001.prompt.txt"]) {
    assert.equal(existsSync(join(out, file)), true, file);
  }
  for (const file of ["out.jsonl", "meta.json", "final-state.txt"]) {
    assert.equal(existsSync(join(out, "runs", "T1-ours-1", file)), true, file);
  }
  assert.match(readFileSync(join(out, "runs", "T1-ours-1", "final-state.txt"), "utf8"), /^commit [0-9a-f]{40}/m);
  assert.equal(existsSync(join(out, "runs", "T3-ours-1", "PR.md")), true, "the output file the task names");
  const dirs = readdirSync(join(out, "runs", "T1-ours-1"));
  assert.equal(dirs.includes("repo"), false, "no run repository");
  assert.match(readFileSync(join(out, "SUMMARY.md"), "utf8"), /\| task \|/);
});

test("publish.sh copies stderr.log beside out.jsonl, scrubbed like the other files", () => {
  const work = publishableWork();
  writeFileSync(join(work, "runs", "T1-ours-1", "stderr.log"), "warning while reading /Users/someone/project\n");
  const results = join(scratch, "results-stderr");
  const r = spawnSync("bash", [publishSh, "round-stderr"], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_RESULTS_DIR: results }),
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const text = readFileSync(join(results, "round-stderr", "runs", "T1-ours-1", "stderr.log"), "utf8");
  assert.match(text, /warning while reading <home>\/project/);
  assert.doesNotMatch(text, /someone/);
});

test("publish.sh refuses an existing name and a name with a path separator", () => {
  const work = publishableWork();
  const results = join(scratch, "results-refuse");
  const env = childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_RESULTS_DIR: results });
  assert.equal(spawnSync("bash", [publishSh, "round-once"], { encoding: "utf8", env }).status, 0);
  const again = spawnSync("bash", [publishSh, "round-once"], { encoding: "utf8", env });
  assert.notEqual(again.status, 0);
  assert.match(again.stderr, /already exists/);
  const bad = spawnSync("bash", [publishSh, "../escape"], { encoding: "utf8", env });
  assert.notEqual(bad.status, 0);
  assert.equal(existsSync(join(scratch, "escape")), false);
});

test("publish.sh refuses to publish a transcript that holds a Gmail address", () => {
  const work = publishableWork();
  writeFileSync(join(work, "runs", "T1-ours-1", "out.jsonl"), "contact: someone@gmail.com\n");
  const results = join(scratch, "results-gmail");
  const r = spawnSync("bash", [publishSh, "round-gmail"], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_RESULTS_DIR: results }),
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /gmail/i, "the refusal names the cause");
  assert.equal(existsSync(join(results, "round-gmail")), false, "nothing is left behind");
});

// The login name of the machine running the tests, the same value publish.sh reads from id -un.
const LOGIN = spawnSync("id", ["-un"], { encoding: "utf8" }).stdout.trim();

test("publish.sh rewrites a planted /Users/<name> and /home/<name> path in meta.json and out.jsonl to <home>", () => {
  const work = publishableWork();
  const metaPath = join(work, "runs", "T1-ours-1", "meta.json");
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  meta.plugin_dir = "/Users/someone/x";
  writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
  writeFileSync(join(work, "runs", "T1-ours-1", "out.jsonl"), '{"cwd":"/Users/someone/x/repo"}\n{"cwd":"/home/ci/y"}\n');
  const results = join(scratch, "results-scrub");
  const r = spawnSync("bash", [publishSh, "round-scrub"], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_RESULTS_DIR: results }),
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const out = join(results, "round-scrub", "runs", "T1-ours-1");
  const published = JSON.parse(readFileSync(join(out, "meta.json"), "utf8"));
  assert.equal(published.plugin_dir, "<home>/x", "meta.json path is rewritten");
  const transcript = readFileSync(join(out, "out.jsonl"), "utf8");
  assert.match(transcript, /"cwd":"<home>\/x\/repo"/);
  assert.match(transcript, /"cwd":"<home>\/y"/);
  assert.doesNotMatch(transcript, /\/Users\/|\/home\//);
});

test("publish.sh rewrites the login name as a whole word to <user>", () => {
  const work = publishableWork();
  writeFileSync(join(work, "runs", "T1-ours-1", "out.jsonl"), `{"who":"${LOGIN}","file":"${LOGIN}-notes.txt","mail":"dev@example.com"}\n`);
  const results = join(scratch, "results-user");
  const r = spawnSync("bash", [publishSh, "round-user"], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_RESULTS_DIR: results }),
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const transcript = readFileSync(join(results, "round-user", "runs", "T1-ours-1", "out.jsonl"), "utf8");
  assert.match(transcript, /"who":"<user>"/);
  assert.match(transcript, /"file":"<user>-notes\.txt"/, "a whole word before a dash is still the login");
  assert.doesNotMatch(transcript, new RegExp(`(^|[^A-Za-z0-9_])${LOGIN}([^A-Za-z0-9_]|$)`));
  assert.match(transcript, /dev@example\.com/, "other email addresses are kept");
});

test("publish.sh refuses a Gmail or googlemail address in any letter case, and leaves nothing behind", () => {
  for (const [name, line] of [
    ["gmail-upper", "contact: Someone@GMAIL.com\n"],
    ["gmail-mixed", "contact: someone@Gmail.Com\n"],
    ["googlemail", "contact: someone@GoogleMail.com\n"],
  ]) {
    const work = publishableWork();
    writeFileSync(join(work, "runs", "T1-ours-1", "out.jsonl"), line);
    const results = join(scratch, `results-${name}`);
    const r = spawnSync("bash", [publishSh, `round-${name}`], {
      encoding: "utf8",
      env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_RESULTS_DIR: results }),
    });
    assert.notEqual(r.status, 0, name);
    assert.match(r.stderr, /gmail/i, name);
    assert.equal(existsSync(join(results, `round-${name}`)), false, `${name}: nothing is left behind`);
  }
});

test("publish.sh scrubs a home path whose name holds a space, to the end of the path", () => {
  const work = publishableWork();
  writeFileSync(join(work, "runs", "T1-ours-1", "out.jsonl"), '{"cwd":"/Users/Efe Genc/projects/x"}\n');
  const results = join(scratch, "results-spaced");
  const r = spawnSync("bash", [publishSh, "round-spaced"], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_RESULTS_DIR: results }),
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const transcript = readFileSync(join(results, "round-spaced", "runs", "T1-ours-1", "out.jsonl"), "utf8");
  assert.match(transcript, /"cwd":"<home>\/projects\/x"/);
  assert.doesNotMatch(transcript, /Genc|Efe/);
});

test("publish.sh never copies the temporary home or the work settings file", () => {
  const work = publishableWork();
  mkdirSync(join(work, "home"), { recursive: true });
  writeFileSync(join(work, "home", ".claude.json"), '{"oauthAccount":{"emailAddress":"owner.fixture@example.org"}}\n');
  writeFileSync(join(work, "settings.json"), '{"hooks":{}}\n');
  const results = join(scratch, "results-nohome");
  const r = spawnSync("bash", [publishSh, "round-nohome"], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_RESULTS_DIR: results }),
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const out = join(results, "round-nohome");
  assert.equal(existsSync(join(out, "home")), false);
  assert.equal(existsSync(join(out, "settings.json")), false);
  const leaked = spawnSync("grep", ["-rl", "owner.fixture@example.org", out], { encoding: "utf8" }).stdout;
  assert.equal(leaked, "", "the owner account email is in no published file");
});

test("publish.sh refuses when a /Users/ path survives the scrub, and leaves nothing behind", () => {
  const work = publishableWork();
  writeFileSync(join(work, "runs", "T1-ours-1", "out.jsonl"), "the folder was /Users/ and then a space\n");
  const results = join(scratch, "results-residual");
  const r = spawnSync("bash", [publishSh, "round-residual"], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_RESULTS_DIR: results }),
  });
  assert.notEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stderr, /\/Users\/|\/home\//);
  assert.equal(existsSync(join(results, "round-residual")), false);
});

test("rerun.sh --dry-run lists the four steps with the model, reps and name, and runs nothing", () => {
  const work = join(scratch, "rerun-dry");
  const r = spawnSync("bash", [rerunSh, "--dry-run", "--model", "opus", "--reps", "2", "--name", "round-x"], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_WORK_DIR: work }),
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /fetch-arms\.sh/);
  assert.match(r.stdout, /runall\.sh --reps 2/);
  assert.match(r.stdout, /grade\.mjs/);
  assert.match(r.stdout, /publish\.sh round-x/);
  assert.match(r.stdout, /PE_BENCH_MODEL=opus/);
  assert.equal(existsSync(work), false, "a dry run creates no work directory");
});

test("rerun.sh picks a model work directory for a model other than the default, and the default keeps the plain work directory", () => {
  const tmp = join(scratch, "tmp-model");
  mkdirSync(tmp, { recursive: true });
  const env = childEnv({ TMPDIR: tmp });
  delete env.PE_BENCH_WORK_DIR;
  const opus = spawnSync("bash", [rerunSh, "--dry-run", "--model", "opus"], { encoding: "utf8", env });
  assert.match(opus.stdout, new RegExp(`${tmp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/pe-bench/work-opus`));
  const sonnet = spawnSync("bash", [rerunSh, "--dry-run"], { encoding: "utf8", env });
  assert.match(sonnet.stdout, new RegExp(`${tmp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/pe-bench/work\\b`));
  assert.doesNotMatch(sonnet.stdout, /work-claude-sonnet-5-5/);
});

test("rerun.sh with --reps 1 passes --min-runs 1 to the summary, and the default passes 3", () => {
  const work = newWork();
  const one = spawnSync("bash", [rerunSh, "--dry-run", "--reps", "1"], { encoding: "utf8", env: childEnv({ PE_BENCH_WORK_DIR: work }) });
  assert.equal(one.status, 0, one.stderr);
  assert.match(one.stdout, /publish\.sh round-1 --min-runs 1/);
  const three = spawnSync("bash", [rerunSh, "--dry-run"], { encoding: "utf8", env: childEnv({ PE_BENCH_WORK_DIR: work }) });
  assert.match(three.stdout, /publish\.sh round-1 --min-runs 3/);
});

test("publish.sh refuses a --min-runs that is not a whole number of 1 or more", () => {
  const work = publishableWork();
  const results = join(scratch, "results-minruns");
  for (const bad of ["0", "x", "-1"]) {
    const r = spawnSync("bash", [publishSh, "round-bad", "--min-runs", bad], {
      encoding: "utf8",
      env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_RESULTS_DIR: results }),
    });
    assert.equal(r.status, 2, bad);
  }
  assert.equal(existsSync(join(results, "round-bad")), false);
});

test("rerun.sh stops at a failing step and does not publish", () => {
  // Fake competitor folders so fetch-arms copies them instead of cloning, and a claude stub that always fails.
  const src = join(scratch, "rerun-src");
  for (const name of ["dod", "iso", "gwc"]) {
    mkdirSync(join(src, name, ".claude-plugin"), { recursive: true });
    writeFileSync(join(src, name, ".claude-plugin", "plugin.json"), `${JSON.stringify({ name, version: "0.0.1" })}\n`);
  }
  mkdirSync(join(src, "dod", "templates"), { recursive: true });
  writeFileSync(join(src, "dod", "templates", "dod-guard.json.template"), "{}\n");
  writeFileSync(join(src, "dod", "templates", "DOD.md.template"), "# {{PROJECT_NAME}}\n");
  const stub = join(scratch, "claude-fail.sh");
  writeFileSync(stub, "#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then echo 9.9.9; exit 0; fi\nexit 1\n");
  chmodSync(stub, 0o755);
  const work = join(scratch, "rerun-fail");
  const results = join(scratch, "rerun-fail-results");
  const r = spawnSync("bash", [rerunSh, "--reps", "1", "--name", "round-fail"], {
    encoding: "utf8",
    env: childEnv({
      PE_BENCH_WORK_DIR: work,
      PE_BENCH_ARMS_DIR: join(scratch, "rerun-arms"),
      PE_BENCH_ARMS_SRC: src,
      PE_BENCH_CLAUDE: stub,
      PE_BENCH_RESULTS_DIR: results,
      PE_BENCH_PAR: "6",
    }),
  });
  assert.notEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /runall\.sh/, "the run step was reached");
  assert.equal(existsSync(join(results, "round-fail")), false, "publish did not run");
});

// ---------- per-model rounds and the minimum runs ----------

test("summarize.mjs refuses runs of two models without --model, and names both", () => {
  const work = newWork();
  for (const rep of [1, 2, 3]) makeRun(work, "T1", "ours", rep, { model: "claude-sonnet-5-5" });
  makeRun(work, "T1", "base", 1, { model: "claude-haiku-5-5" });
  writeGrades(work, [1, 2, 3].map((rep) => ({ runId: `T1-ours-${rep}`, grades: grade({ 2: true, 3: true, 4: true, 5: true }) })));
  const r = spawnSync("node", [summarizeMjs, "--runs-dir", join(work, "runs")], { encoding: "utf8", env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_TASKS: T1_TASKS }) });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /several models/);
  assert.match(r.stderr, /claude-haiku-5-5/);
  assert.match(r.stderr, /claude-sonnet-5-5/);
  assert.equal(r.stdout, "", "no table is printed for a mixed directory");
});

test("summarize.mjs --model counts only that model's runs, and the verdict line states the model and min-runs", () => {
  const work = newWork();
  for (const rep of [1, 2, 3]) makeRun(work, "T1", "ours", rep, { model: "claude-sonnet-5-5" });
  makeRun(work, "T1", "base", 1, { model: "claude-haiku-5-5" });
  writeGrades(work, [
    ...[1, 2, 3].map((rep) => ({ runId: `T1-ours-${rep}`, grades: grade({ 2: true, 3: true, 4: true, 5: true }) })),
    { runId: "T1-base-1", grades: grade({ 2: true, 3: true, 4: true, 5: true }) },
  ]);
  const r = spawnSync("node", [summarizeMjs, "--runs-dir", join(work, "runs"), "--model", "claude-haiku-5-5", "--min-runs", "1"], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_TASKS: T1_TASKS }),
  });
  assert.doesNotMatch(r.stdout, /n 3/, "the three Sonnet runs are left out");
  assert.match(r.stdout, /^T1\s.*\s4 mean 4\.00 min 4 max 4 n 1\s/m, "the one Haiku run is counted");
  const verdict = r.stdout.trim().split("\n").at(-1);
  assert.match(verdict, /^(PASS|FAIL|PARTIAL)/);
  assert.match(verdict, /\[model claude-haiku-5-5, min-runs 1\]$/);
});

test("summarize.mjs without --min-runs needs three runs per cell, and its verdict says so", () => {
  const work = newWork();
  makeRun(work, "T1", "ours", 1, { model: "claude-haiku-5-5" });
  writeGrades(work, [{ runId: "T1-ours-1", grades: grade({ 2: true, 3: true, 4: true, 5: true }) }]);
  const r = spawnSync("node", [summarizeMjs, "--runs-dir", join(work, "runs")], { encoding: "utf8", env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_TASKS: T1_TASKS }) });
  const verdict = r.stdout.trim().split("\n").at(-1);
  assert.match(verdict, /min-runs 3\]$/);
  assert.match(r.stdout, /^  T1 x ours: 1 of 3 scored runs$/m);
});

test("summarize.mjs exits non-zero with a clear message when no DONE run exists, or none for the model asked", () => {
  const empty = newWork();
  mkdirSync(join(empty, "runs"), { recursive: true });
  const none = spawnSync("node", [summarizeMjs, "--runs-dir", join(empty, "runs")], { encoding: "utf8", env: childEnv({ PE_BENCH_WORK_DIR: empty, PE_BENCH_TASKS: T1_TASKS }) });
  assert.notEqual(none.status, 0);
  assert.match(none.stderr, /no DONE runs/);

  const work = newWork();
  makeRun(work, "T1", "ours", 1, { model: "claude-sonnet-5-5" });
  writeGrades(work, [{ runId: "T1-ours-1", grades: grade({ 2: true, 3: true, 4: true, 5: true }) }]);
  const other = spawnSync("node", [summarizeMjs, "--runs-dir", join(work, "runs"), "--model", "claude-opus-5-5"], { encoding: "utf8", env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_TASKS: T1_TASKS }) });
  assert.notEqual(other.status, 0);
  assert.match(other.stderr, /no DONE runs for model claude-opus-5-5/);
});

test("summarize with minRuns 1 accepts single-run cells, and the default still reports them incomplete", () => {
  const runs = [...threeRuns("T1", "ours", 4).slice(0, 1), ...threeRuns("T1", "base", 2).slice(0, 1)];
  const one = summarize(runs, { tasks: ["T1"], arms: ["ours", "base"], minRuns: 1 });
  assert.deepEqual(one.incomplete, []);
  assert.equal(one.minRuns, 1);
  const three = summarize(runs, { tasks: ["T1"], arms: ["ours", "base"] });
  assert.equal(three.incomplete.length, 2);
  assert.equal(three.minRuns, 3);
});

test("extraNumberLines names the H6 runs whose digits are not 30, 500, 15 or 12, and nothing else", () => {
  const lines = extraNumberLines([
    { id: "H6-ours-1", task: "H6", arm: "ours", extra: [60] },
    { id: "H6-base-1", task: "H6", arm: "base", extra: [] },
    { id: "T1-ours-1", task: "T1", arm: "ours", extra: [7] },
  ]);
  assert.deepEqual(lines, ["  H6 c2 extra numbers, H6-ours-1 (ours): 60"]);
});

test("summarize.mjs --model with a second-model verdict never averages the two: a cell holds one model's runs", () => {
  const work = newWork();
  for (const rep of [1, 2, 3]) makeRun(work, "T1", "ours", rep, { model: "claude-sonnet-5-5" });
  writeGrades(work, [1, 2, 3].map((rep) => ({ runId: `T1-ours-${rep}`, grades: grade({ 2: true, 3: true, 4: true, 5: true }) })));
  const r = spawnSync("node", [summarizeMjs, "--runs-dir", join(work, "runs"), "--model", "claude-sonnet-5-5"], { encoding: "utf8", env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_TASKS: T1_TASKS }) });
  assert.match(r.stdout, /^T1\s+\d\/\d\/\d mean \d\.\d\d min \d max \d n 3/m);
  assert.match(r.stdout.trim().split("\n").at(-1), /\[model claude-sonnet-5-5, min-runs 3\]$/);
});

test("readGradeFile reads a grade file, and treats a missing or corrupt one as absent so the run is graded again", () => {
  const dir = mkdtempSync(join(scratch, "grade-file-"));
  const good = join(dir, "good.json");
  writeFileSync(good, '{"grades":{"2":{"pass":true,"why":"x"}}}\n');
  assert.deepEqual(readGradeFile(good), { grades: { 2: { pass: true, why: "x" } } });
  const corrupt = join(dir, "corrupt.json");
  writeFileSync(corrupt, '{"grades":{"2":');
  assert.equal(readGradeFile(corrupt), null);
  assert.equal(readGradeFile(join(dir, "missing.json")), null);
});

test("summarize.mjs prints the H6 extra numbers after the tables, for the H6 run that has them", () => {
  const work = newWork();
  const runDir = makeRun(work, "H6", "base", 1, { model: "claude-sonnet-5-5" });
  writeFileSync(join(runDir, "repo", "LICENCE-plain.txt"), "(1) The hotel has 60 days to pay EUR 500 within 30 days.\n");
  const r = spawnSync("node", [summarizeMjs, "--runs-dir", join(work, "runs")], { encoding: "utf8", env: childEnv({ PE_BENCH_WORK_DIR: work }) });
  assert.match(r.stdout, /^  H6 c2 extra numbers, H6-base-1 \(base\): 60$/m);
});

// ---------- the owner's account address ----------

// The CLI puts the logged-in account's address into the agent's context, so it can reach a transcript. The owner's
// address is read at run time from a fake real .claude.json. It is a fixture address; the owner's real one is never named.
const OWNER_EMAIL = "owner.test@gmail.com";
const ownerHome = join(scratch, "owner-home");
mkdirSync(join(ownerHome, ".claude"), { recursive: true });
writeFileSync(join(ownerHome, ".claude", "settings.json"), '{"hooks":{}}\n');
writeFileSync(
  join(ownerHome, ".claude.json"),
  `${JSON.stringify({ oauthAccount: { emailAddress: OWNER_EMAIL, displayName: "Owner Test", accountUuid: "acct-owner" }, userID: "u", mcpServers: {} })}\n`,
);
const ownerClaudeJson = join(ownerHome, ".claude.json");
const ownerEnv = () => ({
  REAL_HOME: ownerHome,
  PE_BENCH_REAL_SETTINGS: join(ownerHome, ".claude", "settings.json"),
  PE_BENCH_REAL_CLAUDE_JSON: ownerClaudeJson,
});
// True when text holds the owner address in any letter case, or its local part followed by an @.
const holdsOwner = (text) => /owner\.test@/i.test(text);
// Every file under dir as one string, so a check can say whether any published file holds the address.
function allText(dir) {
  let all = "";
  for (const name of readdirSync(dir, { recursive: true })) {
    const path = join(dir, name);
    if (statSync(path).isFile()) all += `\n${readFileSync(path, "utf8")}`;
  }
  return all;
}

test("ownerEmail reads oauthAccount.emailAddress from PE_BENCH_REAL_CLAUDE_JSON, and gives null when there is none", () => {
  assert.equal(ownerEmail({ PE_BENCH_REAL_CLAUDE_JSON: ownerClaudeJson }), OWNER_EMAIL);
  const bare = join(scratch, "no-account.json");
  writeFileSync(bare, '{"userID":"u"}\n');
  assert.equal(ownerEmail({ PE_BENCH_REAL_CLAUDE_JSON: bare }), null);
  assert.equal(ownerEmail({ PE_BENCH_REAL_CLAUDE_JSON: join(scratch, "missing.json") }), null);
});

test("owner_email (shell) prints the same address, and prints nothing when the file is absent", () => {
  const helper = join(bench, "owner-email.sh");
  const env = childEnv({ PE_BENCH_REAL_CLAUDE_JSON: ownerClaudeJson });
  const r = spawnSync("sh", ["-c", '. "$1"; owner_email', "sh", helper], { encoding: "utf8", env });
  assert.equal(r.status, 0, "helper exits 0");
  assert.equal(r.stdout, OWNER_EMAIL);
  const none = spawnSync("sh", ["-c", '. "$1"; owner_email', "sh", helper], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_REAL_CLAUDE_JSON: join(scratch, "missing.json") }),
  });
  assert.equal(none.status, 0);
  assert.equal(none.stdout, "");
});

test("redactOwnerEmail replaces the address in any case, and its local part before any domain, with user@example.com", () => {
  const text = `a ${OWNER_EMAIL} b ${OWNER_EMAIL.toUpperCase()} c owner.test@example.net d other.person@gmail.com e`;
  const out = redactOwnerEmail(text, OWNER_EMAIL);
  assert.equal(holdsOwner(out), false);
  assert.match(out, /other\.person@gmail\.com/, "a different Gmail address is left for the publish refusal");
  assert.equal(out.split("user@example.com").length - 1, 3);
});

test("grade.mjs replaces the owner address in the grader material and in the saved prompt, and the grader never receives it", () => {
  const work = newWork();
  for (const rep of [1, 2, 3]) makeRun(work, "T1", "ours", rep);
  const transcript = [
    JSON.stringify({ type: "user", message: { content: `The user's email address is ${OWNER_EMAIL}.` } }),
    JSON.stringify({ type: "result", result: `Your address is ${OWNER_EMAIL.toUpperCase()}, not owner.test@example.net.` }),
    "",
  ].join("\n");
  for (const rep of [1, 2, 3]) writeFileSync(join(work, "runs", `T1-ours-${rep}`, "out.jsonl"), transcript);
  const received = join(scratch, "owner-grader-stdin.txt");
  const stub = join(scratch, "owner-grader-stub.sh");
  writeFileSync(stub, ["#!/bin/sh", `cat >> '${received}'`, `printf '%s' '${GOOD_GRADE}'`, ""].join("\n"));
  chmodSync(stub, 0o755);
  const r = spawnSync("node", [gradeMjs, "--runs-dir", join(work, "runs")], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_CLAUDE: stub, PE_BENCH_ARMS_DIR: join(scratch, "no-arms"), ...ownerEnv() }),
  });
  assert.equal(r.status, 0, "grade.mjs exits 0");
  assert.equal(holdsOwner(r.stdout + r.stderr), false, "grade.mjs output holds no owner address");
  const sent = readFileSync(received, "utf8");
  assert.equal(holdsOwner(sent), false, "the grader material holds no owner address");
  assert.match(sent, /user@example\.com/);
  for (const name of readdirSync(join(work, "grades"))) {
    if (!name.endsWith(".prompt.txt")) continue;
    assert.equal(holdsOwner(readFileSync(join(work, "grades", name), "utf8")), false, `${name} holds no owner address`);
  }
});

test("publish.sh rewrites the owner address in every published text file, and the published tree holds none", () => {
  const work = publishableWork();
  const t1 = join(work, "runs", "T1-ours-1");
  writeFileSync(
    join(t1, "out.jsonl"),
    [
      JSON.stringify({ type: "user", message: { content: `The user's email address is ${OWNER_EMAIL}.` } }),
      JSON.stringify({ type: "result", result: `It is ${OWNER_EMAIL.toUpperCase()}.` }),
      "",
    ].join("\n"),
  );
  writeFileSync(join(t1, "stderr.log"), `account ${OWNER_EMAIL}\n`);
  const results = join(scratch, "results-owner");
  const r = spawnSync("bash", [publishSh, "round-owner"], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_RESULTS_DIR: results, ...ownerEnv() }),
  });
  assert.equal(r.status, 0, "publish succeeds with only the owner address present");
  assert.equal(holdsOwner(r.stdout + r.stderr), false, "publish output holds no owner address");
  const out = join(results, "round-owner");
  assert.equal(holdsOwner(allText(out)), false, "no published file holds the owner address");
  const transcript = readFileSync(join(out, "runs", "T1-ours-1", "out.jsonl"), "utf8");
  assert.match(transcript, /user@example\.com/);
  assert.equal(holdsOwner(readFileSync(join(out, "runs", "T1-ours-1", "stderr.log"), "utf8")), false);
});

test("publish.sh still refuses another Gmail address, does not print it, and leaves nothing behind", () => {
  const work = publishableWork();
  const other = "someone.else@gmail.com";
  writeFileSync(
    join(work, "runs", "T1-ours-1", "out.jsonl"),
    `{"type":"result","result":"${OWNER_EMAIL} and ${other}"}\n`,
  );
  const results = join(scratch, "results-other-gmail");
  const r = spawnSync("bash", [publishSh, "round-other-gmail"], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_RESULTS_DIR: results, ...ownerEnv() }),
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /gmail/i, "the refusal names the cause");
  assert.equal((r.stdout + r.stderr).includes(other), false, "the refusal does not print the address it found");
  assert.equal(holdsOwner(r.stdout + r.stderr), false);
  assert.equal(existsSync(join(results, "round-other-gmail")), false, "nothing is left behind");
});

test("publish.sh refuses when the real account file is not JSON, because the address could not be scrubbed", () => {
  const work = publishableWork();
  const broken = join(scratch, "broken-claude.json");
  writeFileSync(broken, "{ not json\n");
  const results = join(scratch, "results-broken-account");
  const r = spawnSync("bash", [publishSh, "round-broken-account"], {
    encoding: "utf8",
    env: childEnv({ PE_BENCH_WORK_DIR: work, PE_BENCH_RESULTS_DIR: results, PE_BENCH_REAL_CLAUDE_JSON: broken }),
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /cannot read the owner account file/);
  assert.equal(existsSync(join(results, "round-broken-account")), false, "nothing is left behind");
});
