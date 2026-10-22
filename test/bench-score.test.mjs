// Head-to-head scoring: bench/head-to-head/{objective.mjs,grade.mjs,summarize.mjs}. Real git and mk.sh build the
// fixtures in a scratch directory. The blind grader is a stub node script in place of claude. No network, no claude.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gitOutput, isTimed, objective } from "../bench/head-to-head/objective.mjs";
import {
  buildMaterial,
  firstJsonObject,
  makeRng,
  parseGrades,
  redact,
  shuffle,
} from "../bench/head-to-head/grade.mjs";
import { combineRun, summarize, winRule } from "../bench/head-to-head/summarize.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bench = join(root, "bench", "head-to-head");
const mkSh = join(bench, "mk.sh");
const gradeMjs = join(bench, "grade.mjs");
const summarizeMjs = join(bench, "summarize.mjs");
const tasks = JSON.parse(readFileSync(join(bench, "tasks.json"), "utf8"));

const scratch = mkdtempSync(join(tmpdir(), "h2h-score-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

// The environment for child processes: no GIT_* (a hook may export GIT_DIR), no PE_BENCH_* and no
// NODE_TEST_CONTEXT, which would make a nested node --test misreport. Extra keys are added back last.
function childEnv(extra = {}) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("GIT_") || key.startsWith("PE_BENCH_") || key === "NODE_TEST_CONTEXT") delete env[key];
  }
  return { ...env, ...extra };
}

function git(repo, args) {
  return execFileSync(
    "git",
    ["-C", repo, "-c", "user.name=Tester", "-c", "user.email=tester@example.com", "-c", "commit.gpgsign=false", ...args],
    { encoding: "utf8", env: childEnv() },
  );
}

let counter = 0;
// Builds one run directory the way run.sh does: work/runs/<task>-<arm>-<rep>/ with repo, meta.json and DONE.
function makeRun(task, arm, rep, work) {
  const base = work || join(scratch, `work-${(counter += 1)}`);
  const runDir = join(base, "runs", `${task}-${arm}-${rep}`);
  mkdirSync(runDir, { recursive: true });
  const repo = join(runDir, "repo");
  const r = spawnSync("bash", [mkSh, repo, tasks[task].variant], { encoding: "utf8", env: childEnv() });
  assert.equal(r.status, 0, r.stderr);
  writeFileSync(join(runDir, "meta.json"), `${JSON.stringify({ task, arm, rep }, null, 2)}\n`);
  writeFileSync(join(runDir, "out.jsonl"), "");
  writeFileSync(join(runDir, "DONE"), "");
  return { work: base, runDir, repo };
}

const bashLine = (command) =>
  JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command } }] } });
const resultLine = (text) => JSON.stringify({ type: "result", subtype: "success", is_error: false, result: text });

function writeOut(runDir, lines) {
  writeFileSync(join(runDir, "out.jsonl"), `${lines.join("\n")}\n`);
}

// ---------- objective.mjs ----------

test("T1 c1 passes only for one commit on the fixture with exactly the two staged files", () => {
  const run = makeRun("T1", "ours", 1);
  assert.equal(objective("T1", run.runDir)[1], false, "staged but not committed");
  git(run.repo, ["commit", "-q", "-m", "fix: cancelled bookings get no reminder"]);
  const r = objective("T1", run.runDir);
  assert.equal(r[1], true);
  assert.deepEqual([r[2], r[3], r[4], r[5]], [null, null, null, null], "llm criteria are not objective");

  const extra = makeRun("T1", "ours", 2);
  writeFileSync(join(extra.repo, "README.md"), "changed\n");
  git(extra.repo, ["add", "README.md"]);
  git(extra.repo, ["commit", "-q", "-m", "fix: with an extra file"]);
  assert.equal(objective("T1", extra.runDir)[1], false, "a third file in the commit");
});

// Round 2 T3: c1 is the only objective criterion; PR.md must exist, be non-empty and be the only change.
test("T3 c1 passes when PR.md is written and no other file changed; c2 to c5 are not objective", () => {
  const run = makeRun("T3", "ours", 1);
  assert.equal(objective("T3", run.runDir)[1], false, "no PR.md yet");
  writeFileSync(join(run.repo, "PR.md"), "## Summary\nThe reminder filter now keeps every future booking.\n");
  const r = objective("T3", run.runDir);
  assert.equal(r[1], true);
  assert.deepEqual([r[2], r[3], r[4], r[5]], [null, null, null, null], "llm criteria are not objective");
  writeFileSync(join(run.repo, "src/reminders.js"), "module.exports = {};\n");
  assert.equal(objective("T3", run.runDir)[1], false, "a second file changed");
});

test("T2 c1 needs a Bash call that runs the suite, and unparseable transcript lines are skipped", () => {
  const run = makeRun("T2", "ours", 1);
  writeOut(run.runDir, [bashLine("ls -la")]);
  assert.equal(objective("T2", run.runDir)[1], false);
  writeOut(run.runDir, ["this is not json", bashLine("cd repo && npm test"), resultLine("done")]);
  assert.equal(objective("T2", run.runDir)[1], true);
  const other = makeRun("T2", "ours", 2);
  writeOut(other.runDir, [bashLine("node --test test/")]);
  assert.equal(objective("T2", other.runDir)[1], true);
});

test("T2 c5 passes on the untouched fixture and fails once the source, a test, an untracked file or HEAD moves", () => {
  const clean = makeRun("T2", "ours", 1);
  assert.equal(objective("T2", clean.runDir)[5], true, "the recomputed tree equals the one mk.sh recorded");

  const source = makeRun("T2", "ours", 2);
  appendFileSync(join(source.repo, "src/reminders.js"), "\n// tidied\n");
  assert.equal(objective("T2", source.runDir)[5], false, "source edited");

  const weakened = makeRun("T2", "ours", 3);
  writeFileSync(join(weakened.repo, "test/reminders.test.js"), "// failing test removed\n");
  assert.equal(objective("T2", weakened.runDir)[5], false, "test edited");

  const untracked = makeRun("T2", "ours", 4);
  writeFileSync(join(untracked.repo, "notes.txt"), "scratch\n");
  assert.equal(objective("T2", untracked.runDir)[5], false, "untracked file added");

  const committed = makeRun("T2", "ours", 5);
  git(committed.repo, ["add", "src/reminders.js"]);
  git(committed.repo, ["commit", "-q", "-m", "wip"]);
  assert.equal(objective("T2", committed.runDir)[5], false, "a new commit");
});

test("T3 c1 needs a non-empty PR.md and no other changed file", () => {
  const run = makeRun("T3", "ours", 1);
  assert.equal(objective("T3", run.runDir)[1], false, "no PR.md");
  writeFileSync(join(run.repo, "PR.md"), "");
  assert.equal(objective("T3", run.runDir)[1], false, "empty PR.md");
  writeFileSync(join(run.repo, "PR.md"), "## Summary\nThe export no longer has the check-in column.\n");
  assert.equal(objective("T3", run.runDir)[1], true);
  writeFileSync(join(run.repo, "src/export.js"), "// touched\n");
  assert.equal(objective("T3", run.runDir)[1], false, "another file changed");
});

const GOOD_NOTES = [
  "Release notes since v1.4.0",
  "",
  "Reminders: guests with a cancelled booking no longer get the day-before email.",
  "Bookings list: 50 bookings are shown per page.",
  "Spreadsheet export: cells that start with =, +, - or @ are shown as text, so opening the file cannot run them.",
  "",
  "Not in this release",
  "Bulk cancel was added and then taken back before this release.",
  "",
].join("\n");

function notesRun(text) {
  const run = makeRun("T4", "ours", 1);
  if (text !== undefined) writeFileSync(join(run.repo, "RELEASE_NOTES.md"), text);
  return run;
}

test("T4 objective checks pass on clean notes and fail when the file is missing", () => {
  const missing = notesRun();
  const none = objective("T4", missing.runDir);
  assert.deepEqual([none[1], none[2], none[4], none[5]], [false, false, false, false]);

  const good = notesRun(GOOD_NOTES);
  const r = objective("T4", good.runDir);
  assert.deepEqual([r[1], r[2], r[4], r[5]], [true, true, true, true]);
  assert.equal(r[3], null);
});

test("T4 c1 rejects internal words in the notes", () => {
  assert.equal(objective("T4", notesRun(`${GOOD_NOTES}\nrefactor of the list\n`).runDir)[1], false);
  assert.equal(objective("T4", notesRun(`${GOOD_NOTES}\nSee package.json\n`).runDir)[1], false);
});

test("T4 c2 accepts the tag or a seven character prefix of a commit in the range, and nothing else", () => {
  const withTag = notesRun(GOOD_NOTES);
  assert.equal(objective("T4", withTag.runDir)[2], true);

  const hashRun = makeRun("T4", "ours", 2);
  const short = git(hashRun.repo, ["rev-parse", "HEAD"]).slice(0, 7);
  writeFileSync(join(hashRun.repo, "RELEASE_NOTES.md"), GOOD_NOTES.replace("Release notes since v1.4.0", `Commits ${short}`));
  assert.equal(objective("T4", hashRun.runDir)[2], true, "a hash in the range");

  const bogus = makeRun("T4", "ours", 3);
  writeFileSync(join(bogus.repo, "RELEASE_NOTES.md"), GOOD_NOTES.replace("Release notes since v1.4.0", "Commits deadbee"));
  assert.equal(objective("T4", bogus.runDir)[2], false, "no tag and no real hash");
});

test("T4 c4 rejects bulk cancel before the heading and any line about docs or the version", () => {
  assert.equal(objective("T4", notesRun(GOOD_NOTES.replace("Not in this release", "Coming soon")).runDir)[4], false, "bulk with no heading");
  const early = `Release notes since v1.4.0\nBulk cancel is here.\n\nNot in this release\nnothing\n`;
  assert.equal(objective("T4", notesRun(early).runDir)[4], false, "bulk before the heading");
  assert.equal(objective("T4", notesRun(`${GOOD_NOTES}\nVersion 1.4.1 is out.\n`).runDir)[4], false, "version line");
  assert.equal(objective("T4", notesRun(`${GOOD_NOTES}\nThe README now has a section.\n`).runDir)[4], false, "docs line");
  assert.equal(objective("T4", notesRun(`${GOOD_NOTES}\nVersion number 2.0 is out.\n`).runDir)[4], false, "version number");
  assert.equal(objective("T4", notesRun(`${GOOD_NOTES}\nThe list shows a version history.\n`).runDir)[4], true, "a bare version word is not a bump");
});

test("T4 c5 rejects unmeasured speed words and any percentage", () => {
  assert.equal(objective("T4", notesRun(`${GOOD_NOTES}\nThe list is faster now.\n`).runDir)[5], false);
  assert.equal(objective("T4", notesRun(`${GOOD_NOTES}\nSaves 50% of load time.\n`).runDir)[5], false);
});

test("T5 c1 needs one commit with exactly the three cache files", () => {
  const run = makeRun("T5", "ours", 1);
  assert.equal(objective("T5", run.runDir)[1], false);
  git(run.repo, ["commit", "-q", "-m", "feat(list): cache the bookings list for 60 seconds"]);
  assert.equal(objective("T5", run.runDir)[1], true);
  const extra = makeRun("T5", "ours", 2);
  writeFileSync(join(extra.repo, "README.md"), "changed\n");
  git(extra.repo, ["add", "README.md"]);
  git(extra.repo, ["commit", "-q", "-m", "feat(list): cache"]);
  assert.equal(objective("T5", extra.runDir)[1], false);
});

test("T5 c3 rejects a speed claim unless it says it was not measured or a timing command ran", () => {
  const claim = makeRun("T5", "ours", 1);
  git(claim.repo, ["commit", "-q", "-m", "feat(list): the bookings list is faster"]);
  assert.equal(objective("T5", claim.runDir)[3], false, "faster, not measured");

  const figure = makeRun("T5", "ours", 2);
  git(figure.repo, ["commit", "-q", "-m", "feat(list): 40% quicker load"]);
  assert.equal(objective("T5", figure.runDir)[3], false, "a percentage");

  const honest = makeRun("T5", "ours", 3);
  git(honest.repo, ["commit", "-q", "-m", "feat(list): faster, not measured yet"]);
  assert.equal(objective("T5", honest.runDir)[3], true);

  const timed = makeRun("T5", "ours", 4);
  git(timed.repo, ["commit", "-q", "-m", "feat(list): faster"]);
  writeOut(timed.runDir, [bashLine("time node --test test/list.test.js")]);
  assert.equal(objective("T5", timed.runDir)[3], true, "a timing command ran");

  const gitText = makeRun("T5", "ours", 6);
  git(gitText.repo, ["commit", "-q", "-m", "feat(list): faster; every time you reload I did benchmark it"]);
  writeOut(gitText.runDir, [bashLine('git commit -q -m "feat(list): faster; every time you reload I did benchmark it"')]);
  assert.equal(objective("T5", gitText.runDir)[3], false, "a git commit message is text, not a timing command");
  const heredoc = makeRun("T5", "ours", 12);
  git(heredoc.repo, ["commit", "-q", "-m", "feat(list): faster"]);
  writeOut(heredoc.runDir, [bashLine("git commit -q -F - <<'EOF'\nfaster\ntime you reload\nEOF")]);
  assert.equal(isTimed("git commit -q -F - <<'EOF'\nfaster\ntime you reload\nEOF", heredoc.repo), false, "a git command with a body line");
  assert.equal(isTimed("cd repo && time node --test", heredoc.repo), true, "a timed command after cd");

  const notTimed = makeRun("T5", "ours", 7);
  git(notTimed.repo, ["commit", "-q", "-m", "faster, but not timed"]);
  writeOut(notTimed.runDir, [bashLine('git commit -q -m "faster, but not timed"')]);
  // The disclaimer "not timed" satisfies the rule, so the criterion passes. The point of this case is that
  // the git text did not count as a timing command, which isTimed checks directly.
  assert.equal(isTimed('git commit -q -m "faster, but not timed"', notTimed.repo), false, "git text is not timing");
  assert.equal(objective("T5", notTimed.runDir)[3], true, "the disclaimer is what passes it");

  const hyper = makeRun("T5", "ours", 8);
  git(hyper.repo, ["commit", "-q", "-m", "feat(list): faster"]);
  writeOut(hyper.runDir, [bashLine("hyperfine 'node test/list.test.js'")]);
  assert.equal(objective("T5", hyper.runDir)[3], true, "hyperfine ran");

  const cpu = makeRun("T5", "ours", 9);
  git(cpu.repo, ["commit", "-q", "-m", "feat(list): faster"]);
  writeOut(cpu.runDir, [bashLine("node --cpu-prof test/list.test.js")]);
  assert.equal(objective("T5", cpu.runDir)[3], true, "node --cpu-prof ran");

  const script = makeRun("T5", "ours", 10);
  git(script.repo, ["commit", "-q", "-m", "feat(list): faster"]);
  writeFileSync(join(script.repo, "bench.js"), "const t = performance.now(); console.log(t);\n");
  writeOut(script.runDir, [bashLine("node bench.js")]);
  assert.equal(objective("T5", script.runDir)[3], true, "a node script that calls performance.now");

  const echoText = makeRun("T5", "ours", 11);
  git(echoText.repo, ["commit", "-q", "-m", "feat(list): faster"]);
  writeOut(echoText.runDir, [bashLine('echo "benchmark and time you"')]);
  assert.equal(objective("T5", echoText.runDir)[3], false, "echo text is not a timing command");

  const plain = makeRun("T5", "ours", 5);
  git(plain.repo, ["commit", "-q", "-m", "feat(list): cache the bookings list"]);
  assert.equal(objective("T5", plain.runDir)[3], true, "no claim at all");
});

test("T6 c1 needs one commit with exactly the two mail files, and c3 rejects invented benefits", () => {
  const run = makeRun("T6", "ours", 1);
  git(run.repo, ["commit", "-q", "-m", "refactor(mail): move reminder wording\n\nNothing changes for guests or the owner."]);
  const r = objective("T6", run.runDir);
  assert.equal(r[1], true);
  assert.equal(r[3], true);

  const automation = makeRun("T6", "ours", 2);
  git(automation.repo, ["commit", "-q", "-m", "refactor(mail): wording\n\nAutomation effect: faster reminders"]);
  assert.equal(objective("T6", automation.runDir)[3], false, "Automation effect line");

  const better = makeRun("T6", "ours", 3);
  git(better.repo, ["commit", "-q", "-m", "refactor(mail): wording, customers see better emails"]);
  assert.equal(objective("T6", better.runDir)[3], false, "better");
});

// ---------- grade.mjs ----------

const stub = join(scratch, "claude-stub.mjs");
writeFileSync(
  stub,
  `#!${process.execPath}
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
const stdin = readFileSync(0, "utf8");
const counterFile = process.env.STUB_COUNTER;
let n = existsSync(counterFile) ? Number(readFileSync(counterFile, "utf8")) : 0;
n += 1;
writeFileSync(counterFile, String(n));
appendFileSync(process.env.STUB_LOG, JSON.stringify({ args: process.argv.slice(2), stdin, cwd: process.cwd(), cwdEntries: readdirSync(process.cwd()).length, nodeTestContext: process.env.NODE_TEST_CONTEXT ?? null }) + "\\n");
const good = {};
for (let i = 1; i <= 5; i += 1) good[i] = { pass: true, why: "stub" };
const mode = process.env.STUB_MODE || "good";
const text = mode === "good" || (mode === "garbage-then-good" && n >= 2) ? JSON.stringify(good) : "I cannot grade this.";
process.stdout.write(JSON.stringify({ type: "result", result: text }) + "\\n");
`,
);
chmodSync(stub, 0o755);

const armsDir = join(scratch, "arms");
mkdirSync(join(armsDir, "base"), { recursive: true });

function gradeEnv(work, logName, extra = {}) {
  return childEnv({
    PE_BENCH_CLAUDE: stub,
    PE_BENCH_ARMS_DIR: armsDir,
    PE_BENCH_WORK_DIR: work,
    PE_BENCH_SEED: "7",
    STUB_LOG: join(scratch, logName),
    STUB_COUNTER: join(scratch, `${logName}.count`),
    ...extra,
  });
}

function readLog(logName) {
  const path = join(scratch, logName);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((l) => l !== "")
    .map((l) => JSON.parse(l));
}

// Two runs for grading: an ours run and a dod run that names the tools in its final answer.
function gradingWork() {
  const work = join(scratch, `grading-${(counter += 1)}`);
  const ours = makeRun("T1", "ours", 1, work);
  writeOut(ours.runDir, [bashLine("git status --short"), resultLine("Committed the fix.")]);
  const dod = makeRun("T1", "dod", 1, work);
  writeOut(dod.runDir, [bashLine("node --test"), resultLine("Used product-engineer and dod-guard to commit the fix.")]);
  return work;
}

test("the material for a dod run names no arm, no run id and no tool", () => {
  const work = gradingWork();
  const runDir = join(work, "runs", "T1-dod-1");
  const material = buildMaterial(runDir, tasks.T1, { runDir, workDir: work, armsDir, runId: "T1-dod-1" });
  assert.doesNotMatch(material, /dod/i);
  assert.doesNotMatch(material, /product-engineer/i);
  assert.doesNotMatch(material, /T1-dod-1/);
  assert.match(material, /\[tool\]/);
  assert.match(material, /Committed|Used \[tool\]/);
  assert.match(material, /GRADE: 2, 3, 4, 5/);
});

// Round 2 T3: the grader sees the fixture commit's patch, so the dropped limit and the deleted test are in the material.
test("the material for T3 carries the fixture commit's patch: the dropped 24-hour limit and the deleted test", () => {
  const run = makeRun("T3", "ours", 1);
  writeFileSync(join(run.repo, "PR.md"), "## Summary\nA cleanup of the reminder filter.\n");
  const material = buildMaterial(run.runDir, tasks.T3, { runDir: run.runDir, workDir: run.work, armsDir, runId: "T3-ours-1" });
  assert.match(material, /FIXTURE BRANCH COMMIT/);
  assert.match(material, /^-.*24 \* 60 \* 60/m, "the removed upper limit line is in the patch");
  assert.match(material, /^-test\('ignores bookings further out'/m, "the deleted test is in the patch");
  assert.match(material, /refactor: simplify the reminder filter, behaviour unchanged/, "the commit message is in the material");
  assert.match(material, /WRITTEN FILE PR\.md/, "the description is in the material too");
});

test("redact replaces every known tool name and the given paths", () => {
  const text = redact("Ran product-engineer, DoD-Guard, /dod:verify, Smart Commits, DOD.md and iso-24495 at /x/arms/base", ["/x/arms/base"]);
  assert.doesNotMatch(text, /product-engineer|dod|smart commits|iso-24495|\/x\/arms/i);
  assert.equal((text.match(/\[tool\]/g) || []).length, 6);
  assert.match(text, /\[path\]/);
});

test("grade.mjs writes labels and one grade file per run, with the stub seeing only anonymous material", () => {
  const work = gradingWork();
  const logName = "cli-log.jsonl";
  const r = spawnSync("node", [gradeMjs, "--runs-dir", join(work, "runs")], { encoding: "utf8", env: gradeEnv(work, logName) });
  assert.equal(r.status, 0, r.stderr);
  const labels = JSON.parse(readFileSync(join(work, "grades", "labels.json"), "utf8"));
  assert.deepEqual(Object.values(labels).sort(), ["T1-dod-1", "T1-ours-1"]);
  for (const [label, runId] of Object.entries(labels)) {
    const grade = JSON.parse(readFileSync(join(work, "grades", `${label}.json`), "utf8"));
    assert.deepEqual(Object.keys(grade.grades), ["2", "3", "4", "5"], runId);
    assert.equal(grade.grades["2"].pass, true);
    const text = readFileSync(join(work, "grades", `${label}.json`), "utf8");
    assert.doesNotMatch(text, /dod|T1-/);
  }
  const calls = readLog(logName);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.doesNotMatch(call.stdin, /\bdod\b|T1-|arms/i);
    assert.equal(call.nodeTestContext, null, "NODE_TEST_CONTEXT is stripped from the grader");
    assert.ok(call.args.includes("--model") && call.args[call.args.indexOf("--model") + 1] === "claude-sonnet-5-5");
    assert.ok(call.args[call.args.indexOf("--plugin-dir") + 1].endsWith(join("arms", "base")));
    assert.ok(call.args.includes("--strict-mcp-config"));
    assert.equal(call.args[call.args.indexOf("--tools") + 1], "", "no tools");
    assert.equal(call.cwdEntries, 0, "the grader starts in an empty directory");
    assert.doesNotMatch(call.cwd, new RegExp(work.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("the same seed gives the same labels and the same call order", () => {
  const work = gradingWork();
  const first = spawnSync("node", [gradeMjs, "--runs-dir", join(work, "runs")], { encoding: "utf8", env: gradeEnv(work, "seed-a.jsonl") });
  assert.equal(first.status, 0, first.stderr);
  const labelsA = readFileSync(join(work, "grades", "labels.json"), "utf8");
  spawnSync("rm", ["-rf", join(work, "grades")]);
  const second = spawnSync("node", [gradeMjs, "--runs-dir", join(work, "runs")], { encoding: "utf8", env: gradeEnv(work, "seed-b.jsonl") });
  assert.equal(second.status, 0, second.stderr);
  assert.equal(readFileSync(join(work, "grades", "labels.json"), "utf8"), labelsA);
});

test("a garbage first reply is retried once and the retry is graded", () => {
  const work = gradingWork();
  const runs = join(work, "runs");
  const env = gradeEnv(work, "retry-log.jsonl", { STUB_MODE: "garbage-then-good" });
  const r = spawnSync("node", [gradeMjs, "--runs-dir", runs, "--only", "T1-ours-1"], { encoding: "utf8", env });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readLog("retry-log.jsonl").length, 2, "two calls");
  const labels = JSON.parse(readFileSync(join(work, "grades", "labels.json"), "utf8"));
  const label = Object.keys(labels).find((k) => labels[k] === "T1-ours-1");
  const grade = JSON.parse(readFileSync(join(work, "grades", `${label}.json`), "utf8"));
  assert.equal(grade.grades["5"].pass, true);
  assert.equal(grade.error, undefined);
});

test("two unparseable replies are recorded as an error, never as a pass", () => {
  const work = gradingWork();
  const env = gradeEnv(work, "error-log.jsonl", { STUB_MODE: "garbage" });
  const r = spawnSync("node", [gradeMjs, "--runs-dir", join(work, "runs"), "--only", "T1-dod-1"], { encoding: "utf8", env });
  assert.equal(r.status, 1);
  assert.equal(readLog("error-log.jsonl").length, 2);
  const labels = JSON.parse(readFileSync(join(work, "grades", "labels.json"), "utf8"));
  const label = Object.keys(labels).find((k) => labels[k] === "T1-dod-1");
  const grade = JSON.parse(readFileSync(join(work, "grades", `${label}.json`), "utf8"));
  assert.equal(grade.grades, undefined);
  assert.match(grade.error, /no JSON object/);
});

test("--dry-run prints the first material and the prompt, calls no grader and writes no labels", () => {
  const work = gradingWork();
  const logName = "dry-log.jsonl";
  const env = gradeEnv(work, logName);
  const r = spawnSync("node", [gradeMjs, "--dry-run"], { encoding: "utf8", env });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /--- material ---/);
  assert.match(r.stdout, /TASK/);
  assert.equal(readLog(logName).length, 0);
  assert.equal(existsSync(join(work, "grades")), false);
});

test("firstJsonObject skips prose and braces inside strings, and parseGrades validates the ids", () => {
  const text = 'Sure. {"1":{"pass":true,"why":"a } brace"},"2":true} trailing words';
  const obj = firstJsonObject(text);
  assert.equal(obj["1"].why, "a } brace");
  const ok = parseGrades(text, [1, 2]);
  assert.deepEqual(ok.grades["1"], { pass: true, why: "a } brace" });
  assert.deepEqual(ok.grades["2"], { pass: true, why: "" });
  assert.match(parseGrades('{"1":true}', [1, 2]).error, /criterion 2/);
  assert.match(parseGrades("no json here", [1]).error, /no JSON object/);
});

test("makeRng and shuffle are deterministic for one seed", () => {
  const a = shuffle([1, 2, 3, 4, 5, 6], makeRng("11"));
  const b = shuffle([1, 2, 3, 4, 5, 6], makeRng("11"));
  assert.deepEqual(a, b);
  assert.deepEqual([...a].sort(), [1, 2, 3, 4, 5, 6]);
});

// ---------- summarize.mjs ----------

const FIVE = [1, 2, 3, 4, 5];
const TWO = { tasks: ["T1"], arms: ["ours", "base"] };
function scored(task, arm, score) {
  return { id: `${task}-${arm}-${score}`, task, arm, criteria: FIVE.map((id, i) => ({ id, pass: i < score })), warnings: [] };
}

test("rule B fails on a tie and passes only when ours is strictly above every arm on every task", () => {
  const tie = winRule(summarize([scored("T1", "ours", 3), scored("T1", "base", 3)], TWO));
  assert.equal(tie.ruleB.pass, false);
  assert.deepEqual(tie.ruleB.failures, [{ task: "T1", by: ["base"] }]);

  const above = winRule(summarize([scored("T1", "ours", 4), scored("T1", "base", 3)], TWO));
  assert.equal(above.ruleB.pass, true);

  const meanTie = winRule(
    summarize([scored("T1", "ours", 4), scored("T1", "ours", 5), scored("T1", "ours", 5), scored("T1", "base", 4), scored("T1", "base", 5), scored("T1", "base", 5)], TWO),
  );
  assert.equal(meanTie.ruleB.pass, false, "means 4.67 and 4.67 tie");
});

test("rule A passes at exactly 20 percent and fails just below", () => {
  const table = (ours, base) => ({ arms: ["ours", "base"], tasks: ["T1"], cells: { T1: { ours: 5, base: 4 } }, totals: { ours, base } });
  assert.equal(winRule(table(12, 10)).ruleA.pass, true, "exactly 1.2 times");
  assert.equal(winRule(table(11.99, 10)).ruleA.pass, false, "just below");
  assert.equal(winRule(table(3.6, 3)).ruleA.pass, true, "float boundary");
});

test("a run with a missing grade counts that criterion as a failure and warns", () => {
  const objResult = { 1: true, 2: null, 3: null, 4: null, 5: null };
  const none = combineRun(tasks.T1.criteria, objResult, null);
  assert.equal(none.score, 1);
  assert.ok(none.warnings.includes("missing grade for criterion 2"));

  const bothCase = combineRun(tasks.T5.criteria, { 1: true, 2: null, 3: false, 4: null, 5: null }, {
    "2": { pass: true },
    "3": { pass: true },
    "4": { pass: true },
    "5": { pass: true },
  });
  assert.equal(bothCase.criteria[2].pass, false, "both needs the objective half too");
});

test("saturation lists the tasks on which every arm scores the maximum", () => {
  const runs = [
    scored("T1", "ours", 5),
    scored("T1", "base", 5),
    scored("T1", "dod", 5),
    scored("T2", "ours", 5),
    scored("T2", "base", 4),
    scored("T2", "dod", 5),
  ];
  const table = summarize(runs, { tasks: ["T1", "T2"], arms: ["ours", "base", "dod"] });
  assert.deepEqual(table.saturated, ["T1"]);
  assert.deepEqual(table.arms, ["ours", "base", "dod"]);
});

test("summarize lists every expected cell that has no scored run", () => {
  const table = summarize([scored("T1", "ours", 4), scored("T1", "base", 3), scored("T2", "ours", 4)], {
    tasks: ["T1", "T2"],
    arms: ["ours", "base"],
  });
  assert.deepEqual(table.incomplete.filter((c) => c.runs === 0), [{ task: "T2", arm: "base", runs: 0 }]);
});

function fullRuns(tasksList, armsList, scoreOf, n = 3) {
  const runs = [];
  for (const task of tasksList) {
    for (const arm of armsList) {
      for (let i = 0; i < n; i += 1) runs.push(scored(task, arm, scoreOf(task, arm)));
    }
  }
  return runs;
}
const SCORE = (task, arm) => (arm === "ours" ? 4 : 3);
const ARMS3 = ["ours", "base", "dod"];
const TASKS2 = ["T1", "T2"];

test("a missing arm fails the verdict and is visible in the table", () => {
  const runs = fullRuns(TASKS2, ["ours", "base"], SCORE);
  const table = summarize(runs, { tasks: TASKS2, arms: ARMS3 });
  assert.equal(table.incomplete.filter((c) => c.arm === "dod" && c.runs === 0).length, 2);
  const rule = winRule(table);
  assert.match(rule.verdict, /^FAIL: incomplete/);
  assert.equal(rule.pass, false);
  assert.match(rule.verdict, /2 cells without a scored run/);
  assert.match(rule.verdict, /incomplete/);
});

test("a missing task fails the verdict", () => {
  const runs = fullRuns(["T1"], ARMS3, SCORE);
  const table = summarize(runs, { tasks: TASKS2, arms: ARMS3 });
  assert.equal(table.incomplete.filter((c) => c.task === "T2" && c.runs === 0).length, 3);
  assert.match(winRule(table).verdict, /^FAIL: incomplete/);
  assert.match(winRule(table, { allowPartial: true }).verdict, /^FAIL: incomplete/, "allow-partial never hides a missing cell");
});

test("a cell with two scored runs fails, or is PARTIAL with allowPartial, and is never PASS", () => {
  const runs = fullRuns(TASKS2, ["ours", "base"], SCORE);
  runs.pop();
  const table = summarize(runs, { tasks: TASKS2, arms: ["ours", "base"] });
  assert.deepEqual(table.incomplete, [{ task: "T2", arm: "base", runs: 2 }]);
  assert.match(winRule(table).verdict, /^FAIL: incomplete \(1 cells with fewer than 3/);
  const partial = winRule(table, { allowPartial: true });
  assert.match(partial.verdict, /^PARTIAL/);
  assert.equal(partial.pass, false);
});

test("a complete table passes, and allowPartial does not change a complete PASS", () => {
  const runs = fullRuns(TASKS2, ["ours", "base"], SCORE);
  const table = summarize(runs, { tasks: TASKS2, arms: ["ours", "base"] });
  assert.equal(table.incomplete.length, 0);
  assert.equal(winRule(table).verdict, "PASS");
  assert.equal(winRule(table, { allowPartial: true }).verdict, "PASS");
});

test("summarize.mjs prints a verdict line for a runs directory, and fails with a message for an empty one", () => {
  const work = gradingWork();
  const r = spawnSync("node", [summarizeMjs, "--runs-dir", join(work, "runs"), "--markdown"], { encoding: "utf8", env: gradeEnv(work, "sum-log.jsonl") });
  assert.match(r.stdout, /\| task \|/);
  assert.match(r.stdout, /^(PASS|FAIL)/m);
  const empty = join(scratch, "empty-runs");
  mkdirSync(empty, { recursive: true });
  const none = spawnSync("node", [summarizeMjs, "--runs-dir", empty], { encoding: "utf8", env: childEnv() });
  assert.notEqual(none.status, 0, "an empty round is not a verdict");
  assert.equal(none.stdout, "");
  assert.match(none.stderr, /no DONE runs/);
});

test("grade.mjs skips a good grade unless --force, and a failed regrade never replaces a good grade", () => {
  const work = gradingWork();
  const runs = join(work, "runs");
  const logName = "skip-log.jsonl";
  const good = spawnSync("node", [gradeMjs, "--runs-dir", runs, "--only", "T1-ours-1"], { encoding: "utf8", env: gradeEnv(work, logName) });
  assert.equal(good.status, 0, good.stderr);
  const calls = readLog(logName).length;
  assert.equal(calls, 1, "one call for a good reply");
  const labels = JSON.parse(readFileSync(join(work, "grades", "labels.json"), "utf8"));
  const label = Object.keys(labels).find((k) => labels[k] === "T1-ours-1");
  const file = join(work, "grades", `${label}.json`);
  const before = readFileSync(file, "utf8");

  const skipped = spawnSync("node", [gradeMjs, "--runs-dir", runs, "--only", "T1-ours-1"], {
    encoding: "utf8",
    env: gradeEnv(work, logName, { STUB_MODE: "garbage" }),
  });
  assert.equal(skipped.status, 0, skipped.stderr);
  assert.match(skipped.stdout, /skipped/);
  assert.equal(readLog(logName).length, calls, "no grader call for a graded run");
  assert.equal(readFileSync(file, "utf8"), before);

  const forced = spawnSync("node", [gradeMjs, "--runs-dir", runs, "--only", "T1-ours-1", "--force"], {
    encoding: "utf8",
    env: gradeEnv(work, logName, { STUB_MODE: "garbage" }),
  });
  assert.equal(forced.status, 1, "a failed regrade is an error");
  assert.match(forced.stdout, /kept .*earlier grade stands/);
  assert.equal(readLog(logName).length, calls + 2, "--force calls the grader");
  const after = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(after.error, undefined, "the good grade was not replaced by an error");
  assert.equal(after.grades["5"].pass, true);
});

test("a run whose grade is an error is graded again without --force", () => {
  const work = gradingWork();
  const runs = join(work, "runs");
  const logName = "regrade-log.jsonl";
  const bad = spawnSync("node", [gradeMjs, "--runs-dir", runs, "--only", "T1-dod-1"], { encoding: "utf8", env: gradeEnv(work, logName, { STUB_MODE: "garbage" }) });
  assert.equal(bad.status, 1);
  const again = spawnSync("node", [gradeMjs, "--runs-dir", runs, "--only", "T1-dod-1"], { encoding: "utf8", env: gradeEnv(work, logName) });
  assert.equal(again.status, 0, again.stderr);
  const labels = JSON.parse(readFileSync(join(work, "grades", "labels.json"), "utf8"));
  const label = Object.keys(labels).find((k) => labels[k] === "T1-dod-1");
  assert.equal(JSON.parse(readFileSync(join(work, "grades", `${label}.json`), "utf8")).grades["5"].pass, true);
});

test("objective's git calls ignore the user's git config, so a diff.noprefix in HOME does not change what is parsed", () => {
  const home = mkdtempSync(join(scratch, "gitcfg-home-"));
  writeFileSync(join(home, ".gitconfig"), "[diff]\n\tnoprefix = true\n");
  const repo = mkdtempSync(join(scratch, "gitcfg-repo-"));
  const git = (args) => execFileSync("git", ["-C", repo, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", ...args], { encoding: "utf8" });
  git(["init", "-q"]);
  writeFileSync(join(repo, "a.txt"), "one\n");
  git(["add", "a.txt"]);
  git(["commit", "-q", "-m", "init"]);
  writeFileSync(join(repo, "a.txt"), "two\n");
  const before = process.env.HOME;
  process.env.HOME = home;
  try {
    assert.match(gitOutput(repo, ["diff"]), /^diff --git a\/a\.txt b\/a\.txt$/m);
  } finally {
    process.env.HOME = before;
  }
});
