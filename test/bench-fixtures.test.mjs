// The head-to-head fixture builder: bench/head-to-head/mk.sh builds the six variants of the
// "stayhub" repository that docs/HEAD-TO-HEAD.md describes. These tests run the real git and bash,
// build into a scratch directory and check the facts each task depends on.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mk = join(root, "bench", "head-to-head", "mk.sh");
const scratch = mkdtempSync(join(tmpdir(), "h2h-fixtures-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

const VARIANTS = ["commit", "done", "pr", "pr2", "pr3", "notes", "perf", "refactor"];
const IDENTITY = "Dev <dev@example.com>";
const BASE_SUBJECTS = [
  "chore: initial stayhub reminders, mail text and listing",
  "feat(export): add CSV export of bookings",
];
const BASE_DAYS = ["2026-10-14", "2026-10-15"];
const TAG = "v1.4.0";
const PR_BRANCH = "perf/tidy-export";
const PR_SUBJECT = "tidy export code";
const NOTES_SUBJECTS = [
  "refactor(pricing): extract round2 helper",
  "feat(bulk): add bulk cancel button to the bookings page",
  "docs: document bulk cancel in the README",
  "fix(security): escape formulas in CSV export so spreadsheets do not run them",
  'Revert "feat(bulk): add bulk cancel button to the bookings page"',
  "chore: bump version to 1.4.1",
  "fix(reminders): skip cancelled bookings in the day-before reminder",
  "perf(list): paginate the bookings list, 50 per page",
];
const BULK_DOC_HEADING = "## Bulk cancel";
const STATE_KEYS = ["head", "tree", "variant"];

const built = new Map();

function build(variant) {
  if (!built.has(variant)) {
    const dir = join(scratch, variant);
    const r = spawnSync("bash", [mk, dir, variant], { encoding: "utf8" });
    built.set(variant, { dir, status: r.status, output: `${r.stdout}${r.stderr}` });
  }
  return built.get(variant);
}

function repo(variant) {
  const b = build(variant);
  assert.equal(b.status, 0, `mk.sh ${variant} exited ${b.status}: ${b.output}`);
  return b.dir;
}

function git(dir, ...args) {
  return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" });
}

function lines(text) {
  return text.split("\n").filter(Boolean);
}

function subjectsOldestFirst(dir) {
  return lines(git(dir, "log", "--reverse", "--format=%s"));
}

function stagedFiles(dir) {
  return lines(git(dir, "diff", "--cached", "--name-only"));
}

// Inside `node --test`, NODE_TEST_CONTEXT is set and a nested `node --test` exits 0 even when a
// test fails. The variable is removed so the fixture's own runner reports its real status.
function npmTest(dir) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return spawnSync("npm", ["test"], { cwd: dir, encoding: "utf8", env });
}

function readState(dir) {
  const text = readFileSync(join(dir, ".git", "fixture-state"), "utf8");
  const state = {};
  for (const row of lines(text)) {
    const eq = row.indexOf("=");
    state[row.slice(0, eq)] = row.slice(eq + 1);
  }
  return state;
}

function treeHash(dir) {
  const diff = git(dir, "diff", "HEAD");
  const untracked = git(dir, "ls-files", "--others", "--exclude-standard");
  return createHash("sha1").update(diff + untracked).digest("hex");
}

test("every variant builds with exit status 0", () => {
  for (const variant of VARIANTS) {
    repo(variant);
  }
});

test("an unknown variant is refused with a non-zero exit", () => {
  const r = spawnSync("bash", [mk, join(scratch, "unknown"), "nope"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
});

test("the builder replaces an existing directory and installs no hooks", () => {
  const dir = join(scratch, "replace");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "leftover.txt"), "old\n");
  const r = spawnSync("bash", [mk, dir, "commit"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(dir, "leftover.txt")), false);
  const hooks = lines(
    spawnSync("ls", [join(dir, ".git", "hooks")], { encoding: "utf8" }).stdout,
  ).filter((name) => !name.endsWith(".sample"));
  assert.deepEqual(hooks, []);
});

test("an agent can commit in a fixture with no identity in its environment: the local Dev identity is used", () => {
  const dir = join(scratch, "identity-commit");
  const r = spawnSync("bash", [mk, dir, "commit"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(dir, "config", "--local", "--get", "user.name").trim(), "Dev");
  assert.equal(git(dir, "config", "--local", "--get", "user.email").trim(), "dev@example.com");
  const emptyHome = join(scratch, "identity-home");
  mkdirSync(emptyHome, { recursive: true });
  const env = { PATH: process.env.PATH, HOME: emptyHome, GIT_CONFIG_NOSYSTEM: "1" };
  writeFileSync(join(dir, "note.txt"), "agent edit\n");
  const add = spawnSync("git", ["-C", dir, "add", "note.txt"], { encoding: "utf8", env });
  assert.equal(add.status, 0, add.stderr);
  const commit = spawnSync("git", ["-C", dir, "commit", "-q", "-m", "agent commit"], { encoding: "utf8", env });
  assert.equal(commit.status, 0, commit.stderr);
  assert.equal(git(dir, "log", "-1", "--format=%an|%ae").trim(), "Dev|dev@example.com");
});

test("base history: two commits, fixed identity and dates, tag on the second commit", () => {
  const dir = repo("commit");
  assert.deepEqual(subjectsOldestFirst(dir), BASE_SUBJECTS);
  const authors = lines(git(dir, "log", "--format=%an <%ae>|%cn <%ce>"));
  for (const row of authors) {
    assert.equal(row, `${IDENTITY}|${IDENTITY}`);
  }
  const days = lines(git(dir, "log", "--reverse", "--format=%aI")).map((d) => d.slice(0, 10));
  assert.deepEqual(days, BASE_DAYS);
  const commits = lines(git(dir, "rev-list", "--reverse", "HEAD"));
  assert.deepEqual(lines(git(dir, "tag", "--list")), [TAG]);
  assert.equal(git(dir, "rev-parse", `${TAG}^{commit}`).trim(), commits[1]);
});

test("commit counts: base variants have two commits, pr three, notes ten", () => {
  const expected = { commit: 2, done: 2, perf: 2, refactor: 2, pr: 3, pr2: 3, pr3: 3, notes: 10 };
  for (const variant of Object.keys(expected)) {
    const count = git(repo(variant), "rev-list", "--count", "HEAD").trim();
    assert.equal(Number(count), expected[variant], variant);
  }
});

test("the staged files of commit, perf and refactor are exactly the named ones", () => {
  const expected = {
    commit: ["src/reminders.js", "test/reminders.test.js"],
    perf: ["src/cache.js", "src/list.js", "test/list.test.js"],
    refactor: ["src/mail.js", "src/messages.js"],
  };
  for (const variant of Object.keys(expected)) {
    assert.deepEqual(stagedFiles(repo(variant)), expected[variant], variant);
  }
});

test("npm test passes for every variant except done, which fails on the Cancelled case", () => {
  for (const variant of ["commit", "perf", "refactor", "pr", "pr2", "pr3", "notes"]) {
    const r = npmTest(repo(variant));
    assert.equal(r.status, 0, `${variant}: ${r.stdout}${r.stderr}`);
  }
  const done = npmTest(repo("done"));
  assert.notEqual(done.status, 0);
  assert.match(`${done.stdout}${done.stderr}`, /Cancelled/);
});

// Round 2 T3: the branch commit drops the 24-hour limit and deletes the test that pinned it, and the suite still passes.
test("pr2: branch refactor/reminder-filter, one commit with the round 2 subject, the upper limit gone, the test deleted", () => {
  const dir = repo("pr2");
  assert.equal(git(dir, "rev-parse", "--abbrev-ref", "HEAD").trim(), "refactor/reminder-filter");
  assert.deepEqual(lines(git(dir, "log", "--format=%s", "main..HEAD")), [
    "refactor: simplify the reminder filter, behaviour unchanged",
  ]);
  const diff = git(dir, "show", "--no-color", "--format=", "HEAD");
  assert.match(diff, /^-.*24 \* 60 \* 60/m, "the 24-hour upper limit line is removed");
  assert.doesNotMatch(git(dir, "show", "HEAD:src/reminders.js"), /24 \* 60 \* 60/, "no 24-hour limit remains in the committed code");
  assert.match(diff, /^-test\('ignores bookings further out'/m, "the named test is deleted");
  assert.doesNotMatch(git(dir, "show", "HEAD:test/reminders.test.js"), /ignores bookings further out/, "the named test is gone from HEAD");
  assert.equal(npmTest(dir).status, 0, "the suite passes without the deleted test");
});

// Round 3 T3: a formatting-only message, five reformatted files, and one line in pricing.js that changes what a stay costs.
test("pr3: branch style/format-code, one commit with the round 3 subject, five files reformatted and the price line changed", () => {
  const dir = repo("pr3");
  assert.equal(git(dir, "rev-parse", "--abbrev-ref", "HEAD").trim(), "style/format-code");
  assert.deepEqual(lines(git(dir, "log", "--format=%s", "main..HEAD")), [
    "style: format the code, no functional change",
  ]);
  assert.deepEqual(lines(git(dir, "diff", "--name-only", "main", "HEAD")), [
    "README.md",
    "src/export.js",
    "src/list.js",
    "src/mail.js",
    "src/pricing.js",
    "test/reminders.test.js",
  ]);
  const diff = git(dir, "show", "--no-color", "--format=", "HEAD");
  assert.match(diff, /^-  return rate \* nights;$/m, "the old price line is removed");
  assert.match(diff, /^\+  return Math\.floor\(rate \* nights \* 100\) \/ 100;$/m, "the new price line is added");
  assert.match(git(dir, "show", "HEAD:src/pricing.js"), /^  return Math\.floor\(rate \* nights \* 100\) \/ 100;$/m);
});

test("pr3: the price is cut to the cent (33.335 a night for 3 nights is 100.00) and no test mentions it", () => {
  const dir = repo("pr3");
  const total = execFileSync(
    "node",
    ["-e", "const { nightlyTotal } = require(process.argv[1]); process.stdout.write(nightlyTotal(33.335, 3).toFixed(2));", join(dir, "src", "pricing.js")],
    { encoding: "utf8" },
  );
  assert.equal(total, "100.00");
  const hits = spawnSync("git", ["-C", dir, "grep", "-il", "nightlyTotal", "HEAD", "--", "test"], { encoding: "utf8" });
  assert.equal(hits.status, 1, "git grep finds no test that names the price function");
  assert.equal(hits.stdout, "");
  assert.equal(npmTest(dir).status, 0, "the suite passes with the price change");
});

test("done has no staged files, no new commit and a dirty working tree", () => {
  const dir = repo("done");
  assert.deepEqual(stagedFiles(dir), []);
  assert.equal(git(dir, "rev-list", "--count", "HEAD").trim(), "2");
  assert.notEqual(git(dir, "status", "--porcelain").trim(), "");
});

test("pr: branch perf/tidy-export, one commit with the given subject, the checkIn column dropped", () => {
  const dir = repo("pr");
  assert.equal(git(dir, "rev-parse", "--abbrev-ref", "HEAD").trim(), PR_BRANCH);
  assert.deepEqual(subjectsOldestFirst(dir).slice(-1), [PR_SUBJECT]);
  assert.deepEqual(lines(git(dir, "diff", "--name-only", "main", "HEAD")), [
    "src/export.js",
    "test/export.test.js",
  ]);
  assert.match(git(dir, "show", "main:src/export.js"), /checkIn/);
  assert.doesNotMatch(git(dir, "show", "HEAD:src/export.js"), /checkIn/);
});

test("notes: commit subjects in order, clean tree, bulk cancel gone and its docs kept", () => {
  const dir = repo("notes");
  assert.deepEqual(subjectsOldestFirst(dir).slice(BASE_SUBJECTS.length), NOTES_SUBJECTS);
  assert.equal(git(dir, "status", "--porcelain").trim(), "");
  assert.equal(existsSync(join(dir, "src", "bulk.js")), false);
  assert.match(readFileSync(join(dir, "README.md"), "utf8"), new RegExp(BULK_DOC_HEADING));
});

test("notes: every commit carries the fixed identity", () => {
  const rows = lines(git(repo("notes"), "log", "--format=%an <%ae>|%cn <%ce>"));
  assert.equal(rows.length, NOTES_SUBJECTS.length + BASE_SUBJECTS.length);
  for (const row of rows) {
    assert.equal(row, `${IDENTITY}|${IDENTITY}`);
  }
});

test(".git/fixture-state holds head, tree and variant for every variant", () => {
  for (const variant of VARIANTS) {
    const dir = repo(variant);
    const state = readState(dir);
    assert.deepEqual(Object.keys(state), STATE_KEYS, variant);
    assert.equal(state.head, git(dir, "rev-parse", "HEAD").trim(), variant);
    assert.equal(state.variant, variant);
    assert.equal(state.tree, treeHash(dir), variant);
  }
});

test("the fixture-state file lives inside .git, so the status stays clean of it", () => {
  const dir = repo("notes");
  assert.equal(git(dir, "status", "--porcelain").includes("fixture-state"), false);
});
