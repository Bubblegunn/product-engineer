// The commit-guard PreToolUse hook, run as a child process on real temporary git repositories.
// Every expectation is derived from the behaviour (allow = empty output, deny = one JSON line), never
// from a literal copied out of the output. A secret value is built at run time so that the test file
// itself does not contain a credential-shaped string.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const GUARD = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "commit-guard.mjs");
const roots = [];
after(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

const ENV = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid" };
delete ENV.PRODUCT_ENGINEER_NO_GATE;

const git = (cwd, ...args) => execFileSync("git", args, { cwd, env: ENV, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const put = (repo, path, text) => {
  const full = join(repo, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, text);
};

/** A repository with optional initial commit of the given files. */
function makeRepo({ commit = true, files = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), "cg-"));
  roots.push(root);
  git(root, "-c", "init.defaultBranch=main", "init", "-q");
  if (commit) {
    put(root, "README.md", "# repo\n");
    git(root, "add", "README.md");
    git(root, "commit", "-q", "-m", "init");
  }
  for (const [p, t] of Object.entries(files)) put(root, p, t);
  return root;
}

/** Run the hook with a Bash command. Returns the parsed deny decision, or null for allow. */
function hook(command, { cwd, env = {}, toolName = "Bash", raw } = {}) {
  const input = raw ?? JSON.stringify({ tool_name: toolName, tool_input: { command }, cwd });
  const childEnv = { ...ENV, ...env };
  const out = spawnSync(process.execPath, [GUARD], { input, env: childEnv, encoding: "utf8" });
  assert.equal(out.status, 0, `hook exited ${out.status}: ${out.stderr}`);
  if (out.stdout === "") return null;
  const parsed = JSON.parse(out.stdout);
  assert.equal(out.stdout.trim().split("\n").length, 1, "one JSON line");
  return { raw: out.stdout, ...parsed.hookSpecificOutput };
}
const denied = (r) => r !== null && r.permissionDecision === "deny";

// A Stripe-shaped live key assembled from fragments, so the literal never appears in this file.
const STRIPE_LIVE = ["sk", "live", "4eC39HqLyjWDarjtT1zdp7dc"].join("_");

test("staged .env is denied and the path is named", () => {
  const repo = makeRepo({ files: { ".env": "PORT=3000\n" } });
  git(repo, "add", ".env");
  const r = hook("git commit -m x", { cwd: repo });
  assert.ok(denied(r));
  assert.match(r.permissionDecisionReason, /\.env/);
  assert.match(r.permissionDecisionReason, /git restore --staged/);
  assert.match(r.permissionDecisionReason, /PE_ALLOW_STAGED=1/);
});

test("a staged source file holding a live key is denied and the key is not printed", () => {
  const repo = makeRepo({ files: { "src/pay.js": `export const key = "${STRIPE_LIVE}";\n` } });
  git(repo, "add", "src/pay.js");
  const r = hook("git commit -m x", { cwd: repo });
  assert.ok(denied(r));
  assert.match(r.permissionDecisionReason, /src\/pay\.js:1 \(/);
  assert.ok(!r.raw.includes(STRIPE_LIVE));
  assert.ok(!r.raw.includes("4eC39HqLyjWDarjtT1zdp7dc"));
});

test("git add -A with an untracked id_rsa is denied", () => {
  const repo = makeRepo({ files: { "id_rsa": "-----BEGIN OPENSSH PRIVATE KEY-----\nAAAA\n" } });
  const r = hook("git add -A && git commit -m x", { cwd: repo });
  assert.ok(denied(r));
  assert.match(r.permissionDecisionReason, /id_rsa/);
});

test("git commit -am with a modified tracked config holding an inline URL password is denied", () => {
  const repo = makeRepo({ files: { "config.json": '{"url": "postgres://app:old@db.example.com/x"}\n' } });
  git(repo, "add", "config.json");
  git(repo, "commit", "-q", "-m", "config");
  put(repo, "config.json", '{"url": "postgres://app:hunter2x9Q@db.example.com/x"}\n');
  const r = hook("git commit -am x", { cwd: repo });
  assert.ok(denied(r));
  assert.match(r.permissionDecisionReason, /config\.json:1 \(/);
  assert.ok(!r.raw.includes("hunter2x9Q"));
});

test("a chained add of a clean file still denies when a secret is staged elsewhere", () => {
  const repo = makeRepo({ files: { ".env": "PORT=3000\n", "src/a.js": "export const a = 1;\n" } });
  git(repo, "add", ".env");
  const r = hook("git add src/a.js && git commit -m x", { cwd: repo });
  assert.ok(denied(r));
  assert.match(r.permissionDecisionReason, /\.env/);
});

test("a clean staged change is allowed with no output", () => {
  const repo = makeRepo({ files: { "src/a.js": "export const a = 1;\n" } });
  git(repo, "add", "src/a.js");
  assert.equal(hook("git commit -m x", { cwd: repo }), null);
});

test("PE_ALLOW_STAGED=1 in front of the commit lets a staged secret through", () => {
  const repo = makeRepo({ files: { ".env": "PORT=3000\n" } });
  git(repo, "add", ".env");
  assert.equal(hook("PE_ALLOW_STAGED=1 git commit -m x", { cwd: repo }), null);
});

test("PRODUCT_ENGINEER_NO_GATE=1 allows a staged secret", () => {
  const repo = makeRepo({ files: { ".env": "PORT=3000\n" } });
  git(repo, "add", ".env");
  assert.equal(hook("git commit -m x", { cwd: repo, env: { PRODUCT_ENGINEER_NO_GATE: "1" } }), null);
});

test("a command that is not a commit or add is allowed", () => {
  const repo = makeRepo({ files: { ".env": "PORT=3000\n" } });
  git(repo, "add", ".env");
  assert.equal(hook("ls -la", { cwd: repo }), null);
});

test("a tool other than Bash is allowed", () => {
  const repo = makeRepo({ files: { ".env": "PORT=3000\n" } });
  git(repo, "add", ".env");
  assert.equal(hook("git commit -m x", { cwd: repo, toolName: "Read" }), null);
});

test("malformed or empty stdin is allowed", () => {
  assert.equal(hook(null, { raw: "{not json" }), null);
  assert.equal(hook(null, { raw: "" }), null);
  assert.equal(hook(null, { raw: JSON.stringify({ tool_name: "Bash", tool_input: {} }) }), null);
});

test("a directory that is not a git repository is allowed", () => {
  const plain = mkdtempSync(join(tmpdir(), "cg-plain-"));
  roots.push(plain);
  put(plain, ".env", "PORT=3000\n");
  assert.equal(hook("git commit -am x", { cwd: plain }), null);
});

test("a staged .env.example template is allowed", () => {
  const repo = makeRepo({ files: { ".env.example": "API_KEY=changeme\n" } });
  git(repo, "add", ".env.example");
  assert.equal(hook("git commit -m x", { cwd: repo }), null);
});

test("a staged file with merge conflict markers is denied", () => {
  const repo = makeRepo({ files: { "src/m.js": "<<<<<<< HEAD\nconst a = 1;\n=======\nconst a = 2;\n>>>>>>> branch\n" } });
  git(repo, "add", "src/m.js");
  const r = hook("git commit -m x", { cwd: repo });
  assert.ok(denied(r));
  assert.match(r.permissionDecisionReason, /src\/m\.js:1 \(a merge conflict marker\)/);
  assert.match(r.permissionDecisionReason, /merge markers/);
});

test("a commit message that only mentions git add -A is allowed, even with an untracked key present", () => {
  const repo = makeRepo({ files: { "id_rsa": "-----BEGIN OPENSSH PRIVATE KEY-----\nAAAA\n" } });
  assert.equal(hook('git commit -m "do not run git add -A"', { cwd: repo }), null);
  assert.equal(hook('git commit -m "fix && git add -A"', { cwd: repo }), null);
});

test("a here-document message that mentions git add -A is allowed", () => {
  const repo = makeRepo({ files: { "id_rsa": "-----BEGIN OPENSSH PRIVATE KEY-----\nAAAA\n" } });
  assert.equal(hook("git commit -F - <<'EOF'\nnever git add -A here\nEOF", { cwd: repo }), null);
});

test("a repository with no commits yet denies a staged secret", () => {
  const repo = makeRepo({ commit: false, files: { ".env": "PORT=3000\n" } });
  git(repo, "add", ".env");
  const r = hook("git commit -m init", { cwd: repo });
  assert.ok(denied(r));
  assert.match(r.permissionDecisionReason, /\.env/);
});

test("git add -A of an untracked node_modules folder is denied as junk", () => {
  const repo = makeRepo({ files: { "node_modules/pkg/index.js": "module.exports = 1;\n" } });
  const r = hook("git add -A", { cwd: repo });
  assert.ok(denied(r));
  assert.match(r.permissionDecisionReason, /node_modules/);
});

// ---- Review fixes: literal brackets, path-name rules, unresolvable cd, wrappers, failure budget, env escape, --only, wording.

import { chmodSync } from "node:fs";
const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
const KEY_HEADER = "-----BEGIN OPENSSH PRIVATE KEY-----\nAAAA\n";

test("a bracketed path is one literal path, so a clean add of it does not scan the whole worktree", () => {
  const repo = makeRepo({ files: { "id_rsa": KEY_HEADER, "app/[id]/p.tsx": "export default 1;\n" } });
  assert.equal(hook("git add 'app/[id]/p.tsx'", { cwd: repo }), null);
});

test("a bracketed path that holds a live key is denied and named with its brackets", () => {
  const repo = makeRepo({ files: { "app/[id]/p.tsx": `export const k = "${STRIPE_LIVE}";\n` } });
  const r = hook("git add 'app/[id]/p.tsx'", { cwd: repo });
  assert.ok(denied(r));
  assert.match(r.permissionDecisionReason, /app\/\[id\]\/p\.tsx:1 \(/);
});

test("a staged src/credentials.ts module and a staged .env.test file are allowed", () => {
  const repo = makeRepo({ files: { "src/credentials.ts": "export const x = 1;\n", ".env.test": "MODE=test\n" } });
  git(repo, "add", "src/credentials.ts", ".env.test");
  assert.equal(hook("git commit -m x", { cwd: repo }), null);
});

test("a staged .env.development file is allowed and a staged .env.production file is denied", () => {
  const repo = makeRepo({ files: { ".env.development": "MODE=dev\n" } });
  git(repo, "add", ".env.development");
  assert.equal(hook("git commit -m x", { cwd: repo }), null);
  git(repo, "rm", "-q", "--cached", ".env.development");
  put(repo, ".env.production", "MODE=prod\n");
  git(repo, "add", ".env.production");
  const r = hook("git commit -m x", { cwd: repo });
  assert.ok(denied(r));
  assert.match(r.permissionDecisionReason, /\.env\.production/);
});

test("a cd to a directory that does not exist keeps the last good directory, so a later git add -A is still checked", () => {
  const repo = makeRepo({ files: { "id_rsa": KEY_HEADER } });
  const r = hook("cd /nonexistent-cg-dir && git add -A", { cwd: repo });
  assert.ok(denied(r));
  assert.match(r.permissionDecisionReason, /id_rsa/);
});

test("cd to an unresolvable command substitution keeps the hook directory, so git add -A is still checked", () => {
  const repo = makeRepo({ files: { "id_rsa": KEY_HEADER, "sub/x.txt": "x\n" } });
  const r = hook('cd "$(git rev-parse --show-toplevel)" && git add -A', { cwd: join(repo, "sub") });
  assert.ok(denied(r));
  assert.match(r.permissionDecisionReason, /id_rsa/);
});

for (const cmd of ["env X=1 git add -A", "command git add -A", "time git add -A", "if true; then git add -A; fi", 'bash -c "git add -A"', "sh -c 'git add -A'", "(cd sub && git add .)", "{ git add -A; }"]) {
  test(`a git add -A behind a wrapper is still checked: ${cmd}`, () => {
    const repo = makeRepo({ files: { "id_rsa": KEY_HEADER, "sub/x.txt": "x\n" } });
    const r = hook(cmd, { cwd: repo });
    assert.ok(denied(r), cmd);
  });
}

test("an unreadable untracked file does not discard a secret found in another file", { skip: isRoot }, () => {
  const repo = makeRepo({ files: { "a-locked.txt": "x\n", "src/pay.js": `export const key = "${STRIPE_LIVE}";\n` } });
  chmodSync(join(repo, "a-locked.txt"), 0);
  try {
    const r = hook("git add -A", { cwd: repo });
    assert.ok(denied(r));
    assert.match(r.permissionDecisionReason, /src\/pay\.js:1 \(/);
  } finally {
    chmodSync(join(repo, "a-locked.txt"), 0o644);
  }
});

test("a secret read before the untracked-read budget is spent is kept in the deny", () => {
  const repo = makeRepo({ files: { "a-secret.js": `export const key = "${STRIPE_LIVE}";\n`, "filler/f.txt": "x\n" } });
  const r = hook("git add -A", { cwd: repo });
  assert.ok(denied(r));
  assert.match(r.permissionDecisionReason, /a-secret\.js:1 \(/);
});

test("untracked reads stop once the 50 MB budget is spent, so a file after that is not read (stated limit)", () => {
  const repo = makeRepo({});
  const filler = "x".repeat(1024 * 1024 - 1) + "\n"; // exactly 1 MB, the per-file cap
  for (let i = 0; i < 60; i++) put(repo, `filler/f${String(i).padStart(2, "0")}.txt`, filler);
  put(repo, "zz-secret.js", `export const key = "${STRIPE_LIVE}";\n`);
  assert.equal(hook("git add -A", { cwd: repo }), null);
});

test("git add -A with a comment that names PE_ALLOW_STAGED=1 is still denied", () => {
  const repo = makeRepo({ files: { "id_rsa": KEY_HEADER } });
  assert.ok(denied(hook("git add -A # PE_ALLOW_STAGED=1", { cwd: repo })));
});

test("PE_ALLOW_STAGED=1 in an echo before a commit does not lift the check", () => {
  const repo = makeRepo({ files: { ".env": "PORT=3000\n" } });
  git(repo, "add", ".env");
  assert.ok(denied(hook("echo PE_ALLOW_STAGED=1; git commit -m x", { cwd: repo })));
});

test("PE_ALLOW_STAGED=1 given to env in front of the commit lets a staged secret through", () => {
  const repo = makeRepo({ files: { ".env": "PORT=3000\n" } });
  git(repo, "add", ".env");
  assert.equal(hook("env PE_ALLOW_STAGED=1 git commit -m x", { cwd: repo }), null);
});

test("git commit -m x -- a.txt commits only a.txt, so a staged secret elsewhere is not scanned", () => {
  const repo = makeRepo({ files: { "a.txt": "a\n", "b.txt": `k = "${STRIPE_LIVE}"\n` } });
  git(repo, "add", "a.txt");
  git(repo, "add", "b.txt");
  assert.equal(hook("git commit -m x -- a.txt", { cwd: repo }), null);
});

test("git commit a.txt -m x (only mode, no --) does not scan the other staged file", () => {
  const repo = makeRepo({ files: { "a.txt": "a\n", "b.txt": `k = "${STRIPE_LIVE}"\n` } });
  git(repo, "add", "a.txt");
  git(repo, "add", "b.txt");
  assert.equal(hook("git commit a.txt -m x", { cwd: repo }), null);
});

test("a named path in commit-only mode is still scanned in the worktree", () => {
  const repo = makeRepo({ files: { "b.txt": "b\n", "a.txt": `k = "${STRIPE_LIVE}"\n` } });
  git(repo, "add", "b.txt");
  const r = hook("git commit -m x -- a.txt", { cwd: repo });
  assert.ok(denied(r));
  assert.match(r.permissionDecisionReason, /a\.txt:1 \(/);
});

test("the deny text says a staged path is already staged and names the restore command", () => {
  const repo = makeRepo({ files: { ".env": "PORT=3000\n" } });
  git(repo, "add", ".env");
  const r = hook("git commit -m x", { cwd: repo });
  assert.match(r.permissionDecisionReason, /already staged/);
  assert.match(r.permissionDecisionReason, /git restore --staged <path>/);
});

test("the deny text says git add -A would stage an untracked key", () => {
  const repo = makeRepo({ files: { "id_rsa": KEY_HEADER } });
  const r = hook("git add -A", { cwd: repo });
  assert.match(r.permissionDecisionReason, /git add -A would stage/);
});

test("the deny text for a modified tracked file under commit -a says commit by name or revert, not restore --staged", () => {
  const repo = makeRepo({ files: { "config.json": '{"url": "postgres://app:old@db.example.com/x"}\n' } });
  git(repo, "add", "config.json");
  git(repo, "commit", "-q", "-m", "config");
  put(repo, "config.json", '{"url": "postgres://app:hunter2x9Q@db.example.com/x"}\n');
  const r = hook("git commit -am x", { cwd: repo });
  assert.match(r.permissionDecisionReason, /commit -a would include/);
  assert.match(r.permissionDecisionReason, /commit by name or revert that edit/);
  assert.doesNotMatch(r.permissionDecisionReason, /git restore --staged/);
});

test("a tracked bracketed file is diffed as one literal path, so an old line that is not changed is not re-flagged", () => {
  const repo = makeRepo({ files: { "app/[id]/p.tsx": `export const k = "${STRIPE_LIVE}";\n` } });
  git(repo, "add", "app/[id]/p.tsx");
  git(repo, "commit", "-q", "-m", "page");
  put(repo, "app/[id]/p.tsx", `export const k = "${STRIPE_LIVE}";\nexport const n = 2;\n`);
  assert.equal(hook("git add 'app/[id]/p.tsx'", { cwd: repo }), null);
});
