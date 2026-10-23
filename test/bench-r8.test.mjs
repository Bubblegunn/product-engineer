// Round r8, item r8-0b (b): grader material for external (held-out) tasks.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildMaterial } from "../bench/head-to-head/grade.mjs";

const scratch = mkdtempSync(join(tmpdir(), "h2h-r8-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

function git(repo, ...args) {
  return execFileSync(
    "git",
    ["-C", repo, "-c", "user.name=Tester", "-c", "user.email=tester@example.com", "-c", "commit.gpgsign=false", ...args],
    { encoding: "utf8" },
  ).trim();
}

let counter = 0;
// A run directory whose repo has a fixture commit, fixture-state, one new commit and one uncommitted edit.
function makeRun(variant) {
  counter += 1;
  const runDir = join(scratch, `run-${counter}`);
  const repo = join(runDir, "repo");
  mkdirSync(repo, { recursive: true });
  git(repo, "init", "-q", "-b", "main");
  writeFileSync(join(repo, "a.txt"), "one\n");
  git(repo, "add", "a.txt");
  git(repo, "commit", "-q", "-m", "init");
  const head = git(repo, "rev-parse", "HEAD");
  writeFileSync(join(repo, ".git", "fixture-state"), `head=${head}\ntree=x\nvariant=${variant}\n`);
  writeFileSync(join(repo, "b.txt"), "committed line\n");
  git(repo, "add", "b.txt");
  git(repo, "commit", "-q", "-m", "add b");
  writeFileSync(join(repo, "a.txt"), "one\nuncommitted line\n");
  writeFileSync(join(repo, "c.txt"), "loose file\n");
  writeFileSync(join(runDir, "out.jsonl"), "");
  return runDir;
}

const task = { prompt: "Fix it.", criteria: [{ id: 1, text: "Does it.", kind: "llm" }] };
const paths = (runDir) => ({ runDir, workDir: runDir, runId: "X1-x-1" });

test("r8-0b: external material shows the full patch of new commits and the working-tree diff", () => {
  const runDir = makeRun("external");
  const material = buildMaterial(runDir, { ...task, variant: "external" }, paths(runDir));
  assert.match(material, /patch:\n/);
  assert.doesNotMatch(material, /diff stat:/);
  assert.match(material, /^\+committed line$/m);
  assert.match(material, /GIT DIFF OF THE WORKING TREE/);
  assert.match(material, /^\+uncommitted line$/m);
  assert.match(material, /new file c\.txt\nloose file/);
  assert.doesNotMatch(material, /FINAL NPM TEST OUTPUT/);
});

test("r8-0b: PE_BENCH_GRADER_EVIDENCE=legacy restores the stat-only material", () => {
  const runDir = makeRun("external");
  process.env.PE_BENCH_GRADER_EVIDENCE = "legacy";
  try {
    const material = buildMaterial(runDir, { ...task, variant: "external" }, paths(runDir));
    assert.match(material, /diff stat:/);
    assert.doesNotMatch(material, /patch:\n/);
    assert.doesNotMatch(material, /GIT DIFF OF THE WORKING TREE/);
  } finally {
    delete process.env.PE_BENCH_GRADER_EVIDENCE;
  }
});

test("r8-0b: a non-external variant keeps its stat-only material", () => {
  const runDir = makeRun("commit");
  const material = buildMaterial(runDir, { ...task, variant: "commit" }, paths(runDir));
  assert.match(material, /diff stat:/);
  assert.doesNotMatch(material, /GIT DIFF OF THE WORKING TREE/);
});
