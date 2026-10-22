// bench/head-to-head/ours.sh: the immutable copy of the commit under test that the ours arm runs from (round 2, follow-up
// 16b). Every test uses a temporary git repository in place of this one, with a stub bin/check.mjs, and the real
// shims.sh and ours-verify.mjs. No network, no real claude.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync, lstatSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bench = join(root, "bench", "head-to-head");
const oursSh = join(bench, "ours.sh");
const oursVerify = join(bench, "ours-verify.mjs");
const armsJson = join(bench, "arms.json");

const scratch = mkdtempSync(join(tmpdir(), "h2h-ours-"));
after(() => {
  // The copies are read-only, so make them writable before removing the scratch directory.
  spawnSync("chmod", ["-R", "u+w", scratch]);
  rmSync(scratch, { recursive: true, force: true });
});

function cleanEnv(extra = {}) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("PE_BENCH_") || key.startsWith("GIT_") || key === "NODE_TEST_CONTEXT") delete env[key];
  }
  return { ...env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", ...extra };
}

function git(dir, ...args) {
  const r = spawnSync("git", ["-c", "user.name=Bench Test", "-c", "user.email=bench@example.com", "-c", "core.hooksPath=/dev/null", ...args], {
    cwd: dir,
    encoding: "utf8",
    env: cleanEnv(),
  });
  assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}

// checkScript(version): the stub bin/check.mjs. --version prints the version; --help names the strings the probes need.
function checkScript(version, marker) {
  return [
    `// ${marker}`,
    `if (process.argv.includes("--version")) console.log(${JSON.stringify(version)});`,
    'else console.log("usage: product-engineer check [--kind commit|pr]\\n       product-engineer facts <source> <rewrite>\\n       product-engineer stubs [--staged]\\n       product-engineer notes <file>\\n       product-engineer scope [range]");',
    "",
  ].join("\n");
}

// makeRepo(name, { version, marker }): a git repository with package.json and bin/check.mjs, one commit.
function makeRepo(name, { version = "0.7.0", marker = "v1" } = {}) {
  const dir = join(scratch, name);
  mkdirSync(join(dir, "bin"), { recursive: true });
  writeFileSync(join(dir, "package.json"), `${JSON.stringify({ name: "fake-product-engineer", version: "0.7.0" }, null, 2)}\n`);
  writeFileSync(join(dir, "bin", "check.mjs"), checkScript(version, marker));
  git(dir, "init", "-q");
  git(dir, "add", "package.json", "bin/check.mjs");
  git(dir, "commit", "-q", "-m", `chore: fake repository ${marker}`);
  return dir;
}

function commitMarker(dir, marker, version = "0.7.0") {
  writeFileSync(join(dir, "bin", "check.mjs"), checkScript(version, marker));
  git(dir, "add", "bin/check.mjs");
  git(dir, "commit", "-q", "-m", `chore: fake repository ${marker}`);
}

// ours(work, repo, options): runs ours.sh and returns its result. options.args are extra arguments, options.arms a path.
function ours(work, repo, { args = [], arms = armsJson, env = {} } = {}) {
  return spawnSync("bash", [oursSh, work, repo, arms, ...args], { encoding: "utf8", env: cleanEnv(env) });
}

// withProbes(name, probes): a copy of arms.json whose ours arm has the given probes.
function withProbes(name, probes) {
  const a = JSON.parse(readFileSync(armsJson, "utf8"));
  a.ours.probes = probes;
  const file = join(scratch, `arms-${name}.json`);
  writeFileSync(file, `${JSON.stringify(a, null, 2)}\n`);
  return file;
}

function recordHash(work) {
  return readFileSync(join(work, "ours-commit.txt"), "utf8").split("\n")[0];
}

function digestOf(dir) {
  const r = spawnSync(process.execPath, [oursVerify, "--digest", dir], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}

function head(repo) {
  return git(repo, "rev-parse", "HEAD");
}

function walk(dir) {
  const out = [dir];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (lstatSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

test("ours.sh archives HEAD into <work>/ours/<hash>, records the full hash, and prints the copy's directory", () => {
  const repo = makeRepo("archive");
  const work = join(scratch, "work-archive");
  const r = ours(work, repo);
  assert.equal(r.status, 0, r.stderr);
  const hash = head(repo);
  const copy = join(realpathSync(work), "ours", hash);
  assert.equal(r.stdout.trim(), copy);
  const record = readFileSync(join(work, "ours-commit.txt"), "utf8").split("\n");
  assert.equal(record[0], hash, "line 1 is the full hash");
  assert.match(record[1], /^tree-sha256 [0-9a-f]{64}$/, "line 2 is the digest of the copy's tree");
  assert.equal(record[1], `tree-sha256 ${digestOf(copy)}`);
  assert.equal(readFileSync(join(copy, "bin", "check.mjs"), "utf8"), checkScript("0.7.0", "v1"));
  assert.equal(readFileSync(join(copy, "package.json"), "utf8").includes('"version": "0.7.0"'), true);
});

test("the copy is read-only: no file or directory in it keeps a write bit", () => {
  const repo = makeRepo("readonly");
  const work = join(scratch, "work-readonly");
  const r = ours(work, repo);
  assert.equal(r.status, 0, r.stderr);
  const copy = join(realpathSync(work), "ours", head(repo));
  for (const path of walk(copy)) {
    assert.equal(statSync(path).mode & 0o222, 0, `${path} is writable`);
  }
});

test("PE_BENCH_OURS_COMMIT picks the commit to copy, and the copy and the record name that commit", () => {
  const repo = makeRepo("pinned");
  const first = head(repo);
  commitMarker(repo, "v2");
  const work = join(scratch, "work-pinned");
  const r = ours(work, repo, { env: { PE_BENCH_OURS_COMMIT: first } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(recordHash(work), first);
  assert.equal(readFileSync(join(work, "ours", first, "bin", "check.mjs"), "utf8"), checkScript("0.7.0", "v1"));
});

test("a later commit in the repository does not change the copy, and a later round reuses the recorded copy", () => {
  const repo = makeRepo("later");
  const work = join(scratch, "work-later");
  const first = ours(work, repo);
  assert.equal(first.status, 0, first.stderr);
  const oldHash = head(repo);
  commitMarker(repo, "v2");
  const copy = join(realpathSync(work), "ours", oldHash);
  assert.equal(readFileSync(join(copy, "bin", "check.mjs"), "utf8"), checkScript("0.7.0", "v1"), "the copy keeps the commit it was made from");
  const second = ours(work, repo);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(second.stdout.trim(), copy, "the recorded copy is used, not HEAD");
  assert.equal(recordHash(work), oldHash, "the record is not rewritten");
  const pinned = ours(work, repo, { env: { PE_BENCH_OURS_COMMIT: head(repo) } });
  assert.equal(pinned.status, 2, "a pinned commit that differs from the record is refused");
  assert.match(pinned.stderr, new RegExp(oldHash));
  assert.match(pinned.stderr, new RegExp(head(repo)));
});

test("--existing refuses a work directory that holds no copy, and says what to run", () => {
  const repo = makeRepo("existing-none");
  const work = join(scratch, "work-existing-none");
  const r = ours(work, repo, { args: ["--existing"] });
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /run runall\.sh first \(it builds the immutable copy\)/);
  assert.equal(existsSync(join(work, "ours")), false, "nothing is built");
});

test("a tampered copy is refused by its tree digest, both when reused and with --existing", () => {
  const repo = makeRepo("tamper");
  const work = join(scratch, "work-tamper");
  assert.equal(ours(work, repo).status, 0);
  const copy = join(realpathSync(work), "ours", head(repo));
  chmodSync(join(copy, "bin", "check.mjs"), 0o644);
  writeFileSync(join(copy, "bin", "check.mjs"), `${checkScript("0.7.0", "v1")}// tampered\n`);
  for (const args of [[], ["--existing"]]) {
    const r = ours(work, repo, { args });
    assert.equal(r.status, 2, `${args.join(" ") || "default"}: ${r.stderr}`);
    assert.match(r.stderr, /tree digest/);
  }
});

test("ours-verify --digest is the same for the same tree and changes when a byte changes", () => {
  const repo = makeRepo("digest");
  const work = join(scratch, "work-digest");
  assert.equal(ours(work, repo).status, 0);
  const copy = join(realpathSync(work), "ours", head(repo));
  const first = digestOf(copy);
  assert.equal(digestOf(copy), first);
  assert.match(first, /^[0-9a-f]{64}$/);
  const tree = join(scratch, "digest-copy");
  spawnSync("cp", ["-R", copy, tree]);
  spawnSync("chmod", ["-R", "u+w", tree]);
  writeFileSync(join(tree, "package.json"), "{}\n");
  assert.notEqual(digestOf(tree), first);
});

test("--refresh-ours makes a copy of the new HEAD and rewrites the record", () => {
  const repo = makeRepo("refresh");
  const work = join(scratch, "work-refresh");
  assert.equal(ours(work, repo).status, 0);
  commitMarker(repo, "v2");
  const r = ours(work, repo, { args: ["--refresh-ours"] });
  assert.equal(r.status, 0, r.stderr);
  const newHash = head(repo);
  assert.equal(recordHash(work), newHash);
  assert.equal(readFileSync(join(realpathSync(work), "ours", newHash, "bin", "check.mjs"), "utf8"), checkScript("0.7.0", "v2"));
});

test("a copy that fails a probe aborts with exit 2, and leaves neither the copy nor a record behind", () => {
  const repo = makeRepo("probe-fail");
  const work = join(scratch, "work-probe-fail");
  const r = ours(work, repo, { arms: withProbes("probe-fail", [["--help", "string that is not in the help"]]) });
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /did not print "string that is not in the help"/);
  assert.equal(existsSync(join(work, "ours-commit.txt")), false, "no record for an unverified copy");
  assert.equal(existsSync(join(work, "ours", head(repo))), false, "the unverified copy is removed");
});

test("a copy whose --version differs from its package.json aborts with exit 2", () => {
  const repo = makeRepo("version-fail", { version: "0.6.0", marker: "old" });
  const work = join(scratch, "work-version-fail");
  const r = ours(work, repo);
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /--version printed "0.6.0", but the copy's package.json says "0.7.0"/);
  assert.equal(existsSync(join(work, "ours-commit.txt")), false);
});

test("the shim and the --plugin-dir of the copy both point into the copy, never into the repository", () => {
  const repo = makeRepo("shim-target");
  const work = join(scratch, "work-shim-target");
  const r = ours(work, repo);
  assert.equal(r.status, 0, r.stderr);
  const copy = join(realpathSync(work), "ours", head(repo));
  const shim = readFileSync(join(work, "shim-ours", "product-engineer"), "utf8");
  assert.equal(shim, `#!/bin/sh\nexec node "${copy}/bin/check.mjs" "$@"\n`);
  assert.equal(shim.includes(realpathSync(repo)), false, "the shim does not name the repository");
});

test("arms.json gives ours the feature probes of rounds 2 and 3, as the copy is verified against them", () => {
  const arms = JSON.parse(readFileSync(armsJson, "utf8"));
  assert.deepEqual(arms.ours.probes, [
    ["--help", "stubs"],
    ["--help", "--kind"],
    ["--help", "facts"],
    ["--help", "notes"],
  ["--help", "scope"],
  ]);
});
