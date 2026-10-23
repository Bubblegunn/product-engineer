import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDiff, crossCheck, isTestPath, isDocPath, namedPaths, secretHitsIn, conflictMarkerHitsIn } from "../bin/diff.mjs";

const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "check.mjs");
const has = (f, level, re) => f.some((x) => x.level === level && re.test(x.message));

/** A repository with one commit, then a second change staged on top of it. */
function repo(staged) {
  const dir = mkdtempSync(join(tmpdir(), "pe-diff-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "--quiet", "-b", "main");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "T");
  writeFileSync(join(dir, "README.md"), "# fixture\n");
  git("add", "-A");
  git("commit", "--quiet", "-m", "init");
  for (const [path, body] of Object.entries(staged)) {
    mkdirSync(join(dir, dirname(path)), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  git("add", "-A");
  return { dir, git };
}

test("paths are sorted into source, test and documentation by their conventions", () => {
  for (const p of ["test/a.mjs", "tests/b.py", "src/__tests__/c.ts", "src/a.test.ts", "pkg/b_spec.rb", "test_thing.py"]) {
    assert.equal(isTestPath(p), true, p);
  }
  for (const p of ["src/index.ts", "bin/run.mjs", "package.json"]) assert.equal(isTestPath(p), false, p);
  for (const p of ["README.md", "docs/guide.md", "LICENSE", "notes.txt"]) assert.equal(isDocPath(p), true, p);
  assert.equal(isDocPath("src/index.ts"), false);
});

test("readDiff counts the staged change, including a rename", () => {
  const { dir, git } = repo({ "src/a.ts": "one\ntwo\n" });
  try {
    git("commit", "--quiet", "-m", "add a");
    git("mv", "src/a.ts", "src/b.ts");
    const d = readDiff({ cwd: dir });
    assert.equal(d.files.length, 1);
    assert.equal(d.files[0].path, "src/b.ts");
    assert.equal(d.range, "--cached");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a claim that tests were added is checked against the files that gained lines", () => {
  const withoutTests = repo({ "src/a.ts": "code\n" });
  try {
    const d = readDiff({ cwd: withoutTests.dir });
    const claim = "Added a regression test for the empty case.";
    assert.ok(has(crossCheck(claim, d, { cwd: withoutTests.dir }), "warn", /says tests were added; no test file gains a line/));
    // No claim, no finding: the check is silent unless the message asserts something.
    assert.ok(!has(crossCheck("Renamed the helper.", d, { cwd: withoutTests.dir }), "warn", /tests/));
  } finally {
    rmSync(withoutTests.dir, { recursive: true, force: true });
  }

  const withTests = repo({ "src/a.ts": "code\n", "test/a.test.ts": "assert(true)\n" });
  try {
    const d = readDiff({ cwd: withTests.dir });
    assert.ok(has(crossCheck("Added a regression test for the empty case.", d, { cwd: withTests.dir }), "ok", /tests claimed and 1 test file gains lines/));
  } finally {
    rmSync(withTests.dir, { recursive: true, force: true });
  }
});

test("documentation only is contradicted by a source file, and a refactor claim is not checked", () => {
  const { dir } = repo({ "src/a.ts": "code\n", "README.md": "# fixture\nmore\n" });
  try {
    const d = readDiff({ cwd: dir });
    assert.ok(has(crossCheck("Documentation only.", d, { cwd: dir }), "warn", /documentation only; 1 file is not documentation: src\/a\.ts/));
    // A refactor may legitimately touch source while claiming no behaviour change.
    assert.ok(!has(crossCheck("A refactor with no behaviour change.", d, { cwd: dir }), "warn", /documentation only/));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a stated file count is compared with the change, in digits or words", () => {
  const { dir } = repo({ "src/a.ts": "code\n", "src/b.ts": "code\n" });
  try {
    const d = readDiff({ cwd: dir });
    assert.ok(has(crossCheck("Changed 3 files.", d, { cwd: dir }), "warn", /says 3 files; the change has 2/));
    assert.ok(has(crossCheck("Changed two files.", d, { cwd: dir }), "ok", /stated file count matches the change: 2/));
    // A number about something other than this change needs a change verb to be read as a claim.
    assert.ok(!has(crossCheck("The tarball ships 9 files.", d, { cwd: dir }), "warn", /file count|says 9/));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a named path is reported only when it is neither in the change nor in the repository", () => {
  const { dir } = repo({ "src/a.ts": "code\n" });
  try {
    const d = readDiff({ cwd: dir });
    assert.ok(has(crossCheck("Touched `src/gone.ts` for this.", d, { cwd: dir }), "warn", /not in this change and not in the repository: src\/gone\.ts/));
    // In the change: ordinary.
    assert.ok(!has(crossCheck("Touched `src/a.ts` for this.", d, { cwd: dir }), "warn", /not in this change/));
    // Present but untouched: ordinary context, not a broken reference.
    assert.ok(!has(crossCheck("As in `README.md`.", d, { cwd: dir }), "warn", /not in this change/));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("namedPaths reads backticked and bare paths and ignores prose", () => {
  const found = namedPaths("see `src/a.ts` and docs/b.md but not README or 3.5 or a/b");
  assert.deepEqual(found.sort(), ["docs/b.md", "src/a.ts"]);
});

test("the flag is opt-in, reports warnings only, and survives a range git does not know", () => {
  const { dir, git } = repo({ "src/a.ts": "code\n" });
  try {
    git("commit", "--quiet", "-m", "add a");
    const msg = join(dir, "m.txt");
    writeFileSync(msg, "feat: a\n\nFor the customer:\nWhat changed: Something.\nWhy it matters: A reason.\n\nAdded tests.\n");
    const run = (...extra) => execFileSync(process.execPath, [cli, "check", msg, ...extra], { cwd: dir, encoding: "utf8" });

    // Without the flag the diff is never read.
    assert.ok(!/cross-checked/.test(run()));
    // With it, the claim is checked and the run still exits 0, because no check here errors.
    const out = run("--diff", "HEAD~1");
    assert.match(out, /cross-checked against 1 file/);
    assert.match(out, /says tests were added/);
    assert.match(out, /no errors, 1 warning/);

    // An unknown range warns instead of crashing, and the message is still checked.
    const bad = execFileSync(process.execPath, [cli, "check", msg, "--diff", "no-such-ref"], { cwd: dir, encoding: "utf8" });
    assert.match(bad, /--diff could not read the change/);
    assert.match(bad, /"For the customer:" block/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a phrase in quotes or backticks is named, not claimed", () => {
  // Found by running this check on its own commit: a message describing the checks was read
  // as making the claims it described. A path in backticks is still a path, because naming a
  // file is not the same as quoting a phrase.
  const { dir } = repo({ "src/a.ts": "code\n" });
  try {
    const d = readDiff({ cwd: dir });
    const describing = 'The check reports "documentation only" over a source change, and warns when `tests` are claimed.';
    const f = crossCheck(describing, d, { cwd: dir });
    assert.ok(!has(f, "warn", /documentation only/), JSON.stringify(f));
    assert.ok(!has(f, "warn", /tests were added/), JSON.stringify(f));
    // The claim itself, unquoted, is still caught.
    assert.ok(has(crossCheck("Documentation only.", d, { cwd: dir }), "warn", /documentation only/));
    // And a backticked path is still read.
    assert.ok(has(crossCheck("Touched `src/gone.ts`.", d, { cwd: dir }), "warn", /src\/gone\.ts/));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a staged file that looks like a secret is named; an example or sample env file is not", () => {
  const { dir } = repo({ ".env": "MODE=dev\n", ".env.example": "MODE=\n", "certs/server.pem": "pem\n", "config/credentials.json": "{}\n", "src/a.ts": "code\n" });
  try {
    const f = crossCheck("Adds local config.", readDiff({ cwd: dir }), { cwd: dir });
    assert.ok(has(f, "warn", /staged file looks like a secret: \.env; remove it from the commit/), JSON.stringify(f));
    assert.ok(!has(f, "warn", /looks like a secret: certs\/server\.pem/), JSON.stringify(f));
    assert.ok(has(f, "warn", /staged file looks like a secret: config\/credentials\.json;/));
    assert.ok(!has(f, "warn", /looks like a secret: \.env\.example/));
    assert.ok(!has(f, "warn", /looks like a secret: src\/a\.ts/));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an added line that assigns a long value to a secret-like name is reported by path and line, never by value", () => {
  // The fake value is assembled at run time so this test file itself never carries a
  // secret-shaped assignment into a staged diff.
  const value = "FAKE0123456789ABCDEFxyz";
  const config = ["const size = 1;", `const ${"apiKey"} = "${value}";`, "const token = getToken();", 'const short = "x";'].join("\n") + "\n";
  const pem = "-----BEGIN " + "RSA PRIVATE KEY-----\nbody\n";
  const { dir } = repo({ "src/config.ts": config, "src/key.ts": pem });
  try {
    const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "check.mjs");
    const msg = join(dir, "m.txt");
    writeFileSync(msg, "feat: a\n\nFor the customer:\nWhat changed: Something.\nWhy it matters: A reason.\n");
    const out = execFileSync(process.execPath, [cli, "check", msg, "--diff", "--format", "json"], { cwd: dir, encoding: "utf8" });
    const f = JSON.parse(out).findings;
    assert.ok(has(f, "warn", /looks like a secret \(a long value assigned to a secret-like name\): src\/config\.ts:2;/), out);
    assert.ok(has(f, "warn", /looks like a secret \(a private key header\): src\/key\.ts:1;/), out);
    // The token line is a call, not a value, and the short value is below the length.
    assert.ok(!has(f, "warn", /src\/config\.ts:3/));
    assert.ok(!has(f, "warn", /src\/config\.ts:4/));
    assert.ok(!out.includes(value), "the secret value was printed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a change that mixes unrelated groups names them; one dominant group, a test beside its source, or docs and lockfiles do not", () => {
  const lines = (n) => Array.from({ length: n }, (_, i) => `line ${i}`).join("\n") + "\n";
  const mixed = repo({ "bin/a.mjs": lines(10), "src/b.ts": lines(10) });
  try {
    const f = crossCheck("Adds two things.", readDiff({ cwd: mixed.dir }), { cwd: mixed.dir });
    assert.ok(has(f, "warn", /this change mixes 2 unrelated groups \(bin: bin\/a\.mjs; src: src\/b\.ts\); consider separate commits/), JSON.stringify(f));
  } finally {
    rmSync(mixed.dir, { recursive: true, force: true });
  }

  const dominant = repo({ "bin/a.mjs": lines(40), "src/b.ts": lines(1) });
  try {
    const f = crossCheck("Adds two things.", readDiff({ cwd: dominant.dir }), { cwd: dominant.dir });
    assert.ok(!has(f, "warn", /mixes/), JSON.stringify(f));
  } finally {
    rmSync(dominant.dir, { recursive: true, force: true });
  }

  const paired = repo({ "bin/a.mjs": lines(10), "test/a.test.mjs": lines(10), "docs/notes.md": lines(10), "package-lock.json": lines(10) });
  try {
    const f = crossCheck("Adds two things.", readDiff({ cwd: paired.dir }), { cwd: paired.dir });
    assert.ok(!has(f, "warn", /mixes/), JSON.stringify(f));
  } finally {
    rmSync(paired.dir, { recursive: true, force: true });
  }
});

test("a change larger than the default output buffer is read, and a secret at its end is still reported", () => {
  // About 3 MB of added lines: over the 1 MB default that execFileSync allows, so the patch read
  // must not depend on that default. The secret name is assembled at run time (see above).
  const name = "apiKey";
  const value = "FAKE0123456789ABCDEFxyz";
  const body = Array.from({ length: 150000 }, (_, i) => `const v${i} = ${i};`).join("\n") + "\n" + `const ${name} = "${value}";\n`;
  const { dir } = repo({ "src/big.ts": body });
  try {
    const f = crossCheck("Adds a table.", readDiff({ cwd: dir }), { cwd: dir });
    assert.ok(has(f, "warn", /looks like a secret \(a long value assigned to a secret-like name\): src\/big\.ts:150001;/), "secret at the end of a large change was not reported");
    assert.ok(!has(f, "info", /skipped/));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("when the added-line read fails, secret-content is skipped with an info finding instead of an error", () => {
  const { dir } = repo({ "src/a.ts": "code\n" });
  try {
    // A buffer of 16 bytes cannot hold the patch: the read fails, and the check says so.
    const f = crossCheck("Adds a helper.", readDiff({ cwd: dir, patchBuffer: 16 }), { cwd: dir });
    assert.ok(has(f, "info", /secret-content skipped: change too large/), JSON.stringify(f));
    assert.ok(!has(f, "warn", /secret-content|looks like a secret/));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a staged deletion of a secret file is not flagged, because removing it is the right action", () => {
  const { dir, git } = repo({ ".env": "MODE=dev\n" });
  try {
    git("commit", "--quiet", "-m", "add env");
    git("rm", "--quiet", ".env");
    const f = crossCheck("Removes local config.", readDiff({ cwd: dir }), { cwd: dir });
    assert.ok(!has(f, "warn", /looks like a secret: \.env/), JSON.stringify(f));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the added-line read gives the same path under diff.mnemonicPrefix and diff.noprefix", () => {
  const name = "apiKey";
  const value = "FAKE0123456789ABCDEFxyz";
  for (const setting of ["diff.mnemonicPrefix", "diff.noprefix"]) {
    const { dir, git } = repo({ "src/config.ts": `const ${name} = "${value}";\n` });
    try {
      git("config", setting, "true");
      const f = crossCheck("Adds config.", readDiff({ cwd: dir }), { cwd: dir });
      assert.ok(has(f, "warn", /src\/config\.ts:1;/), `${setting}: ${JSON.stringify(f)}`);
      assert.ok(!has(f, "warn", /(^|\s)[ib]\/src/), `${setting}: a prefix leaked into the path`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("the secret value is absent from the text output as well as the JSON output", () => {
  const name = "apiKey";
  const value = "FAKE0123456789ABCDEFxyz";
  const { dir } = repo({ "src/config.ts": `const ${name} = "${value}";\n` });
  try {
    const msg = join(dir, "m.txt");
    writeFileSync(msg, "feat: a\n\nFor the customer:\nWhat changed: Something.\nWhy it matters: A reason.\n");
    const text = execFileSync(process.execPath, [cli, "check", msg, "--diff"], { cwd: dir, encoding: "utf8" });
    const json = execFileSync(process.execPath, [cli, "check", msg, "--diff", "--format", "json"], { cwd: dir, encoding: "utf8" });
    assert.match(text, /src\/config\.ts:1/);
    assert.ok(!text.includes(value), "the secret value was printed in text output");
    assert.ok(!json.includes(value), "the secret value was printed in json output");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a test that names no source joins the one source group, so a plain feature with its tests does not warn", () => {
  const lines = (n) => Array.from({ length: n }, (_, i) => `line ${i}`).join("\n") + "\n";
  const { dir } = repo({ "src/checkout/index.ts": lines(30), "test/checkout.test.ts": lines(12) });
  try {
    const f = crossCheck("Adds checkout.", readDiff({ cwd: dir }), { cwd: dir });
    assert.ok(!has(f, "warn", /mixes/), JSON.stringify(f));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("monorepo packages group by their first two path segments, so two packages in one change warn", () => {
  const lines = (n) => Array.from({ length: n }, (_, i) => `line ${i}`).join("\n") + "\n";
  const { dir } = repo({ "packages/a/src/x.ts": lines(10), "packages/b/src/y.ts": lines(10) });
  try {
    const f = crossCheck("Adds two things.", readDiff({ cwd: dir }), { cwd: dir });
    assert.ok(has(f, "warn", /this change mixes 2 unrelated groups \(packages\/a: packages\/a\/src\/x\.ts; packages\/b: packages\/b\/src\/y\.ts\)/), JSON.stringify(f));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("root-level manifests and dotfiles are not a group of their own", () => {
  const lines = (n) => Array.from({ length: n }, (_, i) => `line ${i}`).join("\n") + "\n";
  const { dir } = repo({ "package.json": lines(30), ".nvmrc": "20\n", "tsconfig.json": lines(20), "src/a.ts": lines(30) });
  try {
    const f = crossCheck("Adds a helper.", readDiff({ cwd: dir }), { cwd: dir });
    assert.ok(!has(f, "warn", /mixes/), JSON.stringify(f));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a top-level dot-directory such as .github is not a group of its own", () => {
  const lines = (n) => Array.from({ length: n }, (_, i) => `line ${i}`).join("\n") + "\n";
  const ci = repo({ ".github/workflows/ci.yml": lines(40), "src/a.js": lines(10) });
  try {
    const f = crossCheck("Adds a helper.", readDiff({ cwd: ci.dir }), { cwd: ci.dir });
    assert.ok(!has(f, "warn", /mixes/), JSON.stringify(f));
  } finally {
    rmSync(ci.dir, { recursive: true, force: true });
  }

  // Still a mix when two real source groups are present beside the dot-directory.
  const mixed = repo({ ".github/workflows/ci.yml": lines(40), "src/a.js": lines(10), "server/b.js": lines(10) });
  try {
    const f = crossCheck("Adds two things.", readDiff({ cwd: mixed.dir }), { cwd: mixed.dir });
    assert.ok(has(f, "warn", /this change mixes 2 unrelated groups \((?=.*src: src\/a\.js)(?=.*server: server\/b\.js)/), JSON.stringify(f));
  } finally {
    rmSync(mixed.dir, { recursive: true, force: true });
  }
});

test("any top-level dot-directory is ignored, not only .github", () => {
  const lines = (n) => Array.from({ length: n }, (_, i) => `line ${i}`).join("\n") + "\n";
  const { dir } = repo({ ".husky/pre-commit": lines(30), ".vscode/settings.json": lines(20), "src/a.js": lines(10) });
  try {
    const f = crossCheck("Adds a helper.", readDiff({ cwd: dir }), { cwd: dir });
    assert.ok(!has(f, "warn", /mixes/), JSON.stringify(f));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Fix round, final review. A call or an identifier after an assignment is code, not a value.
// A quoted value or an unquoted value that holds a digit and ends the token is a value.
test("secret-content reads a quoted value or an unquoted value with a digit, never a call or an identifier", () => {
  // Built at run time, so no secret-shaped literal is written into this file.
  const quoted = "AbCdEfGh" + "1234567890xY";
  const keyName = "api" + "_key";
  const patch = [
    "diff --git a/src/x.js b/src/x.js",
    "+++ b/src/x.js",
    "@@ -0,0 +1,5 @@",
    "+const token = createSessionTokenForUser(user);",
    "+const password = hashPasswordWithBcrypt(input);",
    "+headers.authorization_token = request_headers_value;",
    `+const ${keyName} = "${quoted}";`,
    "+const sessionToken = mint_session_value_2026;",
  ].join("\n");
  const hits = secretHitsIn(patch).map((h) => h.line);
  assert.deepEqual(hits, [4, 5]);
});

// Fix round, final review. A pull request (a range) is one unit, so unrelated groups are not
// reported as a reason to split it; the staged change keeps the check. A secret-named file in a
// range is a changed file, not a staged one.
test("mixed-change is kept for the staged change and skipped for a range, and the secret-file finding names the scope", () => {
  const lines = (n) => Array.from({ length: n }, (_, i) => `line ${i}`).join("\n") + "\n";
  const committed = repo({ "api/orders.js": lines(10), "web/orders.tsx": lines(10), "test/orders.test.mjs": lines(10), "config/.env": "X=1\n" });
  try {
    committed.git("commit", "--quiet", "-m", "feature across the stack");
    const ranged = readDiff({ range: "HEAD~1..HEAD", cwd: committed.dir });
    const f = crossCheck("Adds orders across the stack.", ranged, { cwd: committed.dir });
    assert.ok(!has(f, "warn", /mixes/), JSON.stringify(f));
    assert.ok(has(f, "warn", /changed file looks like a secret: config\/\.env/), JSON.stringify(f));
    assert.ok(!has(f, "warn", /staged file/), JSON.stringify(f));
  } finally {
    rmSync(committed.dir, { recursive: true, force: true });
  }

  const staged = repo({ "api/orders.js": lines(10), "web/orders.tsx": lines(10), "config/.env": "X=1\n" });
  try {
    const d = readDiff({ cwd: staged.dir });
    const f = crossCheck("Adds orders across the stack.", d, { cwd: staged.dir });
    assert.ok(has(f, "warn", /this change mixes 3 unrelated groups/), JSON.stringify(f));
    assert.ok(has(f, "warn", /staged file looks like a secret: config\/\.env/), JSON.stringify(f));
  } finally {
    rmSync(staged.dir, { recursive: true, force: true });
  }
});

// A change as crossCheck reads it: the files with their line counts, and nothing else.
const change = (...paths) => ({
  files: paths.map((path) => ({ path, added: 2, removed: 1, binary: false, deleted: false })),
  range: "--cached",
  isRange: false,
  secretHits: [],
  secretSkipped: false,
});

test("a fix title over a source change with no test file warns fix-without-test", () => {
  const f = crossCheck("fix(pricing): round the total to cents\n\nThe total showed three decimals.", change("src/pricing.js"));
  assert.ok(has(f, "warn", /^the title says this is a fix, and no test file changes; 1 source file does: src\/pricing\.js/), JSON.stringify(f));
  assert.equal(f.find((x) => x.code === "fix-without-test")?.level, "warn");
});

test("a fix that adds its test in the same change does not warn fix-without-test", () => {
  const f = crossCheck("fix(pricing): round the total to cents", change("src/pricing.js", "test/pricing.test.js"));
  assert.ok(!f.some((x) => x.code === "fix-without-test"), JSON.stringify(f));
});

test("a docs-only fix does not warn fix-without-test, because it changes no source", () => {
  const f = crossCheck("fix: typo in the README install section", change("README.md", "docs/check-reference.md"));
  assert.ok(!f.some((x) => x.code === "fix-without-test"), JSON.stringify(f));
});

test("the fix word at the start of a title counts; a title that only contains the word does not", () => {
  const fixed = crossCheck("Fixed the rounding in the invoice total", change("src/invoice.js"));
  assert.ok(fixed.some((x) => x.code === "fix-without-test"), "Fixed at the start is a fix");
  const fixture = crossCheck("fixture: add a sample invoice for the export", change("src/invoice.js"));
  assert.ok(!fixture.some((x) => x.code === "fix-without-test"), "fixture is not a fix");
  const mid = crossCheck("feat: a quick fix for the export later", change("src/invoice.js"));
  assert.ok(!mid.some((x) => x.code === "fix-without-test"), "fix in the middle of a title is not a fix");
});

test("a fix that changes only a lock file or a workflow does not warn fix-without-test: they are not source", () => {
  const lock = crossCheck("fix: bump the action version", change("package-lock.json"));
  assert.ok(!lock.some((x) => x.code === "fix-without-test"), JSON.stringify(lock));
  const workflow = crossCheck("fix: bump the action version", change(".github/workflows/ci.yml"));
  assert.ok(!workflow.some((x) => x.code === "fix-without-test"), JSON.stringify(workflow));
  const withCode = crossCheck("fix: bump the action version", change("package-lock.json", "src/app.js"));
  assert.ok(withCode.some((x) => x.code === "fix-without-test"), "a source file alongside the lock file still warns");
});

// Provider tokens, inline URL passwords, npm auth tokens and conflict markers. Each secret-shaped
// value is assembled at run time, so no secret-shaped literal is written into this file. A
// near-miss is built the same way and interpolated into the patch line, so the added text holds
// the exact token whose length is being tested (a quote between prefix and tail would not).

// A zero-context patch with one added file holding the given lines, numbered from 1.
const addedPatch = (path, ...lines) =>
  [`diff --git a/${path} b/${path}`, `+++ b/${path}`, `@@ -0,0 +1,${lines.length} @@`, ...lines.map((l) => `+${l}`)].join("\n");
const kindsOf = (patch) => secretHitsIn(patch).map((h) => h.kind);

test("an AWS access key id is reported; a 15-character AKIA value is not", () => {
  const key = "AKIA" + "Q3XW7M2NRT5HBGZK";
  const short = "AKIA" + "Q3XW7M2NRT5HBGZ";
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `const k = "${key}";`)), ["an AWS access key id"]);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `const k = "${short}";`)), []);
});

test("the documented AWS example key, which contains EXAMPLE, is not reported", () => {
  const example = "AKIA" + "IOSFODNN7EXAMPLE";
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `key = ${example}`)), []);
});

test("a GitHub token is reported; ghp_ with too few characters is not", () => {
  const token = "ghp_" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8";
  const short = "ghp_" + "a1B2c3D4e5F6g7H8i9J0";
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `t = "${token}"`)), ["a GitHub token"]);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `t = "${short}"`)), []);
});

test("a fine-grained GitHub token is reported; a github_pat_ prefix with a short tail is not", () => {
  const fine = "github_pat_" + "11ABCDEFG0" + "a".repeat(45);
  const short = "github_pat_" + "a".repeat(20);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `t = "${fine}"`)), ["a GitHub token"]);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `t = "${short}"`)), []);
});

test("a Slack token is reported; the prefix with a short tail is not", () => {
  const slack = "xoxb" + "-1234567890-abcdefghij";
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `s = "${slack}"`)), ["a Slack token"]);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `s = "xoxb-short"`)), []);
});

test("a Google API key is reported; an AIza value one character short is not", () => {
  const google = "AIza" + "S".repeat(35);
  const short = "AIza" + "S".repeat(34);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `g = "${google}"`)), ["a Google API key"]);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `g = "${short}"`)), []);
});

test("a Stripe live key is reported; a live prefix with a short tail, or a test-mode key, is not", () => {
  const live = "sk" + "_live_" + "4eC39HqLyjWDarjtT1zdp7dc";
  const short = "sk" + "_live_" + "abc";
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `stripe = "${live}"`)), ["a Stripe live key"]);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `stripe = "${short}"`)), []);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `stripe = "sk_test_abc"`)), []);
});

test("an Anthropic or OpenAI style key is reported; a sk- prefix with a short tail is not", () => {
  const key = "sk-ant-" + "api03-" + "a".repeat(40);
  const short = "sk-" + "a1b2c3d4e5f6g7h8i9j0k1";
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `k = "${key}"`)), ["an Anthropic or OpenAI style API key"]);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `k = "${short}"`)), []);
});

test("a URL with an inline password is reported; a placeholder password is not", () => {
  const real = "https://deploy:" + "hunter2Real" + "@git.example.org/repo.git";
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `url = "${real}"`)), ["a URL with an inline password"]);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `url = "https://user:\${PASS}@host"`)), []);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `url = "https://user:changeme@host"`)), []);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `url = "https://user:<password>@host"`)), []);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `url = "https://example.com/a:b@c"`)), []);
});

test("an npm _authToken value is reported; an environment reference or a short value is not", () => {
  // Twelve characters with no digit: the existing assignment rule needs 16 characters or a digit,
  // so only the npm rule reports this value.
  const npm = "//registry.npmjs.org/:_authToken=" + "abcdefghijkl";
  assert.deepEqual(kindsOf(addedPatch(".npmrc", npm)), ["an npm auth token"]);
  assert.deepEqual(kindsOf(addedPatch(".npmrc", "//registry.npmjs.org/:_authToken=${NPM_TOKEN}")), []);
  assert.deepEqual(kindsOf(addedPatch(".npmrc", "//registry.npmjs.org/:_authToken=short")), []);
});

test("a merge conflict marker in an added line is reported with its path and line number", () => {
  const patch = addedPatch("src/a.js", "const a = 1;", "<<<<<<< HEAD", "const a = 2;", "=======", "const a = 3;", ">>>>>>> feature");
  assert.deepEqual(conflictMarkerHitsIn(patch), [
    { path: "src/a.js", line: 2, kind: "a merge conflict marker" },
    { path: "src/a.js", line: 4, kind: "a merge conflict marker" },
    { path: "src/a.js", line: 6, kind: "a merge conflict marker" },
  ]);
});

test("a lone ======= line is not a conflict marker when the file has no conflict start or end", () => {
  const underline = addedPatch("docs/guide.md", "Install", "=======", "Run the command.");
  assert.deepEqual(conflictMarkerHitsIn(underline), []);
});

test("a seven-character marker that is indented, or a longer run of angle brackets, is not a conflict marker", () => {
  const near = addedPatch("src/a.js", "  <<<<<<< HEAD", "<<<<<<<<< not seven", " >>>>>>> indented");
  assert.deepEqual(conflictMarkerHitsIn(near), []);
});

test("a conflict marker in a context line is not reported, only added lines are read", () => {
  const patch = [
    "diff --git a/src/a.js b/src/a.js",
    "+++ b/src/a.js",
    "@@ -1,2 +1,2 @@",
    "<<<<<<< HEAD",
    "-old",
    "+new",
  ].join("\n");
  assert.deepEqual(conflictMarkerHitsIn(patch), []);
});

// Review fixes. The timing inputs are built at run time; the secret-shaped values in the negative
// and positive cases are assembled from fragments so no secret-shaped literal sits in this file.
test("a 200k-character line is read in under a second for the URL, npm and scheme inputs", () => {
  const cases = {
    url: "https://" + "a".repeat(200000),
    npm: "_authToken=" + "a".repeat(200000),
    scheme: "a://" + "b".repeat(200000) + ":",
  };
  for (const [name, line] of Object.entries(cases)) {
    const t0 = performance.now();
    secretHitsIn(addedPatch("src/a.js", line));
    const ms = performance.now() - t0;
    assert.ok(ms < 1000, `${name} line took ${Math.round(ms)} ms`);
  }
});

test("a documented URL placeholder and a password shorter than six characters are not reported", () => {
  assert.deepEqual(kindsOf(addedPatch("docs/a.md", "git clone https://user:YOUR_PASSWORD@host/repo.git")), []);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", "u = a://x:p@y")), []);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", "u = a://x:abcde@y")), []);
});

test("an npm _authToken that is an environment reference, bare or quoted, is not reported", () => {
  assert.deepEqual(kindsOf(addedPatch(".npmrc", "//registry.npmjs.org/:_authToken=$NPM_TOKEN")), []);
  assert.deepEqual(kindsOf(addedPatch(".npmrc", '//registry.npmjs.org/:_authToken="${NPM_TOKEN}"')), []);
});

test("a hyphenated sk- slug with no digit is not reported, and an sk- value that says your is not reported", () => {
  assert.deepEqual(kindsOf(addedPatch("docs/a.md", "run sk-learn-pipeline-name-that-is-very-long-indeed")), []);
  assert.deepEqual(kindsOf(addedPatch("src/a.js", 'k = "sk-your-key-' + '1234567890abcdefghijklmnop"')), []);
});

test("a Slack-shaped value with no digit in its tail is not reported", () => {
  assert.deepEqual(kindsOf(addedPatch("src/a.js", 's = "xoxb-your-token-here-abcd"')), []);
});

test("a GitHub token that contains the lowercase word example is still reported", () => {
  const token = "ghp_" + "example" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5";
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `t = "${token}"`)), ["a GitHub token"]);
});

test("a Stripe restricted live key is reported", () => {
  const rk = "rk" + "_live_" + "4eC39HqLyjWDarjtT1zdp7dc";
  assert.deepEqual(kindsOf(addedPatch("src/a.js", `stripe = "${rk}"`)), ["a Stripe live key"]);
});

test("a conflict marker split line that ends in CRLF is reported with its line number", () => {
  const patch = addedPatch("src/a.js", "const a = 1;\r", "<<<<<<< HEAD\r", "const a = 2;\r", "=======\r", "const a = 3;\r", ">>>>>>> feature\r");
  assert.deepEqual(conflictMarkerHitsIn(patch).map((h) => h.line), [2, 4, 6]);
});

// isSecretPath is a path-name rule only. Content is checked separately, so the rule must not flag names that merely contain a credential word.
import { isSecretPath } from "../bin/diff.mjs";

test("isSecretPath flags real credential file names", () => {
  for (const p of [".env", ".env.local", ".env.production", ".env.prod", ".env.staging", "config/.env.local", "credentials", "credentials.env", "config/credentials.json", "id_rsa", "id_ed25519", "deploy/server.key", "keys/privkey.pem", "certs/server-key.pem", "tls/private.pem", "id.p12", "bundle.pfx"]) {
    assert.equal(isSecretPath(p), true, p);
  }
});

test("isSecretPath allows test, development and template env files, and public or CA material", () => {
  for (const p of [".env.test", ".env.development", ".env.example", ".env.sample", ".env.template", ".env.dist", ".env.local.example", "src/credentials.ts", "docs/credentials.md", "certs/ca.pem", "ca.pem", "certs/server.pem", "public.key", "certs/public-key.pem", "keys/ssh.pub.key", "id_rsa.pub", "certs/server.crt"]) {
    assert.equal(isSecretPath(p), false, p);
  }
});
