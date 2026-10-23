import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "check.mjs");

/** A repository with one committed file, so the next staged change has a base. */
function repo(base = { "README.md": "# fixture\n" }) {
  const dir = mkdtempSync(join(tmpdir(), "pe-stubs-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "--quiet", "-b", "main");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "T");
  git("config", "commit.gpgsign", "false");
  write(dir, base);
  git("add", ...Object.keys(base));
  git("commit", "--quiet", "-m", "base");
  return { dir, git };
}

function write(dir, files) {
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
}

/** Stage the named files with the given content, then run the CLI with args. */
function stage(files, args = [], base) {
  const r = base ?? repo();
  write(r.dir, files);
  r.git("add", ...Object.keys(files));
  const res = run(r.dir, args);
  rmSync(r.dir, { recursive: true, force: true });
  return res;
}

function run(cwd, args) {
  try {
    const out = execFileSync(process.execPath, [cli, "stubs", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { status: 0, out };
  } catch (err) {
    return { status: err.status, out: err.stdout, err: err.stderr };
  }
}

const codes = (res) => JSON.parse(res.out).findings.map((f) => f.code);

const JSON_ARG = ["--json"];

// One positive and one negative per detector. Each negative carries a real assertion or a
// function with a body, so a detector that flags everything fails here.
const cases = [
  ["stub-marker", "src/a.mjs", "export const f = 1; // TODO wire this up\n", "export function f(x) {\n  return x + 1;\n}\n"],
  ["stub-marker", "src/a.mjs", "// FIXME: handle the empty list\nexport const g = 2;\n", "// The list is never empty here.\nexport const g = 2;\n"],
  ["stub-marker", "src/a.mjs", "// XXX remove before release\nexport const h = 3;\n", "export const h = 3; // XXX-1234 is a ticket, not a marker\n"],
  ["not-implemented", "src/b.mjs", 'export function f() {\n  throw new Error("not implemented");\n}\n', 'export function f() {\n  throw new Error("boom");\n}\n'],
  ["not-implemented", "src/b.py", "def f():\n    raise NotImplementedError\n", "def f():\n    raise ValueError('bad')\n"],
  ["empty-body", "src/c.mjs", "export function f() {}\n", "export function f(x) {\n  return x;\n}\n"],
  ["empty-body", "src/c.mjs", "export const g = () => {};\n", "export const g = () => {\n  return 1;\n};\n"],
  ["empty-body", "src/c.mjs", "export function f() {\n}\n", "export function f() {\n  return 1;\n}\n"],
  ["empty-body", "src/c.py", "def f():\n    pass\n", "def f(x):\n    return x + 1\n"],
  ["empty-body", "src/c.py", "def f(): pass\n", "def f(): return 1\n"],
  ["placeholder-return", "src/d.mjs", "export function f() {\n  return null; // stub\n}\n", "export function f(x) {\n  return x;\n}\n"],
  ["decorative-assert", "test/d.test.mjs", 'import assert from "node:assert/strict";\nimport { test } from "node:test";\ntest("x", () => {\n  assert.ok(true);\n});\n', 'import assert from "node:assert/strict";\nimport { test } from "node:test";\ntest("x", () => {\n  assert.equal(1 + 2, 3);\n});\n'],
  ["same-expression", "test/e.test.mjs", 'import { test, expect } from "vitest";\ntest("x", () => {\n  expect(value).toBe(value);\n});\n', 'import { test, expect } from "vitest";\ntest("x", () => {\n  expect(value).toBe(42);\n});\n'],
  ["same-expression", "test/e.test.mjs", 'import assert from "node:assert/strict";\nassert.strictEqual(total, total);\n', 'import assert from "node:assert/strict";\nassert.strictEqual(total, 4);\n'],
  ["same-expression", "tests/test_f.py", "def test_same():\n    assert_equal(x, x)\n", "def test_same():\n    assert add(1, 2) == 3\n"],
  ["decorative-assert", "tests/test_g.py", "def test_literal():\n    assert True\n", "def test_literal():\n    assert add(1, 2) == 3\n"],
  ["no-assertion", "test/h.test.mjs", 'import { test } from "node:test";\ntest("adds", () => {\n  const x = add(1, 2);\n});\n', 'import assert from "node:assert/strict";\nimport { test } from "node:test";\ntest("adds", () => {\n  const x = add(1, 2);\n  assert.equal(x, 3);\n});\n'],
  ["no-assertion", "tests/test_i.py", "def test_add():\n    x = add(1, 2)\n", "def test_add():\n    x = add(1, 2)\n    assert x == 3\n"],
  ["no-assertion", "test/k.test.mjs", 'import { test } from "node:test";\nimport assert from "node:assert/strict";\ntest("adds", () => {\n  const x = add(1, 2);\n});\ntest("other", () => {\n  assert.equal(total, 3);\n});\n', 'import assert from "node:assert/strict";\nimport { test } from "node:test";\ntest("adds", () => {\n  assert.equal(add(1, 2), 3);\n});\n'],
  ["no-assertion", "tests/test_l.py", "def test_add():\n    x = add(1, 2)\n\n\ndef test_other():\n    assert add(1, 2) == 3\n", "def test_add():\n    x = add(1, 2)\n    assert x == 3\n"],
  ["skipped-test", "test/j.test.mjs", 'import assert from "node:assert/strict";\nimport { test } from "node:test";\ntest.skip("later", () => {\n  assert.equal(1, 2);\n});\n', 'import assert from "node:assert/strict";\nimport { test } from "node:test";\ntest("now", () => {\n  assert.equal(1 + 1, 2);\n});\n'],
  ["skipped-test", "tests/test_k.py", "import pytest\n\n@pytest.mark.skip\ndef test_later():\n    assert 1 == 2\n", "import pytest\n\ndef test_now():\n    assert 1 + 1 == 2\n"],
  // r8-2: skip, focus and placeholder markers in other test frameworks and languages.
  ["focused-test", "test/m.test.mjs", 'import { test } from "node:test";\nimport assert from "node:assert/strict";\ntest.only("x", () => {\n  assert.equal(add(1, 2), 3);\n});\n', 'import { test } from "node:test";\nimport assert from "node:assert/strict";\ntest("x", () => {\n  assert.equal(add(1, 2), 3);\n});\n'],
  ["focused-test", "test/m.test.mjs", 'describe.only("x", () => {\n  it("y", () => { expect(add(1, 2)).toBe(3); });\n});\n', 'describe("x", () => {\n  it("y", () => { expect(add(1, 2)).toBe(3); });\n});\n'],
  ["skipped-test", "tests/test_n.py", "import pytest\n\n@pytest.mark.xfail\ndef test_later():\n    assert 1 == 2\n", "import pytest\n\ndef test_now():\n    assert 1 + 1 == 2\n"],
  ["skipped-test", "tests/test_n.py", "import pytest\n\ndef test_later():\n    pytest.xfail('later')\n    assert 1 == 2\n", "import pytest\n\ndef test_now():\n    assert 1 + 1 == 2\n"],
  ["skipped-test", "pkg/a_test.go", 'package pkg\n\nfunc TestA(t *testing.T) {\n\tt.Skip("later")\n}\n', 'package pkg\n\nfunc TestA(t *testing.T) {\n\tif Add(1, 2) != 3 {\n\t\tt.Fatal("bad")\n\t}\n}\n'],
  ["skipped-test", "pkg/a_test.go", 'package pkg\n\nfunc TestA(t *testing.T) {\n\tt.Skipf("later %d", 1)\n}\n', 'package pkg\n\nfunc TestA(t *testing.T) {\n\tt.Logf("now %d", 1)\n}\n'],
  ["skipped-test", "src/lib.rs", "#[test]\n#[ignore]\nfn slow() {\n    assert_eq!(1, 1);\n}\n", "#[test]\nfn slow() {\n    assert_eq!(1, 1);\n}\n"],
  ["skipped-test", "src/test/java/ATest.java", "class ATest {\n    @Disabled\n    @Test\n    void a() { assertEquals(1, 1); }\n}\n", "class ATest {\n    @Test\n    void a() { assertEquals(1, 1); }\n}\n"],
  ["not-implemented", "pkg/b.go", 'package pkg\n\nfunc F() int {\n\tpanic("not implemented")\n}\n', 'package pkg\n\nfunc F() int {\n\tpanic("unreachable state")\n}\n'],
  ["not-implemented", "src/b.rs", "fn f() -> u8 {\n    todo!()\n}\n", "fn f() -> u8 {\n    7\n}\n"],
  ["not-implemented", "src/b.rs", "fn f() -> u8 {\n    unimplemented!(\"later\")\n}\n", "fn f() -> u8 {\n    unreachable!(\"never\")\n}\n"],
  ["decorative-assert", "test/o.test.mjs", 'import { test, expect } from "vitest";\ntest("x", () => {\n  expect.assertions(0);\n  run();\n});\n', 'import { test, expect } from "vitest";\ntest("x", () => {\n  expect.assertions(1);\n  expect(run()).toBe(2);\n});\n'],
];

for (const [code, path, bad, good] of cases) {
  test(`${code} flags ${path} with ${JSON.stringify(bad.split("\n")[0].slice(0, 50))}`, () => {
    const res = stage({ [path]: bad }, JSON_ARG);
    assert.equal(res.status, 1, res.out);
    assert.ok(codes(res).includes(code), `expected ${code}, got ${codes(res).join(",")}`);
  });

  test(`${code} stays quiet on the clean counterpart of ${path}`, () => {
    const res = stage({ [path]: good }, JSON_ARG);
    assert.equal(res.status, 0, res.out);
    assert.deepEqual(codes(res), []);
  });
}

test("a TODO inside a string literal is not a stub marker", () => {
  const res = stage({ "src/label.mjs": 'export const label = "TODO list";\n' }, JSON_ARG);
  assert.equal(res.status, 0, res.out);
  assert.deepEqual(codes(res), []);
});

test("assertion shapes outside a test file are not decorative tests", () => {
  const res = stage({ "src/guard.mjs": "export function guard(x) {\n  assert.ok(true);\n  return x;\n}\n" }, JSON_ARG);
  assert.equal(res.status, 0, res.out);
  assert.deepEqual(codes(res), []);
});

test("documentation is not scanned, so a TODO in a markdown file is not a finding", () => {
  const res = stage({ "docs/notes.md": "# Notes\n\n<!-- TODO fill this in -->\n" }, JSON_ARG);
  assert.equal(res.status, 0, res.out);
  assert.deepEqual(codes(res), []);
});

test("a marker that was already in the base is not reported when a new line is staged", () => {
  const r = repo({ "src/old.mjs": "export const a = 1; // TODO old\n" });
  write(r.dir, { "src/old.mjs": "export const a = 1; // TODO old\nexport const b = 2;\n" });
  r.git("add", "src/old.mjs");
  const res = run(r.dir, JSON_ARG);
  rmSync(r.dir, { recursive: true, force: true });
  assert.equal(res.status, 0, res.out);
  assert.deepEqual(codes(res), []);
});

test("--range reads a committed change; --staged reads the index only", () => {
  const r = repo();
  write(r.dir, { "src/n.mjs": "export const n = 1; // TODO later\n" });
  r.git("add", "src/n.mjs");
  r.git("commit", "--quiet", "-m", "add n");
  const ranged = run(r.dir, ["--range", "HEAD~1..HEAD", "--json"]);
  const staged = run(r.dir, ["--staged", "--json"]);
  rmSync(r.dir, { recursive: true, force: true });
  assert.equal(ranged.status, 1, ranged.out);
  assert.deepEqual(codes(ranged), ["stub-marker"]);
  assert.equal(staged.status, 0, staged.out);
  assert.deepEqual(codes(staged), []);
});

test("--range reads a test body from the range's right side, not from the index", () => {
  const r = repo();
  write(r.dir, { "test/r.test.mjs": 'import assert from "node:assert/strict";\nimport { test } from "node:test";\ntest("r", () => {\n  assert.equal(add(1, 2), 3);\n});\n' });
  r.git("add", "test/r.test.mjs");
  r.git("commit", "--quiet", "-m", "add r");
  write(r.dir, { "test/r.test.mjs": 'import { test } from "node:test";\ntest("r", () => {\n  const x = add(1, 2);\n});\n' });
  r.git("add", "test/r.test.mjs");
  const ranged = run(r.dir, ["--range", "HEAD~1..HEAD", "--json"]);
  rmSync(r.dir, { recursive: true, force: true });
  assert.equal(ranged.status, 0, ranged.out);
  assert.deepEqual(codes(ranged), []);
});

// Test bodies: arrow parameters, option objects, helper assertions, braces inside literals.
const bodies = [
  ["playwright fixture with an assertion is not flagged", "test/p.test.mjs", 'test("a", async ({ page }) => {\n  await expect(page).toHaveTitle("x");\n});\n', []],
  ["options object before the callback is not flagged", "test/q.test.mjs", 'test("b", { timeout: 5 }, () => {\n  assert.equal(add(1, 2), 3);\n});\n', []],
  ["fixture test with no assertion is still flagged", "test/r.test.mjs", 'test("c", async ({ page }) => {\n  const x = page;\n});\n', ["no-assertion"]],
  ["a helper named check* counts as an assertion", "test/h2.test.mjs", 'test("h", () => {\n  checkResult(add(1, 2));\n});\n', []],
  ["t.is from ava counts as an assertion", "test/t2.test.mjs", 'test("t", (t) => {\n  t.is(add(1, 2), 3);\n});\n', []],
  ["an expression-bodied arrow with an assertion is not flagged", "test/ex.test.mjs", 'test("e", () => expect(add(1, 2)).toBe(3));\n', []],
  ["an expression-bodied arrow with no assertion is flagged", "test/ex2.test.mjs", 'test("e2", () => add(1, 2));\n', ["no-assertion"]],
  ["an arrow with a block inside an options object does not start the body", "test/opt.test.mjs", 'test("o", { run: () => { noop(); } }, () => {\n  assert.equal(add(1, 2), 3);\n});\n', []],
  ["a test whose body is not on the lines given is not flagged", "test/nb.test.mjs", 'test("nb", namedBody);\n', []],
  ["a closing brace in a string does not end the body", "test/s.test.mjs", 'test("s", () => {\n  const s = "}";\n  assert.equal(s, "}");\n});\n', []],
  ["a brace in a regex literal does not end the body", "test/re.test.mjs", 'test("re", () => {\n  const re = /}/;\n  assert.ok(re.test("}"));\n});\n', []],
  ["a function expression with a fixture parameter and an assertion is not flagged", "test/fn.test.mjs", 'test("f", async function ({ page }) {\n  await expect(page).toBeVisible();\n});\n', []],
  ["a function expression with no assertion is flagged", "test/fn2.test.mjs", 'test("g", function ({ page }) {\n  const x = page;\n});\n', ["no-assertion"]],
  ["a brace in a string does not hide a body with no assertion", "test/s2.test.mjs", 'test("s2", () => {\n  const s = "}";\n});\n', ["no-assertion"]],
];
for (const [name, path, content, expected] of bodies) {
  test(`test body: ${name}`, () => {
    const res = stage({ [path]: content }, JSON_ARG);
    assert.deepEqual(codes(res), expected);
  });
}

test("a comment marker needs a comment: semicolons and decrements do not start one", () => {
  const res = stage({ "src/semi.mjs": 'const a = 1; const label = "TODO list";\ni--; const word = "TODO ";\n' }, JSON_ARG);
  assert.equal(res.status, 0, res.out);
  assert.deepEqual(codes(res), []);
});

test("a range gives the same findings under custom diff prefixes", () => {
  const files = { "test/rm.test.mjs": 'import { test } from "node:test";\ntest("m", () => {\n  const x = add(1, 2);\n});\n' };
  const r = repo();
  write(r.dir, files);
  r.git("add", ...Object.keys(files));
  r.git("commit", "--quiet", "-m", "add rm");
  const plain = run(r.dir, ["--range", "HEAD~1..HEAD", "--json"]);
  r.git("config", "diff.srcPrefix", "src/");
  r.git("config", "diff.dstPrefix", "dst/");
  const mnemonic = run(r.dir, ["--range", "HEAD~1..HEAD", "--json"]);
  rmSync(r.dir, { recursive: true, force: true });
  assert.deepEqual(codes(plain), ["no-assertion"]);
  assert.deepEqual(JSON.parse(mnemonic.out).findings, JSON.parse(plain.out).findings);
});

test("an SQL comment at the start of a line is a stub marker", () => {
  const res = stage({ "db/q.sql": "-- TODO tune this index\nselect 1;\n" }, JSON_ARG);
  assert.deepEqual(codes(res), ["stub-marker"]);
});

test("findings are the same under diff.mnemonicPrefix, which changes the prefixes git writes", () => {
  const files = { "test/m.test.mjs": 'import { test } from "node:test";\ntest("m", () => {\n  const x = add(1, 2);\n});\n' };
  const plain = stage(files, JSON_ARG);
  const r = repo();
  r.git("config", "diff.mnemonicPrefix", "true");
  write(r.dir, files);
  r.git("add", ...Object.keys(files));
  const mnemonic = run(r.dir, JSON_ARG);
  rmSync(r.dir, { recursive: true, force: true });
  assert.deepEqual(codes(plain), ["no-assertion"]);
  assert.deepEqual(JSON.parse(mnemonic.out).findings, JSON.parse(plain.out).findings);
});

test("--warn reports findings and exits 0", () => {
  const res = stage({ "src/a.mjs": "// TODO later\n" }, ["--warn"]);
  assert.equal(res.status, 0, res.out);
  assert.match(res.out, /stub-marker/);
});

test("the text output names the file, the line and a reason, with counts", () => {
  const res = stage({ "src/a.mjs": "export const a = 1;\n// TODO later\n" });
  assert.equal(res.status, 1);
  assert.match(res.out, /src\/a\.mjs:2\s+stub-marker\s+\S/);
  assert.match(res.out, /1 finding/);
});

test("--json has exactly count and findings, each finding file, line, code and reason", () => {
  const res = stage({ "src/a.mjs": "// TODO one\nexport const x = 1; // FIXME two\n" }, JSON_ARG);
  const body = JSON.parse(res.out);
  assert.deepEqual(Object.keys(body).sort(), ["count", "findings"]);
  assert.equal(body.count, body.findings.length);
  assert.equal(body.count, 2);
  for (const f of body.findings) {
    assert.deepEqual(Object.keys(f).sort(), ["code", "file", "line", "reason"]);
    assert.equal(f.file, "src/a.mjs");
    assert.equal(typeof f.line, "number");
    assert.ok(f.reason.length > 0);
  }
  assert.deepEqual(body.findings.map((f) => f.line), [1, 2]);
});

test("a clean change exits 0 and reports count 0", () => {
  const res = stage({ "src/ok.mjs": "export function f(x) {\n  return x;\n}\n" }, JSON_ARG);
  assert.equal(res.status, 0, res.out);
  assert.deepEqual(JSON.parse(res.out), { count: 0, findings: [] });
});

test("two flags that name a source are a usage error", () => {
  const r = repo();
  const res = run(r.dir, ["--staged", "--range", "HEAD~1..HEAD"]);
  rmSync(r.dir, { recursive: true, force: true });
  assert.equal(res.status, 2);
});

// Scope. The default is the working tree against HEAD (staged and unstaged changes) plus new
// files that git does not ignore; --staged is the index only.
test("an unstaged TODO is found by default", () => {
  const r = repo({ "src/u.mjs": "export const u = 1;\n" });
  write(r.dir, { "src/u.mjs": "export const u = 1; // TODO wire this up\n" });
  const res = run(r.dir, JSON_ARG);
  rmSync(r.dir, { recursive: true, force: true });
  assert.equal(res.status, 1, res.out);
  assert.deepEqual(codes(res), ["stub-marker"]);
  assert.equal(JSON.parse(res.out).findings[0].file, "src/u.mjs");
});

test("a new untracked file with a TODO is found by default", () => {
  const r = repo();
  write(r.dir, { "src/new.mjs": "export const n = 1; // TODO finish\n" });
  const res = run(r.dir, JSON_ARG);
  rmSync(r.dir, { recursive: true, force: true });
  assert.equal(res.status, 1, res.out);
  assert.deepEqual(codes(res), ["stub-marker"]);
});

test("a file that git ignores is not scanned by default", () => {
  const r = repo({ ".gitignore": "build/\n" });
  write(r.dir, { "build/out.mjs": "export const o = 1; // TODO generated\n" });
  const res = run(r.dir, JSON_ARG);
  rmSync(r.dir, { recursive: true, force: true });
  assert.equal(res.status, 0, res.out);
  assert.deepEqual(codes(res), []);
});

test("--staged does not see an unstaged change", () => {
  const r = repo({ "src/s.mjs": "export const s = 1;\n" });
  write(r.dir, { "src/s.mjs": "export const s = 1;\nexport const t = 2; // TODO later\n" });
  r.git("add", "src/s.mjs");
  write(r.dir, { "src/s.mjs": "export const s = 1;\nexport const t = 2; // TODO later\nexport const u = 3; // TODO again\n" });
  const staged = run(r.dir, ["--staged", "--json"]);
  const all = run(r.dir, JSON_ARG);
  rmSync(r.dir, { recursive: true, force: true });
  assert.equal(staged.status, 1, staged.out);
  assert.equal(JSON.parse(staged.out).findings.length, 1);
  assert.equal(JSON.parse(staged.out).findings[0].line, 2);
  assert.equal(JSON.parse(all.out).findings.length, 2);
});

test("a clean tree says clean and names the scope it scanned", () => {
  const r = repo();
  const res = run(r.dir, []);
  rmSync(r.dir, { recursive: true, force: true });
  assert.equal(res.status, 0, res.out);
  assert.match(res.out, /stubs: clean, no findings in the working tree/);
  assert.match(res.out, /0 files, 0 added lines scanned/);
});

test("a repository with no commit yet still scans its untracked files", () => {
  const dir = mkdtempSync(join(tmpdir(), "pe-stubs-"));
  execFileSync("git", ["init", "--quiet", "-b", "main"], { cwd: dir });
  write(dir, { "src/first.mjs": "export const f = 1; // TODO first\n" });
  const res = run(dir, JSON_ARG);
  rmSync(dir, { recursive: true, force: true });
  assert.equal(res.status, 1, res.out);
  assert.deepEqual(codes(res), ["stub-marker"]);
});

test("stubs accepts -q and --quiet as a no-op on the findings", () => {
  const r = repo();
  write(r.dir, { "src/q.mjs": "export const q = 1; // TODO quiet\n" });
  const quiet = run(r.dir, ["-q", "--json"]);
  const long = run(r.dir, ["--quiet", "--json"]);
  rmSync(r.dir, { recursive: true, force: true });
  assert.equal(quiet.status, 1, quiet.out);
  assert.deepEqual(JSON.parse(quiet.out), JSON.parse(long.out));
});

test("r8-2 markers inside a string or a comment are not findings", () => {
  for (const [path, text] of [
    ["test/p.test.mjs", 'import assert from "node:assert/strict";\nassert.equal(label, "use test.only( to focus");\n'],
    ["test/p.test.mjs", "// do not call describe.only( here\nassert.equal(add(1, 2), 3);\n"],
    ["pkg/p_test.go", 'package pkg\n\nvar msg = "call t.Skip( to skip"\n// t.Skipf("x")\n'],
    ["pkg/p.go", 'package pkg\n\nvar msg = "panic(\\"not implemented\\")"\n'],
    ["src/p.rs", 'const MSG: &str = "todo!(\\"x\\")";\n// unimplemented!()\n'],
    ["tests/test_p.py", "def test_x():\n    assert note == 'xfail is a word here'\n"],
  ]) {
    const res = stage({ [path]: text }, JSON_ARG);
    assert.equal(res.status, 0, `${path}: ${res.out}`);
  }
});

test("r8-2 a Go or Rust file is read as code, not skipped as an unknown language", () => {
  const res = stage({ "src/q.rs": "fn f() {\n    todo!(); // later\n}\n" }, JSON_ARG);
  assert.deepEqual(codes(res), ["not-implemented"]);
});
