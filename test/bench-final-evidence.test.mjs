// Evidence builder and recompute (bench/head-to-head/final-r9): a synthetic work directory with two tasks, two arms and two
// reps. Checks cells.csv, redaction, the leak scan exit, and recompute --check against an edited cell.
// Every fixture is built in a scratch directory. No claude call, no network.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildEvidence, redactText } from "../bench/head-to-head/final-r9/build-evidence.mjs";
import { recomputeText } from "../bench/head-to-head/final-r9/recompute.mjs";
import { renderText, scoreSet } from "../bench/head-to-head/final-score.mjs";
import { mergeVotes } from "../bench/head-to-head/mergevotes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, "..", "bench", "head-to-head", "final-r9", "build-evidence.mjs");
const RECOMPUTE = join(HERE, "..", "bench", "head-to-head", "final-r9", "recompute.mjs");
const CELL_HEADER = "set,task,arm,rep,outcome_score,outcome_max,process_score";
const TASKS = ["X1", "X2"];
const ARMS = ["ours", "base"];
const REPS = [1, 2];
const HOME_PATH = "/Users/tester";
const EMAIL = "tester@gmail.com";
const TOKEN = "sk-ant-api03-ABCDEFGH12";

const scratch = [];
after(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const git = (cwd, args) => execFileSync("git", ["-c", "user.email=t@example.com", "-c", "user.name=t", ...args], { cwd, encoding: "utf8" });

const TASKS_JSON = {
  X1: {
    variant: "commit",
    title: "Synthetic one",
    group: "core",
    prompt: "Task one prompt.",
    criteria: [
      { id: 1, kind: "llm", text: "first criterion" },
      { id: 2, kind: "llm", text: "second criterion" },
    ],
  },
  X2: {
    variant: "commit",
    title: "Synthetic two",
    group: "core",
    prompt: "Task two prompt.",
    criteria: [
      { id: 1, kind: "llm", text: "first criterion" },
      { id: 2, kind: "llm", text: "second criterion" },
      { id: 3, kind: "llm", text: "third criterion" },
    ],
  },
};
// X1: two outcome criteria. X2: outcome 1 and 3, process 2.
const LABELS = {
  "X1.c1": { label: "outcome", reason: "r" },
  "X1.c2": { label: "outcome", reason: "r" },
  "X2.c1": { label: "outcome", reason: "r" },
  "X2.c2": { label: "process", reason: "r" },
  "X2.c3": { label: "outcome", reason: "r" },
};
// The grade of a criterion: ours passes everything, base passes criterion 1 only.
const passes = (arm, id) => arm === "ours" || id === 1;
const criteriaOf = (task) => TASKS_JSON[task].criteria.map((c) => c.id);
const runId = (task, arm, rep) => `${task}-${arm}-${rep}`;

function makeRun(work, task, arm, rep) {
  const dir = join(work, "runs", runId(task, arm, rep));
  mkdirSync(join(dir, "repo", "src"), { recursive: true });
  writeFileSync(join(dir, "meta.json"), JSON.stringify({ task, arm, rep, model: "claude-test-1", claude_version: "9.9.9 (Claude Code)" }));
  writeFileSync(join(dir, "DONE"), "");
  const events = [
    { type: "system", subtype: "init", cwd: dir },
    {
      type: "assistant",
      message: {
        content: [
          { type: "tool_use", name: "Bash", input: { command: `cd ${work}/runs/${runId(task, arm, rep)}/repo && git status` } },
          { type: "tool_use", name: "Read", input: { file_path: "src/a.js" } },
          { type: "tool_use", name: "Write", input: { file_path: "NOTES.md", content: "x" } },
        ],
      },
    },
    { type: "system", subtype: "hook_response", hook_name: "SessionStart:startup", exit_code: 0, outcome: "success" },
    {
      type: "result",
      subtype: "success",
      is_error: false,
      result: `Done in ${HOME_PATH}/project, mail ${EMAIL}, key ${TOKEN}.`,
      total_cost_usd: 0.1 + rep * 0.01 + (arm === "base" ? 0.5 : 0),
      num_turns: 3 + rep,
      duration_ms: 1000 * rep,
      usage: { input_tokens: 5, output_tokens: 7, cache_read_input_tokens: 11, cache_creation_input_tokens: 13 },
    },
  ];
  writeFileSync(join(dir, "out.jsonl"), `${events.map((e) => JSON.stringify(e)).join("\n")}\n`);
  // The repo: a committed README.md, then a modified README.md, an untracked RELEASE_NOTES.md, an untracked NOTES.md,
  // an untracked src file and an untracked nested .md file.
  const repo = join(dir, "repo");
  git(repo, ["init", "-q"]);
  writeFileSync(join(repo, "README.md"), "# readme\n");
  git(repo, ["add", "README.md"]);
  git(repo, ["commit", "-q", "-m", "base"]);
  writeFileSync(join(repo, "README.md"), "# readme changed\n");
  writeFileSync(join(repo, "RELEASE_NOTES.md"), `Notes for ${HOME_PATH}/project\n`);
  writeFileSync(join(repo, "NOTES.md"), "notes\n");
  writeFileSync(join(repo, "src", "a.js"), "export {};\n");
  mkdirSync(join(repo, "docs"), { recursive: true });
  writeFileSync(join(repo, "docs", "x.md"), "nested\n");
}

// A synthetic work directory with runs/, grades-vote-1/ and the merged grades/. Returns its paths.
function makeWork() {
  const root = mkdtempSync(join(tmpdir(), "pe-evidence-test-"));
  scratch.push(root);
  const work = join(root, "work");
  mkdirSync(work);
  for (const task of TASKS) for (const arm of ARMS) for (const rep of REPS) makeRun(work, task, arm, rep);

  // One grader vote per run, labels anonymous, merged with mergeVotes (min 1 valid vote).
  const vote = join(work, "grades-vote-1");
  mkdirSync(vote);
  const labels = {};
  for (const task of TASKS) {
    for (const arm of ARMS) {
      for (const rep of REPS) {
        const label = `v${task}${arm}${rep}`;
        labels[label] = runId(task, arm, rep);
        const grades = {};
        for (const id of criteriaOf(task)) grades[String(id)] = { pass: passes(arm, id), why: `see ${HOME_PATH}/notes` };
        writeFileSync(join(vote, `${label}.json`), JSON.stringify({ ids: criteriaOf(task).map(String), grades }));
      }
    }
  }
  writeFileSync(join(vote, "labels.json"), JSON.stringify(labels));
  mergeVotes(work, join(work, "grades"), 1);

  const tasks = join(root, "tasks.json");
  const labelsFile = join(root, "labels.json");
  writeFileSync(tasks, JSON.stringify(TASKS_JSON));
  writeFileSync(labelsFile, JSON.stringify(LABELS));
  return { root, work, tasks, labelsFile };
}

// The rows cells.csv must hold, derived from the grade rule above.
function expectedCells() {
  const rows = [];
  for (const task of TASKS) {
    for (const arm of ARMS) {
      for (const rep of REPS) {
        const ids = criteriaOf(task);
        const outcomeIds = ids.filter((id) => LABELS[`${task}.c${id}`].label === "outcome");
        const processIds = ids.filter((id) => LABELS[`${task}.c${id}`].label === "process");
        const outcome = outcomeIds.filter((id) => passes(arm, id)).length;
        const process = processIds.filter((id) => passes(arm, id)).length;
        rows.push(`synth,${task},${arm},${rep},${outcome},${outcomeIds.length},${process}`);
      }
    }
  }
  return rows.sort();
}

function build(w, out, fixtures = null) {
  return buildEvidence({ set: "synth", work: w.work, tasksFile: w.tasks, labelsFile: w.labelsFile, out, fixtures });
}

test("cells.csv holds one row per DONE run, with the outcome and process cell scores", () => {
  const w = makeWork();
  const out = join(w.root, "out");
  const result = build(w, out);
  assert.equal(result.runs, TASKS.length * ARMS.length * REPS.length);
  const lines = readFileSync(join(out, "cells.csv"), "utf8").trim().split("\n");
  assert.equal(lines[0], CELL_HEADER);
  assert.deepEqual(lines.slice(1).sort(), expectedCells());
  const cost = readFileSync(join(out, "cost.csv"), "utf8").trim().split("\n");
  assert.equal(cost[0], "task,arm,rep,usd,turns,duration_ms");
  assert.equal(cost.length - 1, result.runs);
});

test("answer, trace, cost and files are written per cell, and the redaction holds", () => {
  const w = makeWork();
  const out = join(w.root, "out");
  build(w, out);
  const cell = join(out, "runs", "X1", "ours", "1");
  const answer = readFileSync(join(cell, "answer.md"), "utf8");
  assert.ok(answer.includes("<HOME>/project"));
  assert.ok(answer.includes("user@example.com"));
  assert.ok(answer.includes("<redacted-token>"));
  const trace = readFileSync(join(cell, "trace.txt"), "utf8").trim().split("\n");
  assert.equal(trace.length, 4, "three tool_use lines and one hook line");
  assert.ok(trace[0].startsWith("001 Bash cd <WORK>/runs/X1-ours-1/repo && git status"));
  assert.ok(trace[1].startsWith("002 Read src/a.js"));
  assert.ok(trace[3].startsWith("HOOK SessionStart:startup"));
  const cost = JSON.parse(readFileSync(join(cell, "cost.json"), "utf8"));
  assert.equal(cost.total_cost_usd, 0.1 + 0.01);
  assert.equal(cost.num_turns, 4);
  assert.equal(cost.claude_code_version, "9.9.9 (Claude Code)");
  assert.equal(cost.cache_creation_input_tokens, 13);
  assert.deepEqual(readdirSync(join(cell, "files")).sort(), ["NOTES.md", "README.md", "RELEASE_NOTES.md"]);
  assert.ok(readFileSync(join(cell, "files", "RELEASE_NOTES.md"), "utf8").includes("<HOME>/project"));
  // Every text the builder wrote is free of the raw home path, the e-mail address and the token.
  const everything = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, name.name);
      if (name.isDirectory()) walk(full);
      else everything.push(full);
    }
  };
  for (const dir of ["runs", "grades", "grades-vote-1"]) walk(join(out, dir));
  assert.ok(everything.length > 0);
  for (const file of everything) {
    const text = readFileSync(file, "utf8");
    for (const raw of [HOME_PATH, EMAIL, TOKEN]) assert.ok(!text.includes(raw), `${raw} left in ${file}`);
  }
  const grades = readFileSync(join(out, "grades", readdirSync(join(out, "grades")).find((n) => n.startsWith("g") && n.endsWith(".json"))), "utf8");
  assert.ok(!grades.includes(HOME_PATH));
  assert.ok(grades.includes("<HOME>/notes"));
});

test("redactText replaces the work path, home path, e-mail and token shapes", () => {
  const text = `/private/tmp/x/work/runs /Users/efe/Desktop/a ${EMAIL} ${TOKEN} ghp_abcdefghijk xoxb-1234567890 task-name`;
  const out = redactText(text, "/private/tmp/x/work");
  assert.equal(out, "<WORK>/runs <HOME>/Desktop/a user@example.com <redacted-token> <redacted-token> <redacted-token> task-name");
});

test("the leak scan makes the CLI exit 1 and list the file that still matches", () => {
  const w = makeWork();
  const fixtures = join(w.root, "fixtures");
  mkdirSync(fixtures);
  writeFileSync(join(fixtures, "secret.txt"), `leak ${HOME_PATH}/key\n`);
  const bad = spawnSync(process.execPath, [BUILD, "--set", "synth", "--work", w.work, "--tasks", w.tasks, "--labels", w.labelsFile, "--out", join(w.root, "out-bad"), "--fixtures", fixtures], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.ok(bad.stderr.includes("fixtures/secret.txt"), bad.stderr);
  const good = spawnSync(process.execPath, [BUILD, "--set", "synth", "--work", w.work, "--tasks", w.tasks, "--labels", w.labelsFile, "--out", join(w.root, "out-good")], { encoding: "utf8" });
  assert.equal(good.status, 0, good.stderr);
  assert.ok(good.stdout.includes("leak scan: clean"));
});

test("recompute --check passes on its own text and fails after an edited cell", () => {
  const w = makeWork();
  const out = join(w.root, "out");
  build(w, out);
  const written = join(w.root, "summary.txt");
  const wrote = spawnSync(process.execPath, [RECOMPUTE, out, "--write", written], { encoding: "utf8" });
  assert.equal(wrote.status, 0, wrote.stderr);
  const pass = spawnSync(process.execPath, [RECOMPUTE, out, "--check", written], { encoding: "utf8" });
  assert.equal(pass.status, 0, pass.stderr);
  // Lower one ours cell from 2 to 0: the recomputed text changes, so the stored file no longer matches.
  const cells = join(out, "cells.csv");
  const edited = readFileSync(cells, "utf8").replace("synth,X1,ours,1,2,2,0", "synth,X1,ours,1,0,2,0");
  assert.notEqual(edited, readFileSync(cells, "utf8"));
  writeFileSync(cells, edited);
  const fail = spawnSync(process.execPath, [RECOMPUTE, out, "--check", written], { encoding: "utf8" });
  assert.equal(fail.status, 1);
  assert.ok(fail.stderr.includes("FAILED"));
});

test("recompute matches final-score on the same runs, apart from the error line and the cost section", () => {
  const w = makeWork();
  const out = join(w.root, "out");
  build(w, out);
  const recomputed = recomputeText(out);
  const scored = scoreSet({ runsDir: join(w.work, "runs"), gradesDir: join(w.work, "grades"), tasks: TASKS_JSON, labels: LABELS });
  const finalText = renderText("synth", scored).replace(
    "runs with an error criterion: none\n",
    "runs with an error criterion: not recomputed here (see grades/ERRORS.json)\n",
  );
  assert.ok(recomputed.startsWith(finalText));
  assert.ok(recomputed.slice(finalText.length).startsWith("cost (cost.csv"));
  assert.ok(recomputed.includes(`all arms: ${TASKS.length * ARMS.length * REPS.length} runs, total $`));
});

test("recompute refuses cells whose outcome maximum disagrees with labels.json", () => {
  const w = makeWork();
  const out = join(w.root, "out");
  build(w, out);
  const labels = JSON.parse(readFileSync(join(out, "labels.json"), "utf8"));
  labels["X1.c9"] = { label: "outcome", reason: "extra" };
  writeFileSync(join(out, "labels.json"), JSON.stringify(labels));
  assert.throws(() => recomputeText(out), /outcome_max of X1/);
});
