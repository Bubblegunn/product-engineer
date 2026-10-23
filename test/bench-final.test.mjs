// Final-round tooling: reason-first grader prompt (grade.mjs), vote merging (mergevotes.mjs) and the final score
// (final-score.mjs). Every fixture is synthetic and built in a scratch directory. No claude call, no network.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GRADER_PROMPT,
  JOINT_GRADER_PROMPT,
  graderPrompt,
  jointGraderPrompt,
  parseGrades,
  parseJointGrades,
} from "../bench/head-to-head/grade.mjs";
import { mergeVotes } from "../bench/head-to-head/mergevotes.mjs";
import { pairedBootstrap, scoreSet } from "../bench/head-to-head/final-score.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const finalScoreMjs = join(root, "bench", "head-to-head", "final-score.mjs");

const scratch = mkdtempSync(join(tmpdir(), "bench-final-"));
after(() => rmSync(scratch, { recursive: true, force: true }));
let counter = 0;
const fresh = (name) => {
  counter += 1;
  return join(scratch, `${name}-${counter}`);
};

function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

// Runs the test body with PE_BENCH_REASON_FIRST set to value, then restores the previous value.
function withReasonFirst(value, body) {
  const previous = process.env.PE_BENCH_REASON_FIRST;
  if (value === undefined) delete process.env.PE_BENCH_REASON_FIRST;
  else process.env.PE_BENCH_REASON_FIRST = value;
  try {
    return body();
  } finally {
    if (previous === undefined) delete process.env.PE_BENCH_REASON_FIRST;
    else process.env.PE_BENCH_REASON_FIRST = previous;
  }
}

// ---------- part 1: reason-first grader prompt ----------

test("grader prompts are unchanged by default and switch to reason-first with PE_BENCH_REASON_FIRST=1", () => {
  withReasonFirst(undefined, () => {
    assert.equal(graderPrompt(), GRADER_PROMPT);
    assert.equal(jointGraderPrompt(), JOINT_GRADER_PROMPT);
  });
  withReasonFirst("0", () => assert.equal(graderPrompt(), GRADER_PROMPT));
  withReasonFirst("1", () => {
    const single = graderPrompt();
    const joint = jointGraderPrompt();
    assert.notEqual(single, GRADER_PROMPT);
    assert.notEqual(joint, JOINT_GRADER_PROMPT);
    assert.match(single, /\{"why": "one short sentence of reasoning", "pass": true or false\}, reasoning first/);
    assert.match(single, /Example: \{"1":\{"why":"\.\.\.","pass":true\}\}/);
    assert.doesNotMatch(single, /"pass": true or false, "why"/);
    assert.match(joint, /"why":"one short sentence of reasoning","pass":true or false/);
    assert.match(joint, /Example: \{"g0a1b2c":\{"1":\{"why":"\.\.\.","pass":true\}\}\}/);
    assert.doesNotMatch(joint, /"pass":true or false,"why"/);
    // the standard itself is the same text as the default prompt
    assert.ok(single.startsWith(GRADER_PROMPT.split("\n").slice(0, 6).join("\n")));
    assert.ok(joint.startsWith(JOINT_GRADER_PROMPT.split("\n").slice(0, 9).join("\n")));
  });
});

test("a reason-first reply parses for one run and for a joint round, with the same pass and why", () => {
  const single = '{"1":{"why":"the file is there","pass":true},"2":{"why":"no commit","pass":false}}';
  assert.deepEqual(parseGrades(single, ["1", "2"]), {
    grades: { 1: { pass: true, why: "the file is there" }, 2: { pass: false, why: "no commit" } },
  });
  const joint = '{"g0a1b2c":{"1":{"why":"tests ran","pass":true}},"g0d3e4f":{"1":{"why":"none","pass":false}}}';
  assert.deepEqual(parseJointGrades(joint, { g0a1b2c: ["1"], g0d3e4f: ["1"] }), {
    grades: { g0a1b2c: { 1: { pass: true, why: "tests ran" } }, g0d3e4f: { 1: { pass: false, why: "none" } } },
  });
});

// ---------- part 2: mergevotes ----------

// votes: array of per-vote grade maps {runId: {id: pass | null}}. A null id is absent from that vote. Vote k writes why "v<k>".
function writeVotes(work, votes) {
  votes.forEach((vote, k) => {
    const dir = join(work, `grades-vote-${k + 1}`);
    const labels = {};
    Object.entries(vote).forEach(([runId, byId], i) => {
      const label = `v${k + 1}r${i + 1}`;
      labels[label] = runId;
      const grades = {};
      for (const [id, pass] of Object.entries(byId)) {
        if (pass !== null) grades[id] = { pass, why: `v${k}` };
      }
      writeJson(join(dir, `${label}.json`), { label, ids: Object.keys(byId).map(Number), grades });
    });
    writeJson(join(dir, "labels.json"), labels);
  });
}

const readOut = (out, name) => JSON.parse(readFileSync(join(out, name), "utf8"));

test("mergevotes: five valid votes take the majority, and the first majority-side vote gives the why", () => {
  const work = fresh("merge-majority");
  // R1 has five votes. id 1: T T T F F -> pass, why from vote 0. id 2: T F F F T -> fail, why from vote 1 (first fail).
  // id 3: all pass -> 5-0, not a close split. R2 has seven votes: id 1 is T F T T F T F -> 4-3 pass, a close split.
  const r1Votes = [
    [true, true],
    [true, false],
    [true, false],
    [false, false],
    [false, true],
  ];
  const r2Votes = [true, false, true, true, false, true, false];
  writeVotes(
    work,
    r2Votes.map((p, k) => {
      const vote = { R2: { 1: p } };
      if (k < 5) vote.R1 = { 1: r1Votes[k][0], 2: r1Votes[k][1], 3: true };
      return vote;
    }),
  );
  const out = fresh("merge-majority-out");
  const result = mergeVotes(work, out, 3);
  const labels = readOut(out, "labels.json");
  const r1Label = Object.keys(labels).find((l) => labels[l] === "R1");
  const r2Label = Object.keys(labels).find((l) => labels[l] === "R2");
  const g1 = readOut(out, `${r1Label}.json`).grades;
  assert.deepEqual(g1["1"], { pass: true, why: "v0" });
  assert.deepEqual(g1["2"], { pass: false, why: "v1" });
  assert.deepEqual(g1["3"], { pass: true, why: "v0" });
  const g2 = readOut(out, `${r2Label}.json`).grades;
  assert.equal(g2["1"].pass, true);
  assert.deepEqual(readOut(out, "ERRORS.json"), []);
  assert.equal(result.runs, 2);
  const splitKeys = result.splits.map((s) => `${s.run}/${s.id}/${s.split}`).sort();
  assert.deepEqual(splitKeys, ["R1/1/3-2", "R1/2/2-3", "R2/1/4-3"]);
  assert.equal(result.agreement.tasks.unknown.R1["3"], "5-0");
  assert.equal(result.splits.some((s) => s.id === 3), false);
});

test("final score: a B-prime exception on one task within 0.34 of the best other", () => {
  // X1 ours mean 5/3 against other 2: deficit 1/3, inside the margin. X2 ours 2 against other 1.
  const set = buildSet("final-bprime-ok", {
    X1: { ours: [2, 2, 1], other: [2, 2, 2] },
    X2: { ours: [2, 2, 2], other: [1, 1, 1] },
  });
  const s = scoreSet({ ...set });
  assert.deepEqual(s.ruleB.failures, ["X1"]);
  assert.equal(s.ruleB.pass, false);
  assert.equal(s.ruleBPrime.pass, true);
  assert.equal(s.ruleBPrime.exception, "X1");
});

test("mergevotes: a tie fails the criterion and is listed as a close split", () => {
  const work = fresh("merge-tie");
  writeVotes(work, [{ R1: { 1: true } }, { R1: { 1: false } }, { R1: { 1: true } }, { R1: { 1: false } }]);
  const out = fresh("merge-tie-out");
  const result = mergeVotes(work, out, 3);
  const label = Object.keys(result.labels)[0];
  const record = readOut(out, `${label}.json`);
  assert.equal(record.grades["1"].pass, false);
  assert.equal(record.grades["1"].err, undefined);
  assert.deepEqual(result.splits, [{ task: "unknown", run: "R1", label, id: 1, split: "2-2" }]);
});

test("mergevotes: two valid votes give an error criterion, and the run is listed in ERRORS.json", () => {
  const work = fresh("merge-err");
  // Three votes, but one vote has no id 2 for R1, so id 2 has only two valid votes.
  writeVotes(work, [{ R1: { 1: true, 2: true } }, { R1: { 1: true, 2: null } }, { R1: { 1: false, 2: true } }]);
  const out = fresh("merge-err-out");
  mergeVotes(work, out, 3);
  const labels = readOut(out, "labels.json");
  const label = Object.keys(labels)[0];
  const grades = readOut(out, `${label}.json`).grades;
  assert.deepEqual(grades["2"], { pass: false, err: true, why: "fewer than 3 valid votes" });
  assert.equal(grades["1"].pass, true);
  assert.equal(grades["1"].err, undefined);
  const errors = readOut(out, "ERRORS.json");
  assert.deepEqual(errors, [{ run: "R1", label, task: "unknown", criteria: [2] }]);
});

test("mergevotes: --min-valid 2 accepts the same two valid votes", () => {
  const work = fresh("merge-minvalid");
  writeVotes(work, [{ R1: { 1: true } }, { R1: { 1: true } }]);
  const out = fresh("merge-minvalid-out");
  mergeVotes(work, out, 2);
  const label = Object.keys(readOut(out, "labels.json"))[0];
  assert.deepEqual(readOut(out, `${label}.json`).grades["1"], { pass: true, why: "v0" });
  assert.deepEqual(readOut(out, "ERRORS.json"), []);
});

// ---------- part 3: final score ----------

// scores: {task: {arm: [outcome score rep1, rep2, rep3]}}. Tasks have three llm criteria: 1 and 2 outcome, 3 process.
// The grade of criterion 1 passes when the score is at least 1, criterion 2 when at least 2, and criterion 3 always passes.
// errors: [{task, arm, rep, id}] set one criterion to an error grade.
function buildSet(name, scores, errors = []) {
  const base = fresh(name);
  const runsDir = join(base, "runs");
  const gradesDir = join(base, "grades");
  const tasks = {};
  const labels = {};
  const labelMap = {};
  let n = 0;
  for (const [task, byArm] of Object.entries(scores)) {
    tasks[task] = { criteria: [1, 2, 3].map((id) => ({ id, kind: "llm" })) };
    labels[`${task}.c1`] = { label: "outcome" };
    labels[`${task}.c2`] = { label: "outcome" };
    labels[`${task}.c3`] = { label: "process" };
    for (const [arm, reps] of Object.entries(byArm)) {
      reps.forEach((s, i) => {
        const rep = i + 1;
        const runId = `${task}-${arm}-${rep}`;
        writeJson(join(runsDir, runId, "meta.json"), { task, arm, rep, model: "test-model" });
        writeFileSync(join(runsDir, runId, "DONE"), "");
        n += 1;
        const label = `g${String(n).padStart(3, "0")}`;
        labelMap[label] = runId;
        const grades = { 1: { pass: s >= 1, why: "w" }, 2: { pass: s >= 2, why: "w" }, 3: { pass: true, why: "p" } };
        for (const e of errors) {
          if (e.task === task && e.arm === arm && e.rep === rep) grades[e.id] = { pass: false, err: true, why: "error" };
        }
        writeJson(join(gradesDir, `${label}.json`), { label, ids: [1, 2, 3], grades });
      });
    }
  }
  writeJson(join(gradesDir, "labels.json"), labelMap);
  return { runsDir, gradesDir, tasks, labels };
}

// Hand-computed: X1 ours [2,2,1] mean 5/3, base [1,1,0] mean 2/3, other [2,1,1] mean 4/3.
//                X2 ours [1,2,2] mean 5/3, base [0,1,1] mean 2/3, other [1,1,1] mean 1.
// Totals: ours 10/3, base 4/3, other 7/3. Maximum 2 per task, so the set maximum is 4.
// Lost points: ours 2/3, other 5/3. Rule A: 2/3 <= 0.8 x 5/3 = 4/3, so it passes.
// Paired cells (task, rep) of ours minus other: X1 0,1,0 and X2 0,1,1, so the mean difference is 0.5.
const MAIN_SCORES = {
  X1: { ours: [2, 2, 1], base: [1, 1, 0], other: [2, 1, 1] },
  X2: { ours: [1, 2, 2], base: [0, 1, 1], other: [1, 1, 1] },
};

test("final score: hand-computed totals, Rule A, Rule B, Rule B-prime and an interval above zero", () => {
  const set = buildSet("final-main", MAIN_SCORES);
  const s = scoreSet({ ...set, taskList: null });
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
  close(s.totals.ours, 10 / 3);
  close(s.totals.base, 4 / 3);
  close(s.totals.other, 7 / 3);
  assert.equal(s.bestOther.arm, "other");
  close(s.lost.ours, 4 - 10 / 3);
  close(s.lost.other, 4 - 7 / 3);
  assert.equal(s.ruleA.pass, true);
  assert.equal(s.ruleB.pass, true);
  assert.equal(s.ruleBPrime.pass, true);
  assert.equal(s.bestNatural.arm, "other");
  assert.equal(s.bootstrap.pairs, 6);
  close(s.bootstrap.mean, 0.5);
  close(s.bootstrap.ci95[0], 1 / 6);
  close(s.bootstrap.ci95[1], 5 / 6);
  assert.ok(s.bootstrap.ci95[0] > 0, `lower bound ${s.bootstrap.ci95[0]} not above zero`);
  assert.ok(s.bootstrap.ci95[0] <= 0.5 && 0.5 <= s.bootstrap.ci95[1]);
  assert.equal(s.bootstrap.i1, true);
  assert.deepEqual(s.errRuns, []);
});

test("final score: a best other arm at the ceiling makes I1 false", () => {
  const set = buildSet("final-ceiling", {
    X1: { ours: [2, 2, 2], base: [0, 0, 0], other: [2, 2, 2] },
    X2: { ours: [2, 2, 2], base: [0, 0, 0], other: [2, 2, 2] },
  });
  const s = scoreSet({ ...set });
  assert.equal(s.bestOther.arm, "other");
  assert.equal(s.bootstrap.mean, 0);
  assert.deepEqual(s.bootstrap.ci95, [0, 0]);
  assert.equal(s.bootstrap.i1, false);
  // both at the task maximum: Rule B holds through the ceiling clause, not through strict superiority
  assert.equal(s.ruleB.pass, true);
  assert.equal(s.ruleA.pass, true);
});

test("final score: Rule B fails on a task where ours is below the best other, and B-prime allows one such task within 0.34", () => {
  const set = buildSet("final-bprime", {
    X1: { ours: [1, 1, 1], base: [0, 0, 0], other: [2, 2, 2] },
    X2: { ours: [2, 2, 2], base: [0, 0, 0], other: [1, 1, 1] },
  });
  const s = scoreSet({ ...set });
  assert.deepEqual(s.ruleB.failures, ["X1"]);
  assert.equal(s.ruleB.pass, false);
  // ours 1 against 2: deficit 1.0, outside the 0.34 margin
  assert.equal(s.ruleBPrime.pass, false);
  assert.equal(s.ruleBPrime.exception, null);
});

test("final score: a run with an error criterion is listed", () => {
  const set = buildSet("final-err", MAIN_SCORES, [{ task: "X2", arm: "ours", rep: 3, id: 2 }]);
  const s = scoreSet({ ...set });
  assert.deepEqual(s.errRuns, [{ run: "X2-ours-3", task: "X2", arm: "ours", criteria: [2] }]);
});

test("final score: --tasks-list restricts the set to the listed tasks", () => {
  const set = buildSet("final-list", MAIN_SCORES);
  const s = scoreSet({ ...set, taskList: ["X1"] });
  assert.deepEqual(s.tasks, ["X1"]);
  assert.equal(s.totals.ours, 5 / 3);
  assert.equal(s.bootstrap.pairs, 3);
});

test("final score: the CLI prints the set, the verdict lines and the interval in JSON mode", () => {
  const set = buildSet("final-cli", MAIN_SCORES);
  const tasksFile = join(dirname(set.runsDir), "tasks.json");
  const labelsFile = join(dirname(set.runsDir), "labels.json");
  writeJson(tasksFile, set.tasks);
  writeJson(labelsFile, set.labels);
  const r = spawnSync(
    process.execPath,
    [finalScoreMjs, "--runs-dir", set.runsDir, "--grades", set.gradesDir, "--tasks", tasksFile, "--labels", labelsFile, "--set-name", "synthetic", "--json"],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.set, "synthetic");
  assert.equal(out.bootstrap.i1, true);
  assert.equal(out.bestOther.arm, "other");
  const text = spawnSync(
    process.execPath,
    [finalScoreMjs, "--runs-dir", set.runsDir, "--grades", set.gradesDir, "--tasks", tasksFile, "--labels", labelsFile, "--set-name", "synthetic"],
    { encoding: "utf8" },
  );
  assert.equal(text.status, 0, text.stderr);
  assert.match(text.stdout, /I1: HOLDS/);
  assert.match(text.stdout, /Rule A: PASS/);
});

test("final score: Rule A fails when ours loses more than 0.8 times the best other's lost points", () => {
  // ours total 7/3, lost 5/3. other total 3, lost 1. 5/3 is above 0.8 x 1, so Rule A fails.
  const set = buildSet("final-rulea", {
    X1: { ours: [2, 1, 1], other: [2, 2, 2] },
    X2: { ours: [1, 1, 1], other: [1, 1, 1] },
  });
  const s = scoreSet({ ...set });
  assert.equal(s.bestOther.arm, "other");
  assert.ok(Math.abs(s.ruleA.oursLost - 5 / 3) < 1e-9);
  assert.equal(s.ruleA.bestLost, 1);
  assert.equal(s.ruleA.pass, false);
});

test("final score: Rule A fails on an equal total, since equal lost points are above 0.8 times themselves", () => {
  // ours total 3 and other total 3: both lost 1. 1 is above 0.8 x 1.
  const set = buildSet("final-rulea-equal", {
    X1: { ours: [2, 2, 2], other: [1, 1, 1] },
    X2: { ours: [1, 1, 1], other: [2, 2, 2] },
  });
  const s = scoreSet({ ...set });
  assert.equal(s.totals.ours, s.totals.other);
  assert.equal(s.bestOther.arm, "other");
  assert.equal(s.ruleA.pass, false);
});

test("final score: a tie below the ceiling fails Rule B on that task", () => {
  const set = buildSet("final-tie", {
    X1: { ours: [1, 1, 1], other: [1, 1, 1] },
    X2: { ours: [2, 2, 2], other: [1, 1, 1] },
  });
  const s = scoreSet({ ...set });
  assert.deepEqual(s.ruleB.failures, ["X1"]);
  assert.equal(s.ruleBPrime.exception, "X1");
});

test("final score: the Rule B ceiling clause needs the best other arm at the ceiling, not just another arm", () => {
  // alpha has the best total (3 against beta's 2). On X1 beta ties ours at the ceiling but alpha does not.
  const set = buildSet("final-ceiling-clause", {
    X1: { ours: [2, 2, 2], alpha: [1, 1, 1], beta: [2, 2, 2] },
    X2: { ours: [2, 2, 2], alpha: [2, 2, 2], beta: [0, 0, 0] },
  });
  const s = scoreSet({ ...set });
  assert.equal(s.bestOther.arm, "alpha");
  assert.deepEqual(s.ruleB.failures, ["X1"]);
});

test("final score: two tasks outside Rule B are never one B-prime exception", () => {
  const set = buildSet("final-two-fail", {
    X1: { ours: [2, 2, 1], other: [2, 2, 2] },
    X2: { ours: [2, 2, 1], other: [2, 2, 2] },
  });
  const s = scoreSet({ ...set });
  assert.deepEqual(s.ruleB.failures, ["X1", "X2"]);
  assert.equal(s.ruleBPrime.pass, false);
});

test("final score: an interval that straddles zero gives I1 false", () => {
  const set = buildSet("final-straddle", {
    X1: { ours: [2, 1, 1], other: [1, 2, 1] },
    X2: { ours: [1, 1, 2], other: [2, 1, 1] },
  });
  const s = scoreSet({ ...set });
  assert.equal(s.bootstrap.mean, 0);
  assert.ok(s.bootstrap.ci95[0] < 0 && s.bootstrap.ci95[1] > 0, JSON.stringify(s.bootstrap.ci95));
  assert.equal(s.bootstrap.i1, false);
});

test("paired bootstrap: a constant difference gives that constant at both bounds", () => {
  assert.deepEqual(pairedBootstrap([1, 1, 1]), { mean: 1, lo: 1, hi: 1 });
  assert.deepEqual(pairedBootstrap([]), { mean: null, lo: null, hi: null });
});
