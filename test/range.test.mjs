import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { range, render, parseRange } from "../bin/range.mjs";

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
