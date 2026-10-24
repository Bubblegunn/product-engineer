import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { range, render, parseRange, vocabularyOf, VOCAB_CAP, VOCAB_COMMIT_LIMIT, windowOf } from "../bin/range.mjs";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "check.mjs");
let tick = 0;
// Fixed dates: every git call gets the next minute of 2026-10-01, so the commit order is the call order.
const at = () => `2026-10-01T10:${String(++tick % 60).padStart(2, "0")}:00+0000`;
const run = (cwd, ...args) => execFileSync("git", ["-c", "user.name=Dev", "-c", "user.email=dev@example.com", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", ...args], { cwd, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_DATE: at(), GIT_COMMITTER_DATE: at() } });
const head = (dir) => run(dir, "rev-parse", "HEAD").trim();
const pkg = (version) => `{\n  "name": "shop",\n  "version": "${version}"\n}\n`;

function newRepo() {
  const dir = mkdtempSync(join(tmpdir(), "range-"));
  run(dir, "init", "-q", "-b", "master");
  return dir;
}

function commit(dir, files, subject, body = "") {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, dirname(path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  run(dir, "add", "-A");
  run(dir, "commit", "-q", "-m", subject, ...(body ? ["-m", body] : []));
  return head(dir);
}

const find = (report, sha) => report.commits.find((c) => c.sha === sha);
const flagsOf = (report, sha) => find(report, sha).flags.map((f) => f.text);

/** Base, feat, docs, security fix, revert of feat, version bump, reminders fix, perf change with no timing file. */
function mainRepo() {
  const dir = newRepo();
  const base = commit(dir, { "package.json": pkg("1.0.0"), "src/list.js": "export const page = (xs) => xs;\n", "README.md": "# Shop\n" }, "chore: start the shop");
  const feat = commit(dir, { "src/bulk.js": "export const bulk = () => [];\n" }, "feat(bulk): add bulk invoice export");
  const docs = commit(dir, { "README.md": "# Shop\n\nBulk export is on the invoices page.\n" }, "docs: explain bulk export");
  const security = commit(dir, { "src/csv.js": "export const cell = (v) => v;\n" }, "fix(security): escape formulas in CSV export");
  run(dir, "revert", "--no-edit", feat);
  const revert = head(dir);
  const chore = commit(dir, { "package.json": pkg("1.0.1") }, "chore: bump version to 1.0.1");
  const reminders = commit(dir, { "src/reminders.js": "export const due = (d) => d > 0;\n" }, "fix(reminders): send once per day");
  const perf = commit(dir, { "src/list.js": "export const page = (xs, n) => xs.slice(0, n);\n" }, "perf(list): paginate the invoice list");
  return { dir, base, feat, docs, security, revert, chore, reminders, perf };
}

test("the ledger counts net changes, cancels a reverted change and names the sha", () => {
  const { dir, base, feat, docs, security, revert, chore, reminders, perf } = mainRepo();
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.deepEqual(report.summary, { commits: 7, present: 5, cancelled: 1 });
  assert.equal(report.header, `range ${base}..HEAD: 7 commits, 5 net changes present, 1 cancelled`);
  assert.ok(flagsOf(report, feat).includes(`net: cancelled (reverted by ${revert.slice(0, 7)})`));
  assert.ok(flagsOf(report, docs).includes("net: present"));
  assert.ok(flagsOf(report, reminders).includes("net: present"));
  assert.ok(flagsOf(report, revert).some((t) => t.startsWith(`reverts ${feat.slice(0, 7)}`)));
  assert.equal(find(report, revert).net, null);
  assert.deepEqual(find(report, chore).classes, ["version"]);
  assert.deepEqual(find(report, docs).classes, ["docs"]);
  assert.deepEqual(find(report, reminders).classes, ["source"]);
  assert.ok(find(report, security).flags.some((f) => f.code === "security"));
  assert.deepEqual(flagsOf(report, perf).filter((t) => t.startsWith("performance")), ["performance wording: no timing file or benchmark change in this range"]);
  assert.ok(render(report).endsWith("Candidates only. Read the diff before you write a line about any of these."));
});

test("a revert of a revert puts the change back: net present", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/bulk.js": "export const base = 1;\n" }, "chore: start");
  const feat = commit(dir, { "src/bulk.js": "export const bulk = () => [];\n" }, "feat(bulk): add bulk invoice export");
  run(dir, "revert", "--no-edit", feat);
  const revert = head(dir);
  run(dir, "revert", "--no-edit", revert);
  const revertOfRevert = head(dir);
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.deepEqual(report.summary, { commits: 3, present: 1, cancelled: 0 });
  assert.ok(flagsOf(report, feat).includes(`net: present (restored by ${revertOfRevert.slice(0, 7)})`));
  assert.ok(flagsOf(report, revertOfRevert).some((t) => t.startsWith(`reapplies ${revert.slice(0, 7)}`)), "git writes a revert of a revert as Reapply");
  assert.ok(!flagsOf(report, revertOfRevert).some((t) => t.startsWith("same change")), "the reapply is the original change, not a duplicate of it");
});

test("a cherry-picked copy is the same change, and a docs type over a source file is flagged", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/pricing.js": "export const tax = 0.2;\nexport const total = (a) => a;\n// end\n" }, "chore: start pricing");
  const fix = commit(dir, { "src/pricing.js": "export const tax = 0.18;\nexport const total = (a) => a;\n// end\n" }, "fix(payments): use the 18 percent tax rate");
  const doc = commit(dir, { "src/pricing.js": "export const tax = 0.18;\nexport const total = (a) => a;\n// end, net of tax\n" }, "docs: note that prices are net of tax");
  run(dir, "checkout", "-q", "-b", "side", base);
  run(dir, "cherry-pick", fix);
  const copy = head(dir);
  run(dir, "checkout", "-q", "master");
  run(dir, "merge", "-q", "--no-ff", "-m", "merge side", "side");
  const merge = head(dir);
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.deepEqual(report.summary, { commits: 4, present: 3, cancelled: 0 });
  assert.ok(flagsOf(report, copy).includes(`same change as ${fix.slice(0, 7)}`));
  assert.ok(!flagsOf(report, fix).some((t) => t.startsWith("same change")));
  assert.deepEqual(find(report, merge).classes, ["merge"]);
  assert.ok(find(report, merge).merge);
  assert.ok(flagsOf(report, doc).includes("type says docs but the commit changes source files: src/pricing.js"));
});

test("a performance commit with a bench file in the range gets the bench note, not the unmeasured warning", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/list.js": "export const totals = (xs) => xs;\n" }, "chore: start");
  const perf = commit(dir, { "src/list.js": "const memo = new Map();\nexport const totals = (xs) => xs;\n", "bench/timing.txt": "before 120ms\nafter 40ms\n" }, "perf(list): cache invoice totals");
  const breaking = commit(dir, { "src/api.js": "export const v2 = () => 2;\n" }, "feat(api)!: drop the v1 export", "BREAKING CHANGE: callers must move to v2.");
  const refactor = commit(dir, { ".eslintrc.json": "{ \"rules\": {} }\n" }, "refactor: move lint settings");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.ok(flagsOf(report, perf).includes("a bench/timing file changed in the range: bench/timing.txt"));
  assert.ok(!flagsOf(report, perf).some((t) => t.startsWith("performance wording")));
  assert.ok(flagsOf(report, breaking).some((t) => t.startsWith("breaking-change marker: ")));
  assert.ok(flagsOf(report, breaking).some((t) => t.includes("!")) && flagsOf(report, breaking).some((t) => t.includes("BREAKING CHANGE in the body")));
  assert.ok(flagsOf(report, refactor).includes("refactor touches config: .eslintrc.json"));
});

test("the CLI: a single ref means ref..HEAD, --json parses, a bad range or a missing argument exits 2", () => {
  const { dir, base } = mainRepo();
  run(dir, "tag", "v1.0.0", base);
  const ok = spawnSync(process.execPath, [CLI, "range", "v1.0.0"], { cwd: dir, encoding: "utf8" });
  assert.equal(ok.status, 0);
  assert.ok(ok.stdout.startsWith("range v1.0.0..HEAD: 7 commits, 5 net changes present, 1 cancelled"));
  const json = spawnSync(process.execPath, [CLI, "range", `${base}..HEAD`, "--json"], { cwd: dir, encoding: "utf8" });
  assert.equal(json.status, 0);
  const parsed = JSON.parse(json.stdout);
  assert.deepEqual(parsed.summary, { commits: 7, present: 5, cancelled: 1 });
  const bad = spawnSync(process.execPath, [CLI, "range", "no-such-ref..HEAD"], { cwd: dir, encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /usage: product-engineer range|cannot read the range/);
  const missing = spawnSync(process.execPath, [CLI, "range"], { cwd: dir, encoding: "utf8" });
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /usage: product-engineer range/);
  const help = spawnSync(process.execPath, [CLI, "--help"], { encoding: "utf8" });
  assert.match(help.stdout, /product-engineer range <from>\.\.<to>/);
});

test("a hand-written Revert or Reapply subject with no sha in the body is matched by subject", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/a.js": "export const a = 1;\n" }, "chore: start");
  const first = commit(dir, { "src/b.js": "export const b = 1;\n" }, "feat(x): add the thing");
  const undo = commit(dir, { "src/b.js": "export const b = 0;\n" }, "Revert \"feat(x): add the thing\"", "Undo the thing for now.");
  const again = commit(dir, { "src/b.js": "export const b = 1;\n" }, "Reapply \"feat(x): add the thing\"");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.deepEqual(report.summary, { commits: 3, present: 1, cancelled: 0 });
  assert.ok(flagsOf(report, undo).includes(`reverts ${first.slice(0, 7)}: feat(x): add the thing`));
  assert.ok(flagsOf(report, again).includes(`reapplies ${first.slice(0, 7)}: feat(x): add the thing`));
  assert.ok(flagsOf(report, first).includes(`net: present (restored by ${again.slice(0, 7)})`));
});

test("parseRange accepts from..to and a bare ref, and refuses triple dots and option-looking text", () => {
  assert.deepEqual(parseRange("v1.4.0..HEAD"), { from: "v1.4.0", to: "HEAD" });
  assert.deepEqual(parseRange("v1.4.0"), { from: "v1.4.0", to: "HEAD" });
  assert.equal(parseRange("a...b"), null);
  assert.equal(parseRange("--all"), null);
  assert.equal(parseRange("..HEAD"), null);
});

test("a revert or reapply commit is never flagged as a duplicate of the change it undoes", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/a.js": "export const a = 1;\n" }, "chore: start");
  const feat = commit(dir, { "src/b.js": "export const b = 1;\n" }, "feat(x): add the b module");
  const undo = commit(dir, { "src/b.js": "" }, "Revert \"feat(x): add the b module\"", "This reverts commit " + feat + ".");
  const again = commit(dir, { "src/b.js": "export const b = 1;\n" }, "Reapply \"feat(x): add the b module\"");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  for (const sha of [undo, again]) assert.ok(!flagsOf(report, sha).some((t) => t.startsWith("same change")), sha);
  assert.ok(flagsOf(report, again).includes(`reapplies ${feat.slice(0, 7)}: feat(x): add the b module`));
});

test("a Reapply subject is a reapply even with a This reverts commit body; a body mention mid-line is not a revert", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/a.js": "export const a = 1;\n" }, "chore: start");
  const feat = commit(dir, { "src/b.js": "export const b = 1;\n" }, "feat(x): add the b module");
  const undo = commit(dir, { "src/b.js": "" }, "Revert \"feat(x): add the b module\"", "This reverts commit " + feat + ".");
  const again = commit(dir, { "src/b.js": "export const b = 1;\n" }, "Reapply \"Revert \\\"feat(x): add the b module\\\"\"", "This reverts commit " + undo + ".");
  const note = commit(dir, { "src/c.js": "export const c = 1;\n" }, "feat(y): add the c module", "Notes: This reverts commit " + feat + " in spirit only.");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.ok(flagsOf(report, again).some((t) => t.startsWith(`reapplies ${undo.slice(0, 7)}`)));
  assert.equal(find(report, again).net, null);
  assert.equal(find(report, note).net.state, "present", "a mid-line mention of a sha is not a revert");
  assert.ok(!flagsOf(report, note).some((t) => t.startsWith("reverts") || t.startsWith("reapplies")));
});

test("a revert whose subject is not Revert and whose body starts the line with This reverts commit is a revert", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/a.js": "export const a = 1;\n" }, "chore: start");
  const feat = commit(dir, { "src/b.js": "export const b = 1;\n" }, "feat(x): add the b module");
  const undo = commit(dir, { "src/b.js": "" }, "Undo the b module", "Some words.\n\nThis reverts commit " + feat + ".");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.ok(flagsOf(report, undo).includes(`reverts ${feat.slice(0, 7)}: feat(x): add the b module`));
  assert.equal(find(report, feat).net.state, "cancelled");
});

test("reverting a merge with -m 1 cancels the commits that merge brought in, and the header counts them", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/a.js": "export const a = 1;\n" }, "chore: start");
  run(dir, "checkout", "-q", "-b", "side");
  const s1 = commit(dir, { "src/bulk.js": "export const bulk = 1;\n" }, "feat(bulk): add the bulk export");
  const s2 = commit(dir, { "src/bulk.js": "export const bulk = 2;\n" }, "fix(bulk): round the total");
  run(dir, "checkout", "-q", "master");
  const keep = commit(dir, { "src/keep.js": "export const keep = 1;\n" }, "feat(keep): keep the list");
  run(dir, "merge", "-q", "--no-ff", "-m", "merge side", "side");
  const merge = head(dir);
  run(dir, "revert", "-m", "1", "--no-edit", merge);
  const revert = head(dir);
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.deepEqual(report.summary, { commits: 5, present: 1, cancelled: 2 });
  assert.equal(report.header, `range ${base}..HEAD: 5 commits, 1 net change present, 2 cancelled`);
  const why = `net: cancelled (branch merged by ${merge.slice(0, 7)} was reverted by ${revert.slice(0, 7)})`;
  assert.ok(flagsOf(report, s1).includes(why));
  assert.ok(flagsOf(report, s2).includes(why));
  assert.ok(flagsOf(report, keep).includes("net: present"));
  assert.ok(flagsOf(report, revert).some((t) => t.startsWith(`reverts ${merge.slice(0, 7)}`)));
});

test("an unknown ref exits 2 with the unknown revision message; HEAD~1.. reads as HEAD~1..HEAD", () => {
  const { dir } = mainRepo();
  const bad = spawnSync(process.execPath, [CLI, "range", "no-such-ref..HEAD"], { cwd: dir, encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /unknown revision: no-such-ref/);
  assert.deepEqual(parseRange("HEAD~1.."), { from: "HEAD~1", to: "HEAD" });
  const open = spawnSync(process.execPath, [CLI, "range", "HEAD~1.."], { cwd: dir, encoding: "utf8" });
  assert.equal(open.status, 0, open.stderr);
  assert.ok(open.stdout.startsWith("range HEAD~1..HEAD: 1 commit,"), open.stdout.split("\n")[0]);
});

/** A repo of `n` commits, each touching one of 17 files, built with git fast-import (no per-commit process). */
function bigRepo(n) {
  const dir = newRepo();
  const lines = [];
  for (let i = 1; i <= n; i++) {
    const msg = `feat(step): change ${i}`;
    const body = `export const v${i} = ${i};\n`;
    lines.push("commit refs/heads/master", `mark :${i}`, `committer Dev <dev@example.com> ${1761900000 + i} +0000`, `data ${Buffer.byteLength(msg)}`, msg);
    if (i > 1) lines.push(`from :${i - 1}`);
    lines.push(`M 100644 inline src/f${i % 17}.js`, `data ${Buffer.byteLength(body)}`, body, "");
  }
  execFileSync("git", ["fast-import", "--quiet"], { cwd: dir, input: lines.join("\n") + "\n" });
  return dir;
}

test("a 300-commit range is read in under 5 seconds", () => {
  const dir = bigRepo(301);
  const t0 = Date.now();
  const report = range({ from: "HEAD~300", to: "HEAD", cwd: dir });
  const ms = Date.now() - t0;
  assert.equal(report.summary.commits, 300);
  assert.equal(report.summary.present, 300);
  assert.equal(report.commits[0].files.length, 1);
  assert.ok(ms < 5000, `took ${ms} ms`);
});

const flagOf = (report, sha, code) => find(report, sha).flags.find((f) => f.code === code);

test("a chore commit that changes a limit prints the changed lines under its type flag", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/x.js": "export const LIMIT = 50;\nexport const pick = (xs) => xs.slice(0, LIMIT);\n" }, "chore: start the list");
  const change = commit(dir, { "src/x.js": "export const LIMIT = 25;\nexport const pick = (xs) => xs.slice(0, LIMIT);\n" }, "chore: tidy the list");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  const flag = flagOf(report, change, "type");
  assert.ok(flag.text.startsWith("type says chore but the commit changes source files: src/x.js"));
  assert.deepEqual(flag.evidence, [{ sign: "-", text: "export const LIMIT = 50;" }, { sign: "+", text: "export const LIMIT = 25;" }]);
  assert.equal(flag.moreLines, 0);
  assert.ok(render(report).includes("\n    - export const LIMIT = 50;\n    + export const LIMIT = 25;\n"));
});

test("a docs-titled commit that changes a constant prints the changed lines too", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/page.js": "export const PAGE = 25;\n" }, "chore: start paging");
  const doc = commit(dir, { "src/page.js": "export const PAGE = 40;\n" }, "docs: note the page size");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  const flag = flagOf(report, doc, "type");
  assert.ok(flag.text.startsWith("type says docs but the commit changes source files: src/page.js"));
  assert.deepEqual(flag.evidence, [{ sign: "-", text: "export const PAGE = 25;" }, { sign: "+", text: "export const PAGE = 40;" }]);
  assert.ok(render(report).includes("    - export const PAGE = 25;\n    + export const PAGE = 40;"));
});

test("an engines.node bump is a requirement change and its lines are printed", () => {
  const dir = newRepo();
  const manifest = (node) => `{\n  "name": "shop",\n  "engines": {\n    "node": "${node}"\n  }\n}\n`;
  const base = commit(dir, { "package.json": manifest(">=20") }, "chore: start");
  const bump = commit(dir, { "package.json": manifest(">=22") }, "chore: raise the node floor");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  const flag = flagOf(report, bump, "requirement");
  assert.equal(flag.text, "requirement change: package.json changes how or where this runs; owners who run it themselves may need to act");
  assert.deepEqual(flag.evidence, [{ sign: "-", text: "\"node\": \">=20\"" }, { sign: "+", text: "\"node\": \">=22\"" }]);
  assert.ok(render(report).includes("    requirement change: package.json changes how or where this runs; owners who run it themselves may need to act\n    - \"node\": \">=20\"\n    + \"node\": \">=22\""));
});

test("a plain dependency version bump is not a requirement change", () => {
  const dir = newRepo();
  const manifest = (v) => `{\n  "name": "shop",\n  "dependencies": {\n    "dep": "${v}"\n  }\n}\n`;
  const base = commit(dir, { "package.json": manifest("^1.0.0") }, "chore: start");
  const bump = commit(dir, { "package.json": manifest("^1.1.0") }, "chore: update dep");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.ok(!find(report, bump).flags.some((f) => f.code === "requirement"));
  assert.ok(!render(report).includes("requirement change"));
});

test("a runtime pin file with a changed version is a requirement change, whatever the line says", () => {
  const dir = newRepo();
  const base = commit(dir, { ".nvmrc": "20\n" }, "chore: start");
  const bump = commit(dir, { ".nvmrc": "22\n" }, "chore: pin the runtime");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.deepEqual(flagOf(report, bump, "requirement").evidence, [{ sign: "-", text: "20" }, { sign: "+", text: "22" }]);
});

test("a large flagged diff prints six lines and the count of the rest; every printed line is at most 100 characters", () => {
  const dir = newRepo();
  // Ten lines all change: git lists the ten removed lines first, so the first printed line is the long one.
  const old = ["export const note = \"" + "w".repeat(150) + "\";", ...Array.from({ length: 9 }, (_, i) => `export const v${i} = ${i};`)];
  const next = old.map((l, i) => (i === 0 ? `export const note = "${"x".repeat(150)}";` : l.replace(/= (\d+);/, (_, n) => `= ${Number(n) + 100};`)));
  const base = commit(dir, { "src/big.js": `${old.join("\n")}\n` }, "chore: start the table");
  const change = commit(dir, { "src/big.js": `${next.join("\n")}\n` }, "chore: rewrite the table");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  const flag = flagOf(report, change, "type");
  assert.equal(flag.evidence.length, 6);
  assert.ok(flag.evidence.every((e) => e.text.length <= 100), "each printed line is cut to 100 characters");
  assert.ok(flag.evidence[0].text.endsWith("..."));
  assert.equal(flag.moreLines, 20 - 6, "ten removed and ten added lines, six printed");
  assert.ok(render(report).includes("    (14 more changed lines; read the diff)"));
});

test("the JSON report carries the evidence arrays and the count of lines not printed", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/x.js": "export const LIMIT = 50;\n" }, "chore: start");
  commit(dir, { "src/x.js": "export const LIMIT = 25;\n" }, "chore: tidy the list");
  const json = spawnSync(process.execPath, [CLI, "range", `${base}..HEAD`, "--json"], { cwd: dir, encoding: "utf8" });
  assert.equal(json.status, 0, json.stderr);
  const parsed = JSON.parse(json.stdout);
  assert.equal(parsed.commits.length, 1, "base..HEAD leaves out the base");
  const flag = parsed.commits[0].flags.find((f) => f.code === "type");
  assert.deepEqual(flag.evidence, [{ sign: "-", text: "export const LIMIT = 50;" }, { sign: "+", text: "export const LIMIT = 25;" }]);
  assert.equal(flag.moreLines, 0);
  assert.ok(parsed.commits[0].flags.filter((f) => f.code !== "type").every((f) => Array.isArray(f.evidence) && f.evidence.length === 0), "a flag with no evidence carries an empty array");
});

// Names gone at <to>: a removed name that the tree at <to> no longer holds (own fixtures below).
const goneOf = (report) => report.gonenames.map((g) => g.name);

test("a name renamed in code, tests and README is listed as gone, with the files that held it at from", () => {
  const dir = newRepo();
  const base = commit(dir, {
    "src/client.js": "export function connect(o) {\n  return o.retryLimit ?? 3;\n}\n",
    "test/client.test.mjs": "import { connect } from \"../src/client.js\";\nconnect({ retryLimit: 5 });\n",
    "README.md": "# Client\n\nSet retryLimit to change the retries.\n",
  }, "chore: start the client");
  commit(dir, {
    "src/client.js": "export function connect(o) {\n  return o.maxAttempts ?? 3;\n}\n",
    "test/client.test.mjs": "import { connect } from \"../src/client.js\";\nconnect({ maxAttempts: 5 });\n",
    "README.md": "# Client\n\nSet maxAttempts to change the attempts.\n",
  }, "feat(client): rename the retry option");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  const gone = report.gonenames.find((g) => g.name === "retryLimit");
  assert.ok(gone, "retryLimit is listed");
  assert.equal(gone.files, 2);
  assert.deepEqual([...gone.paths].sort(), ["README.md", "src/client.js"]);
  const text = render(report);
  assert.match(text, /^names gone at HEAD:$/m);
  assert.match(text, /^ {2}retryLimit {2}\(was in 2 files: /m);
  assert.ok(text.includes("Candidates: a name that disappeared may be a renamed or removed option, flag, setting or function that users call. Check before you write the release notes."));
  assert.ok(text.indexOf("names gone at HEAD:") < text.indexOf("Candidates only."), "the section comes before the footer");
});

test("a local variable renamed inside one function is listed as a candidate; a name still in the tree is not", () => {
  const dir = newRepo();
  const base = commit(dir, {
    "src/pager.js": "export function pageOf(xs, n) {\n  const pageTotal = n;\n  return xs.slice(0, pageTotal);\n}\n",
    "src/totals.js": "export const pageTotal = 3;\n",
  }, "chore: start the pager");
  commit(dir, {
    "src/pager.js": "export function pageOf(xs, n) {\n  const pageCount = n;\n  return xs.slice(0, pageCount);\n}\n",
  }, "refactor(pager): rename a local");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.ok(!goneOf(report).includes("pageTotal"), "pageTotal is still declared in src/totals.js at HEAD");
  const d = newRepo();
  const b = commit(d, { "src/pager.js": "export function pageOf(xs, n) {\n  const pageSize = n;\n  return xs.slice(0, pageSize);\n}\n" }, "chore: start");
  commit(d, { "src/pager.js": "export function pageOf(xs, n) {\n  const perPage = n;\n  return xs.slice(0, perPage);\n}\n" }, "refactor(pager): rename a local");
  const local = range({ from: b, to: "HEAD", cwd: d });
  const pageSize = local.gonenames.find((g) => g.name === "pageSize");
  assert.ok(pageSize, "the renamed local is listed, as a candidate");
  assert.deepEqual(pageSize.paths, ["src/pager.js"]);
});

test("a removed flag is listed; a flag still in the tree is not", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/cli.js": "const flags = [\"--legacy-output\", \"--json\"];\nexport default flags;\n" }, "chore: start the cli");
  commit(dir, { "src/cli.js": "const flags = [\"--json\"];\nexport default flags;\n" }, "feat(cli): drop the legacy output flag");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.deepEqual(goneOf(report), ["--legacy-output"]);
  assert.equal(report.gonenames[0].files, 1);
});

test("a range that holds only docs changes has no names-gone section and an empty list", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/api.js": "export const retryLimit = 3;\n", "README.md": "# Api\n\nUse legacyRetryMode to enable retries.\n" }, "chore: start");
  commit(dir, { "README.md": "# Api\n\nRetries are off by default.\n" }, "docs: explain retries");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.deepEqual(report.gonenames, [], "legacyRetryMode is named only in a doc line, which is not code");
  assert.ok(!render(report).includes("names gone at"));
  assert.ok(!render(report).includes("Candidates: a name that disappeared"));
});

test("a name removed only from a test file, or only from a comment line, is not listed", () => {
  const dir = newRepo();
  const base = commit(dir, {
    "src/store.js": "export const open = () => 1;\n// legacyAudit is kept for old readers\n",
    "test/store.test.mjs": "const probeBeacon = 1;\n",
  }, "chore: start the store");
  commit(dir, {
    "src/store.js": "export const open = () => 1;\n",
    "test/store.test.mjs": "const probeBeaconNew = 1;\n",
  }, "refactor(store): tidy");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.ok(!goneOf(report).includes("legacyAudit"), "a comment line is not code");
  assert.ok(!goneOf(report).includes("probeBeacon"), "a test file is not counted");
});

test("at most eight names are listed, most-mentioned first", () => {
  const dir = newRepo();
  const names = Array.from({ length: 10 }, (_, i) => `knobName${String.fromCharCode(97 + i)}`);
  const base = commit(dir, { "src/knobs.js": `${names.map((n) => `export const ${n} = 1;`).join("\n")}\n` }, "chore: start the knobs");
  commit(dir, { "src/knobs.js": "export const kept = 1;\n" }, "refactor(knobs): replace the knobs");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.equal(report.gonenames.length, 8);
  assert.ok(report.gonenames.every((g, i, all) => i === 0 || all[i - 1].files >= g.files));
});

test("a 1000-commit range is read in under 5 seconds, and a name removed late in it is listed", () => {
  const dir = newRepo();
  const count = 1000;
  const ts = 1767225600;
  const data = (text) => `data ${Buffer.byteLength(text)}\n${text}\n`;
  const stream = [];
  for (let i = 1; i <= count; i++) {
    const path = i === 1 || i === count ? "src/knobs.js" : `src/f${i}.js`;
    const content = i === 1 ? "export const legacyKnobValue = 1;\n" : i === count ? "export const kept = 2;\n" : `export const v${i} = ${i};\n`;
    stream.push(`commit refs/heads/master\nmark :${i}\ncommitter Dev <dev@example.com> ${ts + i * 60} +0000\n${data(`feat(part): step ${i}`)}${i > 1 ? `from :${i - 1}\n` : ""}M 100644 inline ${path}\n${data(content)}\n`);
  }
  execFileSync("git", ["-C", dir, "fast-import", "--quiet"], { input: stream.join("") });
  const base = run(dir, "rev-parse", `HEAD~${count - 1}`).trim();
  const started = Date.now();
  const report = range({ from: base, to: "HEAD", cwd: dir });
  const elapsed = Date.now() - started;
  assert.equal(report.summary.commits, count - 1);
  assert.ok(elapsed < 5000, `took ${elapsed} ms`);
  assert.ok(goneOf(report).includes("legacyKnobValue"));
});

test("keywords, words under five characters and numbers without a letter are not names", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/f.js": "export function f() {\n  const tmp1 = 30000;\n  return tmp1;\n}\n" }, "chore: start");
  commit(dir, { "src/f.js": "export const f = () => 45000;\n" }, "refactor(f): simplify");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.deepEqual(report.gonenames, []);
});

test("the list is most-mentioned first: a name in two files comes before a name in one", () => {
  const dir = newRepo();
  const base = commit(dir, {
    "src/a.js": "export const alphaKnob = 1;\n",
    "src/b.js": "export const alphaKnob = 2;\n",
    "src/c.js": "export const betaKnob = 3;\n",
  }, "chore: start");
  commit(dir, { "src/a.js": "export const kept = 1;\n", "src/b.js": "export const kept = 2;\n", "src/c.js": "export const kept = 3;\n" }, "refactor(knobs): replace the knobs");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.deepEqual(goneOf(report).slice(0, 2), ["alphaKnob", "betaKnob"]);
  assert.equal(report.gonenames[0].files, 2);
  assert.equal(report.gonenames[1].files, 1);
});

// A repo of `commits` built in one fast-import stream: each { subject, files } is one commit on master.
function fastRepo(commits) {
  const dir = newRepo();
  const data = (text) => `data ${Buffer.byteLength(text)}\n${text}\n`;
  const stream = commits.map((c, i) => `commit refs/heads/master\ncommitter Dev <dev@example.com> ${1767225600 + i * 60} +0000\n${data(c.subject)}${Object.entries(c.files).map(([p, t]) => `M 100644 inline ${p}\n${data(t)}`).join("")}\n`);
  execFileSync("git", ["-C", dir, "fast-import", "--quiet"], { input: stream.join("") });
  run(dir, "checkout", "-q", "master");
  return dir;
}

// Runs the CLI with stdout as a pipe that is not read for 200 ms, so a write that is cut off by an early exit shows.
function pipedRun(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], { cwd });
    const chunks = [];
    let stderr = "";
    child.stderr.on("data", (c) => { stderr += c; });
    child.stdout.on("data", (c) => chunks.push(c));
    child.stdout.pause();
    setTimeout(() => child.stdout.resume(), 200);
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout: Buffer.concat(chunks).toString("utf8"), stderr }));
  });
}

test("a merge commit whose subject reads as a revert is a merge with no net state, and the ledger does not throw", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/a.js": "export const a = 1;\n" }, "chore: start");
  run(dir, "checkout", "-q", "-b", "side");
  commit(dir, { "src/side.js": "export const side = 1;\n" }, "feat(side): add the side");
  run(dir, "checkout", "-q", "master");
  const keep = commit(dir, { "src/keep.js": "export const keep = 1;\n" }, "feat(keep): keep the list");
  run(dir, "merge", "-q", "--no-ff", "-m", 'Revert "feat(side): add the side"', "side");
  const merge = head(dir);
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.equal(report.summary.commits, 3);
  const m = find(report, merge);
  assert.equal(m.merge, true);
  assert.equal(m.net, null);
  assert.deepEqual(m.classes, ["merge"]);
  assert.ok(flagsOf(report, merge).some((t) => t.startsWith("merge commit whose subject reads as a revert")));
  assert.ok(flagsOf(report, keep).includes("net: present"));
  assert.ok(render(report).includes("merge commit whose subject reads as a revert"));
});

test("range --json through a pipe that is read slowly keeps every byte of a 600-commit ledger", async () => {
  const commits = Array.from({ length: 601 }, (_, i) => ({ subject: `docs: note ${i}`, files: { [`notes/${i}.md`]: `note ${i}\n` } }));
  const dir = fastRepo(commits);
  const out = await pipedRun(["range", "HEAD~600..HEAD", "--json"], dir);
  assert.equal(out.code, 0, out.stderr);
  const parsed = JSON.parse(out.stdout);
  assert.deepEqual(parsed.summary, { commits: 600, present: 600, cancelled: 0 });
  assert.equal(parsed.commits.length, 600);
  assert.ok(out.stdout.length > 65536, `only ${out.stdout.length} bytes: the pipe was not exercised past 64 KiB`);
});

test("a range of more than 3000 commits is read for its last 500, and the report says so", () => {
  const total = 3101;
  const dir = fastRepo(Array.from({ length: total }, (_, i) => ({ subject: `docs: note ${i}`, files: { [`notes/${i}.md`]: `note ${i}\n` } })));
  const report = range({ from: `HEAD~${total - 1}`, to: "HEAD", cwd: dir });
  assert.equal(report.summary.commits, 500);
  assert.deepEqual(report.notes, ["range too large (3100 commits); showing the last 500"]);
  assert.ok(render(report).includes("note: range too large (3100 commits); showing the last 500"));
  // The first commit shown is the one 500 back from HEAD: the window is the newest 500 commits, oldest first.
  assert.equal(report.commits[0].sha, run(dir, "rev-parse", "HEAD~499").trim());
  assert.equal(report.commits.at(-1).sha, head(dir));
});

test("evidence lines are read for the first 40 flagged commits only, and the note says so", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/a.js": "export const a = 1;\n" }, "chore: start");
  for (let i = 1; i <= 45; i++) commit(dir, { "src/a.js": `export const a = ${i + 1};\n` }, `docs: change the constant ${i}`);
  const report = range({ from: base, to: "HEAD", cwd: dir });
  const withEvidence = report.commits.filter((c) => c.flags.some((f) => f.code === "type" && f.evidence.length > 0));
  const flagged = report.commits.filter((c) => c.flags.some((f) => f.code === "type"));
  assert.equal(flagged.length, 45, "every commit is still flagged");
  assert.equal(withEvidence.length, 40);
  assert.deepEqual(report.notes, ["evidence for the first 40 flagged commits only"]);
  assert.ok(render(report).includes("note: evidence for the first 40 flagged commits only"));
});

test("names gone beyond the first 300 are not checked, and the report says how many there were", () => {
  const dir = newRepo();
  const names = Array.from({ length: 320 }, (_, i) => `tokenNumber${i}`);
  const base = commit(dir, { "src/many.js": `${names.map((n) => `export const ${n} = 1;`).join("\n")}\n` }, "chore: start");
  commit(dir, { "src/many.js": "export const kept = 1;\n" }, "refactor(many): replace the constants");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.deepEqual(report.notes, ["names gone: checked the first 300 of 320 removed names; the rest were not checked"]);
});

test("a removed name that survives only inside a longer name is still listed as gone (whole words only)", () => {
  const dir = newRepo();
  // `shared` is removed from other.js but kept in limits.js, so limits.js is read for the batch; `retryLimit` is only inside `retryLimitMax` there.
  const base = commit(dir, {
    "src/limits.js": "export const retryLimit = 3;\nexport const retryLimitMax = 5;\nexport const shared = 1;\n",
    "src/other.js": "export const shared = 1;\n",
  }, "chore: start the limits");
  commit(dir, {
    "src/limits.js": "export const retryLimitMax = 5;\nexport const shared = 1;\n",
    "src/other.js": "export const other = 1;\n",
  }, "refactor(limits): drop the short name");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.ok(goneOf(report).includes("retryLimit"), "retryLimitMax is a different word");
  assert.ok(!goneOf(report).includes("shared"), "shared is still a whole word in limits.js");
});

// Commits with fixed committer dates, from one fast-import stream: [{ subject, files: { path: text }, date: "YYYY-MM-DD" }].
function datedRepo(commits) {
  const dir = newRepo();
  const lines = [];
  commits.forEach((c, i) => {
    const msg = c.subject;
    const unix = Math.floor(Date.parse(`${c.date}T00:00:00Z`) / 1000);
    lines.push("commit refs/heads/master", `mark :${i + 1}`, `committer Dev <dev@example.com> ${unix} +0000`, `data ${Buffer.byteLength(msg)}`, msg);
    if (i > 0) lines.push(`from :${i}`);
    for (const [path, text] of Object.entries(c.files)) lines.push(`M 100644 inline ${path}`, `data ${Buffer.byteLength(text)}`, text, "");
  });
  execFileSync("git", ["fast-import", "--quiet"], { cwd: dir, input: lines.join("\n") + "\n" });
  return dir;
}

test("--first-parent lists only the first-parent chain, and the header says so", () => {
  const dir = newRepo();
  const base = commit(dir, { "src/a.js": "export const a = 1;\n" }, "chore: start the shop");
  const onMain = commit(dir, { "src/main.js": "export const m = 1;\n" }, "feat(main): add the main thing");
  run(dir, "checkout", "-q", "-b", "side", base);
  const sideFeat = commit(dir, { "src/side.js": "export const s = 1;\n" }, "feat(side): add the side thing");
  run(dir, "checkout", "-q", "master");
  run(dir, "merge", "-q", "--no-ff", "-m", "merge side", "side");
  const merge = head(dir);
  const all = range({ from: base, to: "HEAD", cwd: dir });
  assert.ok(all.commits.some((c) => c.sha === sideFeat), "without the flag the side commit is listed");
  assert.equal(all.firstParent, false);
  const fp = range({ from: base, to: "HEAD", cwd: dir, firstParent: true });
  assert.deepEqual(fp.commits.map((c) => c.sha), [onMain, merge], "the side commit is not on the first-parent chain");
  assert.equal(fp.firstParent, true);
  assert.equal(fp.header, `range ${base}..HEAD (first parent): 2 commits, 1 net change present, 0 cancelled`);
  const cli = spawnSync(process.execPath, [CLI, "range", `${base}..HEAD`, "--first-parent", "--json"], { cwd: dir, encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).firstParent, true);
});

test("--since and --until pick the window by committer date and print the resolved range with its first and last dates", () => {
  const dir = datedRepo([
    { subject: "chore: start the ledger", files: { "ledger/a.txt": "one\n" }, date: "2026-09-01" },
    { subject: "feat(ledger): add the export", files: { "ledger/b.txt": "two\n" }, date: "2026-09-15" },
    { subject: "fix(ledger): round the totals", files: { "ledger/c.txt": "three\n" }, date: "2026-09-30" },
  ]);
  const [c1, c2, c3] = ["HEAD~2", "HEAD~1", "HEAD"].map((r) => run(dir, "rev-parse", r).trim());
  const report = windowOf({ since: "2026-09-10", until: "2026-09-20", cwd: dir });
  assert.equal(report.commits, 1);
  assert.equal(report.first.sha, c2);
  assert.equal(report.last.sha, c2);
  assert.equal(report.first.date, "2026-09-15 00:00:00 +0000", "the date carries its timezone");
  assert.equal(report.from, c1, "from is the parent of the oldest commit in the window");
  assert.equal(report.to, c2);
  const cli = spawnSync(process.execPath, [CLI, "range", "--since", "2026-09-10", "--until", "2026-09-20"], { cwd: dir, encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.ok(cli.stdout.startsWith("window 2026-09-10 to 2026-09-20: first commit 2026-09-15 00:00:00 +0000, last commit 2026-09-15 00:00:00 +0000\n"), cli.stdout);
  assert.ok(cli.stdout.includes(`resolved ${c1}..${c2}\n`));
  assert.ok(cli.stdout.includes("1 commit,") || cli.stdout.includes("1 commits,"), cli.stdout);
  const json = spawnSync(process.execPath, [CLI, "range", "--since", "2026-09-10", "--json"], { cwd: dir, encoding: "utf8" });
  assert.equal(json.status, 0, json.stderr);
  const parsed = JSON.parse(json.stdout);
  assert.equal(parsed.window.to, c3, "with no --until the window runs to the tip");
  assert.equal(parsed.window.from, c1, "from is the parent of the oldest commit since 10 September (c2)");
  assert.equal(parsed.summary.commits, 2);
});

test("a ref after --since is the tip the window is read from, not HEAD", () => {
  const dir = datedRepo([
    { subject: "chore: start the ledger", files: { "ledger/a.txt": "one\n" }, date: "2026-09-01" },
    { subject: "feat(ledger): add the export", files: { "ledger/b.txt": "two\n" }, date: "2026-09-15" },
    { subject: "fix(ledger): round the totals", files: { "ledger/c.txt": "three\n" }, date: "2026-09-30" },
  ]);
  const c2 = run(dir, "rev-parse", "HEAD~1").trim();
  const report = windowOf({ since: "2026-09-10", tip: "HEAD~1", cwd: dir });
  assert.equal(report.to, c2);
  assert.equal(report.commits, 1);
});

test("a window with no commit exits 2 and names the window; a window that starts at the first commit exits 2", () => {
  const dir = datedRepo([
    { subject: "chore: start the ledger", files: { "ledger/a.txt": "one\n" }, date: "2026-09-01" },
    { subject: "feat(ledger): add the export", files: { "ledger/b.txt": "two\n" }, date: "2026-09-15" },
  ]);
  const empty = spawnSync(process.execPath, [CLI, "range", "--since", "2026-09-02", "--until", "2026-09-05"], { cwd: dir, encoding: "utf8" });
  assert.equal(empty.status, 2);
  assert.match(empty.stderr, /range: cannot read the window: no commit between 2026-09-02 to 2026-09-05 on HEAD/);
  const root = spawnSync(process.execPath, [CLI, "range", "--until", "2026-09-02"], { cwd: dir, encoding: "utf8" });
  assert.equal(root.status, 2);
  assert.match(root.stderr, /starts at the first commit of the history/);
});

test("a malformed or future --since, a malformed --until, and a window mixed with a range are usage errors", () => {
  const dir = datedRepo([{ subject: "chore: start the ledger", files: { "ledger/a.txt": "one\n" }, date: "2026-09-01" }]);
  for (const args of [["--since", "2026-02-31"], ["--since", "garbage"], ["--since", "2999-01-01"], ["--until", "2026-13-01"], ["--since"], ["--since", "2026-09-01", "HEAD~0..HEAD"]]) {
    const r = spawnSync(process.execPath, [CLI, "range", ...args], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 2, `${args.join(" ")}: ${r.stdout}${r.stderr}`);
  }
  const future = spawnSync(process.execPath, [CLI, "range", "--since", "2999-01-01"], { cwd: dir, encoding: "utf8" });
  assert.match(future.stderr, /--since is in the future/);
  const malformed = spawnSync(process.execPath, [CLI, "range", "--since", "garbage"], { cwd: dir, encoding: "utf8" });
  assert.match(malformed.stderr, /--since takes a date such as 2026-10-01/);
});

test("candidate themes name the top three directories by changed files, and are omitted for one directory", () => {
  const dir = newRepo();
  const base = commit(dir, { "README.md": "# Shop\n" }, "chore: start");
  commit(dir, { "src/billing/a.js": "export const a = 1;\n", "src/billing/b.js": "export const b = 1;\n", "src/billing/c.js": "export const c = 1;\n" }, "feat(billing): add the first part");
  commit(dir, { "docs/guide.md": "one\n", "docs/api.md": "two\n", "tests/x.test.mjs": "x\n" }, "docs: add the guide");
  commit(dir, { "scripts/build.sh": "echo\n", "src/billing/d.js": "export const d = 1;\n" }, "feat(build): add the build");
  const report = range({ from: base, to: "HEAD", cwd: dir });
  assert.deepEqual(report.themes, [
    { dir: "src/billing", files: 4 },
    { dir: "docs", files: 2 },
    { dir: "scripts", files: 1 },
  ]);
  assert.ok(render(report).includes("candidate themes: src/billing (4 files), docs (2 files), scripts (1 file)"));
  const one = newRepo();
  const b1 = commit(one, { "src/a.js": "a\n" }, "chore: start");
  commit(one, { "src/b.js": "b\n", "src/c.js": "c\n" }, "feat: more");
  const single = range({ from: b1, to: "HEAD", cwd: one });
  assert.deepEqual(single.themes, []);
  assert.ok(!render(single).includes("candidate themes"));
});

test("vocabularyOf holds the subject words, the path components and the changed-line words of a range", () => {
  const dir = newRepo();
  const base = commit(dir, { "README.md": "# Shop\n" }, "chore: start");
  commit(dir, { "ledgerpages/summary.txt": "tally = 1\n" }, "feat(reports): add the nightly rollup");
  const v = vocabularyOf({ from: base, to: "HEAD", cwd: dir });
  assert.equal(v.capped, false);
  for (const w of ["nightly", "rollup", "ledgerpages", "summary", "tally"]) assert.ok(v.words.has(w), w);
  assert.ok(!v.words.has("zebra"));
  assert.ok(!v.words.has("start"), "a word of the base commit, outside the range, is not in the vocabulary");
});

test("vocabularyOf stops at the word cap and says so", () => {
  const dir = newRepo();
  const base = commit(dir, { "README.md": "# Shop\n" }, "chore: start");
  const words = [];
  for (let i = 0; words.length < VOCAB_CAP + 500; i++) words.push(`w${i.toString(36).padStart(4, "a")}x${(i * 7919).toString(36)}`.replace(/[^a-z]/g, "q") + "qqqqq");
  commit(dir, { "src/many.txt": `${words.join("\n")}\n` }, "chore: many words");
  const v = vocabularyOf({ from: base, to: "HEAD", cwd: dir });
  assert.equal(v.capped, true);
  assert.equal(v.words.size, VOCAB_CAP);
});

test("vocabularyOf skips a range of more than 2000 commits and returns no words", () => {
  const dir = bigRepo(VOCAB_COMMIT_LIMIT + 2);
  const v = vocabularyOf({ from: `HEAD~${VOCAB_COMMIT_LIMIT + 1}`, to: "HEAD", cwd: dir });
  assert.equal(v.words, null);
  assert.equal(v.commits, VOCAB_COMMIT_LIMIT + 1);
});

test("the vocabulary of a 500-commit range is built and matched against a note in under 3 seconds", async () => {
  const { notes } = await import("../bin/notes.mjs");
  const dir = bigRepo(501);
  const text = "Changes since HEAD~500\nEach change is listed in the ledger view.\nThe weather panel arrives tomorrow morning.\n";
  const t0 = Date.now();
  const v = vocabularyOf({ from: "HEAD~500", to: "HEAD", cwd: dir });
  const r = notes(text, { vocabulary: v.words });
  const ms = Date.now() - t0;
  assert.deepEqual(r.findings.map((f) => `${f.code}:${f.line}`), ["untraced:3"]);
  assert.ok(ms < 3000, `took ${ms} ms`);
});
