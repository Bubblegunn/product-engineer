import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scope, render, classOf } from "../bin/scope.mjs";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "check.mjs");
const run = (cwd, ...args) => execFileSync("git", ["-c", "user.name=Dev", "-c", "user.email=dev@example.com", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", ...args], { cwd, encoding: "utf8" });

function calendarRepo() {
  const dir = mkdtempSync(join(tmpdir(), "scope-"));
  run(dir, "init", "-q", "-b", "main");
  mkdirSync(join(dir, "src"));
  mkdirSync(join(dir, "test"));
  writeFileSync(join(dir, "src", "slots.js"), "function free(a, b) {\n  return b - a;\n}\nmodule.exports = { free };\n");
  writeFileSync(join(dir, "src", "invite.js"), "const send = (to) => {\n  return `Invite for ${to}`;\n};\nmodule.exports = { send };\n");
  writeFileSync(join(dir, "test", "slots.test.js"), "// test\n");
  writeFileSync(join(dir, "README.md"), "# Calendar\n");
  run(dir, "add", "-A");
  run(dir, "commit", "-q", "-m", "base");
  return dir;
}

test("a reformatted file is whitespace-only and a changed line is shown", () => {
  const dir = calendarRepo();
  writeFileSync(join(dir, "src", "invite.js"), "const send = (to) => {\n\n    return `Invite for ${to}`;\n};\nmodule.exports = { send };\n");
  writeFileSync(join(dir, "src", "slots.js"), "function free(a, b) {\n  return Math.abs(b - a);\n}\nmodule.exports = { free };\n");
  run(dir, "add", "-A");
  run(dir, "commit", "-q", "-m", "tidy");
  const report = scope({ range: "HEAD~1..HEAD", cwd: dir });
  const invite = report.files.find((f) => f.path === "src/invite.js");
  const slots = report.files.find((f) => f.path === "src/slots.js");
  assert.equal(invite.whitespaceOnly, true);
  assert.equal(slots.whitespaceOnly, false);
  assert.equal(slots.changedIgnoringWhitespace, 2);
  assert.deepEqual(slots.lines, ["-  return b - a;", "+  return Math.abs(b - a);"]);
  const text = render(report);
  assert.match(text, /src\/invite\.js: whitespace-only/);
  assert.match(text, /\+  return Math\.abs\(b - a\);/);
  assert.match(text, /1 whitespace-only, 1 not; 0 test files touched/);
});

test("with no range it reads the staged change, then the working tree, then the last commit", () => {
  const dir = calendarRepo();
  assert.match(render(scope({ cwd: dir })), /no parent commit/);
  writeFileSync(join(dir, "README.md"), "# Calendar v2\n");
  run(dir, "commit", "-q", "-am", "second");
  assert.match(render(scope({ cwd: dir })), /scope of the last commit/);
  writeFileSync(join(dir, "README.md"), "# Calendar app\n");
  assert.match(render(scope({ cwd: dir })), /scope of the working tree against HEAD/);
  run(dir, "add", "README.md");
  assert.match(render(scope({ cwd: dir })), /scope of the staged change/);
});

test("files are classed by path", () => {
  assert.equal(classOf("test/slots.test.js"), "test");
  assert.equal(classOf("docs/guide.md"), "doc");
  assert.equal(classOf("package.json"), "config");
  assert.equal(classOf(".github/workflows/ci.yml"), "config");
  assert.equal(classOf("src/slots.js"), "source");
});

test("the scope command runs from the CLI, prints json, and rejects an unknown flag", () => {
  const dir = calendarRepo();
  writeFileSync(join(dir, "README.md"), "# Calendar app\n");
  const ok = spawnSync("node", [CLI, "scope", "--json"], { cwd: dir, encoding: "utf8" });
  assert.equal(ok.status, 0);
  assert.equal(JSON.parse(ok.stdout).files[0].path, "README.md");
  assert.equal(spawnSync("node", [CLI, "scope", "--nope"], { cwd: dir, encoding: "utf8" }).status, 2);
});

test("changes outside the chosen change are listed as notes", () => {
  const dir = calendarRepo();
  writeFileSync(join(dir, "README.md"), "# Calendar v3\n");
  run(dir, "add", "README.md");
  writeFileSync(join(dir, "src", "slots.js"), "// changed\n");
  writeFileSync(join(dir, "src", "new.js"), "// new\n");
  const text = render(scope({ cwd: dir }));
  assert.match(text, /scope of the staged change/);
  assert.match(text, /note  1 file also changed but not staged: src\/slots\.js/);
  assert.match(text, /note  1 untracked file not read: src\/new\.js/);
});

test("spaces inside a line count as changes when tokens join, indentation changes do not", () => {
  const dir = calendarRepo();
  writeFileSync(join(dir, "src", "slots.js"), "function free(a, b) {\n  returnb - a;\n}\nmodule.exports = { free };\n");
  assert.equal(scope({ cwd: dir }).files[0].whitespaceOnly, false);
});

test("scope --json through a pipe that is read slowly keeps every byte of a diff with more than 200 KB of output", async () => {
  const dir = mkdtempSync(join(tmpdir(), "scope-pipe-"));
  run(dir, "init", "-q", "-b", "main");
  writeFileSync(join(dir, "base.txt"), "base\n");
  run(dir, "add", "-A");
  run(dir, "commit", "-q", "-m", "chore: base");
  const files = Array.from({ length: 1500 }, (_, i) => `bulk/part-${String(i).padStart(4, "0")}.txt`);
  // Blank files: each is whitespace-only, so scope does not run one git call per file, and the JSON is still large.
  for (const f of files) { mkdirSync(join(dir, "bulk"), { recursive: true }); writeFileSync(join(dir, f), "\n"); }
  run(dir, "add", "-A");
  run(dir, "commit", "-q", "-m", "docs: add the bulk parts");
  const out = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, "scope", "HEAD~1..HEAD", "--json"], { cwd: dir });
    const chunks = [];
    child.stdout.on("data", (c) => chunks.push(c));
    child.stdout.pause();
    setTimeout(() => child.stdout.resume(), 200);
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout: Buffer.concat(chunks).toString("utf8") }));
  });
  assert.equal(out.code, 0);
  assert.ok(out.stdout.length > 200 * 1024, `only ${out.stdout.length} bytes`);
  const parsed = JSON.parse(out.stdout);
  assert.equal(parsed.files.length, 1500);
});
