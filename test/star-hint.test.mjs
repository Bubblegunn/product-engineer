// The one-time star hint: each condition that suppresses it, the marker, the text, the --quiet
// flag, and the real CLI under a pipe, under a pseudo-terminal and under the git hook variables.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { maybeShowStarHint, STAR_HINT, markerPath } from "../bin/star-hint.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "bin", "check.mjs");
const fixture = join(root, "test", "fixtures", "with-block.txt");
const hasPty = (process.platform === "darwin" || process.platform === "linux") && spawnSync("sh", ["-c", "command -v script"], { encoding: "utf8" }).status === 0;
const ptySkip = { skip: !hasPty && "no script(1) pseudo-terminal helper on this machine" };

const AGENT_VARS = ["CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT", "CODEX_SANDBOX", "CURSOR_AGENT", "GEMINI_CLI", "AIDER_CHAT_HISTORY_FILE", "AGENT"];
const HOOK_VARS = ["GIT_INDEX_FILE", "GIT_EXEC_PATH", "PRE_COMMIT"];
const SUPPRESSING_VARS = ["CI", "PRODUCT_ENGINEER_NO_STAR_HINT", "XDG_CONFIG_HOME", ...AGENT_VARS, ...HOOK_VARS];

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
const newDir = () => {
  const d = mkdtempSync(join(tmpdir(), "pe-star-"));
  dirs.push(d);
  return d;
};

// The environment of the machine running the tests may itself be an agent or a CI runner, so the
// real-CLI cases start from an environment with every suppressing variable removed.
function cleanEnv(extra = {}) {
  const env = { ...process.env };
  for (const k of SUPPRESSING_VARS) delete env[k];
  return { ...env, ...extra };
}

const tty = { isTTY: true };
const pipe = { isTTY: false };

function attempt(overrides = {}) {
  const written = [];
  const args = {
    exitCode: 0,
    stdout: tty,
    stderr: tty,
    env: {},
    argv: ["check", "message.txt"],
    configDir: newDir(),
    write: (s) => written.push(s),
    ...overrides,
  };
  const shown = maybeShowStarHint(args);
  return { shown, written, configDir: args.configDir };
}

// Run the real bin/check.mjs inside a pseudo-terminal, so stdout and stderr are both TTYs.
// stdin is ignored, not piped: script refuses a socket on stdin ("tcgetattr/ioctl").
function inPty(argv, env) {
  const options = { encoding: "utf8", env, cwd: root, stdio: ["ignore", "pipe", "pipe"], timeout: 20000 };
  if (process.platform === "darwin") return spawnSync("script", ["-q", "/dev/null", ...argv], options);
  const quoted = argv.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(" ");
  return spawnSync("script", ["-qc", quoted, "/dev/null"], options);
}

test("shown once on a successful run in a terminal, and the marker is written", () => {
  const r = attempt();
  assert.equal(r.shown, true);
  assert.deepEqual(r.written, [`${STAR_HINT}\n`]);
  assert.equal(existsSync(markerPath(r.configDir)), true);
});

test("a second run on the same machine is silent", () => {
  const dir = newDir();
  const first = attempt({ configDir: dir });
  const second = attempt({ configDir: dir });
  assert.equal(first.shown, true);
  assert.equal(second.shown, false);
  assert.deepEqual(second.written, []);
});

test("the marker lives under the config directory it is given", () => {
  const dir = newDir();
  assert.equal(markerPath(dir), join(dir, "product-engineer", "star-hint-shown"));
});

test("the text is exactly the constant: one line, no emoji, no em or en dash", () => {
  assert.equal(STAR_HINT, "If product-engineer saved you a review round, a star on GitHub helps others find it: https://github.com/Bubblegunn/product-engineer (shown once; PRODUCT_ENGINEER_NO_STAR_HINT=1 hides it)");
  assert.equal(STAR_HINT.includes("\n"), false);
  assert.doesNotMatch(STAR_HINT, /\p{Extended_Pictographic}/u);
  assert.doesNotMatch(STAR_HINT, /[‒-―]/);
  assert.equal(attempt().written[0], `${STAR_HINT}\n`);
});

const suppressed = [
  ["a non-zero exit", () => ({ overrides: { exitCode: 1 } })],
  ["stdout not a TTY", () => ({ overrides: { stdout: pipe } })],
  ["stderr not a TTY", () => ({ overrides: { stderr: pipe } })],
  ["CI set", () => ({ overrides: { env: { CI: "true" } } })],
  ...AGENT_VARS.map((v) => [`${v} set`, () => ({ overrides: { env: { [v]: "1" } } })]),
  ...HOOK_VARS.map((v) => [`${v} set`, () => ({ overrides: { env: { [v]: "/x" } } })]),
  ["--quiet", () => ({ overrides: { argv: ["check", "m.txt", "--quiet"] } })],
  ["-q", () => ({ overrides: { argv: ["check", "m.txt", "-q"] } })],
  ["PRODUCT_ENGINEER_NO_STAR_HINT=1", () => ({ overrides: { env: { PRODUCT_ENGINEER_NO_STAR_HINT: "1" } } })],
  ["--json", () => ({ overrides: { argv: ["stubs", "--json"] } })],
  ["--format json", () => ({ overrides: { argv: ["check", "m.txt", "--format", "json"] } })],
  ["--format=json", () => ({ overrides: { argv: ["check", "m.txt", "--format=json"] } })],
  ["the template subcommand", () => ({ overrides: { argv: ["template", "--lang", "tr"] } })],
  [
    "an existing marker",
    () => {
      const configDir = newDir();
      mkdirSync(join(configDir, "product-engineer"), { recursive: true });
      writeFileSync(markerPath(configDir), "shown\n");
      return { overrides: { configDir }, markerKept: true };
    },
  ],
  [
    "an unwritable config directory",
    () => {
      const base = newDir();
      const blocker = join(base, "not-a-directory");
      writeFileSync(blocker, "x");
      return { overrides: { configDir: join(blocker, "config") }, noMarker: true };
    },
  ],
];

for (const [name, make] of suppressed) {
  test(`suppressed by ${name}: nothing is printed`, () => {
    const { overrides, markerKept, noMarker } = make();
    const r = attempt(overrides);
    assert.equal(r.shown, false);
    assert.deepEqual(r.written, []);
    if (markerKept) assert.equal(existsSync(markerPath(r.configDir)), true);
    if (noMarker) assert.equal(existsSync(markerPath(r.configDir)), false);
  });
}

test("empty values do not suppress: CI= and an empty agent variable still show the hint", () => {
  assert.equal(attempt({ env: { CI: "" } }).shown, true);
  assert.equal(attempt({ env: { CLAUDECODE: "" } }).shown, true);
  assert.equal(attempt({ env: { PRODUCT_ENGINEER_NO_STAR_HINT: "0" } }).shown, true);
});

test("the real CLI under a pipe, the normal child-process case, prints no hint and writes no marker", () => {
  const dir = newDir();
  const r = spawnSync(process.execPath, [cli, "check", fixture], { cwd: root, encoding: "utf8", env: cleanEnv({ XDG_CONFIG_HOME: dir }) });
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stderr, /star on GitHub/);
  assert.equal(existsSync(markerPath(dir)), false);
});

test("the real CLI with GIT_INDEX_FILE set (a git hook) prints no hint, even in a terminal", ptySkip, () => {
  const dir = newDir();
  const r = inPty([process.execPath, cli, "check", fixture], cleanEnv({ XDG_CONFIG_HOME: dir, GIT_INDEX_FILE: "/tmp/index" }));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout + r.stderr, /star on GitHub/);
  assert.equal(existsSync(markerPath(dir)), false);
});

test("the real CLI in a terminal with no suppressing variable prints the hint once (control)", ptySkip, () => {
  const dir = newDir();
  const first = inPty([process.execPath, cli, "check", fixture], cleanEnv({ XDG_CONFIG_HOME: dir }));
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.match(first.stdout + first.stderr, /star on GitHub/);
  const second = inPty([process.execPath, cli, "check", fixture], cleanEnv({ XDG_CONFIG_HOME: dir }));
  assert.doesNotMatch(second.stdout + second.stderr, /star on GitHub/);
});

test("the commit-msg hook path cannot show the hint: the pre-commit entry sets the opt-out, and the commit-msg script never runs the CLI", () => {
  const entry = readFileSync(join(root, "scripts", "pre-commit-check.sh"), "utf8");
  assert.match(entry, /PRODUCT_ENGINEER_NO_STAR_HINT=1/);
  const hook = readFileSync(join(root, "scripts", "commit-msg"), "utf8");
  assert.doesNotMatch(hook, /check\.mjs/);
});

test("the pre-commit entry, run in a terminal, prints no hint and writes no marker", ptySkip, () => {
  const dir = newDir();
  const r = inPty(["sh", join(root, "scripts", "pre-commit-check.sh"), fixture], cleanEnv({ XDG_CONFIG_HOME: dir }));
  assert.doesNotMatch(r.stdout + r.stderr, /star on GitHub/);
  assert.equal(existsSync(markerPath(dir)), false);
});

test("the GitHub Action step sets the opt-out", () => {
  assert.match(readFileSync(join(root, "action.yml"), "utf8"), /PRODUCT_ENGINEER_NO_STAR_HINT: "1"/);
});

test("--quiet is accepted, is listed in the usage text, and drops the ok lines from the report", () => {
  const help = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
  assert.match(help.stdout, /--quiet/);
  const loud = spawnSync(process.execPath, [cli, "check", fixture], { cwd: root, encoding: "utf8", env: cleanEnv() });
  const quiet = spawnSync(process.execPath, [cli, "check", fixture, "--quiet"], { cwd: root, encoding: "utf8", env: cleanEnv() });
  assert.equal(quiet.status, loud.status);
  assert.match(loud.stdout, /^ok\s/m);
  assert.doesNotMatch(quiet.stdout, /^ok\s/m);
  assert.match(quiet.stdout, /no errors/);
});

test("docs/check-reference.md says how to turn the hint off in one line", () => {
  assert.match(readFileSync(join(root, "docs", "check-reference.md"), "utf8"), /PRODUCT_ENGINEER_NO_STAR_HINT=1/);
});
