import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { verify, rangeOf, failingCount, scopeChange } from "../bin/verify.mjs";
import { readSession, REPLY_WHOLE } from "../bin/claim-gate.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GATE = join(ROOT, "bin", "claim-gate.mjs");

const sh = (cwd, args) => execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
const put = (dir, files) => {
  for (const [p, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), content);
  }
};
/** A git repository under the temp directory with one commit holding `files`. */
function repo(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pe-verify-test-"));
  sh(dir, ["init", "-q"]);
  sh(dir, ["config", "user.email", "t@example.com"]);
  sh(dir, ["config", "user.name", "Test"]);
  put(dir, files);
  sh(dir, ["add", "-A"]);
  sh(dir, ["commit", "-q", "-m", "init"]);
  return dir;
}
const commit = (dir, subject) => {
  sh(dir, ["add", "-A"]);
  sh(dir, ["commit", "-q", "-m", subject]);
};
const W = (dir, p) => ({ kind: "write", path: join(dir, p), text: "" });
const B = (command) => ({ kind: "bash", command });
const S = (events) => ({ events, prompt: "", last: "" });
const ids = (findings) => findings.map((f) => f.id);
const text = (findings, id) => findings.find((f) => f.id === id)?.text ?? "";
const TESTED = { "package.json": JSON.stringify({ scripts: { test: "node --test" } }) };

// Two files where a rename in one leaves a use of the old name in the other.
const RENAME = {
  "src/api.js": "export function fetchUser(id) {\n  return db.get(id);\n}\n",
  "src/page.js": "import { fetchUser } from './api.js';\nexport const show = (id) => fetchUser(id);\n",
};
const renameInApi = (dir) => put(dir, { "src/api.js": "export function loadUser(id) {\n  return db.get(id);\n}\n" });

// A removed line whose copy stays in another file with the same shape and different names.
const TWIN = {
  "src/a.js": "export function total(items) {\n  return items.map(priceOf).reduce(sumOf, 0) + tax(items, rate);\n}\n",
  "src/b.js": "export function subtotal(list) {\n  return list.map(priceOf).reduce(sumOf, 0) + tax(list, rate);\n}\n",
};
const editTwin = (dir) => put(dir, { "src/a.js": "export function total(items) {\n  return items.map(priceOf).reduce(sumOf, 0) + tax(items, 0.2);\n}\n" });

// A release history: v0 holds legacyExport in two files and legacyOnce in one; a feature is added, then reverted
// (cancelled); then the helpers are removed.
function releaseRepo(extra = {}) {
  const dir = repo({
    ...TESTED,
    "src/a.js": "export function legacyExport() {\n  return 1;\n}\nexport function legacyOnce() {\n  return 2;\n}\n",
    "src/b.js": "export function legacyExport() {\n  return 1;\n}\n",
    ...extra.base,
  });
  sh(dir, ["tag", "v0"]);
  put(dir, { "src/cal.js": "export const calendar = 1;\n" });
  commit(dir, "feat: shared calendars view");
  sh(dir, ["revert", "--no-edit", "HEAD"]);
  put(dir, { "src/a.js": "export const kept = 1;\n", "src/b.js": "export const kept = 1;\n" });
  commit(dir, "chore: remove old helper");
  return dir;
}

// The owner's unfinished work sits in the tree before the session starts and the session never opens it.
function ownerWip() {
  const dir = repo({
    ...TESTED,
    "src/api.js": "export function fetchUser(id) {\n  return db.get(id);\n}\n",
    "src/page.js": "import { fetchUser } from './api.js';\nexport const show = (id) => fetchUser(id);\n",
    "src/own.js": "export const own = 1;\n",
  });
  // The owner renames a function and leaves a TODO; page.js still uses the old name.
  put(dir, { "src/api.js": "export function loadUser(id) {\n  // TODO finish the cache\n  return db.get(id);\n}\n" });
  return dir;
}

test("scope: a finding about the owner's unfinished work in a file the session never wrote is not reported", () => {
  const dir = ownerWip();
  put(dir, { "src/own.js": "export const own = 2;\n" });
  const f = verify({ cwd: dir, session: S([W(dir, "src/own.js"), B("npm test")]) });
  assert.deepEqual(ids(f).filter((i) => ["names-dangling", "stubs-in-change", "twins-open"].includes(i)), [], JSON.stringify(f));
  // The same tree with the session writing the owner's file: the findings are the session's own.
  const f2 = verify({ cwd: dir, session: S([W(dir, "src/api.js"), B("npm test")]) });
  assert.ok(ids(f2).includes("names-dangling"), JSON.stringify(f2));
  assert.ok(ids(f2).includes("stubs-in-change"), JSON.stringify(f2));
});

test("scope: a write that names no path counts for the changed files its command mentions", () => {
  const dir = ownerWip();
  const shell = { kind: "write", path: "", text: "", touches: [], command: "sed -i 's/a/b/' src/api.js" };
  put(dir, { "src/own.js": "export const own = 2;\n" });
  assert.ok(ids(verify({ cwd: dir, session: S([W(dir, "src/own.js"), shell, B("npm test")]) })).includes("names-dangling"), "the sed target is in scope next to a written file");
  assert.ok(!ids(verify({ cwd: dir, session: S([W(dir, "src/own.js"), B("npm test")]) })).includes("names-dangling"), "without it the owner's rename is out of scope");
  // A path-less write that mentions no changed file leaves the change whole: nothing to scope by.
  const blind = { kind: "write", path: "", text: "", touches: [], command: "cat > /tmp/x <<EOF" };
  assert.ok(ids(verify({ cwd: dir, session: S([blind, B("npm test")]) })).includes("names-dangling"));
});

test("scope: a new file the owner staged and the session never wrote is not reported as unwired", () => {
  const dir = repo({ ...TESTED, "src/app.js": "export const app = 1;\n", "src/other.js": "export const other = 1;\n" });
  put(dir, { "src/ownernew.js": "export const fee = 1;\n" });
  sh(dir, ["add", "src/ownernew.js"]);
  put(dir, { "src/other.js": "export const other = 2;\n" });
  assert.ok(!text(verify({ cwd: dir, session: S([W(dir, "src/other.js"), B("npm test")]) }), "unwired-file").includes("ownernew"));
  assert.ok(text(verify({ cwd: dir, session: S([W(dir, "src/ownernew.js"), B("npm test")]) }), "unwired-file").includes("ownernew"));
});

test("scope: a name that a file the session did not write writes again is not dangling; the owner's twin is not the session's finding", () => {
  const dir = repo({
    ...TESTED,
    "src/api.js": "export function fetchUser(id) {\n  return db.get(id);\n}\n",
    "src/page.js": "import { fetchUser } from './api.js';\nexport const show = (id) => fetchUser(id);\n",
    "src/owner.js": "export const unrelated = 1;\n",
    "src/a.js": "export function total(items) {\n  return items.map(priceOf).reduce(sumOf, 0) + tax(items, rate);\n}\n",
    "src/b.js": "export function subtotal(list) {\n  return list.map(priceOf).reduce(sumOf, 0) + tax(list, rate);\n}\n",
  });
  // The session rewrites api.js without the old name; the owner's unfinished work in owner.js introduces that name again.
  put(dir, { "src/api.js": "export function loadUser(id) {\n  return db.get(id);\n}\n", "src/owner.js": "export const fetchUser = 2;\n" });
  assert.ok(!ids(verify({ cwd: dir, session: S([W(dir, "src/api.js"), B("npm test")]) })).includes("names-dangling"), "fetchUser is written again in the same change");
  // The owner's edit removes a line that has a copy; the session never touched it.
  put(dir, { "src/api.js": "export function fetchUser(id) {\n  return db.get(id);\n}\n", "src/owner.js": "export const unrelated = 1;\n", "src/a.js": "export function total(items) {\n  return items.map(priceOf).reduce(sumOf, 0) + tax(items, 0.2);\n}\n" });
  put(dir, { "src/page.js": "import { fetchUser } from './api.js';\nexport const show = (id) => fetchUser(id) + 1;\n" });
  assert.ok(!ids(verify({ cwd: dir, session: S([W(dir, "src/page.js"), B("npm test")]) })).includes("twins-open"), "the owner's a.js edit is out of scope");
  assert.ok(ids(verify({ cwd: dir, session: S([W(dir, "src/a.js"), B("npm test")]) })).includes("twins-open"), "the same edit is a finding when the session wrote a.js");
});

test("scopeChange: keeps lines of written files, passes a baseline change through, keeps the change whole without a usable scope", () => {
  const change = { range: "HEAD", removed: [{ path: "a.js", line: 1, text: "x" }, { path: "b.js", line: 1, text: "y" }], added: [{ path: "a.js", line: 1, text: "z" }, { path: "b.js", line: 1, text: "w" }] };
  const narrowed = scopeChange(change, ["a.js"]);
  assert.deepEqual(narrowed.removed.map((l) => l.path), ["a.js"]);
  assert.deepEqual(narrowed.added.map((l) => l.path), ["a.js"]);
  assert.equal(narrowed.addedAll.length, 2, "the added lines of every file stay available to ask whether a name is written again");
  assert.equal(scopeChange({ ...change, baseline: true }, ["a.js"]).removed.length, 2);
  assert.equal(scopeChange(change, []).removed.length, 2);
  assert.equal(scopeChange(change, [], ["cat > /tmp/x"]).removed.length, 2);
  assert.deepEqual(scopeChange(change, [], ["sed -i s/x/q/ ./b.js"]).removed.map((l) => l.path), ["b.js"]);
  assert.equal(scopeChange(null, ["a.js"]), null);
});

test("tests-not-run: a source write after no test run is a finding, with the detected command", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  put(dir, { "src/a.js": "export const a = 2;\n" });
  const f = verify({ cwd: dir, session: S([W(dir, "src/a.js")]) });
  assert.deepEqual(ids(f), ["tests-not-run"]);
  assert.match(f[0].text, /src\/a\.js\)\. Run npm test and read the result\./);
});

test("tests-not-run: a test run after the write, a test file, a doc or no test command settles it", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  put(dir, { "src/a.js": "export const a = 2;\n" });
  assert.ok(!ids(verify({ cwd: dir, session: S([W(dir, "src/a.js"), B("npm test")]) })).includes("tests-not-run"));
  assert.ok(ids(verify({ cwd: dir, session: S([B("npm test"), W(dir, "src/a.js")]) })).includes("tests-not-run"));
  assert.ok(!ids(verify({ cwd: dir, session: S([W(dir, "test/a.test.js")]) })).includes("tests-not-run"));
  assert.ok(!ids(verify({ cwd: dir, session: S([W(dir, "README.md")]) })).includes("tests-not-run"));
  const bare = repo({ "src/a.js": "export const a = 1;\n" });
  put(bare, { "src/a.js": "export const a = 2;\n" });
  assert.deepEqual(verify({ cwd: bare, session: S([W(bare, "src/a.js")]) }), []);
});

test("tests-not-run: the runner is detected from the test files when package.json has no test script", () => {
  const cases = [
    [{ "test/a.test.mjs": "" }, "node --test"],
    [{ "test_mod.py": "" }, "pytest"],
    [{ "mod_test.go": "" }, "go test ./..."],
  ];
  for (const [files, command] of cases) {
    const dir = repo({ "src/a.js": "export const a = 1;\n", ...files });
    put(dir, { "src/a.js": "export const a = 2;\n" });
    assert.ok(text(verify({ cwd: dir, session: S([W(dir, "src/a.js")]) }), "tests-not-run").includes(`Run ${command} `), command);
  }
});

test("twins-open: a removed line with a copy elsewhere is a finding until twins or a grep runs", () => {
  const dir = repo(TWIN);
  editTwin(dir);
  const f = verify({ cwd: dir, session: S([W(dir, "src/a.js")]) });
  assert.ok(ids(f).includes("twins-open"));
  assert.match(text(f, "twins-open"), /twin src\/b\.js:2 \(resembles removed src\/a\.js:2/);
  assert.match(text(f, "twins-open"), /product-engineer twins/);
  assert.ok(!ids(verify({ cwd: dir, session: S([W(dir, "src/a.js"), B("product-engineer twins")]) })).includes("twins-open"));
  assert.ok(!ids(verify({ cwd: dir, session: S([W(dir, "src/a.js"), B("git grep -n items src")]) })).includes("twins-open"));
  assert.ok(!ids(verify({ cwd: dir, session: S([W(dir, "src/a.js"), B("rg -n priceOf")]) })).includes("twins-open"));
});

test("twins-open: a comment in another file that names the changed function is listed in the finding", () => {
  const dir = repo({ ...TWIN, "src/c.js": "// total is shown on the invoice\nexport const shown = 1;\n" });
  editTwin(dir);
  const f = verify({ cwd: dir, session: S([W(dir, "src/a.js")]) });
  assert.ok(ids(f).includes("twins-open"));
  assert.match(text(f, "twins-open"), /Comments that name the changed code: src\/c\.js:1 "\/\/ total is shown/);
});

test("twins-open: a loose twin (same calls and operators, other parentheses) is listed and tagged", () => {
  const dir = repo({
    "src/rates.js": "export function charge(line) {\n  return Math.floor(line.cents * (line.rate / 100));\n}\n",
    "src/fees.js": "export function fee(order) {\n  return Math.floor(order.cents * order.pct / 100);\n}\n",
  });
  put(dir, { "src/fees.js": "export function fee(order) {\n  return 0;\n}\n" });
  const f = verify({ cwd: dir, session: S([W(dir, "src/fees.js")]) });
  assert.ok(ids(f).includes("twins-open"));
  assert.match(text(f, "twins-open"), /twin src\/rates\.js:2 \(resembles removed src\/fees\.js:2 .*\) \(looser match\)/);
});

test("twins-open: no change, no finding", () => {
  const dir = repo(TWIN);
  assert.ok(!ids(verify({ cwd: dir, session: S([W(dir, "src/a.js")]) })).includes("twins-open"));
});

const REFACTOR_PROMPT = "Refactor the two price helpers into one module, no behaviour change.";

test("refactor-unchecked: a refactor that edits source with no run of the old or new code is a finding", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  put(dir, { "src/a.js": "export const a = 2;\n" });
  const f = verify({ cwd: dir, session: SP([W(dir, "src/a.js")], REFACTOR_PROMPT) });
  assert.ok(ids(f).includes("refactor-unchecked"));
  assert.match(text(f, "refactor-unchecked"), /git show HEAD:<path>/);
});

test("refactor-unchecked: a bug fix with no refactor words, a run before the edit, a side-by-side compare, or no source edit settles it", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n", "README.md": "x\n" });
  put(dir, { "src/a.js": "export const a = 2;\n" });
  const has = (events, prompt) => ids(verify({ cwd: dir, session: SP(events, prompt) })).includes("refactor-unchecked");
  assert.equal(has([W(dir, "src/a.js")], "Fix the bug in the total."), false);
  assert.equal(has([B("node -e 'console.log(1)'"), W(dir, "src/a.js")], REFACTOR_PROMPT), false);
  assert.equal(has([B("node scripts/run.mjs"), W(dir, "src/a.js")], REFACTOR_PROMPT), false);
  assert.equal(has([B("npm test"), W(dir, "src/a.js")], REFACTOR_PROMPT), false);
  assert.equal(has([W(dir, "src/a.js"), B("git show HEAD:src/a.js > old.js && node -e 'require(\"./old.js\")'")], REFACTOR_PROMPT), false);
  assert.equal(has([W(dir, "README.md")], REFACTOR_PROMPT), false);
});

test("refactor-unchecked: bug-fix wording that shares words with refactor (extract, clean up, merge, pull) is not a refactor", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  put(dir, { "src/a.js": "export const a = 2;\n" });
  const has = (prompt) => ids(verify({ cwd: dir, session: SP([W(dir, "src/a.js")], prompt) })).includes("refactor-unchecked");
  for (const prompt of [
    "Fix the bug where we extract the wrong date from the header.",
    "Clean up the error message in the login form.",
    "Fix the crash when the cleanup job runs.",
    "Fix the broken merge of the cart items.",
    "Extracted fee is wrong for EU users; fix it.",
    "Fix the broken pull request sync.",
  ]) assert.equal(has(prompt), false, prompt);
});

test("refactor-unchecked: each refactor phrasing is a refactor", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  put(dir, { "src/a.js": "export const a = 2;\n" });
  for (const prompt of [
    "Refactor the two price helpers into one module, no behaviour change.",
    "Extract the fee calc into a function.",
    "Clean up duplicate helpers in the cart.",
    "Merge the two price helpers.",
    "Pull the two parsers into one.",
    "Dedupe the price logic.",
  ]) assert.ok(ids(verify({ cwd: dir, session: SP([W(dir, "src/a.js")], prompt) })).includes("refactor-unchecked"), prompt);
});

test("names-dangling: a removed name still used in an untouched tracked file is a finding", () => {
  const dir = repo({ ...TESTED, ...RENAME });
  renameInApi(dir);
  const f = verify({ cwd: dir, session: S([W(dir, "src/api.js")]) });
  assert.ok(ids(f).includes("names-dangling"));
  assert.match(text(f, "names-dangling"), /fetchUser at src\/page\.js:1/);
  assert.match(text(f, "names-dangling"), /git grep -n -w/);
});

test("names-dangling: a name that the change still writes, or no longer used anywhere, is not dangling", () => {
  const dir = repo({
    ...TESTED,
    "src/api.js": "export const rate = compute(first);\n",
    "src/use.js": "import { compute } from './api.js';\nexport const x = compute(1);\n",
  });
  put(dir, { "src/api.js": "export const rate = compute(first, second);\n" });
  assert.ok(!ids(verify({ cwd: dir, session: S([W(dir, "src/api.js")]) })).includes("names-dangling"));
  const renamed = repo({ ...TESTED, ...RENAME });
  renameInApi(renamed);
  put(renamed, { "src/page.js": "import { loadUser } from './api.js';\nexport const show = (id) => loadUser(id);\n" });
  assert.ok(!ids(verify({ cwd: renamed, session: S([W(renamed, "src/api.js"), W(renamed, "src/page.js")]) })).includes("names-dangling"));
});

test("notes-check: a note that announces cancelled work is a finding; under Not in this release it is not", () => {
  const dir = releaseRepo();
  put(dir, { "CHANGELOG.md": "Changes since v0\n\nShared calendars view is now available to everyone.\n" });
  const f = verify({ cwd: dir, session: S([W(dir, "CHANGELOG.md")]) });
  assert.ok(ids(f).includes("notes-check"));
  assert.match(text(f, "notes-check"), /announce work this range cancelled: CHANGELOG\.md:3\b/);
  put(dir, { "CHANGELOG.md": "Changes since v0\n\nNot in this release\n- Shared calendars view is now available to everyone.\n" });
  assert.ok(!text(verify({ cwd: dir, session: S([W(dir, "CHANGELOG.md")]) }), "notes-check").includes("announce"));
});

test("notes-check: a gone name in two files that the notes never mention is reported, a mention or one file is not", () => {
  const dir = releaseRepo();
  put(dir, { "CHANGELOG.md": "Changes since v0\n\nThe calendar is tidier.\n" });
  const reported = text(verify({ cwd: dir, session: S([W(dir, "CHANGELOG.md")]) }), "notes-check");
  assert.match(reported, /legacyExport/);
  assert.ok(!reported.includes("legacyOnce"));
  put(dir, { "CHANGELOG.md": "Changes since v0\n\nlegacyExport is gone.\n" });
  assert.ok(!text(verify({ cwd: dir, session: S([W(dir, "CHANGELOG.md")]) }), "notes-check").includes("Names gone"));
});

test("notes-check: a notes file with no range on its first line is not read", () => {
  const dir = releaseRepo();
  put(dir, { "CHANGELOG.md": "Release notes\n\nShared calendars view is now available.\n" });
  assert.deepEqual(verify({ cwd: dir, session: S([W(dir, "CHANGELOG.md")]) }), []);
});

test("rangeOf reads since <ref> and <a>..<b> on a line, and nothing else", () => {
  assert.equal(rangeOf("Changes since v1.2.0"), "v1.2.0");
  assert.equal(rangeOf("v1.0..v1.1"), "v1.0..v1.1");
  assert.equal(rangeOf("v1.0.."), "v1.0..HEAD");
  assert.equal(rangeOf("Release notes for this version"), null);
});

test("fail open: no session writes, a non-git directory, a missing directory and a broken session return no findings", () => {
  const dir = repo({ ...TESTED, "src/a.js": "x\n" });
  assert.deepEqual(verify({ cwd: dir, session: S([B("npm test")]) }), []);
  const plain = mkdtempSync(join(tmpdir(), "pe-verify-plain-"));
  try {
    assert.deepEqual(verify({ cwd: plain, session: S([W(plain, "src/a.js")]) }), []);
  } finally {
    rmSync(plain, { recursive: true, force: true });
  }
  assert.deepEqual(verify({ cwd: "/nonexistent/pe-verify/dir", session: S([W(dir, "src/a.js")]) }), []);
  assert.deepEqual(verify({ cwd: dir, session: null }), []);
  assert.deepEqual(verify({ cwd: dir, session: { events: "broken" } }), []);
});

test("fail open: a corrupt transcript yields no events and no findings", () => {
  const dir = repo({ ...TESTED, "src/a.js": "x\n" });
  const session = readSession(["{", "not json", "", "{\"type\":"]);
  assert.deepEqual(session.events, []);
  assert.deepEqual(verify({ cwd: dir, session }), []);
});

test("deadline: a budget already spent returns no findings", () => {
  const dir = repo({ ...TESTED, ...RENAME });
  renameInApi(dir);
  assert.deepEqual(verify({ cwd: dir, session: S([W(dir, "src/api.js")]), limits: { budgetMs: -1 } }), []);
});

test("deadline: the budget is checked between checks, so later checks do not run once it is spent", () => {
  const dir = repo({ ...TESTED, ...RENAME });
  renameInApi(dir);
  let t = 0;
  const now = () => (t += 1000);
  const f = verify({ cwd: dir, session: S([W(dir, "src/api.js")]), limits: { budgetMs: 1500, now } });
  assert.deepEqual(ids(f), ["tests-not-run"]);
});

test("speed: a 3000-file repository is checked in under 3 seconds", () => {
  const files = { ...TESTED };
  for (let i = 0; i < 3000; i++) files[`src/m${i % 50}/f${i}.js`] = `export function f${i}(x) {\n  return compute${i}(x, ${i});\n}\n`;
  const dir = repo(files);
  put(dir, { "src/m0/f0.js": "export function f0(x) {\n  return compute0(x, 2);\n}\n" });
  const began = Date.now();
  const f = verify({ cwd: dir, session: S([W(dir, "src/m0/f0.js")]) });
  const took = Date.now() - began;
  assert.ok(took < 3000, `took ${took} ms`);
  assert.ok(ids(f).includes("tests-not-run"));
});

// The Stop hook, end to end, with the two-round state file.
function hook(dir, lines, input, env = {}) {
  const transcript = join(dir, "t.jsonl");
  writeFileSync(transcript, lines.map((l) => JSON.stringify(l)).join("\n"));
  return spawnSync("node", [GATE], { input: JSON.stringify({ transcript_path: transcript, cwd: dir, ...input }), encoding: "utf8", env: { ...process.env, ...env } });
}
const editOf = (dir, p) => ({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: join(dir, p) } }, { type: "text", text: "Done." }] } });
const promptLine = { type: "user", message: { content: "Add the fee rule." } };

test("state: a block, then the same findings do not block again, a new finding blocks once more, then never", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  // A private temp directory: the state file cannot be shared with another test or an earlier run.
  const home = mkdtempSync(join(tmpdir(), "pe-verify-state-"));
  const env = { TMPDIR: home };
  const sid = `verify-state-${process.pid}-${Date.now()}`;
  try {
    const one = [promptLine, editOf(dir, "src/a.js")];
    const first = hook(dir, one, { session_id: sid }, env);
    assert.equal(JSON.parse(first.stdout).decision, "block");
    assert.match(JSON.parse(first.stdout).reason, /Source files changed after the last test run/);
    assert.ok(JSON.parse(first.stdout).reason.endsWith(REPLY_WHOLE));
    assert.equal(hook(dir, one, { session_id: sid, stop_hook_active: true }, env).stdout, "");

    const two = [...one, editOf(dir, "src/b.js")];
    const second = hook(dir, two, { session_id: sid, stop_hook_active: true }, env);
    assert.equal(JSON.parse(second.stdout).decision, "block");
    assert.match(JSON.parse(second.stdout).reason, /src\/b\.js/);

    const three = [...two, editOf(dir, "src/c.js")];
    assert.equal(hook(dir, three, { session_id: sid, stop_hook_active: true }, env).stdout, "");
    assert.equal(hook(dir, three, { session_id: sid }, env).stdout, "");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("state: stop_hook_active without a session id never blocks, and the switch still turns everything off", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  const lines = [promptLine, editOf(dir, "src/a.js")];
  assert.equal(hook(dir, lines, { stop_hook_active: true }).stdout, "");
  assert.equal(hook(dir, lines, { session_id: `verify-off-${process.pid}` }, { PRODUCT_ENGINEER_NO_GATE: "1" }).stdout, "");
});

// ---- B1b: the result of the last test run, red-then-green, stubs in the change, unwired new files ----

const OUT = (command, output) => ({ kind: "bash", command, output });
const SP = (events, prompt = "") => ({ events, prompt, last: "" });

test("readSession pairs each Bash tool_use with its tool_result and keeps the last 4000 characters", () => {
  const long = `${"x".repeat(5000)}\nℹ fail 2\n`;
  const s = readSession([
    JSON.stringify({ type: "user", message: { content: "Fix the parser." } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id: "t1", name: "Bash", input: { command: "npm test" } }] } }),
    JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t1", content: long }] } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id: "t2", name: "Bash", input: { command: "ls" } }, { type: "text", text: "Done." }] } }),
    JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t2", content: [{ type: "text", text: "a.js" }] }] } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id: "t3", name: "Bash", input: { command: "npm run build" } }] } }),
  ]);
  assert.equal(s.events[0].command, "npm test");
  assert.equal(s.events[0].output.length, 4000);
  assert.ok(s.events[0].output.endsWith("ℹ fail 2\n"));
  assert.equal(s.events[1].output, "a.js");
  assert.equal(s.events[2].output, undefined, "a tool_use with no result has no output");
  assert.equal(s.last, "Done.");
  assert.equal(s.prompt, "Fix the parser.");
});

test("failingCount reads the summary of each runner, 0 for green, null when no summary is printed", () => {
  const cases = [
    ["ℹ tests 3\nℹ pass 2\nℹ fail 1\n", 1],
    ["ℹ tests 3\nℹ pass 3\nℹ fail 0\n", 0],
    ["Tests:       1 failed, 2 passed, 3 total", 1],
    ["Tests:       3 passed, 3 total", 0],
    ["      Tests  2 failed | 1 passed (3)", 2],
    ["=========== 1 failed, 2 passed in 0.12s ===========", 1],
    ["==== 3 passed in 0.01s ====", 0],
    ["test result: FAILED. 1 passed; 2 failed; 0 ignored", 2],
    ["--- FAIL: TestParse (0.00s)\nFAIL\nFAIL\texample/x\t0.01s", 1],
    ["ok  \texample/x\t0.01s", 0],
    ["npm ERR! Test failed.\nexit code 1", 1],
    ["hello world", null],
    ["", null],
  ];
  for (const [output, want] of cases) assert.equal(failingCount(output), want, JSON.stringify(output));
});

test("tests-red: the last test run after the last source edit is red and the answer does not say so", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  put(dir, { "src/a.js": "export const a = 2;\n" });
  const red = OUT("npm test", "ℹ tests 2\nℹ fail 1\n");
  const f = verify({ cwd: dir, session: SP([W(dir, "src/a.js"), red]), answer: "The fee rule is in place." });
  assert.ok(ids(f).includes("tests-red"));
  assert.equal(text(f, "tests-red"), "The last test run (npm test) reported 1 failing; your answer does not say so. Fix them or report them.");
});

test("tests-red: a red answer that names the failure, a green last run, or a run before the edit is not a finding", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  put(dir, { "src/a.js": "export const a = 2;\n" });
  const red = OUT("npm test", "ℹ fail 1\n");
  assert.ok(!ids(verify({ cwd: dir, session: SP([W(dir, "src/a.js"), red]), answer: "One test still fails; I stopped here." })).includes("tests-red"));
  assert.ok(!ids(verify({ cwd: dir, session: SP([W(dir, "src/a.js"), OUT("npm test", "ℹ fail 0\n")]), answer: "Done." })).includes("tests-red"));
  assert.ok(!ids(verify({ cwd: dir, session: SP([red, W(dir, "src/a.js")]), answer: "Done." })).includes("tests-red"));
});

test("tests-red: an answer that says the tests pass while the last run is red says so explicitly", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  put(dir, { "src/a.js": "export const a = 2;\n" });
  const f = verify({ cwd: dir, session: SP([W(dir, "src/a.js"), OUT("npm test", "ℹ fail 3\n")]), answer: "All tests pass now." });
  assert.equal(text(f, "tests-red"), "The last test run (npm test) reported 3 failing, and your answer says the tests pass. Fix them or report them.");
});

test("fix-not-redgreen: a fix with no red run before the edit and no new test run after it is a finding", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  put(dir, { "src/a.js": "export const a = 2;\n" });
  const green = OUT("npm test", "ℹ fail 0\n");
  const want = "No red-then-green evidence for the fix: run the new test against the old code (undo the fix, run, restore) or say you could not.";
  assert.ok(text(verify({ cwd: dir, session: SP([W(dir, "src/a.js"), green], "Fix the crash on empty input.") }), "fix-not-redgreen").startsWith(want));
  assert.ok(ids(verify({ cwd: dir, session: SP([green, W(dir, "src/a.js"), green], "Fix the crash on empty input.") })).includes("fix-not-redgreen"));
});

test("fix-not-redgreen: a red run before the edit and a green run after it, or a new test run after the edit, settles it", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  put(dir, { "src/a.js": "export const a = 2;\n" });
  const prompt = "Fix the crash on empty input.";
  const red = OUT("npm test", "ℹ fail 1\n");
  const green = OUT("npm test", "ℹ fail 0\n");
  assert.ok(!ids(verify({ cwd: dir, session: SP([red, W(dir, "src/a.js"), green], prompt) })).includes("fix-not-redgreen"));
  assert.ok(!ids(verify({ cwd: dir, session: SP([W(dir, "src/a.js"), W(dir, "test/a.test.js"), green], prompt) })).includes("fix-not-redgreen"));
  assert.ok(!ids(verify({ cwd: dir, session: SP([W(dir, "src/a.js"), green], "Add the fee rule.") })).includes("fix-not-redgreen"));
  const bare = repo({ "src/a.js": "export const a = 1;\n" });
  put(bare, { "src/a.js": "export const a = 2;\n" });
  assert.ok(!ids(verify({ cwd: bare, session: SP([W(bare, "src/a.js")], prompt) })).includes("fix-not-redgreen"));
});

test("stubs-in-change: an added stub marker is a finding; a doc or a clean change is not", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n", "README.md": "Notes.\n" });
  put(dir, { "src/a.js": "export const a = 2;\n// TODO finish the fee rule\n" });
  const f = verify({ cwd: dir, session: SP([W(dir, "src/a.js")]) });
  assert.equal(text(f, "stubs-in-change").includes("src/a.js:2 stub-marker"), true);
  assert.match(text(f, "stubs-in-change"), /Run product-engineer stubs and fix each one/);

  const docs = repo({ ...TESTED, "src/a.js": "export const a = 1;\n", "README.md": "Notes.\n" });
  put(docs, { "README.md": "TODO: write this section.\n" });
  assert.ok(!ids(verify({ cwd: docs, session: SP([W(docs, "README.md")]) })).includes("stubs-in-change"));

  const clean = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  put(clean, { "src/a.js": "export const a = 2;\n" });
  assert.ok(!ids(verify({ cwd: clean, session: SP([W(clean, "src/a.js")]) })).includes("stubs-in-change"));
});

test("stubs-in-change: a skipped test in a test file counts, a plain test in a test file does not", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  put(dir, { "test/a.test.js": "import { test } from 'node:test';\ntest.skip('later', () => {\n  assert.ok(1);\n});\n" });
  assert.equal(text(verify({ cwd: dir, session: SP([W(dir, "test/a.test.js")]) }), "stubs-in-change").includes("test/a.test.js:2 skipped-test"), true);
  const plain = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  put(plain, { "test/b.test.js": "test('x', () => {\n  assert.equal(f(), 1);\n});\n" });
  assert.ok(!ids(verify({ cwd: plain, session: SP([W(plain, "test/b.test.js")]) })).includes("stubs-in-change"));
});

test("unwired-file: a new source file that nothing mentions is a finding, staged or not; a mention by a tracked or new file settles it", () => {
  const dir = repo({ ...TESTED, "src/app.js": "export const app = 1;\n" });
  put(dir, { "src/newmod.js": "export const fee = 1;\n" });
  const want = "New file src/newmod.js is referenced nowhere. Wire it in or say it is standalone.";
  assert.equal(text(verify({ cwd: dir, session: SP([W(dir, "src/newmod.js")]) }), "unwired-file"), want);
  sh(dir, ["add", "src/newmod.js"]);
  assert.equal(text(verify({ cwd: dir, session: SP([W(dir, "src/newmod.js")]) }), "unwired-file"), want);

  const tracked = repo({ ...TESTED, "src/page.js": "export const page = 1;\n" });
  put(tracked, { "src/page.js": "import { fee } from './newmod.js';\nexport const page = fee;\n", "src/newmod.js": "export const fee = 1;\n" });
  assert.ok(!text(verify({ cwd: tracked, session: SP([W(tracked, "src/page.js"), W(tracked, "src/newmod.js")]) }), "unwired-file").includes("newmod"));

  const newImporter = repo({ ...TESTED, "src/app.js": "export const app = 1;\n" });
  put(newImporter, { "src/newmod.js": "export const fee = 1;\n", "src/other.js": "import { fee } from './newmod.js';\n" });
  assert.ok(!text(verify({ cwd: newImporter, session: SP([W(newImporter, "src/newmod.js"), W(newImporter, "src/other.js")]) }), "unwired-file").includes("newmod"));
});

test("unwired-file: entry points, index files, tests and config are never candidates", () => {
  const dir = repo({ ...TESTED, "package.json": JSON.stringify({ scripts: { test: "node --test" }, main: "src/entry.js" }), "src/app.js": "export const app = 1;\n" });
  put(dir, { "src/entry.js": "export const e = 1;\n", "src/index.js": "export const i = 1;\n", "test/x.test.js": "x\n", "config/app.json": "{}\n" });
  const f = verify({ cwd: dir, session: SP([W(dir, "src/entry.js"), W(dir, "src/index.js"), W(dir, "test/x.test.js"), W(dir, "config/app.json")]) });
  assert.ok(!ids(f).includes("unwired-file"), JSON.stringify(f));
});

// A tagged release, then a flag added and reverted in the range; the README names the flag at line 3 when `readme` is set.
function flagReleaseRepo(readme) {
  const dir = repo({ ...TESTED, "src/cli.js": "export const run = (argv) => argv.length;\n", "README.md": "# Shop\n" });
  sh(dir, ["tag", "v0"]);
  put(dir, { "src/cli.js": "export const run = (argv) => (argv.includes(\"--ledger-flag\") ? 1 : 0);\n" });
  commit(dir, "feat(cli): add ledger flag");
  sh(dir, ["revert", "--no-edit", "HEAD"]);
  if (readme) {
    put(dir, { "README.md": `# Shop\n\n${readme}\n` });
    commit(dir, "docs: explain the ledger");
  }
  return dir;
}
const STALE = /README\.md:3 still describes --ledger-flag, which was added and reverted in this range\. Fix the document or tell the owner it is stale\./;

test("notes-check: a note with a range names a README line that still describes a reverted flag", () => {
  const dir = flagReleaseRepo("Pass --ledger-flag to print the ledger.");
  put(dir, { "RELEASE-NOTES.md": "Changes since v0\n\nFixed the page layout.\n" });
  const f = verify({ cwd: dir, session: S([W(dir, "RELEASE-NOTES.md")]) });
  assert.ok(ids(f).includes("notes-check"));
  assert.match(text(f, "notes-check"), STALE);
  assert.equal(ids(f).filter((i) => i === "stale-docs").length, 0, "no second finding for the same file");
});

test("notes-check: with no README mention of the reverted flag there is no stale finding", () => {
  const dir = flagReleaseRepo(null);
  put(dir, { "RELEASE-NOTES.md": "Changes since v0\n\nFixed the page layout.\n" });
  const f = verify({ cwd: dir, session: S([W(dir, "RELEASE-NOTES.md")]) });
  assert.ok(!text(f, "notes-check").includes("still describes"));
  assert.ok(!ids(f).includes("stale-docs"));
});

test("stale-docs: a notes file with no range line uses the latest tag to HEAD and reports the stale README line", () => {
  const dir = flagReleaseRepo("Pass --ledger-flag to print the ledger.");
  put(dir, { "upgrade-guide.md": "Upgrading is a one-line change.\n" });
  const f = verify({ cwd: dir, session: S([W(dir, "upgrade-guide.md")]) });
  assert.ok(ids(f).includes("stale-docs"));
  assert.match(text(f, "stale-docs"), STALE);
  assert.ok(!ids(f).includes("notes-check"), "no range line, so notes-check does not read the file");
});

test("stale-docs: without a README mention, or for a file that is not a notes file, nothing is reported", () => {
  const clean = flagReleaseRepo(null);
  put(clean, { "upgrade-guide.md": "Upgrading is a one-line change.\n" });
  assert.ok(!ids(verify({ cwd: clean, session: S([W(clean, "upgrade-guide.md")]) })).includes("stale-docs"));
  const dir = flagReleaseRepo("Pass --ledger-flag to print the ledger.");
  put(dir, { "src/other.md": "Pass --ledger-flag here.\n" });
  assert.ok(!ids(verify({ cwd: dir, session: S([W(dir, "src/other.md")]) })).includes("stale-docs"));
});

test("twins-open: an old value still written beside the same words is a finding, also after a grep for the names", () => {
  const dir = repo({
    "src/limits.js": "export const MAX_UPLOAD_MB = 25;\n// Uploads larger than 25 MB are rejected.\n",
    "docs/upload.md": "Uploads larger than 25 MB are rejected by the server.\n",
  });
  put(dir, { "src/limits.js": "export const MAX_UPLOAD_MB = 50;\n// Uploads larger than 50 MB are rejected.\n" });
  const f = verify({ cwd: dir, session: S([W(dir, "src/limits.js"), B("git grep -n MAX_UPLOAD_MB")]) });
  assert.ok(ids(f).includes("twins-open"));
  assert.match(text(f, "twins-open"), /docs\/upload\.md:1 still says 25 \(changed to 50/);
  assert.ok(!ids(verify({ cwd: dir, session: S([W(dir, "src/limits.js"), B("product-engineer twins")]) })).includes("twins-open"));
});
