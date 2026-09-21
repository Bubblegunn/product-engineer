import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findReferences, resolveReferences, referenceFindings } from "../bin/references.mjs";
import { analyse } from "../bin/check.mjs";

const dir = mkdtempSync(join(tmpdir(), "references-test-"));
mkdirSync(join(dir, "src"), { recursive: true });
mkdirSync(join(dir, "docs"), { recursive: true });
writeFileSync(join(dir, "src", "gate.ts"), "one\ntwo\nthree\n");
process.on("exit", () => rmSync(dir, { recursive: true, force: true }));

const levels = (text, opts) => referenceFindings(text, { cwd: dir, ...opts }).map((f) => `${f.level}: ${f.message}`);

test("a path that exists resolves", () => {
  const out = resolveReferences(findReferences("fixed in src/gate.ts today"), { cwd: dir });
  assert.equal(out.length, 1);
  assert.equal(out[0].resolved, true);
});

test("a path that does not exist is reported, with the reason", () => {
  const [f] = levels("fixed in src/missing.ts today");
  assert.match(f, /^warn: cites src\/missing\.ts, which does not resolve: no such file here$/);
});

test("a line number past the end of a real file is reported", () => {
  const [f] = levels("see src/gate.ts:900");
  assert.match(f, /line 900 is past the end of the file \(4 lines\)/);
});

test("a directory is not a file", () => {
  assert.deepEqual(
    resolveReferences([{ kind: "file", raw: "docs", path: "docs", line: null }], { cwd: dir })[0].why,
    "is a directory, not a file",
  );
});

test("a run URL is accepted by shape and nothing goes online", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("this check must not make a network request");
  };
  try {
    const out = levels("run https://github.com/Bubblegunn/workproof/actions/runs/123456789");
    assert.deepEqual(out, ["ok: 1 reference resolves"]);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("citing nothing is never a failure, even in error mode", () => {
  for (const mode of ["warn", "error"]) {
    const out = levels("fix(gate): hold the message until morning", { mode });
    assert.equal(out.length, 1);
    assert.match(out[0], /^info: no file or run reference to resolve/);
  }
});

test("error mode escalates a broken reference, off mode says nothing", () => {
  assert.match(levels("see src/missing.ts", { mode: "error" })[0], /^error: cites src\/missing\.ts/);
  assert.deepEqual(levels("see src/missing.ts", { mode: "off" }), []);
});

test("version numbers, abbreviations and bare words are not paths", () => {
  for (const text of ["shipped v0.3.4", "1.5x faster", "e.g. faster", "no slash here.md", "the ratio is 3/4"]) {
    assert.deepEqual(findReferences(text), [], `treated a non-path as a path in: ${text}`);
  }
});

test("the same path cited twice is resolved once", () => {
  assert.equal(findReferences("src/gate.ts and again src/gate.ts").length, 1);
});

test("analyse carries the finding, and --references off removes it", () => {
  const msg = [
    "fix(gate): hold until morning",
    "",
    "The fix is in src/missing.ts.",
    "",
    "For the customer:",
    "What changed: messages wait until the morning.",
    "Why it matters: nobody is woken at three.",
  ].join("\n");
  const on = analyse(msg, { cwd: dir }).findings.map((f) => f.message);
  assert.ok(on.some((m) => /cites src\/missing\.ts/.test(m)), "analyse dropped the reference finding");
  const off = analyse(msg, { cwd: dir, references: "off" }).findings.map((f) => f.message);
  assert.ok(!off.some((m) => /cites src\/missing\.ts/.test(m)));
});
