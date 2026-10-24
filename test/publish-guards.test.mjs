// The publish guards of the commit-guard PreToolUse hook: a commit that skips the hooks, a pull request
// with no body, and a pathspec-less commit that would split a change. Each case runs the hook as a child
// process on a temporary repository. Expectations come from the behaviour: allow is empty output, deny is
// one JSON line.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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

function makeRepo(files = {}) {
  const root = mkdtempSync(join(tmpdir(), "pg-"));
  roots.push(root);
  git(root, "-c", "init.defaultBranch=main", "init", "-q");
  put(root, "README.md", "# repo\n");
  for (const p of Object.keys(files)) put(root, p, "original\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "init");
  return root;
}

function hook(command, { cwd, env = {} } = {}) {
  const input = JSON.stringify({ tool_name: "Bash", tool_input: { command }, cwd });
  const out = spawnSync(process.execPath, [GUARD], { input, env: { ...ENV, ...env }, encoding: "utf8" });
  assert.equal(out.status, 0, `hook exited ${out.status}: ${out.stderr}`);
  if (out.stdout === "") return null;
  assert.equal(out.stdout.trim().split("\n").length, 1, "one JSON line");
  return { raw: out.stdout, ...JSON.parse(out.stdout).hookSpecificOutput };
}
const denied = (r) => r !== null && r.permissionDecision === "deny";

test("a commit that skips the hooks with --no-verify or -n is denied, with the way out named", () => {
  const repo = makeRepo();
  for (const cmd of ["git commit --no-verify -m fix", "git commit -n -m fix", "git commit -an -m fix", "git commit -m fix --no-verify"]) {
    const r = hook(cmd, { cwd: repo });
    assert.ok(denied(r), `expected a deny for: ${cmd}`);
    assert.match(r.permissionDecisionReason, /--no-verify/);
    assert.match(r.permissionDecisionReason, /PE_ALLOW_STAGED=1/);
  }
});

test("a commit without the hook-skipping flag, and a -n that is only a message word, are allowed", () => {
  const repo = makeRepo();
  assert.equal(hook("git commit -m fix", { cwd: repo }), null);
  assert.equal(hook('git commit -m "use -n in the docs"', { cwd: repo }), null);
  assert.equal(hook("git log -n 5", { cwd: repo }), null);
});

test("PE_ALLOW_STAGED=1 in front of a --no-verify commit lets it through", () => {
  const repo = makeRepo();
  assert.equal(hook("PE_ALLOW_STAGED=1 git commit --no-verify -m fix", { cwd: repo }), null);
});

test("gh pr create with no body option is denied, and the reason names the options that fix it", () => {
  const repo = makeRepo();
  for (const cmd of ['gh pr create --title "Fix"', 'gh pr create --title "Fix" --body ""', 'gh pr create --title "Fix" --body=""', 'gh pr create --title "Fix" --body "   "']) {
    const r = hook(cmd, { cwd: repo });
    assert.ok(denied(r), `expected a deny for: ${cmd}`);
    assert.match(r.permissionDecisionReason, /--body-file/);
    assert.match(r.permissionDecisionReason, /--fill/);
  }
});

test("gh pr create with a body, a body file, -F, -b or --fill is allowed", () => {
  const repo = makeRepo();
  const ok = [
    'gh pr create --title "Fix" --body "What changed: x"',
    'gh pr create --title "Fix" --body-file body.md',
    'gh pr create --title "Fix" -F body.md',
    'gh pr create --title "Fix" -b "What changed: x"',
    'gh pr create --title "Fix" --fill',
    'gh pr create -f',
    'gh pr list',
  ];
  for (const cmd of ok) assert.equal(hook(cmd, { cwd: repo }), null, `expected allow for: ${cmd}`);
});

test("PE_ALLOW_STAGED=1 lets a pull request with no body through", () => {
  const repo = makeRepo();
  assert.equal(hook('PE_ALLOW_STAGED=1 gh pr create --title "Fix"', { cwd: repo }), null);
});

// A repository whose staged change spans the given top-level folders, with one unstaged modified file.
function mixedRepo({ stagedDirs, unstaged = true }) {
  const files = {};
  for (const d of stagedDirs) files[`${d}/file.txt`] = "original\n";
  const repo = makeRepo(files);
  for (const d of stagedDirs) put(repo, `${d}/file.txt`, "changed\n");
  git(repo, "add", ...stagedDirs.map((d) => `${d}/file.txt`));
  if (unstaged) put(repo, "README.md", "# edited\n");
  return repo;
}

test("a commit with no pathspec, while staged files span three folders and a file is unstaged, is denied", () => {
  const repo = mixedRepo({ stagedDirs: ["alpha", "beta", "gamma"] });
  const r = hook("git commit -m fix", { cwd: repo });
  assert.ok(denied(r));
  assert.match(r.permissionDecisionReason, /3 top-level folders/);
  assert.match(r.permissionDecisionReason, /PE_ALLOW_STAGED=1/);
  assert.match(r.permissionDecisionReason, /git commit -- <paths>/);
});

test("the same staged change is allowed when it spans fewer than three folders, or nothing is unstaged", () => {
  assert.equal(hook("git commit -m fix", { cwd: mixedRepo({ stagedDirs: ["alpha", "beta"] }) }), null);
  assert.equal(hook("git commit -m fix", { cwd: mixedRepo({ stagedDirs: ["alpha", "beta", "gamma"], unstaged: false }) }), null);
});

test("a commit with a pathspec, with -a, or with PE_ALLOW_STAGED=1 is not caught by the mixed check", () => {
  const repo = mixedRepo({ stagedDirs: ["alpha", "beta", "gamma"] });
  assert.equal(hook("git commit -m fix -- alpha/file.txt", { cwd: repo }), null);
  const all = hook("git commit -a -m fix", { cwd: repo });
  assert.ok(all === null || !/top-level folders/.test(all.permissionDecisionReason), "the mixed check fired on -a");
  assert.equal(hook("PE_ALLOW_STAGED=1 git commit -m fix", { cwd: repo }), null);
});
