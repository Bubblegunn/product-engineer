import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDiff, crossCheck, isTestPath, isDocPath, namedPaths } from "../bin/diff.mjs";

const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "check.mjs");
const has = (f, level, re) => f.some((x) => x.level === level && re.test(x.message));

/** A repository with one commit, then a second change staged on top of it. */
function repo(staged) {
  const dir = mkdtempSync(join(tmpdir(), "pe-diff-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "--quiet", "-b", "main");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "T");
  writeFileSync(join(dir, "README.md"), "# fixture\n");
  git("add", "-A");
  git("commit", "--quiet", "-m", "init");
  for (const [path, body] of Object.entries(staged)) {
    mkdirSync(join(dir, dirname(path)), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  git("add", "-A");
  return { dir, git };
}

test("paths are sorted into source, test and documentation by their conventions", () => {
  for (const p of ["test/a.mjs", "tests/b.py", "src/__tests__/c.ts", "src/a.test.ts", "pkg/b_spec.rb", "test_thing.py"]) {
    assert.equal(isTestPath(p), true, p);
  }
  for (const p of ["src/index.ts", "bin/run.mjs", "package.json"]) assert.equal(isTestPath(p), false, p);
  for (const p of ["README.md", "docs/guide.md", "LICENSE", "notes.txt"]) assert.equal(isDocPath(p), true, p);
  assert.equal(isDocPath("src/index.ts"), false);
});

test("readDiff counts the staged change, including a rename", () => {
  const { dir, git } = repo({ "src/a.ts": "one\ntwo\n" });
  try {
    git("commit", "--quiet", "-m", "add a");
    git("mv", "src/a.ts", "src/b.ts");
    const d = readDiff({ cwd: dir });
    assert.equal(d.files.length, 1);
    assert.equal(d.files[0].path, "src/b.ts");
    assert.equal(d.range, "--cached");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a claim that tests were added is checked against the files that gained lines", () => {
  const withoutTests = repo({ "src/a.ts": "code\n" });
  try {
    const d = readDiff({ cwd: withoutTests.dir });
    const claim = "Added a regression test for the empty case.";
    assert.ok(has(crossCheck(claim, d, { cwd: withoutTests.dir }), "warn", /says tests were added; no test file gains a line/));
    // No claim, no finding: the check is silent unless the message asserts something.
    assert.ok(!has(crossCheck("Renamed the helper.", d, { cwd: withoutTests.dir }), "warn", /tests/));
  } finally {
    rmSync(withoutTests.dir, { recursive: true, force: true });
  }

  const withTests = repo({ "src/a.ts": "code\n", "test/a.test.ts": "assert(true)\n" });
  try {
    const d = readDiff({ cwd: withTests.dir });
    assert.ok(has(crossCheck("Added a regression test for the empty case.", d, { cwd: withTests.dir }), "ok", /tests claimed and 1 test file gains lines/));
  } finally {
    rmSync(withTests.dir, { recursive: true, force: true });
  }
});

test("documentation only is contradicted by a source file, and a refactor claim is not checked", () => {
  const { dir } = repo({ "src/a.ts": "code\n", "README.md": "# fixture\nmore\n" });
  try {
    const d = readDiff({ cwd: dir });
    assert.ok(has(crossCheck("Documentation only.", d, { cwd: dir }), "warn", /documentation only; 1 file is not documentation: src\/a\.ts/));
    // A refactor may legitimately touch source while claiming no behaviour change.
    assert.ok(!has(crossCheck("A refactor with no behaviour change.", d, { cwd: dir }), "warn", /documentation only/));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a stated file count is compared with the change, in digits or words", () => {
  const { dir } = repo({ "src/a.ts": "code\n", "src/b.ts": "code\n" });
  try {
    const d = readDiff({ cwd: dir });
    assert.ok(has(crossCheck("Changed 3 files.", d, { cwd: dir }), "warn", /says 3 files; the change has 2/));
    assert.ok(has(crossCheck("Changed two files.", d, { cwd: dir }), "ok", /stated file count matches the change: 2/));
    // A number about something other than this change needs a change verb to be read as a claim.
    assert.ok(!has(crossCheck("The tarball ships 9 files.", d, { cwd: dir }), "warn", /file count|says 9/));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a named path is reported only when it is neither in the change nor in the repository", () => {
  const { dir } = repo({ "src/a.ts": "code\n" });
  try {
    const d = readDiff({ cwd: dir });
    assert.ok(has(crossCheck("Touched `src/gone.ts` for this.", d, { cwd: dir }), "warn", /not in this change and not in the repository: src\/gone\.ts/));
    // In the change: ordinary.
    assert.ok(!has(crossCheck("Touched `src/a.ts` for this.", d, { cwd: dir }), "warn", /not in this change/));
    // Present but untouched: ordinary context, not a broken reference.
    assert.ok(!has(crossCheck("As in `README.md`.", d, { cwd: dir }), "warn", /not in this change/));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("namedPaths reads backticked and bare paths and ignores prose", () => {
  const found = namedPaths("see `src/a.ts` and docs/b.md but not README or 3.5 or a/b");
  assert.deepEqual(found.sort(), ["docs/b.md", "src/a.ts"]);
});

test("the flag is opt-in, reports warnings only, and survives a range git does not know", () => {
  const { dir, git } = repo({ "src/a.ts": "code\n" });
  try {
    git("commit", "--quiet", "-m", "add a");
    const msg = join(dir, "m.txt");
    writeFileSync(msg, "feat: a\n\nFor the customer:\nWhat changed: Something.\nWhy it matters: A reason.\n\nAdded tests.\n");
    const run = (...extra) => execFileSync(process.execPath, [cli, "check", msg, ...extra], { cwd: dir, encoding: "utf8" });

    // Without the flag the diff is never read.
    assert.ok(!/cross-checked/.test(run()));
    // With it, the claim is checked and the run still exits 0, because no check here errors.
    const out = run("--diff", "HEAD~1");
    assert.match(out, /cross-checked against 1 file/);
    assert.match(out, /says tests were added/);
    assert.match(out, /no errors, 1 warning/);

    // An unknown range warns instead of crashing, and the message is still checked.
    const bad = execFileSync(process.execPath, [cli, "check", msg, "--diff", "no-such-ref"], { cwd: dir, encoding: "utf8" });
    assert.match(bad, /--diff could not read the change/);
    assert.match(bad, /"For the customer:" block/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
