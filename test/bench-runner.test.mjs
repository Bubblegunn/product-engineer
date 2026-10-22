// The head-to-head runner: bench/head-to-head/{fetch-arms.sh,run.sh,runall.sh}. Every test runs the real
// scripts with temporary arms, work and tasks paths and a stub in place of claude. No network, no real claude.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bench = join(root, "bench", "head-to-head");
const fetchSh = join(bench, "fetch-arms.sh");
const runSh = join(bench, "run.sh");
const runallSh = join(bench, "runall.sh");
const armsJson = join(bench, "arms.json");

const scratch = mkdtempSync(join(tmpdir(), "h2h-runner-"));
// The ours copies are read-only (ours.sh chmods them), so they are made writable again before the scratch directory goes.
after(() => {
  spawnSync("chmod", ["-R", "u+w", scratch]);
  rmSync(scratch, { recursive: true, force: true });
});

const arms = join(scratch, "arms");
const src = join(scratch, "src");
const tasks = join(scratch, "tasks.json");
const stub = join(scratch, "claude-stub.sh");
const TASK_PROMPTS = {
  T1: "Commit the reminder fix.",
  T2: "Finish the cancelled-booking reminder work.",
  T3: "Open a pull request for the export change.",
  T4: "Write the release notes for this week.",
  T5: "Add a cache to the bookings list.",
  T6: "Refactor the reminder mail text.",
  H1: "Add a /login endpoint.",
  H2: "Fix the email validation regex.",
  H3: "Add a /refund endpoint.",
  H4: "Extract the auth middleware.",
  H5: "Please commit what I have staged.",
  H6: "Rewrite LICENCE.txt in plain language.",
  H7: "Write the changelog for the week.",
};

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

// Fake competitor folders. The dod folder carries the two templates the runner reads.
writeJson(join(src, "dod", ".claude-plugin", "plugin.json"), { name: "dod-guard", version: "0.2.0" });
mkdirSync(join(src, "dod", "templates"), { recursive: true });
writeFileSync(
  join(src, "dod", "templates", "dod-guard.json.template"),
  '{"strictness":"{{STRICTNESS}}","stack":"{{STACK}}","runner":"{{TEST_RUNNER}}"}\n',
);
writeFileSync(join(src, "dod", "templates", "DOD.md.template"), "# {{PROJECT_NAME}} definition of done\n");
for (const name of ["iso", "gwc"]) {
  writeJson(join(src, name, ".claude-plugin", "plugin.json"), { name, version: "0.0.1" });
}
// A fake real home: the three files the isolation reads, and no real one. The email is a fixture address.
const REAL_EMAIL = "real.owner@example.org";
const REAL_NAME = "Real Owner Name";
const fakeRealHomes = [];
function makeRealHome(name, { hooks = { Stop: [{ hooks: [{ type: "command", command: "echo real" }] }] }, mcpServers = {} } = {}) {
  const dir = join(scratch, name);
  mkdirSync(join(dir, ".claude"), { recursive: true });
  mkdirSync(join(dir, "Library", "Keychains"), { recursive: true });
  writeJson(join(dir, ".claude.json"), {
    oauthAccount: {
      emailAddress: REAL_EMAIL,
      accountUuid: "acct-1",
      organizationUuid: "org-1",
      displayName: REAL_NAME,
      fullName: REAL_NAME,
      organizationName: `${REAL_EMAIL}'s Organization`,
      billingType: "stripe_subscription",
    },
    userID: "user-1",
    hasCompletedOnboarding: false,
    mcpServers,
    projects: { "/Users/someone/x": {} },
  });
  writeJson(join(dir, ".claude", "settings.json"), { hooks });
  fakeRealHomes.push(dir);
  return dir;
}
const realHome = makeRealHome("real-home");
function realEnv(dir = realHome) {
  return {
    REAL_HOME: dir,
    PE_BENCH_REAL_SETTINGS: join(dir, ".claude", "settings.json"),
    PE_BENCH_REAL_CLAUDE_JSON: join(dir, ".claude.json"),
  };
}
writeJson(tasks, Object.fromEntries(Object.entries(TASK_PROMPTS).map(([k, prompt]) => [k, { prompt }])));

// Stub claude: answers --version without recording, otherwise records cwd, CLAUDE_PLUGIN_ROOT and the
// arguments to $STUB_RECORD, then prints one JSON line.
writeFileSync(
  stub,
  [
    "#!/bin/sh",
    'if [ "$1" = "--version" ]; then if [ -n "${STUB_VERSION_RECORD-}" ]; then printf "%s" "${CLAUDE_CONFIG_DIR-__UNSET__}" > "$STUB_VERSION_RECORD"; fi; echo "9.9.9 (Claude Code stub)"; exit 0; fi',
    "{",
    '  printf \'cwd=%s\\n\' "$(pwd)"',
    "  printf 'root=%s\\n' \"${CLAUDE_PLUGIN_ROOT-__UNSET__}\"",
    "  printf 'home=%s\\n' \"$HOME\"",
    "  printf 'cfg=%s\\n' \"${CLAUDE_CONFIG_DIR-__UNSET__}\"",
    "  printf 'xdg=%s\\n' \"${XDG_CONFIG_HOME-__UNSET__}\"",
    "  printf 'path=%s\\n' \"$PATH\"",
    "  printf 'pe=%s\\n' \"$(command -v product-engineer || echo __NONE__)\"",
    "  if [ -n \"${STUB_CLI-}\" ]; then product-engineer --help >/dev/null 2>&1; printf 'pe_help=%s\\n' \"$?\"; fi",
    "  for a in \"$@\"; do printf 'arg=%s\\n' \"$a\"; done",
    '} > "$STUB_RECORD"',
    'if [ -n "${STUB_MUTATE-}" ]; then printf \'%s\' "$STUB_MUTATE_JSON" > "$STUB_MUTATE"; fi',
    "if [ -n \"${STUB_STDERR-}\" ]; then printf '%s\\n' \"$STUB_STDERR\" >&2; fi",
    'settings_file=""; prev=""; for a in "$@"; do if [ "$prev" = "--settings" ]; then settings_file=$a; fi; prev=$a; done',
    'if [ -n "${STUB_READ_SETTINGS-}" ] && [ -n "$settings_file" ]; then cat "$settings_file" > "$STUB_READ_SETTINGS.$$"; fi',
    "if [ -n \"${STUB_LINE-}\" ]; then printf '%s\\n' \"$STUB_LINE\"; else printf '{\"type\":\"result\",\"stub\":true}\\n'; fi",
    "exit \"${STUB_EXIT:-0}\"",
    "",
  ].join("\n"),
);
spawnSync("chmod", ["755", stub]);

function baseEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("PE_BENCH_") || key === "NODE_TEST_CONTEXT") delete env[key];
  }
  delete env.CLAUDE_PLUGIN_ROOT;
  return env;
}

function run(script, args, extra = {}) {
  return spawnSync("bash", [script, ...args], {
    encoding: "utf8",
    env: { ...baseEnv(), ...extra },
  });
}

// Fetches every arm from the fake source once, before any run needs an arm folder.
const fetched = run(fetchSh, [], { PE_BENCH_ARMS_DIR: arms, PE_BENCH_ARMS_SRC: src });
assert.equal(fetched.status, 0, fetched.stderr);

// The dod prerequisites are machine dependent (bash 4 and GNU find), so the runner tests use copies of arms.json whose
// dod probes are stubs: one that passes, one that fails. The real probes are checked by hand, not here.
function armsWithProbes(name, requires) {
  const a = JSON.parse(readFileSync(armsJson, "utf8"));
  a.dod.requires = requires;
  const file = join(scratch, `arms-${name}.json`);
  writeJson(file, a);
  return file;
}
const passingArms = armsWithProbes("pass", [{ name: "stub probe passes", command: "true" }]);
const failingArms = armsWithProbes("fail", [{ name: "stub probe fails", command: "false" }]);

// The repository the ours arm runs from. A temporary git repository with a stub bin/check.mjs stands in for this one, so
// no test depends on the real HEAD: ours.sh archives its commit (see bench-ours.test.mjs for the copy itself).
const fakeRepo = join(scratch, "fake-repo");
mkdirSync(join(fakeRepo, "bin"), { recursive: true });
writeJson(join(fakeRepo, "package.json"), { name: "fake-product-engineer", version: "0.7.0" });
writeFileSync(
  join(fakeRepo, "bin", "check.mjs"),
  [
    'if (process.argv.includes("--version")) console.log("0.7.0");',
    'else console.log("usage: product-engineer check [--kind commit|pr]\\n       product-engineer facts <source> <rewrite>\\n       product-engineer stubs [--staged]\\n       product-engineer notes <file>");',
    "",
  ].join("\n"),
);
for (const args of [
  ["init", "-q"],
  ["add", "package.json", "bin/check.mjs"],
  ["commit", "-q", "-m", "chore: fake repository for the runner tests"],
]) {
  const r = spawnSync("git", ["-c", "user.name=Bench Test", "-c", "user.email=bench@example.com", "-c", "core.hooksPath=/dev/null", ...args], {
    cwd: fakeRepo,
    encoding: "utf8",
    env: baseEnv(),
  });
  assert.equal(r.status, 0, r.stderr);
}

function runEnv(work, extra = {}) {
  return {
    ...realEnv(),
    PE_BENCH_REPO_ROOT: fakeRepo,
    PE_BENCH_ARMS_DIR: arms,
    PE_BENCH_ARMS_JSON: passingArms,
    PE_BENCH_WORK_DIR: work,
    PE_BENCH_TASKS: tasks,
    PE_BENCH_CLAUDE: stub,
    STUB_RECORD: join(work, "stub-record.txt"),
    ...extra,
  };
}

// buildOurs(work, repo): builds the copy of the repository's HEAD that the ours arm runs from, the way runall.sh does.
function buildOurs(work, repo = fakeRepo) {
  const r = spawnSync("bash", [join(bench, "ours.sh"), work, repo, armsJson], { encoding: "utf8", env: baseEnv() });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}

function runArm(task, arm, rep, { work, extra = {} } = {}) {
  const w = work || join(scratch, `work-${task}-${arm}-${rep}-${Math.random().toString(36).slice(2)}`);
  // The ours arm runs from a copy that runall.sh builds first; a test that calls run.sh directly gets the same set-up.
  if (arm === "ours" && !work) buildOurs(w);
  const r = run(runSh, [task, arm, String(rep)], runEnv(w, extra));
  return { ...r, work: w, runDir: join(w, "runs", `${task}-${arm}-${rep}`) };
}

function stubRecord(work) {
  const lines = readFileSync(join(work, "stub-record.txt"), "utf8").split("\n");
  const root = lines.find((l) => l.startsWith("root=")).slice("root=".length);
  const cwd = lines.find((l) => l.startsWith("cwd=")).slice("cwd=".length);
  const args = lines.filter((l) => l.startsWith("arg=")).map((l) => l.slice("arg=".length));
  return { root, cwd, args };
}

function hasPair(args, flag, value) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] === value;
}

function pendingLines(stdout) {
  return stdout.split("\n").filter((l) => /^[TH][1-7] \S+ [123]$/.test(l));
}

test("arms.json lists the eight arms with the expected kinds, pins and competitor groups", () => {
  const arms = JSON.parse(readFileSync(armsJson, "utf8"));
  assert.deepEqual(Object.keys(arms), ["ours", "base", "dod", "iso", "gwc", "dod-invoked", "iso-invoked", "gwc-invoked"]);
  assert.equal(arms.ours.competitorOf, undefined);
  assert.equal(arms.base.competitorOf, undefined);
  for (const [invoked, name] of [["dod-invoked", "dod"], ["iso-invoked", "iso"], ["gwc-invoked", "gwc"]]) {
    assert.equal(arms[invoked].sameAs, name, invoked);
    assert.equal(arms[invoked].competitorOf, name, invoked);
    assert.equal(arms[name].competitorOf, name, name);
    assert.equal(arms[invoked].kind, undefined, invoked);
    assert.equal(typeof arms[invoked].promptPrefix, "string", invoked);
  }
  assert.equal(arms["dod-invoked"].promptPrefix, "Use the dod-guard plugin: run its /dod:verify command and follow its report format before you give your final answer.");
  assert.equal(arms["iso-invoked"].promptPrefix, "Apply the iso-24495-1 skill to everything you write, iso-24495-2 for legal text, iso-24495-3 for technical text, and iso-24495-5 for complex documents.");
  assert.equal(arms["gwc-invoked"].promptPrefix, "Use the git-weekly-changelog skill.");
  assert.equal(arms.ours.kind, "self");
  assert.equal(arms.base.kind, "empty");
  for (const name of ["dod", "iso", "gwc"]) {
    assert.equal(arms[name].kind, "git", name);
    assert.match(arms[name].commit, /^[0-9a-f]{40}$/, name);
    assert.match(arms[name].repo, /^https:\/\/github\.com\//, name);
  }
  assert.equal(arms.dod.exportPluginRoot, true);
  assert.notEqual(arms.iso.exportPluginRoot, true);
  assert.notEqual(arms.gwc.exportPluginRoot, true);
});

test("fetch-arms prints one line per arm, copies the git arms and writes the empty base manifest", () => {
  const lines = fetched.stdout.split("\n").filter(Boolean);
  assert.equal(lines.length, 8);
  for (const name of ["ours", "base", "dod", "iso", "gwc", "dod-invoked", "iso-invoked", "gwc-invoked"]) {
    assert.ok(lines.some((l) => l.startsWith(`${name}:`)), name);
  }
  assert.ok(lines.some((l) => l.startsWith("dod-invoked:") && /alias of dod/.test(l)), "invoked arms are aliases");
  assert.equal(existsSync(join(arms, "dod-invoked")), false, "no second clone for an invoked arm");
  assert.equal(existsSync(join(arms, "dod", "templates", "DOD.md.template")), true);
  const manifest = JSON.parse(readFileSync(join(arms, "base", ".claude-plugin", "plugin.json"), "utf8"));
  assert.equal(manifest.name, "empty");
  assert.equal(manifest.version, "0.0.0");
});

test("fetch-arms skips a git arm that is already at its pinned commit", () => {
  const again = run(fetchSh, ["dod", "iso"], { PE_BENCH_ARMS_DIR: arms, PE_BENCH_ARMS_SRC: src });
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /dod: already at/);
  assert.match(again.stdout, /iso: already at/);
});

test("fetch-arms refuses an unknown arm name", () => {
  const r = run(fetchSh, ["nope"], { PE_BENCH_ARMS_DIR: join(scratch, "arms-unknown"), PE_BENCH_ARMS_SRC: src });
  assert.notEqual(r.status, 0);
});

test("dry-run lists 13 tasks x 8 arms x 3 reps = 312 pending triples", () => {
  const r = run(runallSh, ["--dry-run"], runEnv(join(scratch, "work-matrix")));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(pendingLines(r.stdout).length, 312);
  assert.match(r.stdout, /about \$[0-9.]+ \(about \$0\.06 per run\)/);
});

test("dry-run leaves out a run that already has DONE", () => {
  const work = join(scratch, "work-done");
  mkdirSync(join(work, "runs", "T2-ours-1"), { recursive: true });
  writeFileSync(join(work, "runs", "T2-ours-1", "DONE"), "");
  const r = run(runallSh, ["--dry-run"], runEnv(work));
  assert.equal(r.status, 0, r.stderr);
  const pending = pendingLines(r.stdout);
  assert.equal(pending.length, 311);
  assert.equal(pending.includes("T2 ours 1"), false);
});

test("--tasks, --arms and --reps narrow the dry-run matrix", () => {
  const r = run(runallSh, ["--dry-run", "--tasks", "T2", "--arms", "ours,base", "--reps", "1"], runEnv(join(scratch, "work-narrow")));
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(pendingLines(r.stdout), ["T2 ours 1", "T2 base 1"]);
});

test("runall runs the pending triples through run.sh", () => {
  const work = join(scratch, "work-runall");
  const r = run(runallSh, ["--tasks", "T1", "--arms", "base", "--reps", "1"], runEnv(work, { PE_BENCH_PAR: "1" }));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(work, "runs", "T1-base-1", "DONE")), true);
  assert.equal(existsSync(join(work, "runs", "T1-base-1", "meta.json")), true);
});

test("run.sh T2 dod 1 passes CLAUDE_PLUGIN_ROOT, and the stub sees the dod plugin directory", () => {
  const r = runArm("T2", "dod", 1);
  assert.equal(r.status, 0, r.stderr);
  const rec = stubRecord(r.work);
  assert.equal(rec.root, realpathSync(join(arms, "dod")));
});

test("run.sh takes H1 to H7, each with its own orders-api fixture variant and prompt", () => {
  for (let n = 1; n <= 7; n += 1) {
    const task = `H${n}`;
    const r = runArm(task, "base", 1);
    assert.equal(r.status, 0, `${task}: ${r.stderr}`);
    const state = readFileSync(join(r.runDir, "repo", ".git", "fixture-state"), "utf8");
    assert.match(state, new RegExp(`^variant=h${n}$`, "m"), task);
    assert.equal(stubRecord(r.work).args[1], TASK_PROMPTS[task], task);
  }
});

test("run.sh with the dod arm writes the project name of an H task (orders-api), and stayhub for a T task", () => {
  const h = runArm("H4", "dod", 1);
  assert.equal(h.status, 0, h.stderr);
  assert.match(readFileSync(join(h.runDir, "repo", "DOD.md"), "utf8"), /orders-api/);
  const t = runArm("T1", "dod", 1);
  assert.equal(t.status, 0, t.stderr);
  assert.match(readFileSync(join(t.runDir, "repo", "DOD.md"), "utf8"), /stayhub/);
});

test("run.sh T2 iso 1 does not pass CLAUDE_PLUGIN_ROOT, even when the parent environment sets it", () => {
  const r = runArm("T2", "iso", 1, { extra: { CLAUDE_PLUGIN_ROOT: "/leaked/from/parent" } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(stubRecord(r.work).root, "__UNSET__");
});

test("the session runs in the fixture repository with the flags of the protocol", () => {
  const r = runArm("T1", "iso", 2);
  assert.equal(r.status, 0, r.stderr);
  const { cwd, args } = stubRecord(r.work);
  assert.equal(cwd, realpathSync(join(r.runDir, "repo")));
  assert.equal(args[0], "-p");
  assert.equal(args[1], TASK_PROMPTS.T1);
  assert.ok(hasPair(args, "--setting-sources", "project"));
  assert.ok(hasPair(args, "--plugin-dir", realpathSync(join(arms, "iso"))));
  assert.ok(hasPair(args, "--model", "claude-sonnet-5-5"));
  assert.ok(hasPair(args, "--output-format", "stream-json"));
  for (const flag of ["--dangerously-skip-permissions", "--strict-mcp-config", "--verbose"]) {
    assert.ok(args.includes(flag), flag);
  }
});

test("the dod fixture has its own config and DOD.md, and git status does not show them", () => {
  const r = runArm("T2", "dod", 1);
  assert.equal(r.status, 0, r.stderr);
  const repo = join(r.runDir, "repo");
  const config = readFileSync(join(repo, ".dod-guard.json"), "utf8");
  assert.doesNotMatch(config, /\{\{/);
  assert.match(config, /"strictness":"normal"/);
  const doc = readFileSync(join(repo, "DOD.md"), "utf8");
  assert.doesNotMatch(doc, /\{\{/);
  assert.match(doc, /^# stayhub /m);
  const status = spawnSync("git", ["-C", repo, "status", "--porcelain"], { encoding: "utf8" }).stdout;
  assert.doesNotMatch(status, /dod-guard\.json|DOD\.md/);
  for (const name of [".dod-guard.json", "DOD.md"]) {
    const ignored = spawnSync("git", ["-C", repo, "check-ignore", "-q", name]);
    assert.equal(ignored.status, 0, name);
  }
});

test("a non-dod arm gets no dod files in its fixture", () => {
  const r = runArm("T3", "base", 1);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(r.runDir, "repo", ".dod-guard.json")), false);
  assert.equal(existsSync(join(r.runDir, "repo", "DOD.md")), false);
});

test("meta.json records task, arm, rep, model, plugin directory, claude version, exported root and times", () => {
  const dod = runArm("T2", "dod", 1);
  const meta = JSON.parse(readFileSync(join(dod.runDir, "meta.json"), "utf8"));
  assert.equal(meta.task, "T2");
  assert.equal(meta.arm, "dod");
  assert.equal(meta.rep, 1);
  assert.equal(meta.model, "claude-sonnet-5-5");
  assert.equal(meta.plugin_dir, realpathSync(join(arms, "dod")));
  assert.equal(meta.claude_version, "9.9.9 (Claude Code stub)");
  assert.equal(meta.exported_root, "yes");
  assert.match(meta.started_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.match(meta.ended_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);

  const iso = runArm("T2", "iso", 1);
  assert.equal(JSON.parse(readFileSync(join(iso.runDir, "meta.json"), "utf8")).exported_root, "no");
  assert.equal(existsSync(join(iso.runDir, "DONE")), true);
});

test("a second run without PE_BENCH_FORCE refuses, and PE_BENCH_FORCE=1 reruns it", () => {
  const work = join(scratch, "work-force");
  const first = runArm("T3", "base", 1, { work });
  assert.equal(first.status, 0, first.stderr);
  const second = runArm("T3", "base", 1, { work });
  assert.notEqual(second.status, 0);
  assert.match(second.stderr, /DONE/);
  const forced = runArm("T3", "base", 1, { work, extra: { PE_BENCH_FORCE: "1" } });
  assert.equal(forced.status, 0, forced.stderr);
});

test("run.sh refuses an unknown task, an unknown arm and a rep outside 1..3", () => {
  assert.notEqual(runArm("T9", "base", 1).status, 0);
  assert.notEqual(runArm("T1", "nope", 1).status, 0);
  assert.notEqual(runArm("T1", "base", 4).status, 0);
});

test("arms.json has no unused prepare key", () => {
  const arms = JSON.parse(readFileSync(armsJson, "utf8"));
  for (const [name, arm] of Object.entries(arms)) {
    assert.equal("prepare" in arm, false, name);
  }
});

test("a stub that exits 1 gives no DONE, a FAILED file and exit_status 1 in meta.json", () => {
  const work = join(scratch, "work-exit1");
  const r = runArm("T3", "base", 1, { work, extra: { STUB_EXIT: "1" } });
  assert.equal(r.status, 1, r.stderr);
  assert.equal(existsSync(join(r.runDir, "DONE")), false);
  assert.equal(existsSync(join(r.runDir, "FAILED")), true);
  const meta = JSON.parse(readFileSync(join(r.runDir, "meta.json"), "utf8"));
  assert.equal(meta.exit_status, 1);
  assert.equal(meta.outcome, "failed");
});

test("a stub that exits 0 but ends with an is_error result gives no DONE and a FAILED file", () => {
  const work = join(scratch, "work-iserror");
  const line = '{"type":"result","subtype":"error_during_execution","is_error":true}';
  const r = runArm("T3", "base", 1, { work, extra: { STUB_LINE: line } });
  assert.notEqual(r.status, 0);
  assert.equal(existsSync(join(r.runDir, "DONE")), false);
  assert.equal(existsSync(join(r.runDir, "FAILED")), true);
  const meta = JSON.parse(readFileSync(join(r.runDir, "meta.json"), "utf8"));
  assert.equal(meta.exit_status, 0);
  assert.equal(meta.outcome, "failed");
});

test("a rerun after FAILED works without PE_BENCH_FORCE", () => {
  const work = join(scratch, "work-retry");
  const first = runArm("T3", "base", 1, { work, extra: { STUB_EXIT: "1" } });
  assert.equal(first.status, 1);
  assert.equal(existsSync(join(first.runDir, "FAILED")), true);
  const second = runArm("T3", "base", 1, { work });
  assert.equal(second.status, 0, second.stderr);
  assert.equal(existsSync(join(second.runDir, "DONE")), true);
  assert.equal(existsSync(join(second.runDir, "FAILED")), false);
});

test("runall keeps a FAILED run pending and prints the failed triples with a non-zero exit", () => {
  const work = join(scratch, "work-runall-failed");
  const r = run(runallSh, ["--tasks", "T1", "--arms", "base", "--reps", "1"], runEnv(work, { PE_BENCH_PAR: "1", STUB_EXIT: "1" }));
  assert.notEqual(r.status, 0);
  const tail = r.stdout.slice(r.stdout.lastIndexOf("failed"));
  assert.match(tail, /T1 base 1/);
  assert.equal(existsSync(join(work, "runs", "T1-base-1", "FAILED")), true);
});

test("runall dedupes repeated arms in --arms", () => {
  const r = run(runallSh, ["--dry-run", "--tasks", "T2", "--arms", "ours,ours", "--reps", "1"], runEnv(join(scratch, "work-dedupe")));
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(pendingLines(r.stdout), ["T2 ours 1"]);
});

test("the default work directory is under TMPDIR and runall names it on its first line", () => {
  const tmp = join(scratch, "tmp with space");
  mkdirSync(tmp, { recursive: true });
  const env = { ...runEnv(join(scratch, "unused")), TMPDIR: tmp, PE_BENCH_WORK_DIR: "" };
  delete env.PE_BENCH_WORK_DIR;
  const listed = run(runallSh, ["--dry-run", "--tasks", "T3", "--arms", "base", "--reps", "1"], env);
  assert.equal(listed.status, 0, listed.stderr);
  assert.equal(listed.stdout.split("\n")[0].includes(join(tmp, "pe-bench", "work")), true, listed.stdout);

  const r = run(runSh, ["T3", "base", "1"], { ...env, PE_BENCH_CLAUDE: stub, STUB_RECORD: join(tmp, "rec.txt"), PE_BENCH_TASKS: tasks, PE_BENCH_ARMS_DIR: arms });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(tmp, "pe-bench", "work", "runs", "T3-base-1", "DONE")), true);
});

test("a work directory whose path has a space works end to end", () => {
  const work = join(scratch, "work with space");
  const r = runArm("T4", "dod", 1, { work });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(r.runDir, "DONE")), true);
  assert.equal(existsSync(join(r.runDir, "repo", ".dod-guard.json")), true);
  assert.equal(stubRecord(work).root, realpathSync(join(arms, "dod")));
});

test("a second runall retries a FAILED triple and clears it", () => {
  const work = join(scratch, "work-runall-retry");
  const first = run(runallSh, ["--tasks", "T1", "--arms", "base", "--reps", "1"], runEnv(work, { PE_BENCH_PAR: "1", STUB_EXIT: "1" }));
  assert.notEqual(first.status, 0);
  const second = run(runallSh, ["--tasks", "T1", "--arms", "base", "--reps", "1"], runEnv(work, { PE_BENCH_PAR: "1" }));
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.equal(existsSync(join(work, "runs", "T1-base-1", "DONE")), true);
});

test("an invoked arm prefixes the prompt with its sentence and one space, and runs the competitor's plugin", () => {
  const armSpec = JSON.parse(readFileSync(armsJson, "utf8"));
  const r = runArm("T3", "gwc-invoked", 1);
  assert.equal(r.status, 0, r.stderr);
  const { args } = stubRecord(r.work);
  assert.equal(args[1], `${armSpec["gwc-invoked"].promptPrefix} ${TASK_PROMPTS.T3}`);
  assert.ok(hasPair(args, "--plugin-dir", realpathSync(join(arms, "gwc"))));
  const meta = JSON.parse(readFileSync(join(r.runDir, "meta.json"), "utf8"));
  assert.equal(meta.arm, "gwc-invoked");
  assert.equal(meta.prompt_prefix, armSpec["gwc-invoked"].promptPrefix);
});

test("the plain competitor arm keeps the natural prompt, with no prefix", () => {
  const r = runArm("T3", "gwc", 1);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(stubRecord(r.work).args[1], TASK_PROMPTS.T3);
  assert.equal(JSON.parse(readFileSync(join(r.runDir, "meta.json"), "utf8")).prompt_prefix, "");
});

test("dod-invoked gets the exported plugin root and the dod-guard set-up files", () => {
  const r = runArm("T2", "dod-invoked", 1);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(stubRecord(r.work).root, realpathSync(join(arms, "dod")));
  const repo = join(r.runDir, "repo");
  assert.match(readFileSync(join(repo, ".dod-guard.json"), "utf8"), /"strictness":"normal"/);
  assert.match(readFileSync(join(repo, "DOD.md"), "utf8"), /^# stayhub /m);
  const meta = JSON.parse(readFileSync(join(r.runDir, "meta.json"), "utf8"));
  assert.equal(meta.exported_root, "yes");
  assert.equal(meta.plugin_dir, realpathSync(join(arms, "dod")));
});

// ---------- isolation: temporary HOME, --settings, mkhome.sh and guard.sh ----------

const mkhomeSh = join(bench, "mkhome.sh");
const guardSh = join(bench, "guard.sh");
const mkSh = join(bench, "mk.sh");

function stubValue(work, key) {
  const line = readFileSync(join(work, "stub-record.txt"), "utf8").split("\n").find((l) => l.startsWith(`${key}=`));
  return line.slice(key.length + 1);
}

function stubHome(work) {
  const line = readFileSync(join(work, "stub-record.txt"), "utf8").split("\n").find((l) => l.startsWith("home="));
  return line.slice("home=".length);
}

test("the claude calls do not see CLAUDE_CONFIG_DIR or XDG_CONFIG_HOME from the owner's shell", () => {
  const work = join(scratch, "work-config-env");
  const versionRecord = join(scratch, "version-cfg.txt");
  const r = runArm("T2", "iso", 1, { work, extra: { CLAUDE_CONFIG_DIR: "/owner/config", XDG_CONFIG_HOME: "/owner/xdg", STUB_VERSION_RECORD: versionRecord } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(stubValue(r.work, "cfg"), "__UNSET__");
  assert.equal(stubValue(r.work, "xdg"), "__UNSET__");
  assert.equal(readFileSync(versionRecord, "utf8"), "__UNSET__", "the version call too");
});

test("mk.sh ignores a planted global git config: a template from it is not copied into the fixture", () => {
  const fakeHome = join(scratch, "git-home");
  const tpl = join(scratch, "git-tpl");
  mkdirSync(tpl, { recursive: true });
  writeFileSync(join(tpl, "PLANTED"), "from the global config\n");
  mkdirSync(fakeHome, { recursive: true });
  writeFileSync(join(fakeHome, ".gitconfig"), `[init]\n\ttemplateDir = ${tpl}\n[alias]\n\tplanted = !echo x\n[user]\n\tname = Planted Person\n\temail = planted@example.com\n`);
  const dir = join(scratch, "mk-global", "repo");
  const env = { HOME: fakeHome, XDG_CONFIG_HOME: join(fakeHome, ".config") };
  delete env.GIT_CONFIG_GLOBAL;
  const r = run(mkSh, [dir, "commit"], env);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(dir, ".git", "PLANTED")), false, "the global template did not apply");
  assert.equal(existsSync(join(dir, "package.json")), true, "the fixture was still built");
  assert.equal(spawnSync("git", ["-C", dir, "config", "--get", "user.name"], { encoding: "utf8" }).stdout.trim(), "Dev", "the local identity applies");
  assert.equal(spawnSync("git", ["-C", dir, "log", "-1", "--format=%an"], { encoding: "utf8" }).stdout.trim(), "Dev", "the planted global identity did not");
});

test("runall takes the guard snapshot once: a settings change between two runall calls makes the second exit 3", () => {
  const dir = makeRealHome("real-runall-2");
  const work = join(scratch, "work-runall-guard");
  const env = runEnv(work, { ...realEnv(dir), PE_BENCH_PAR: "1" });
  assert.equal(run(runallSh, ["--tasks", "T1", "--arms", "base", "--reps", "1"], env).status, 0);
  writeJson(join(dir, ".claude", "settings.json"), { hooks: { Stop: [{ hooks: [{ type: "command", command: "echo changed" }] }] } });
  const second = run(runallSh, ["--tasks", "T1", "--arms", "base", "--reps", "2"], env);
  assert.equal(second.status, 3, second.stdout + second.stderr);
  assert.equal(existsSync(join(work, "runs", "T1-base-2", "DONE")), false);
});

test("runall --reset-guard drops the baseline and STOP, takes a fresh snapshot, and the run then passes", () => {
  const dir = makeRealHome("real-runall-reset");
  const work = join(scratch, "work-runall-reset");
  const env = runEnv(work, { ...realEnv(dir), PE_BENCH_PAR: "1" });
  assert.equal(run(runallSh, ["--tasks", "T1", "--arms", "base", "--reps", "1"], env).status, 0);
  writeJson(join(dir, ".claude", "settings.json"), { hooks: { Stop: [{ hooks: [{ type: "command", command: "echo changed" }] }] } });
  assert.equal(run(runallSh, ["--tasks", "T1", "--arms", "base", "--reps", "2"], env).status, 3);
  assert.equal(existsSync(join(work, "STOP")), true);
  const reset = run(runallSh, ["--reset-guard", "--tasks", "T1", "--arms", "base", "--reps", "2"], env);
  assert.equal(reset.status, 0, reset.stdout + reset.stderr);
  assert.equal(existsSync(join(work, "STOP")), false);
  assert.equal(existsSync(join(work, "runs", "T1-base-2", "DONE")), true);
});

test("runall builds the temporary home, the settings file and the baseline before any run", () => {
  const work = join(scratch, "work-runall-build");
  const r = run(runallSh, ["--tasks", "T3", "--arms", "base", "--reps", "1"], runEnv(work, { PE_BENCH_PAR: "3" }));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(work, "home", ".claude.json")), true);
  assert.equal(existsSync(join(work, "settings.json")), true);
  assert.match(readFileSync(join(work, "guard-baseline"), "utf8"), /^hooks=/);
});

test("mkhome.sh copies only oauthAccount, userID and hasCompletedOnboarding, and links the keychain on Darwin", () => {
  const dir = join(scratch, "mkhome-1", "home");
  const r = run(mkhomeSh, [dir], realEnv());
  assert.equal(r.status, 0, r.stderr);
  const claude = JSON.parse(readFileSync(join(dir, ".claude.json"), "utf8"));
  assert.deepEqual(Object.keys(claude).sort(), ["hasCompletedOnboarding", "oauthAccount", "userID"]);
  assert.equal(claude.hasCompletedOnboarding, true);
  assert.equal(claude.userID, "user-1");
  assert.equal(claude.oauthAccount.emailAddress, "user@example.com");
  assert.equal(claude.oauthAccount.accountUuid, "acct-1", "the account id is kept");
  assert.equal(claude.oauthAccount.organizationUuid, "org-1", "the organization id is kept");
  assert.equal(claude.oauthAccount.billingType, "stripe_subscription", "a non-identity field is kept");
  assert.equal(claude.oauthAccount.displayName, "Bench User");
  assert.equal(claude.oauthAccount.fullName, "Bench User");
  assert.equal(claude.oauthAccount.organizationName, "Bench");
  assert.equal(claude.mcpServers, undefined, "a planted mcpServers key is not copied");
  assert.deepEqual(JSON.parse(readFileSync(join(dir, ".claude", "settings.json"), "utf8")), {});
  if (process.platform === "darwin") {
    assert.equal(realpathSync(join(dir, "Library", "Keychains")), realpathSync(join(realHome, "Library", "Keychains")));
  } else {
    assert.equal(existsSync(join(dir, "Library")), false);
  }
  assert.equal(`${r.stdout}${r.stderr}`.includes(REAL_EMAIL), false, "the script prints no email");
});

test("mkhome.sh sanitises the copied account: the planted email and name never reach the temporary home", () => {
  const dir = join(scratch, "mkhome-sanitised", "home");
  const r = run(mkhomeSh, [dir], realEnv());
  assert.equal(r.status, 0, r.stderr);
  const text = readFileSync(join(dir, ".claude.json"), "utf8");
  assert.equal(text.includes(REAL_EMAIL), false, "no planted email");
  assert.equal(text.includes("real.owner"), false, "no part of the planted email");
  assert.equal(text.includes(REAL_NAME), false, "no planted person name");
  assert.equal(text.includes("Real Owner"), false, "no part of the planted name");
});

test("mkhome.sh refuses when the real .claude.json is missing", () => {
  const empty = makeRealHome("real-empty");
  rmSync(join(empty, ".claude.json"));
  const r = run(mkhomeSh, [join(scratch, "mkhome-none", "home")], realEnv(empty));
  assert.notEqual(r.status, 0);
});

test("the stub sees HOME as the temporary home, not the real one, and --settings naming the work directory (iso arm)", () => {
  const r = runArm("T2", "iso", 1);
  assert.equal(r.status, 0, r.stderr);
  const work = realpathSync(r.work);
  assert.equal(stubHome(r.work), join(work, "home"));
  assert.notEqual(stubHome(r.work), realHome);
  const { args } = stubRecord(r.work);
  // The iso arm has its own settings file: the shared one merged with its output style.
  assert.ok(hasPair(args, "--settings", join(work, "settings-iso.json")));
  assert.ok(hasPair(args, "--setting-sources", "project"), "the existing project source is kept");
  assert.deepEqual(JSON.parse(readFileSync(join(work, "settings-iso.json"), "utf8")), { hooks: {}, outputStyle: "ISO 24495" });
  assert.deepEqual(JSON.parse(readFileSync(join(work, "settings.json"), "utf8")), { hooks: {} }, "the shared file is unchanged");
  assert.equal(existsSync(join(work, "home", ".claude.json")), true, "mkhome built the temporary home");
});

test("arms.json gives dod two prerequisite probes, bash >= 4 and GNU find, and the invoked arm inherits its base", () => {
  const dod = JSON.parse(readFileSync(armsJson, "utf8")).dod;
  assert.deepEqual(dod.requires.map((p) => p.name), ["bash >= 4", "GNU find (-regextype)"]);
  for (const probe of dod.requires) assert.equal(typeof probe.command, "string", probe.name);
});

test("a failing prerequisite makes the run not run: no claude call, FAILED with the not-run reason, meta outcome not-run, exit 0", () => {
  const work = join(scratch, "work-not-run");
  const r = runArm("T2", "dod", 1, { work, extra: { PE_BENCH_ARMS_JSON: failingArms } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(work, "stub-record.txt")), false, "claude was not called");
  assert.equal(existsSync(join(r.runDir, "DONE")), false);
  const failed = readFileSync(join(r.runDir, "FAILED"), "utf8");
  assert.match(failed, /^exit_status=0$/m);
  assert.match(failed, /^reason=not run: needs bash >= 4 and GNU find/m);
  const meta = JSON.parse(readFileSync(join(r.runDir, "meta.json"), "utf8"));
  assert.equal(meta.outcome, "not-run");
  assert.equal(meta.exit_status, 0);
  assert.match(r.stderr, /prerequisite failed: stub probe fails/);
});

test("the invoked dod arm inherits its base prerequisites: not run too", () => {
  const work = join(scratch, "work-not-run-invoked");
  const r = runArm("T2", "dod-invoked", 1, { work, extra: { PE_BENCH_ARMS_JSON: failingArms } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(readFileSync(join(r.runDir, "meta.json"), "utf8")).outcome, "not-run");
  assert.equal(existsSync(join(work, "stub-record.txt")), false);
});

test("a passing prerequisite lets claude run as before", () => {
  const r = runArm("T2", "dod", 1, { extra: { PE_BENCH_ARMS_JSON: passingArms } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(r.runDir, "DONE")), true);
  assert.equal(existsSync(join(r.work, "stub-record.txt")), true, "claude was called");
});

test("run.sh on a not-run run without PE_BENCH_FORCE leaves it alone; with PE_BENCH_FORCE=1 it probes again", () => {
  const work = join(scratch, "work-not-run-direct");
  const env = { PE_BENCH_ARMS_JSON: failingArms };
  assert.equal(runArm("T2", "dod", 1, { work, extra: env }).status, 0);
  const again = runArm("T2", "dod", 1, { work, extra: env });
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stderr, /already not run/);
  const forced = runArm("T2", "dod", 1, { work, extra: { ...env, PE_BENCH_FORCE: "1" } });
  assert.equal(forced.status, 0, forced.stderr);
  assert.match(forced.stderr, /prerequisite failed/);
});

test("runall treats a not-run run as finished: no failed triple, nothing to do on a rerun, redone only with PE_BENCH_FORCE=1", () => {
  const work = join(scratch, "work-not-run-runall");
  const env = runEnv(work, { PE_BENCH_ARMS_JSON: failingArms, PE_BENCH_PAR: "1" });
  const first = run(runallSh, ["--tasks", "T2", "--arms", "dod", "--reps", "1"], env);
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.doesNotMatch(first.stdout, /failed triples/);
  const second = run(runallSh, ["--tasks", "T2", "--arms", "dod", "--reps", "1"], env);
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.match(second.stdout, /^0 runs to do, 1 already done, 1 in the matrix$/m);
  const dryForced = run(runallSh, ["--dry-run", "--tasks", "T2", "--arms", "dod", "--reps", "1"], { ...env, PE_BENCH_FORCE: "1" });
  assert.match(dryForced.stdout, /^T2 dod 1$/m);
  const dry = run(runallSh, ["--dry-run", "--tasks", "T2", "--arms", "dod", "--reps", "1"], env);
  assert.doesNotMatch(dry.stdout, /^T2 dod 1$/m);
});

test("the exported-root branch (dod) runs under the temporary home too", () => {
  const r = runArm("T2", "dod", 1);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(stubHome(r.work), join(realpathSync(r.work), "home"));
  assert.equal(stubRecord(r.work).root, realpathSync(join(arms, "dod")));
});

test("no run writes the fixture email outside a temporary home", () => {
  const work = join(scratch, "work-email");
  assert.equal(runArm("T2", "iso", 1, { work }).status, 0);
  const hits = spawnSync("grep", ["-rl", REAL_EMAIL, scratch], { encoding: "utf8" }).stdout.split("\n").filter(Boolean);
  for (const hit of hits) {
    const fake = fakeRealHomes.some((dir) => hit.startsWith(dir + "/"));
    const temporary = hit.endsWith(`/home/.claude.json`);
    assert.ok(fake || temporary, `the email appears in ${hit}`);
  }
});

test("guard.sh snapshot writes a digest of hooks and of mcpServers, and check passes while nothing changes", () => {
  const dir = makeRealHome("guard-clean", { mcpServers: { one: { command: "a" } } });
  const work = join(scratch, "guard-clean-work");
  const env = { ...realEnv(dir), PE_BENCH_WORK_DIR: work };
  assert.equal(run(guardSh, ["snapshot"], env).status, 0);
  assert.match(readFileSync(join(work, "guard-baseline"), "utf8"), /^hooks=[0-9a-f]{64}\nmcpServers=[0-9a-f]{64}\n$/);
  const ok = run(guardSh, ["check"], env);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(existsSync(join(work, "STOP")), false);
});

test("guard.sh check names a changed hooks object, writes STOP and exits 3", () => {
  const dir = makeRealHome("guard-hooks");
  const work = join(scratch, "guard-hooks-work");
  const env = { ...realEnv(dir), PE_BENCH_WORK_DIR: work };
  assert.equal(run(guardSh, ["snapshot"], env).status, 0);
  writeJson(join(dir, ".claude", "settings.json"), { hooks: { Stop: [{ hooks: [{ type: "command", command: "echo changed" }] }] } });
  const r = run(guardSh, ["check"], env);
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stderr, /hooks/);
  assert.doesNotMatch(r.stderr, /mcpServers/);
  assert.match(readFileSync(join(work, "STOP"), "utf8"), /hooks/);
});

test("guard.sh check names a changed mcpServers object and exits 3", () => {
  const dir = makeRealHome("guard-mcp");
  const work = join(scratch, "guard-mcp-work");
  const env = { ...realEnv(dir), PE_BENCH_WORK_DIR: work };
  assert.equal(run(guardSh, ["snapshot"], env).status, 0);
  writeJson(join(dir, ".claude.json"), {
    oauthAccount: { emailAddress: REAL_EMAIL },
    userID: "user-1",
    mcpServers: { added: { command: "b" } },
  });
  const r = run(guardSh, ["check"], env);
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stderr, /mcpServers/);
  assert.doesNotMatch(r.stderr, /hooks/);
});

test("guard.sh check without a snapshot refuses with exit 3", () => {
  const work = join(scratch, "guard-none-work");
  const r = run(guardSh, ["check"], { ...realEnv(), PE_BENCH_WORK_DIR: work });
  assert.equal(r.status, 3);
});

test("a settings hooks change between two runs writes STOP, run.sh exits 3, and the next run refuses at once", () => {
  const dir = makeRealHome("real-stop-1");
  const work = join(scratch, "work-stop-1");
  const first = runArm("T1", "base", 1, { work, extra: realEnv(dir) });
  assert.equal(first.status, 0, first.stderr);
  writeJson(join(dir, ".claude", "settings.json"), { hooks: { Stop: [{ hooks: [{ type: "command", command: "echo changed" }] }] } });
  const second = runArm("T1", "base", 2, { work, extra: realEnv(dir) });
  assert.equal(second.status, 3, second.stderr);
  assert.match(second.stderr, /hooks/);
  assert.equal(existsSync(join(work, "STOP")), true);
  assert.equal(existsSync(join(second.runDir, "DONE")), false);
  const third = runArm("T1", "base", 3, { work, extra: realEnv(dir) });
  assert.equal(third.status, 3, third.stderr);
  assert.equal(existsSync(join(third.runDir, "DONE")), false);
});

test("an unchanged real settings file lets two runs pass with no STOP", () => {
  const dir = makeRealHome("real-stable");
  const work = join(scratch, "work-stable");
  assert.equal(runArm("T1", "base", 1, { work, extra: realEnv(dir) }).status, 0);
  assert.equal(runArm("T1", "base", 2, { work, extra: realEnv(dir) }).status, 0);
  assert.equal(existsSync(join(work, "STOP")), false);
});

test("a hooks change made during a run stops runall with exit 3 and leaves the remaining runs undone", () => {
  const dir = makeRealHome("real-stop-2");
  const work = join(scratch, "work-stop-2");
  const r = run(
    runallSh,
    ["--tasks", "T1", "--arms", "base", "--reps", "2"],
    runEnv(work, {
      ...realEnv(dir),
      PE_BENCH_PAR: "1",
      STUB_MUTATE: join(dir, ".claude", "settings.json"),
      STUB_MUTATE_JSON: '{"hooks":{"Stop":[{"changed":true}]}}',
    }),
  );
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.equal(existsSync(join(work, "STOP")), true);
  assert.equal(existsSync(join(work, "runs", "T1-base-1", "DONE")), false, "the run that saw the change is not done");
  assert.equal(existsSync(join(work, "runs", "T1-base-2", "DONE")), false, "the next run refuses at once");
});

// The stub's --settings file, read back from the arguments it was given.
function settingsArg(args) {
  const file = args[args.indexOf("--settings") + 1];
  return JSON.parse(readFileSync(file, "utf8"));
}

test("the iso arms select the ISO output style, and no other arm does", () => {
  for (const arm of ["iso", "iso-invoked"]) {
    const r = runArm("T1", arm, 1);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(settingsArg(stubRecord(r.work).args), { hooks: {}, outputStyle: "ISO 24495" }, arm);
  }
  for (const arm of ["ours", "base", "dod", "gwc", "dod-invoked", "gwc-invoked"]) {
    const r = runArm("T1", arm, 1);
    assert.equal(r.status, 0, `${arm}: ${r.stderr}`);
    assert.deepEqual(settingsArg(stubRecord(r.work).args), { hooks: {} }, arm);
  }
});

test("stderr goes to stderr.log and does not decide the outcome: noise after a result line still gives DONE", () => {
  const r = runArm("T3", "base", 1, { extra: { STUB_STDERR: "Stop hook wrote this to stderr" } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(r.runDir, "DONE")), true);
  assert.doesNotMatch(readFileSync(join(r.runDir, "out.jsonl"), "utf8"), /Stop hook/);
  assert.match(readFileSync(join(r.runDir, "stderr.log"), "utf8"), /Stop hook wrote this/);
});

test("a non-JSON line after a result line still gives DONE, because the last result line decides", () => {
  const r = runArm("T3", "base", 1, { extra: { STUB_LINE: '{"type":"result","stub":true}\nnot json at all' } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(r.runDir, "DONE")), true);
});

test("a run with no result line fails, even when the output is otherwise JSON", () => {
  const r = runArm("T3", "base", 1, { extra: { STUB_LINE: '{"type":"assistant","message":{}}' } });
  assert.notEqual(r.status, 0);
  assert.equal(existsSync(join(r.runDir, "DONE")), false);
  assert.match(readFileSync(join(r.runDir, "FAILED"), "utf8"), /no result line/);
});

test("the last result line decides: an error result followed by a good one is DONE, a good one followed by an error is failed", () => {
  const error = '{"type":"result","is_error":true}';
  const good = '{"type":"result","stub":true}';
  const first = runArm("T3", "base", 1, { extra: { STUB_LINE: `${error}\n${good}` } });
  assert.equal(first.status, 0, first.stderr);
  assert.equal(existsSync(join(first.runDir, "DONE")), true);
  const second = runArm("T3", "base", 1, { extra: { STUB_LINE: `${good}\n${error}` } });
  assert.notEqual(second.status, 0);
  assert.equal(existsSync(join(second.runDir, "DONE")), false);
});

// Like runArm, but returns a promise, so two run.sh calls can overlap.
function runAsync(script, args, env) {
  return new Promise((resolve) => {
    const child = spawn("bash", [script, ...args], { env: { ...baseEnv(), ...env } });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.on("close", (status) => resolve({ status, stderr }));
  });
}

test("two run.sh calls on the same arm at once each read a complete ISO output style file", async () => {
  const work = join(scratch, "work-two-at-once");
  const readBase = join(work, "read");
  const first = runArm("T3", "iso", 1, { work, extra: { STUB_READ_SETTINGS: readBase } });
  assert.equal(first.status, 0, first.stderr);
  const env = runEnv(work, { STUB_READ_SETTINGS: readBase });
  const [a, b] = await Promise.all([runAsync(runSh, ["T3", "iso", "2"], env), runAsync(runSh, ["T3", "iso", "3"], env)]);
  assert.equal(a.status, 0, a.stderr);
  assert.equal(b.status, 0, b.stderr);
  const reads = readdirSync(work).filter((f) => f.startsWith("read."));
  assert.equal(reads.length, 3, "each of the three runs read its settings file");
  for (const f of reads) {
    assert.deepEqual(JSON.parse(readFileSync(join(work, f), "utf8")), { hooks: {}, outputStyle: "ISO 24495" }, f);
  }
});

test("a stale settings file for an arm is replaced before the next run reads it", () => {
  const work = join(scratch, "work-stale-settings");
  const first = runArm("T3", "iso", 1, { work });
  assert.equal(first.status, 0, first.stderr);
  writeFileSync(join(work, "settings-iso.json"), '{"hooks":{},"outputStyle":"Explanatory"}\n');
  const second = runArm("T3", "iso", 2, { work });
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(settingsArg(stubRecord(second.work).args), { hooks: {}, outputStyle: "ISO 24495" });
  assert.deepEqual(JSON.parse(readFileSync(join(work, "settings-iso.json"), "utf8")), { hooks: {}, outputStyle: "ISO 24495" });
});

test("runall builds each arm's settings file once in the shared set-up, and removes a stale file for an arm without settings", () => {
  const work = join(scratch, "work-runall-settings");
  mkdirSync(work, { recursive: true });
  writeFileSync(join(work, "settings-base.json"), '{"stale":true}\n');
  const r = run(runallSh, ["--tasks", "T3", "--arms", "iso,base", "--reps", "1"], runEnv(work, { PE_BENCH_PAR: "1" }));
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(readFileSync(join(work, "settings-iso.json"), "utf8")), { hooks: {}, outputStyle: "ISO 24495" });
  assert.equal(existsSync(join(work, "settings-base.json")), false, "a stale file for an arm with no settings is removed");
});

// ---------- round 2: PATH shims (the ours product-engineer command, the dod bash and GNU find links) ----------

function stubPathRecord(work) {
  const lines = readFileSync(join(work, "stub-record.txt"), "utf8").split("\n");
  const pick = (key) => {
    const line = lines.find((l) => l.startsWith(`${key}=`));
    return line === undefined ? undefined : line.slice(key.length + 1);
  };
  return { path: pick("path"), pe: pick("pe"), peHelp: pick("pe_help") };
}

test("the ours arm's claude sees shim-ours first on PATH, product-engineer resolves to it, and --help works through it", () => {
  const r = runArm("T2", "ours", 1, { extra: { STUB_CLI: "1" } });
  assert.equal(r.status, 0, r.stderr);
  const work = realpathSync(r.work);
  const ours = join(work, "ours", readFileSync(join(work, "ours-commit.txt"), "utf8").split("\n")[0]);
  const rec = stubPathRecord(r.work);
  assert.ok(rec.path.startsWith(`${join(work, "shim-ours")}:`), rec.path);
  assert.equal(rec.pe, join(work, "shim-ours", "product-engineer"));
  assert.equal(rec.peHelp, "0", "product-engineer --help exits 0 through the shim");
  assert.equal(
    readFileSync(join(work, "shim-ours", "product-engineer"), "utf8"),
    `#!/bin/sh\nexec node "${ours}/bin/check.mjs" "$@"\n`,
  );
  assert.equal((statSync(join(work, "shim-ours", "product-engineer")).mode & 0o111) !== 0, true, "the shim is executable");
});

test("no other arm gets a shim: base's claude has the PATH it was given, with neither shim in it", () => {
  const r = runArm("T2", "base", 1, { extra: { STUB_CLI: "1" } });
  assert.equal(r.status, 0, r.stderr);
  const rec = stubPathRecord(r.work);
  assert.equal(rec.path, process.env.PATH, "PATH is unchanged for base");
  assert.doesNotMatch(rec.path, /shim-/);
  assert.doesNotMatch(rec.pe, /shim-/);
});

test("dod and dod-invoked get shim-dod first on PATH; the stub sees it on the claude call", () => {
  for (const arm of ["dod", "dod-invoked"]) {
    const r = runArm("T2", arm, 1, { extra: { PE_BENCH_ARMS_JSON: passingArms } });
    assert.equal(r.status, 0, `${arm}: ${r.stderr}`);
    assert.ok(stubPathRecord(r.work).path.startsWith(`${join(realpathSync(r.work), "shim-dod")}:`), arm);
  }
});

// Stand-ins for bash 5 and GNU find. They answer the two marker options the probes use and pass everything else to the
// real tools, so the fixture build and the guard still run. Real bash and find reject the markers, so a probe that passes
// proves the shim put the stand-ins on PATH.
const realBash = spawnSync("sh", ["-c", "command -v bash"], { encoding: "utf8" }).stdout.trim();
const realFind = spawnSync("sh", ["-c", "command -v find"], { encoding: "utf8" }).stdout.trim();
const fakeTools = join(scratch, "fake-tools");
mkdirSync(fakeTools, { recursive: true });
writeFileSync(
  join(fakeTools, "bash"),
  [
    "#!/bin/sh",
    'case "$1" in',
    "  --bench-stub) exit 0 ;;",
    '  --version) echo "GNU bash, version 5.9.9 (bench stub)"; exit 0 ;;',
    "esac",
    `exec ${realBash} "$@"`,
    "",
  ].join("\n"),
);
writeFileSync(
  join(fakeTools, "find"),
  [
    "#!/bin/sh",
    'case " $* " in',
    '  *" --bench-stub "*|*" -regextype "*) exit 0 ;;',
    "esac",
    `exec ${realFind} "$@"`,
    "",
  ].join("\n"),
);
spawnSync("chmod", ["755", join(fakeTools, "bash"), join(fakeTools, "find")]);
const stubProbes = [
  { name: "bash >= 4", command: "bash --bench-stub && bash --version | grep -q 'version 5'" },
  { name: "GNU find (-regextype)", command: "find --bench-stub && find /dev/null -regextype posix-basic -regex x >/dev/null 2>&1" },
];
function armsWithTools(name, pathLinks) {
  const a = JSON.parse(readFileSync(armsJson, "utf8"));
  a.dod.requires = stubProbes;
  a.dod.pathLinks = pathLinks;
  const file = join(scratch, `arms-tools-${name}.json`);
  writeJson(file, a);
  return file;
}
// xargs points at a file that does not exist, so its link must be left out.
const toolsArms = armsWithTools("with", {
  bash: join(fakeTools, "bash"),
  find: join(fakeTools, "find"),
  xargs: join(fakeTools, "xargs-missing"),
});
const noToolsArms = armsWithTools("without", {});

test("the shim-dod links point at the existing targets only: a missing xargs target leaves no link", () => {
  const work = join(scratch, "work-links");
  const r = runArm("T2", "dod", 1, { work, extra: { PE_BENCH_ARMS_JSON: toolsArms } });
  assert.equal(r.status, 0, r.stderr);
  const shim = join(realpathSync(work), "shim-dod");
  assert.equal(readlinkSync(join(shim, "bash")), join(fakeTools, "bash"));
  assert.equal(readlinkSync(join(shim, "find")), join(fakeTools, "find"));
  assert.equal(existsSync(join(shim, "xargs")), false, "no xargs link when its target is missing");
});

test("with shim-dod the dod probes pass and claude is called; without the links they fail and the run is not run", () => {
  const withShim = runArm("T2", "dod", 1, { work: join(scratch, "work-probe-with"), extra: { PE_BENCH_ARMS_JSON: toolsArms } });
  assert.equal(withShim.status, 0, withShim.stderr);
  assert.equal(existsSync(join(withShim.runDir, "DONE")), true, "the probes passed with the shim");
  assert.equal(existsSync(join(withShim.work, "stub-record.txt")), true, "claude was called");
  assert.doesNotMatch(withShim.stderr, /prerequisite failed/, "no prerequisite is reported missing with the shim");
  const withoutShim = runArm("T2", "dod", 1, { work: join(scratch, "work-probe-without"), extra: { PE_BENCH_ARMS_JSON: noToolsArms } });
  assert.equal(withoutShim.status, 0, withoutShim.stderr);
  assert.equal(existsSync(join(withoutShim.work, "stub-record.txt")), false, "claude was not called");
  assert.match(withoutShim.stderr, /prerequisite failed: bash >= 4, GNU find \(-regextype\)/);
});

test("arms.json marks ours as the installed CLI arm and gives dod the bash and GNU find links, with no other arm changed", () => {
  const arms = JSON.parse(readFileSync(armsJson, "utf8"));
  assert.equal(arms.ours.cli, true);
  for (const name of ["base", "dod-invoked", "iso", "gwc"]) assert.equal(arms[name].cli, undefined, name);
  assert.deepEqual(arms.dod.pathLinks, {
    bash: "/opt/homebrew/bin/bash",
    find: "/opt/homebrew/opt/findutils/libexec/gnubin/find",
    xargs: "/opt/homebrew/opt/findutils/libexec/gnubin/xargs",
  });
});

test("T3 runs the round 3 pr3 fixture: the branch style/format-code is checked out in the session repository", () => {
  const r = runArm("T3", "base", 1);
  assert.equal(r.status, 0, r.stderr);
  const branch = spawnSync("git", ["-C", join(r.runDir, "repo"), "rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" });
  assert.equal(branch.stdout.trim(), "style/format-code");
});

// ---------- round 2 follow-up 16b: the ours arm runs from an immutable copy of the commit under test ----------

const oursProbeArms = (() => {
  const a = JSON.parse(readFileSync(armsJson, "utf8"));
  a.ours.probes = [["--help", "a string that is not in the help"]];
  const file = join(scratch, "arms-ours-probe-fail.json");
  writeJson(file, a);
  return file;
})();

test("the ours run's --plugin-dir is the copy, and meta.json records that directory and ours_commit; base records no ours_commit", () => {
  const r = runArm("T2", "ours", 1);
  assert.equal(r.status, 0, r.stderr);
  const work = realpathSync(r.work);
  const hash = readFileSync(join(work, "ours-commit.txt"), "utf8").split("\n")[0];
  const copy = join(work, "ours", hash);
  assert.ok(hasPair(stubRecord(r.work).args, "--plugin-dir", copy), stubRecord(r.work).args.join(" "));
  const meta = JSON.parse(readFileSync(join(r.runDir, "meta.json"), "utf8"));
  assert.equal(meta.plugin_dir, copy);
  assert.equal(meta.ours_commit, spawnSync("git", ["-C", fakeRepo, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim());
  const base = runArm("T2", "base", 1);
  assert.equal(base.status, 0, base.stderr);
  assert.equal(JSON.parse(readFileSync(join(base.runDir, "meta.json"), "utf8")).ours_commit, null);
});

test("runall stops with exit 2 when a probe of the ours copy fails, and no ours run starts", () => {
  const work = join(scratch, "work-runall-probe-fail");
  const r = run(runallSh, ["--tasks", "T2", "--arms", "ours", "--reps", "1"], runEnv(work, { PE_BENCH_ARMS_JSON: oursProbeArms }));
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /did not print "a string that is not in the help"/);
  assert.equal(existsSync(join(work, "runs", "T2-ours-1")), false, "no run directory was made");
});

test("run.sh for the ours arm refuses with exit 2 when no copy is recorded, and says to run runall.sh first; base still runs", () => {
  const work = join(scratch, "work-ours-no-copy");
  const r = run(runSh, ["T2", "ours", "1"], runEnv(work));
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /run runall\.sh first \(it builds the immutable copy\)/);
  assert.equal(existsSync(join(work, "runs", "T2-ours-1", "DONE")), false, "claude was not called");
  const base = runArm("T2", "base", 1, { work: join(scratch, "work-base-no-copy") });
  assert.equal(base.status, 0, base.stderr);
});

test("a commit in the repository after the copy was made does not fail a run: the run uses the recorded copy", () => {
  const later = join(scratch, "fake-repo-later");
  spawnSync("cp", ["-R", fakeRepo, later]);
  const work = join(scratch, "work-later-run");
  const copy = buildOurs(work, later);
  writeFileSync(join(later, "bin", "check.mjs"), "// a later commit\n");
  for (const args of [["add", "bin/check.mjs"], ["commit", "-q", "-m", "chore: a later commit"]]) {
    const g = spawnSync("git", ["-c", "user.name=Bench Test", "-c", "user.email=bench@example.com", "-c", "core.hooksPath=/dev/null", ...args], { cwd: later, encoding: "utf8", env: baseEnv() });
    assert.equal(g.status, 0, g.stderr);
  }
  const r = runArm("T2", "ours", 1, { work, extra: { PE_BENCH_REPO_ROOT: later } });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(hasPair(stubRecord(r.work).args, "--plugin-dir", copy), stubRecord(r.work).args.join(" "));
});

test("a tampered copy stops the run with exit 2 and a message about its tree digest", () => {
  const work = join(scratch, "work-tampered-run");
  const copy = buildOurs(work);
  spawnSync("chmod", ["u+w", join(copy, "bin", "check.mjs")]);
  writeFileSync(join(copy, "bin", "check.mjs"), "// tampered\n");
  const r = run(runSh, ["T2", "ours", "1"], runEnv(work));
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /tree digest/);
  assert.equal(existsSync(join(work, "runs", "T2-ours-1", "DONE")), false);
});

test("mk.sh for a dod run sees the system PATH; shim-dod reaches only the probes and the claude call", () => {
  // A copy of the bench scripts whose mk.sh records the PATH it is given, then runs the real one.
  const benchCopy = join(scratch, "bench-copy");
  mkdirSync(benchCopy, { recursive: true });
  const files = readdirSync(bench).filter((f) => /\.(sh|mjs)$/.test(f) || f === "arms.json" || f === "tasks.json" || f === "labels.json");
  spawnSync("cp", [...files.map((f) => join(bench, f)), benchCopy]);
  spawnSync("mv", [join(benchCopy, "mk.sh"), join(benchCopy, "mk-real.sh")]);
  writeFileSync(
    join(benchCopy, "mk.sh"),
    '#!/bin/bash\nprintf \'%s\' "$PATH" > "$STUB_MK_PATH"\nexec bash "$(dirname "$0")/mk-real.sh" "$@"\n',
  );
  const work = join(scratch, "work-mk-path");
  const mkPathFile = join(scratch, "mk-path.txt");
  const r = spawnSync("bash", [join(benchCopy, "run.sh"), "T2", "dod", "1"], {
    encoding: "utf8",
    env: { ...baseEnv(), ...runEnv(work, { STUB_MK_PATH: mkPathFile }) },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(work, "runs", "T2-dod-1", "DONE")), true);
  const mkPath = readFileSync(mkPathFile, "utf8");
  assert.doesNotMatch(mkPath, /shim-dod/, "the fixture build keeps the system PATH");
  assert.equal(mkPath, process.env.PATH, "mk.sh gets the PATH it was given");
  assert.ok(stubPathRecord(work).path.startsWith(`${join(realpathSync(work), "shim-dod")}:`), "claude gets shim-dod first");
});
