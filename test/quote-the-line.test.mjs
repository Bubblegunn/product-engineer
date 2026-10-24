// The quote-the-line gate in bin/references.mjs. A file reference with a line number, followed in the same
// sentence by a backticked or quoted snippet of six or more characters, must have that snippet on the cited
// line or within two lines of it (whitespace ignored). Every fixture is written by this test.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { referenceFindings } from "../bin/references.mjs";

let dir;
before(() => {
  dir = mkdtempSync(join(tmpdir(), "quote-test-"));
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "gate.ts"), ["import { gate } from './x';", "const limit = computeLimit(input);", "return limit > 0;", "export default gate;", ""].join("\n"));
});
after(() => rmSync(dir, { recursive: true, force: true }));

const quoteWarnings = (text, opts = {}) => referenceFindings(text, { cwd: dir, ...opts }).filter((f) => f.code === "quoted-text-missing").map((f) => f.message);

test("a snippet that is on the cited line passes", () => {
  assert.deepEqual(quoteWarnings("The limit is set at src/gate.ts:2 and reads `const limit = computeLimit(input);`."), []);
});

test("a snippet that is not on the cited line, or within two lines of it, is reported at path:line", () => {
  assert.deepEqual(quoteWarnings("The limit is set at src/gate.ts:2 and reads `const limit = 10;`."), ["quoted text not found at src/gate.ts:2"]);
});

test("whitespace does not decide the match", () => {
  assert.deepEqual(quoteWarnings("At src/gate.ts:2 the line reads `const   limit=computeLimit( input );`."), []);
});

test("a snippet on a line within two lines of the cited one passes; one three lines away is reported", () => {
  // Line 4 is two lines below line 2.
  assert.deepEqual(quoteWarnings('At src/gate.ts:2 it says "export default gate;".'), []);
  // Line 4 is three lines below line 1.
  assert.deepEqual(quoteWarnings('At src/gate.ts:1 it says "export default gate;".'), ["quoted text not found at src/gate.ts:1"]);
});

test("double-quoted and curly-quoted snippets are checked too", () => {
  assert.deepEqual(quoteWarnings('At src/gate.ts:3 it says "return limit > 0;".'), []);
  assert.deepEqual(quoteWarnings("At src/gate.ts:3 it says “nothing like this”."), ["quoted text not found at src/gate.ts:3"]);
});

test("a snippet shorter than six characters is not checked", () => {
  assert.deepEqual(quoteWarnings("At src/gate.ts:2 the value is `x = 1`."), []);
});

test("a snippet before the reference, or in a later sentence, is not checked", () => {
  assert.deepEqual(quoteWarnings("`const bogus = 99;` is in src/gate.ts:2."), []);
  assert.deepEqual(quoteWarnings("See src/gate.ts:2. Then `const bogus = 99;` appears elsewhere."), []);
});

test("a reference with no line number is not checked for a quote", () => {
  assert.deepEqual(quoteWarnings("The gate in src/gate.ts reads `const bogus = 99;`."), []);
});

test("a reference that does not resolve is reported as broken, not as a quote mismatch", () => {
  const out = referenceFindings("At src/missing.ts:2 it says `const bogus = 99;`.", { cwd: dir });
  assert.equal(out.filter((f) => f.code === "quoted-text-missing").length, 0);
  assert.ok(out.some((f) => f.code === "references-broken"));
});

test("the gate is off with references set to off", () => {
  assert.deepEqual(quoteWarnings("At src/gate.ts:2 it says `const bogus = 99;`.", { mode: "off" }), []);
});

test("the mismatch is reported at warn level, or error level in error mode", () => {
  const text = "At src/gate.ts:2 it says `const bogus = 99;`.";
  const warn = referenceFindings(text, { cwd: dir }).find((f) => f.code === "quoted-text-missing");
  assert.equal(warn.level, "warn");
  const err = referenceFindings(text, { cwd: dir, mode: "error" }).find((f) => f.code === "quoted-text-missing");
  assert.equal(err.level, "error");
});
