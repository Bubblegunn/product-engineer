import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { verify, rangeOf } from "../bin/verify.mjs";
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

test("twins-open: no change, no finding", () => {
  const dir = repo(TWIN);
  assert.ok(!ids(verify({ cwd: dir, session: S([W(dir, "src/a.js")]) })).includes("twins-open"));
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
  const sid = `verify-state-${process.pid}-${Date.now()}`;
  const state = join(tmpdir(), `product-engineer-gate-${sid}.json`);
  try {
    const one = [promptLine, editOf(dir, "src/a.js")];
    const first = hook(dir, one, { session_id: sid });
    assert.equal(JSON.parse(first.stdout).decision, "block");
    assert.match(JSON.parse(first.stdout).reason, /Source files changed after the last test run/);
    assert.ok(JSON.parse(first.stdout).reason.endsWith(REPLY_WHOLE));
    assert.equal(hook(dir, one, { session_id: sid, stop_hook_active: true }).stdout, "");

    const two = [...one, editOf(dir, "src/b.js")];
    const second = hook(dir, two, { session_id: sid, stop_hook_active: true });
    assert.equal(JSON.parse(second.stdout).decision, "block");
    assert.match(JSON.parse(second.stdout).reason, /src\/b\.js/);

    const three = [...two, editOf(dir, "src/c.js")];
    assert.equal(hook(dir, three, { session_id: sid, stop_hook_active: true }).stdout, "");
    assert.equal(hook(dir, three, { session_id: sid }).stdout, "");
  } finally {
    rmSync(state, { force: true });
  }
});

test("state: stop_hook_active without a session id never blocks, and the switch still turns everything off", () => {
  const dir = repo({ ...TESTED, "src/a.js": "export const a = 1;\n" });
  const lines = [promptLine, editOf(dir, "src/a.js")];
  assert.equal(hook(dir, lines, { stop_hook_active: true }).stdout, "");
  assert.equal(hook(dir, lines, { session_id: `verify-off-${process.pid}` }, { PRODUCT_ENGINEER_NO_GATE: "1" }).stdout, "");
});
