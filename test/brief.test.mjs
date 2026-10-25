import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RULES, assemble, baselinePath, brief, readBaseline, runBrief, testCommand, writeBaseline } from "../bin/brief.mjs";
import { verify } from "../bin/verify.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "bin", "brief.mjs");
// git needs an identity for commits and for `git stash create`, also when the test runs on a machine without one.
process.env.GIT_AUTHOR_NAME ??= "Dev";
process.env.GIT_AUTHOR_EMAIL ??= "dev@example.com";
process.env.GIT_COMMITTER_NAME ??= "Dev";
process.env.GIT_COMMITTER_EMAIL ??= "dev@example.com";
const DATE = "2026-10-01T10:00:00+0000";
const GIT_OPTS = ["-c", "user.name=Dev", "-c", "user.email=dev@example.com", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null"];
const git = (cwd, ...args) => execFileSync("git", [...GIT_OPTS, ...args], { cwd, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_DATE: DATE, GIT_COMMITTER_DATE: DATE } });

function newRepo() {
  const dir = mkdtempSync(join(tmpdir(), "brief-"));
  git(dir, "init", "-q", "-b", "master");
  return dir;
}
function put(dir, files) {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
}
function commit(dir, files, subject) {
  put(dir, files);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", subject);
}
// Runs the brief in a directory and returns the section lines (the text between header and final line).
function sections(dir) {
  const text = brief({ cwd: dir });
  assert.ok(text, "expected a brief inside a repository");
  return text.split("\n");
}
const rmDir = (dir) => rmSync(dir, { recursive: true, force: true });
const withRepo = (fn) => {
  const dir = newRepo();
  try {
    fn(dir);
  } finally {
    rmDir(dir);
  }
};

test("state: names staged, unstaged and untracked files, and says clean when none", () => {
  withRepo((dir) => {
    commit(dir, { "src/a.mjs": "export const a = 1;\n", "src/b.mjs": "export const b = 1;\n" }, "feat: add a and b");
    assert.ok(sections(dir).includes("state: clean tree"));
    put(dir, { "src/a.mjs": "export const a = 2;\n" });
    git(dir, "add", "src/a.mjs");
    put(dir, { "src/b.mjs": "export const b = 2;\n", "src/c.mjs": "x\n" });
    const lines = sections(dir);
    assert.ok(lines.includes("state: 1 staged, 1 unstaged, 1 untracked"));
    assert.ok(lines.includes("  staged (1): src/a.mjs"));
    assert.ok(lines.includes("  unstaged (1): src/b.mjs"));
    assert.ok(lines.includes("  untracked (1): src/c.mjs"));
  });
});

test("state: caps each list at six names and counts the rest", () => {
  withRepo((dir) => {
    commit(dir, { "seed.txt": "seed\n" }, "chore: seed");
    const files = {};
    for (let i = 0; i < 9; i++) files[`f${i}.txt`] = "x\n";
    put(dir, files);
    assert.ok(sections(dir).some((l) => /^ {2}untracked \(9\): f0.txt, f1.txt, f2.txt, f3.txt, f4.txt, f5.txt, \+3 more$/.test(l)));
  });
});

test("last commits: sha, type with its classes, subject, newest first; a mark when the type contradicts the files", () => {
  withRepo((dir) => {
    commit(dir, { "README.md": "one\n" }, "chore: first");
    commit(dir, { "src/x.mjs": "export const x = 1;\n" }, "docs: change source without docs");
    commit(dir, { "src/x.mjs": "export const x = 2;\n", "test/x.test.mjs": "x\n" }, "feat: x");
    const lines = sections(dir);
    const at = lines.indexOf("last commits (newest first):");
    assert.ok(at > 0);
    // Three commits: the root ("chore: first") is never listed, so the two after it are.
    const [newest, middle] = lines.slice(at + 1, at + 3);
    assert.match(newest, /^ {2}[0-9a-f]{7} feat\/test\+source feat: x$/);
    assert.match(middle, /^ {2}[0-9a-f]{7} docs\/source docs: change source without docs \[type contradicts the files\]$/);
    assert.ok(!lines.some((l) => l.includes("chore: first")));
  });
});

test("last commits: says none is listed when the only commit is the root", () => {
  withRepo((dir) => {
    commit(dir, { "a.txt": "a\n" }, "chore: only");
    assert.ok(sections(dir).includes("last commits: none listed, the only commit is the root commit"));
  });
});

test("tests: names the command the repository uses, and none found when there is none", () => {
  withRepo((dir) => {
    commit(dir, { "src/a.txt": "a\n" }, "chore: nothing to test");
    assert.ok(sections(dir).some((l) => l.startsWith("tests: no test command found (looked at")));
  });
  withRepo((dir) => {
    commit(dir, { "package.json": JSON.stringify({ scripts: { test: "node --test" } }) + "\n" }, "chore: pkg");
    assert.ok(sections(dir).includes("tests: npm test"));
  });
  withRepo((dir) => {
    commit(dir, { "package.json": JSON.stringify({ scripts: { test: 'echo "Error: no test specified" && exit 1' } }) + "\n", "test/a.test.mjs": "x\n" }, "chore: pkg");
    assert.ok(sections(dir).includes("tests: node --test"));
  });
  withRepo((dir) => {
    commit(dir, { "tests/test_core.py": "x\n" }, "chore: py");
    assert.equal(testCommand(dir), "pytest");
  });
  withRepo((dir) => {
    commit(dir, { "pkg/core_test.go": "x\n" }, "chore: go");
    assert.equal(testCommand(dir), "go test ./...");
  });
  withRepo((dir) => {
    commit(dir, { "Cargo.toml": "[package]\n" }, "chore: rust");
    assert.equal(testCommand(dir), "cargo test");
  });
});

test("unmerged branches: lists a branch with work HEAD lacks, with ahead count, author and date; skips merged ones", () => {
  withRepo((dir) => {
    commit(dir, { "a.txt": "a\n" }, "chore: base");
    git(dir, "branch", "already-merged");
    git(dir, "checkout", "-q", "-b", "feature/old");
    commit(dir, { "b.txt": "b\n" }, "feat: old work");
    git(dir, "checkout", "-q", "master");
    const lines = sections(dir);
    assert.ok(lines.includes("unmerged branches (local and remote, not in HEAD): 1"));
    assert.ok(lines.includes("  feature/old: 1 ahead, last by Dev, 2026-10-01"));
    assert.ok(!lines.some((l) => l.includes("already-merged")));
  });
});

test("unmerged branches: says none when every branch is merged", () => {
  withRepo((dir) => {
    commit(dir, { "a.txt": "a\n" }, "chore: base");
    git(dir, "branch", "already-merged");
    assert.ok(sections(dir).includes("unmerged branches: none (searched local and remote-tracking branches)"));
  });
});

test("latest tag: names the tag and the commits since it, or none", () => {
  withRepo((dir) => {
    commit(dir, { "a.txt": "a\n" }, "chore: base");
    assert.ok(sections(dir).includes("latest tag: none reachable from HEAD"));
    git(dir, "tag", "v1.0.0");
    commit(dir, { "a.txt": "b\n" }, "fix: later");
    commit(dir, { "a.txt": "c\n" }, "fix: later again");
    assert.ok(sections(dir).includes("latest tag: v1.0.0, 2 commits since"));
  });
});

test("skipped tests: counts skipped tests in tracked test files and names the first three", () => {
  withRepo((dir) => {
    commit(dir, { "test/a.test.mjs": "test('ok', () => {});\ntest.skip('later', () => {});\n", "src/b.mjs": "it.skip('not a test file', 1);\n" }, "test: add");
    commit(dir, { "test/c.test.mjs": "describe.todo('x');\nxit('y');\n" }, "test: more");
    const lines = sections(dir);
    assert.ok(lines.includes("skipped or todo tests: 3 in tracked test files on this branch"));
    assert.ok(lines.includes("  test/a.test.mjs:2"));
    assert.ok(lines.includes("  test/c.test.mjs:1"));
    assert.ok(lines.includes("  test/c.test.mjs:2"));
    assert.ok(!lines.some((l) => l.includes("src/b.mjs")));
  });
});

test("skipped tests: the option forms of node:test count, and a skip option set to false does not", () => {
  withRepo((dir) => {
    commit(dir, { "test/a.test.mjs": "test('a', { skip: 'flaky on CI' }, () => {});\ntest('b', { todo: true }, () => {});\ntest('c', { timeout: 5 }, () => {});\n", "test/b.test.mjs": "test('d', { skip: false }, () => {});\n" }, "test: add");
    const lines = sections(dir);
    assert.ok(lines.includes("skipped or todo tests: 2 in tracked test files on this branch"));
    assert.ok(lines.includes("  test/a.test.mjs:1") && lines.includes("  test/a.test.mjs:2"));
  });
});

test("skipped tests: says none when no tracked test file skips a test", () => {
  withRepo((dir) => {
    commit(dir, { "test/a.test.mjs": "test('ok', () => {});\n" }, "test: add");
    assert.ok(sections(dir).includes("skipped or todo tests: none in tracked test files on this branch or in the 0 unmerged branches searched; untracked files not searched"));
  });
});

test("skipped tests: a skipped test that exists only on an unmerged branch is named with its branch, and none never claims what was not searched", () => {
  withRepo((dir) => {
    commit(dir, { "test/a.test.mjs": "test('ok', () => {});\n" }, "test: add");
    git(dir, "checkout", "-q", "-b", "feature/export");
    commit(dir, { "test/export.test.mjs": "test('rows', () => {});\ntest.skip('flaky on CI', () => {});\n" }, "test: export");
    git(dir, "checkout", "-q", "master");
    const lines = sections(dir);
    assert.ok(lines.includes("skipped or todo tests: none in tracked test files on this branch, but unmerged branches add some"));
    assert.ok(lines.includes("  not merged, on feature/export: test/export.test.mjs:2"));
    assert.ok(!lines.some((l) => l.startsWith("skipped or todo tests: none in tracked test files on this branch or")));
  });
});

test("skipped tests: with no skip anywhere, none states the branches it searched and that untracked files are not searched", () => {
  withRepo((dir) => {
    commit(dir, { "test/a.test.mjs": "test('ok', () => {});\n" }, "test: add");
    git(dir, "checkout", "-q", "-b", "feature/x");
    commit(dir, { "test/x.test.mjs": "test('x', () => {});\n" }, "test: x");
    git(dir, "checkout", "-q", "master");
    assert.ok(sections(dir).includes("skipped or todo tests: none in tracked test files on this branch or in the 1 unmerged branch searched; untracked files not searched"));
  });
});

test("skipped tests: branches beyond the first five are reported as not searched", () => {
  withRepo((dir) => {
    commit(dir, { "test/a.test.mjs": "test('ok', () => {});\n" }, "test: add");
    for (let i = 0; i < 7; i++) {
      git(dir, "checkout", "-q", "-b", `b${i}`, "master");
      commit(dir, { [`f${i}.txt`]: "x\n" }, `chore: ${i}`);
    }
    git(dir, "checkout", "-q", "master");
    const line = sections(dir).find((l) => l.startsWith("skipped or todo tests: none"));
    assert.match(line, /; 2 more unmerged branches not searched/);
  });
});

test("--hook prints the always-on rules after the brief, and they name no file, setting or value of any task", () => {
  withRepo((dir) => {
    commit(dir, { "a.txt": "a\n" }, "chore: a");
    const sid = `hook-rules-${process.pid}-${Date.now()}`;
    const r = spawnSync(process.execPath, [CLI, "--hook"], { cwd: dir, encoding: "utf8", input: JSON.stringify({ session_id: sid, cwd: dir }) });
    try {
      const ctx = JSON.parse(r.stdout.split("\n").filter(Boolean)[0]).hookSpecificOutput.additionalContext;
      assert.ok(ctx.endsWith(RULES));
      assert.ok(ctx.indexOf("repo brief:") < ctx.indexOf("product-engineer rules"));
    } finally {
      rmSync(baselinePath(sid), { force: true });
    }
  });
  const lines = RULES.split("\n");
  assert.ok(lines.length <= 10, "ten lines at most");
  assert.ok(RULES.length <= 1700, `short enough to cost little: ${RULES.length}`);
  // Each rule the owner listed is there: shape follows the request, search before editing, real test state, every branch, keep names, scoped none.
  for (const re of [/request decides the shape/, /search the whole repository/, /real test state/, /every branch/, /Keep the names and numbers/, /true only for what was searched/, /still do the part that can be undone/, /ask only before something that cannot be undone/]) assert.match(RULES, re);
});

test("identifiers changed: names a removed identifier that no added line carries", () => {
  withRepo((dir) => {
    commit(dir, { "src/lib.mjs": "export function computeTotal(items) { return items.length; }\n" }, "feat: lib");
    put(dir, { "src/lib.mjs": "export function sumPrices(items) { return items.length; }\n" });
    const lines = sections(dir);
    const line = lines.find((l) => l.startsWith("identifiers changed"));
    assert.equal(line, "identifiers changed (removed, not added back): computeTotal");
  });
});

test("identifiers changed: says none when the change only adds or keeps names", () => {
  withRepo((dir) => {
    commit(dir, { "src/lib.mjs": "export const keep = 1;\n" }, "feat: lib");
    put(dir, { "src/lib.mjs": "export const keep = 2;\nexport const extra = 3;\n" });
    assert.ok(sections(dir).includes("identifiers changed in the working tree against HEAD: none"));
  });
});

test("hot files: lists files touched by three or more of the last twenty commits, most touched first", () => {
  withRepo((dir) => {
    commit(dir, { "hot.txt": "0\n", "cold.txt": "0\n" }, "chore: start");
    for (let i = 1; i <= 3; i++) commit(dir, { "hot.txt": `${i}\n` }, `fix: hot ${i}`);
    commit(dir, { "cold.txt": "1\n" }, "fix: cold once");
    assert.ok(sections(dir).includes("hot files (3+ of last 20 commits): hot.txt (4)"));
  });
});

test("hot files: says none when no file is touched three times", () => {
  withRepo((dir) => {
    commit(dir, { "a.txt": "a\n" }, "chore: a");
    commit(dir, { "b.txt": "b\n" }, "chore: b");
    assert.ok(sections(dir).includes("hot files (3+ of last 20 commits): none"));
  });
});

test("authors of changed files: names the people whose commits touch the changed files", () => {
  withRepo((dir) => {
    commit(dir, { "src/a.mjs": "1\n" }, "feat: a");
    commit(dir, { "src/a.mjs": "2\n" }, "feat: a again");
    put(dir, { "src/a.mjs": "3\n" });
    assert.ok(sections(dir).includes("authors of changed files: Dev (2)"));
  });
});

test("authors of changed files: says none when the tree has no change", () => {
  withRepo((dir) => {
    commit(dir, { "src/a.mjs": "1\n" }, "feat: a");
    assert.ok(sections(dir).includes("authors of changed files: none (no tracked file differs from HEAD)"));
  });
});

test("header and final line are always present", () => {
  withRepo((dir) => {
    commit(dir, { "a.txt": "a\n" }, "chore: a");
    const lines = sections(dir);
    assert.equal(lines[0], "repo brief: branch master");
    assert.equal(lines.at(-1), 'Settle counts with product-engineer range / claims, repeated code with twins, and "nothing else uses X" with git grep before you say it.');
  });
});

test("truncation: assemble keeps the header and the final line and drops the least important block first", () => {
  // The first block is the most important and carries a long item; the last block is the least important.
  const blocks = [
    ["state: a", `  ${"s".repeat(300)}`],
    ["tests: npm test"],
    ["hot files: h", `  ${"h".repeat(300)}`],
    [`authors of changed files: ${"a".repeat(300)}`],
  ];
  const header = "repo brief: branch main";
  const final = "FINAL LINE";
  const untrimmed = [header, ...blocks.flat(), final].join("\n");
  assert.ok(untrimmed.length > 700, "the fixture must exceed the limit, or the test is vacuous");
  const out = assemble(header, blocks, final, 700);
  assert.ok(out.length <= 700);
  assert.equal(out.split("\n")[0], header);
  assert.equal(out.split("\n").at(-1), final);
  assert.ok(out.includes(`  ${"s".repeat(300)}`), "the item of the most important block stays");
  assert.ok(out.includes("tests: npm test"));
  assert.ok(!out.includes("authors of changed files"), "the least important block goes first");
});

test("truncation: a repository with long names still gives at most 1500 characters", () => {
  withRepo((dir) => {
    const long = (n) => `${"x".repeat(n)}Name`;
    commit(dir, { "src/base.mjs": "export const base = 1;\n" }, "chore: base");
    for (let i = 0; i < 6; i++) commit(dir, { [`src/file${i}.mjs`]: `export const v${i} = 1;\n` }, `feat: ${"describe the change ".repeat(6)}${i}`);
    for (let i = 0; i < 5; i++) {
      git(dir, "branch", `feature/${long(60)}${i}`, "HEAD~1");
    }
    const body = [];
    for (let i = 0; i < 8; i++) body.push(`export function ${long(60)}${i}() {}`);
    commit(dir, { "src/many.mjs": `${body.join("\n")}\n` }, "feat: many");
    put(dir, { "src/many.mjs": "export const nothing = 1;\n" });
    const text = brief({ cwd: dir });
    assert.ok(text.length <= 1500, `got ${text.length}`);
    assert.equal(text.split("\n")[0], "repo brief: branch master");
    assert.ok(text.endsWith('before you say it.'));
    const unlimited = brief({ cwd: dir, max: 100000 });
    assert.ok(unlimited.length > 1500, "the repository must be large enough that the limit cut something");
  });
});

test("not a git repository: brief is null, the command prints nothing and exits 0", () => {
  const dir = mkdtempSync(join(tmpdir(), "brief-plain-"));
  try {
    assert.equal(brief({ cwd: dir }), null);
    const r = spawnSync(process.execPath, [CLI], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
    const h = spawnSync(process.execPath, [CLI, "--hook"], { cwd: dir, encoding: "utf8", input: "{\"session_id\":\"plain-1\"}" });
    assert.equal(h.status, 0);
    assert.equal(h.stdout, "");
    assert.equal(readBaseline("plain-1"), null);
  } finally {
    rmDir(dir);
  }
});

test("--hook prints one SessionStart JSON line with the brief as additionalContext", () => {
  withRepo((dir) => {
    commit(dir, { "a.txt": "a\n" }, "chore: a");
    const sid = `hook-shape-${process.pid}-${Date.now()}`;
    const r = spawnSync(process.execPath, [CLI, "--hook"], { cwd: dir, encoding: "utf8", input: JSON.stringify({ session_id: sid, cwd: dir }) });
    try {
      assert.equal(r.status, 0);
      const lines = r.stdout.split("\n").filter(Boolean);
      assert.equal(lines.length, 1);
      const json = JSON.parse(lines[0]);
      assert.deepEqual(Object.keys(json), ["hookSpecificOutput"]);
      assert.equal(json.hookSpecificOutput.hookEventName, "SessionStart");
      assert.match(json.hookSpecificOutput.additionalContext, /^repo brief: branch master\n/);
    } finally {
      rmSync(baselinePath(sid), { force: true });
    }
  });
});

test("--hook prints nothing when PRODUCT_ENGINEER_NO_BRIEF=1, and still records the baseline", () => {
  withRepo((dir) => {
    commit(dir, { "a.txt": "a\n" }, "chore: a");
    const sid = `hook-off-${process.pid}-${Date.now()}`;
    const r = spawnSync(process.execPath, [CLI, "--hook"], { cwd: dir, encoding: "utf8", input: JSON.stringify({ session_id: sid }), env: { ...process.env, PRODUCT_ENGINEER_NO_BRIEF: "1" } });
    try {
      assert.equal(r.stdout, "");
      assert.ok(readBaseline(sid));
    } finally {
      rmSync(baselinePath(sid), { force: true });
    }
  });
});

test("baseline: a dirty tree is recorded as a stash commit, the stash list stays empty and the work tree does not change", () => {
  withRepo((dir) => {
    commit(dir, { "a.txt": "one\n" }, "chore: a");
    put(dir, { "a.txt": "two\n", "new.txt": "untracked\n" });
    const before = git(dir, "status", "--porcelain=v1", "-uall");
    const sid = `base-dirty-${process.pid}-${Date.now()}`;
    try {
      const path = writeBaseline({ cwd: dir, sessionId: sid, now: Date.UTC(2026, 9, 1) });
      assert.equal(path, baselinePath(sid));
      const saved = JSON.parse(readFileSync(path, "utf8"));
      assert.equal(saved.head, git(dir, "rev-parse", "HEAD").trim());
      assert.match(saved.stash, /^[0-9a-f]{40}$/);
      assert.notEqual(saved.stash, saved.head);
      assert.equal(saved.time, "2026-10-01T00:00:00.000Z");
      assert.equal(git(dir, "stash", "list"), "");
      assert.equal(git(dir, "status", "--porcelain=v1", "-uall"), before);
      assert.equal(readFileSync(join(dir, "a.txt"), "utf8"), "two\n");
    } finally {
      rmSync(baselinePath(sid), { force: true });
    }
  });
});

test("baseline: a clean tree records HEAD and no stash", () => {
  withRepo((dir) => {
    commit(dir, { "a.txt": "one\n" }, "chore: a");
    const sid = `base-clean-${process.pid}-${Date.now()}`;
    try {
      writeBaseline({ cwd: dir, sessionId: sid });
      const b = readBaseline(sid);
      assert.equal(b.head, git(dir, "rev-parse", "HEAD").trim());
      assert.equal(b.stash, null);
    } finally {
      rmSync(baselinePath(sid), { force: true });
    }
  });
});

test("baseline: a compact keeps the baseline already recorded for the session", () => {
  withRepo((dir) => {
    commit(dir, { "a.txt": "one\n" }, "chore: a");
    const sid = `base-compact-${process.pid}-${Date.now()}`;
    try {
      writeBaseline({ cwd: dir, sessionId: sid });
      const first = readFileSync(baselinePath(sid), "utf8");
      commit(dir, { "a.txt": "two\n" }, "fix: later");
      writeBaseline({ cwd: dir, sessionId: sid, source: "compact" });
      assert.equal(readFileSync(baselinePath(sid), "utf8"), first);
      writeBaseline({ cwd: dir, sessionId: sid, source: "startup" });
      assert.notEqual(readFileSync(baselinePath(sid), "utf8"), first);
    } finally {
      rmSync(baselinePath(sid), { force: true });
    }
  });
});

test("baseline: an empty session id writes nothing", () => {
  withRepo((dir) => {
    commit(dir, { "a.txt": "one\n" }, "chore: a");
    assert.equal(writeBaseline({ cwd: dir, sessionId: "" }), null);
    assert.equal(baselinePath(""), null);
  });
});

test("verify uses the baseline: a removal made before the session is not the session's change", () => {
  withRepo((dir) => {
    commit(dir, { "src/lib.mjs": "export function oldName() { return 1; }\nexport function keptName() { return 2; }\n", "src/use.mjs": "import { oldName, keptName } from './lib.mjs';\nconsole.log(oldName(), keptName());\n" }, "feat: lib");
    // The user removes oldName by hand before the session starts; the session then removes keptName.
    put(dir, { "src/lib.mjs": "export function keptName() { return 2; }\n" });
    const sid = `verify-base-${process.pid}-${Date.now()}`;
    const session = { events: [{ kind: "write", path: "src/lib.mjs" }], last: "done" };
    try {
      writeBaseline({ cwd: dir, sessionId: sid });
      put(dir, { "src/lib.mjs": "export const other = 3;\n" });
      const withBase = verify({ cwd: dir, session, answer: "done", sessionId: sid });
      const dangling = withBase.find((f) => f.id === "names-dangling");
      assert.ok(dangling, "the session removed keptName and use.mjs still calls it");
      assert.match(dangling.text, /keptName at src\/use\.mjs/);
      assert.ok(!dangling.text.includes("oldName"), "oldName was removed before the session");
      const withoutBase = verify({ cwd: dir, session, answer: "done", sessionId: `${sid}-none` });
      assert.ok(withoutBase.find((f) => f.id === "names-dangling" && /oldName/.test(f.text)), "without a baseline the whole change counts");
    } finally {
      rmSync(baselinePath(sid), { force: true });
    }
  });
});

test("verify with a baseline and no change in the session reports nothing from the user's own edits", () => {
  withRepo((dir) => {
    commit(dir, { "src/lib.mjs": "export function oldName() { return 1; }\n", "src/use.mjs": "import { oldName } from './lib.mjs';\nconsole.log(oldName());\n" }, "feat: lib");
    put(dir, { "src/lib.mjs": "export const other = 3;\n" });
    const sid = `verify-quiet-${process.pid}-${Date.now()}`;
    try {
      writeBaseline({ cwd: dir, sessionId: sid });
      const findings = verify({ cwd: dir, session: { events: [{ kind: "write", path: "src/lib.mjs" }], last: "done" }, answer: "done", sessionId: sid });
      assert.ok(!findings.some((f) => f.id === "names-dangling"));
    } finally {
      rmSync(baselinePath(sid), { force: true });
    }
  });
});

test("performance: a brief of a 3000-file repository takes under two seconds", () => {
  withRepo((dir) => {
    const files = {};
    for (let i = 0; i < 3000; i++) files[`pkg${i % 30}/mod${i}.mjs`] = `export const v${i} = ${i};\n`;
    put(dir, files);
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "chore: many files");
    for (let i = 0; i < 4; i++) commit(dir, { "pkg0/mod0.mjs": `export const v0 = ${i + 100};\n` }, `fix: touch ${i}`);
    put(dir, { "pkg1/mod1.mjs": "export const changed = 1;\n" });
    const t0 = performance.now();
    const text = brief({ cwd: dir });
    const ms = performance.now() - t0;
    assert.ok(text);
    assert.ok(ms < 2000, `took ${Math.round(ms)} ms`);
  });
});

test("testCommand: null for a repository with no test setup", () => {
  withRepo((dir) => {
    commit(dir, { "a.txt": "a\n" }, "chore: a");
    assert.equal(testCommand(dir), null);
  });
});

test("runBrief prints the brief for a plain run inside a repository", () => {
  const r = spawnSync(process.execPath, [CLI], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^repo brief: branch /);
  assert.ok(r.stdout.length <= 1501);
});
