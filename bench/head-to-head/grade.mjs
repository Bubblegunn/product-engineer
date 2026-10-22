#!/usr/bin/env node
// Blind grading for the head-to-head runs (docs/HEAD-TO-HEAD.md, "Grading").
// Usage: node grade.mjs [--runs-dir work/runs] [--dry-run] [--only <run id>] [--force]
//        node grade.mjs --joint [--tasks T3,H1] [--runs-dir work/runs] [--dry-run] [--force]
// --joint grades every DONE run of a task in ONE grader call (all sessions, shuffled, anonymous labels), so one grader
// applies one standard to all of them. A task whose runs already all have a good grade is skipped unless --force; when it
// is graded, all its runs are graded again together. A task that cannot be parsed after one retry stays ungraded (no grade
// file is written for it) and the command exits 1. PE_BENCH_JOINT_MAX_CHARS (default 400000) is the material size above
// which one task is split into the fewest balanced chunks.
// Env PE_BENCH_COST_FILE: every grader call appends one row: time(UTC ISO) TAB description TAB usd TAB cumulative.
// For every run directory with DONE, it builds an anonymised material text, asks a plain Sonnet call
// (no plugins) to grade the llm and both criteria, and writes grades/<label>.json. labels.json maps each
// label to its run id. Env: PE_BENCH_CLAUDE (claude binary), PE_BENCH_SEED (shuffle and labels),
// PE_BENCH_WORK_DIR (default ${TMPDIR:-/tmp}/pe-bench/work), PE_BENCH_TASKS, PE_BENCH_ARMS_DIR.
// Isolation: each grader call runs with HOME=<work dir>/home (mkhome.sh) and --settings <work dir>/settings.json.
// guard.sh check runs before and after each call; a changed real Claude settings stops grading with exit 3.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gitOutput, loadRunContext } from "./objective.mjs";
import { ownerEmail, redactOwnerEmail } from "./owner-email.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, "guard.sh");
const MKHOME = join(HERE, "mkhome.sh");

// Names that would tell the grader which tool produced the work. They are replaced before grading.
export const REDACTED_NAMES = [
  "product-engineer",
  "customer-block",
  "done-means-observed",
  "release-notes",
  "dod-guard",
  "DoD-Guard",
  "DOD.md",
  "/dod:",
  "ISO 24495",
  "iso-24495",
  "git-weekly-changelog",
  "Smart Commits",
];

export const GRADER_PROMPT = [
  "You are grading one coding-assistant session against fixed criteria.",
  "The material on stdin is everything you may see: the task the user gave, the criteria, the assistant's",
  "final answer, the Bash commands it ran, the commits it made with their messages and diff statistics, and any",
  "file it wrote. Judge only what the material shows. Grade only the criteria whose ids are listed under GRADE.",
  "A criterion passes only when the material supports it. If the material does not show it, it fails.",
  "",
  'Reply with one JSON object and nothing else. Its keys are the criterion ids as strings, and each value is',
  '{"pass": true or false, "why": "one short sentence"}. Example: {"1":{"pass":true,"why":"..."}}',
].join("\n");

export const JOINT_GRADER_PROMPT = [
  "You are grading several coding-assistant sessions against the same fixed criteria.",
  "The material on stdin holds one block per session, each starting with a line like === SESSION <label> ===.",
  "The sessions are in mixed order, and nothing about the order or the label tells you anything. Each block holds",
  "the task the user gave, the criteria, the assistant's final answer, the Bash commands it ran, the commits it made",
  "with their messages and diff statistics, and any file it wrote.",
  "Grade every session independently against the criteria listed under GRADE in its own block. A session passes a",
  "criterion only if its own material supports it. If a session's material does not show it, that session fails that",
  "criterion. Do not let one session's material count for another. Apply the same standard to every session.",
  "",
  'Reply with one JSON object and nothing else: {"<label>":{"<id>":{"pass":true or false,"why":"one short sentence"}}}.',
  'It has one key per session label, and under each label one key per criterion id as a string.',
  'Example: {"g0a1b2c":{"1":{"pass":true,"why":"..."}}}',
].join("\n");

export const JOINT_MAX_CHARS = 400000;

export function defaultWorkDir() {
  return process.env.PE_BENCH_WORK_DIR || join(process.env.TMPDIR || "/tmp", "pe-bench", "work");
}

function parseArgs(argv) {
  const opts = { runsDir: join(defaultWorkDir(), "runs"), dryRun: false, only: null, force: false, joint: false, tasks: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--force") opts.force = true;
    else if (a === "--joint") opts.joint = true;
    else if (a === "--tasks" && argv[i + 1]) {
      opts.tasks = argv[i + 1].split(",").filter((t) => t !== "");
      i += 1;
    }
    else if (a === "--runs-dir" && argv[i + 1]) {
      opts.runsDir = argv[i + 1];
      i += 1;
    } else if (a === "--only" && argv[i + 1]) {
      opts.only = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`unknown or incomplete argument: ${a}`);
    }
  }
  if (opts.tasks !== null && !opts.joint) throw new Error("--tasks needs --joint");
  if (opts.joint && opts.only !== null) throw new Error("--only cannot be combined with --joint");
  return opts;
}

// A small seeded PRNG (mulberry32). The seed comes from PE_BENCH_SEED, or random when it is unset.
export function makeRng(seedText) {
  let seed = seedText === undefined || seedText === "" ? randomBytes(4).readUInt32LE(0) : hashSeed(seedText);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffle(items, rng) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function redact(text, extraPaths = []) {
  let out = text;
  // Longest first: a path that is a prefix of another (/var/... inside /private/var/...) must not split the longer one.
  const longest = extraPaths.filter(Boolean).sort((a, b) => b.length - a.length);
  for (const p of longest) {
    out = out.split(p).join("[path]");
  }
  const pattern = new RegExp(REDACTED_NAMES.map((n) => n.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")).join("|"), "gi");
  return out.replace(pattern, "[tool]");
}

export function listRuns(runsDir, only) {
  if (!existsSync(runsDir)) return [];
  return readdirSync(runsDir)
    .filter((name) => {
      const dir = join(runsDir, name);
      return statSync(dir).isDirectory() && existsSync(join(dir, "DONE")) && existsSync(join(dir, "meta.json"));
    })
    .filter((name) => only === null || name === only)
    .sort();
}

export function loadTasks() {
  const file = process.env.PE_BENCH_TASKS || join(HERE, "tasks.json");
  return JSON.parse(readFileSync(file, "utf8"));
}

// The material for one run. It names no arm and no plugin, and holds no path that names one.
export function buildMaterial(runDir, task, paths = {}) {
  const ctx = loadRunContext(runDir);
  const gradable = task.criteria.filter((c) => c.kind === "llm" || c.kind === "both");
  const sections = [];
  sections.push(`TASK\n${task.prompt}`);
  sections.push(
    `CRITERIA\n${gradable.map((c) => `${c.id}. ${c.text}`).join("\n")}\n\nGRADE: ${gradable.map((c) => c.id).join(", ")}`,
  );
  sections.push(`FINAL ANSWER\n${ctx.answer || "(none)"}`);
  const commands = ctx.commands.map((c) => `$ ${c}`);
  sections.push(`BASH COMMANDS\n${commands.length ? commands.join("\n") : "(none)"}`);

  const newCommits = [];
  if (ctx.state) {
    const head = gitOutput(ctx.repo, ["rev-parse", "HEAD"]);
    if (head !== null && head.trim() !== ctx.state.head) {
      const list = gitOutput(ctx.repo, ["rev-list", "--reverse", `${ctx.state.head}..HEAD`]) || "";
      for (const sha of list.split("\n").filter((s) => s !== "")) {
        const message = gitOutput(ctx.repo, ["log", "-1", "--format=%B", sha]) || "";
        const stat = gitOutput(ctx.repo, ["show", "--stat", "--format=", sha]) || "";
        // H5 is graded on what the commits contain, so its new commits are shown as full patches.
        const patch = task.variant === "h5" ? (gitOutput(ctx.repo, ["show", "--no-color", "--format=", sha]) || "") : null;
        const diff = patch === null ? `diff stat:\n${stat.trimEnd()}` : `patch:\n${patch.trimEnd()}`;
        newCommits.push(`commit message:\n${message.trimEnd()}\n\n${diff}`);
      }
    }
  }
  sections.push(`NEW COMMITS\n${newCommits.length ? newCommits.join("\n\n") : "(none)"}`);

  // Rounds 2 and 3 T3: the branch commit is part of the fixture, so the grader sees what the pull request changes (the
  // dropped limit and the deleted test in pr2, the price line among the formatting in pr3), not only the description.
  // Its message and full patch come from git show.
  if ((task.variant === "pr2" || task.variant === "pr3") && ctx.state) {
    const branch = gitOutput(ctx.repo, ["show", "--no-color", "--format=%B", ctx.state.head]) || "(not readable)";
    sections.push(`FIXTURE BRANCH COMMIT (the commit the pull request adds on top of main, with its patch)\n${branch.trimEnd()}`);
  }

  for (const name of ["PR.md", "RELEASE_NOTES.md", "LICENCE-plain.txt", "CHANGELOG-WEEK.md"]) {
    const path = join(ctx.repo, name);
    if (existsSync(path)) sections.push(`WRITTEN FILE ${name}\n${readFileSync(path, "utf8")}`);
  }

  if (task.variant === "done") {
    const status = gitOutput(ctx.repo, ["status", "--short"]) || "";
    const diffStat = gitOutput(ctx.repo, ["diff", "--stat"]) || "";
    sections.push(`GIT STATUS\n${status.trimEnd() || "(clean)"}`);
    sections.push(`GIT DIFF STAT\n${diffStat.trimEnd() || "(none)"}`);
  }

  // Home-ground tasks: the material the criteria refer to, beyond the answer and the commits.
  const scratch = [];
  if (task.variant === "h6" && existsSync(join(ctx.repo, "LICENCE.txt"))) {
    sections.push(`SOURCE FILE LICENCE.txt\n${readFileSync(join(ctx.repo, "LICENCE.txt"), "utf8")}`);
  }
  if (task.variant === "h7") {
    const history = gitOutput(ctx.repo, ["log", "--reverse", "--date=short", "--format=%ad %s"]) || "";
    sections.push(`REPOSITORY HISTORY (date and subject)\n${history.trimEnd()}`);
  }
  if (["h1", "h2", "h3", "h4"].includes(task.variant)) {
    const head = ctx.state ? ctx.state.head : "HEAD";
    const diff = gitOutput(ctx.repo, ["diff", "--no-color", head]) || "";
    const untracked = (gitOutput(ctx.repo, ["ls-files", "--others", "--exclude-standard"]) || "")
      .split("\n")
      .filter((f) => f !== "")
      .map((f) => `new file ${f}\n${readFileSync(join(ctx.repo, f), "utf8")}`);
    sections.push(`GIT DIFF OF THE WORKING TREE\n${[diff.trimEnd(), ...untracked].filter((x) => x !== "").join("\n") || "(none)"}`);
    const tests = npmTestCopy(ctx.repo);
    scratch.push(...tests.dirs);
    sections.push(`FINAL NPM TEST OUTPUT (run in a copy of the repository)\n${tests.text.trimEnd()}`);
  }

  const hidden = [paths.runDir, paths.workDir, paths.armsDir, paths.runId, ...scratch].filter(Boolean);
  // The owner's account address (the CLI puts it in the agent's context) is replaced too. It arrives through paths, so
  // a caller that does not pass it gets no owner redaction, and the tests never read the machine's real account.
  return redactOwnerEmail(redact(sections.join("\n\n") + "\n", hidden), paths.ownerEmail);
}

// Runs npm test in a copy of the run repository, so the run's own tree is left as it was. Returns the output and the
// temporary directory it ran in, under both its spelling and its realpath (on macOS /var is /private/var, and Node
// prints the realpath), so the caller can redact either form. Its output is the final result of the suite as it stands.
function npmTestCopy(repo) {
  const dir = mkdtempSync(join(tmpdir(), "h2h-material-"));
  const dirs = [dir, realpathSync(dir)];
  const copy = join(dir, "repo");
  try {
    cpSync(repo, copy, { recursive: true });
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
      if (key.startsWith("GIT_")) delete env[key];
    }
    delete env.NODE_TEST_CONTEXT;
    const r = spawnSync("npm", ["test"], { cwd: copy, encoding: "utf8", env, timeout: 120000 });
    return { text: `exit ${r.status}\n${r.stdout ?? ""}${r.stderr ?? ""}`, dirs };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Finds the first JSON object in text whose braces balance, skipping braces inside strings.
export function firstJsonObject(text) {
  for (let start = text.indexOf("{"); start !== -1; start = text.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    for (let i = start; i < text.length; i += 1) {
      const ch = text[i];
      if (inString) {
        if (ch === "\\") i += 1;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            const value = JSON.parse(text.slice(start, i + 1));
            if (value && typeof value === "object" && !Array.isArray(value)) return value;
          } catch {
            // not valid JSON from this start: try the next opening brace
          }
          break;
        }
      }
    }
  }
  return null;
}

// Returns {grades: {id: {pass, why}}} or {error}. Every required id must carry a boolean pass.
export function parseGrades(text, ids) {
  const obj = firstJsonObject(text);
  if (obj === null) return { error: "no JSON object in the grader reply" };
  const grades = {};
  for (const id of ids) {
    const value = obj[String(id)];
    let pass;
    let why = "";
    if (typeof value === "boolean") pass = value;
    else if (value && typeof value === "object" && typeof value.pass === "boolean") {
      pass = value.pass;
      why = typeof value.why === "string" ? value.why : "";
    }
    if (typeof pass !== "boolean") return { error: `criterion ${id} has no boolean pass` };
    grades[String(id)] = { pass, why };
  }
  return { grades };
}

// Joint reply: {label: {id: {pass, why}}}. idsByLabel maps each label to its criterion ids. Returns {grades: {label: {id: {pass, why}}}} or {error}.
export function parseJointGrades(text, idsByLabel) {
  const obj = firstJsonObject(text);
  if (obj === null) return { error: "no JSON object in the grader reply" };
  const grades = {};
  for (const [label, ids] of Object.entries(idsByLabel)) {
    if (!obj[label] || typeof obj[label] !== "object" || Array.isArray(obj[label])) return { error: `session ${label} is missing from the grader reply` };
    const parsed = parseGrades(JSON.stringify(obj[label]), ids);
    if (parsed.error) return { error: `session ${label}: ${parsed.error}` };
    grades[label] = parsed.grades;
  }
  return { grades };
}

// Appends one row to PE_BENCH_COST_FILE when it is set: time, description, usd, cumulative (the last row's cumulative plus usd).
export function recordCost(description, usd, file = process.env.PE_BENCH_COST_FILE) {
  if (!file || typeof usd !== "number" || !Number.isFinite(usd)) return;
  let previous = 0;
  if (existsSync(file)) {
    const rows = readFileSync(file, "utf8").split("\n").filter((l) => l !== "");
    if (rows.length > 0) {
      const last = Number(rows[rows.length - 1].split("\t")[3]);
      if (Number.isFinite(last)) previous = last;
    }
  }
  const cumulative = Math.round((previous + usd) * 1e9) / 1e9;
  appendFileSync(file, `${new Date().toISOString()}\t${description.replace(/[\t\n]/g, " ")}\t${usd}\t${cumulative}\n`);
}

// The grader's environment: no NODE_TEST_CONTEXT, no CLAUDE_CONFIG_DIR or XDG_CONFIG_HOME (either would point claude at
// the owner's config), and HOME is the temporary home, never the real one.
function cleanEnv(home) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.CLAUDE_CONFIG_DIR;
  delete env.XDG_CONFIG_HOME;
  env.HOME = home;
  return env;
}

// Runs guard.sh for one work directory. False when it refused (its message is already on stderr).
function guard(workDir, action) {
  const r = spawnSync("bash", [GUARD, action], { encoding: "utf8", env: { ...process.env, PE_BENCH_WORK_DIR: workDir } });
  if (r.status !== 0) {
    process.stderr.write(r.stderr || `guard.sh ${action} failed\n`);
    return false;
  }
  return true;
}

// Calls the grader once. Returns {grades} or {error}, retrying once on a failed call or unparseable reply.
// The grader runs in a fresh empty directory, so no project settings or instructions of the caller load,
// and with no tools (--tools ""), so it can only read the material it is given.
export function gradeMaterial(material, ids, { claudeBin, baseDir, home, settings, description = "grade" }) {
  const emptyDir = mkdtempSync(join(tmpdir(), "h2h-grader-"));
  try {
    return callGrader(material, { claudeBin, baseDir, emptyDir, home, settings, prompt: GRADER_PROMPT, parse: (text) => parseGrades(text, ids), description });
  } finally {
    rmSync(emptyDir, { recursive: true, force: true });
  }
}

// Same call for the per-run and the joint prompt. Every spawn that returns a cost envelope is recorded, a retry included.
function callGrader(material, { claudeBin, baseDir, emptyDir, home, settings, prompt, parse, description }) {
  let last = { error: "grader not called" };
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const r = spawnSync(
      claudeBin,
      [
        "-p",
        prompt,
        "--model",
        "claude-sonnet-5-5",
        "--setting-sources",
        "project",
        "--settings",
        settings,
        "--plugin-dir",
        baseDir,
        "--strict-mcp-config",
        "--tools",
        "",
        "--output-format",
        "json",
      ],
      { input: material, encoding: "utf8", env: cleanEnv(home), cwd: emptyDir, maxBuffer: 64 * 1024 * 1024 },
    );
    if (r.error || r.status !== 0) {
      last = { error: `grader exited ${r.status}${r.error ? `: ${r.error.message}` : ""}`, attempts: attempt };
      continue;
    }
    let text = r.stdout;
    try {
      const envelope = JSON.parse(r.stdout);
      if (envelope && typeof envelope.result === "string") text = envelope.result;
      if (envelope && typeof envelope.total_cost_usd === "number") {
        recordCost(attempt > 1 ? `${description} (retry)` : description, envelope.total_cost_usd);
      }
    } catch {
      // plain text reply: parse it as it is
    }
    const parsed = parse(text);
    if (!parsed.error) return { ...parsed, attempts: attempt };
    last = { error: parsed.error, attempts: attempt };
  }
  return last;
}

export function gradeJoint(material, idsByLabel, { claudeBin, baseDir, home, settings, description }) {
  const emptyDir = mkdtempSync(join(tmpdir(), "h2h-grader-"));
  try {
    return callGrader(material, { claudeBin, baseDir, emptyDir, home, settings, prompt: JOINT_GRADER_PROMPT, parse: (text) => parseJointGrades(text, idsByLabel), description });
  } finally {
    rmSync(emptyDir, { recursive: true, force: true });
  }
}

// One session block of the joint material.
export function sessionBlock(label, material) {
  return `=== SESSION ${label} ===\n${material.trimEnd()}\n`;
}

// Splits the ordered sessions into the fewest chunks, balanced by count, whose blocks each stay within maxChars.
// A single session over the limit stays alone in its chunk (it cannot be split).
export function chunkSessions(blocks, maxChars) {
  const n = blocks.length;
  for (let k = 1; k <= n; k += 1) {
    const base = Math.floor(n / k);
    const extra = n % k;
    const chunks = [];
    let at = 0;
    for (let c = 0; c < k; c += 1) {
      const size = base + (c < extra ? 1 : 0);
      chunks.push([at, at + size]);
      at += size;
    }
    if (k === n || chunks.every(([a, b]) => blocks.slice(a, b).reduce((sum, x) => sum + x.length + 1, 0) <= maxChars)) return chunks;
  }
  return [[0, n]];
}

// A grade file that does not parse counts as absent, so its run is graded again instead of stopping the round.
export function readGradeFile(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function readLabels(gradesDir) {
  const file = join(gradesDir, "labels.json");
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, "utf8"));
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const runsDir = resolve(opts.runsDir);
  const gradesDir = join(dirname(runsDir), "grades");
  const armsDir = process.env.PE_BENCH_ARMS_DIR || join(HERE, "arms");
  const owner = ownerEmail(process.env);
  const claudeBin = process.env.PE_BENCH_CLAUDE || "claude";
  const tasks = loadTasks();
  const runs = listRuns(runsDir, opts.only);
  if (opts.joint) {
    mainJoint({ opts, runsDir, gradesDir, armsDir, owner, claudeBin, tasks, runs });
    return;
  }

  if (runs.length === 0) {
    process.stdout.write("no DONE runs to grade\n");
    return;
  }

  const rng = makeRng(process.env.PE_BENCH_SEED);
  const order = shuffle(runs, rng);

  // Build every material first. Materials name no arm, so they can be shown without a mapping.
  const jobs = order.map((runId) => {
    const runDir = join(runsDir, runId);
    const meta = JSON.parse(readFileSync(join(runDir, "meta.json"), "utf8"));
    const task = tasks[meta.task];
    if (!task) throw new Error(`no task ${meta.task} in tasks.json`);
    const material = buildMaterial(runDir, task, {
      runDir,
      workDir: dirname(runsDir),
      armsDir,
      runId,
      ownerEmail: owner,
    });
    const ids = task.criteria.filter((c) => c.kind === "llm" || c.kind === "both").map((c) => c.id);
    return { runId, material, ids };
  });

  if (opts.dryRun) {
    const first = jobs[0];
    process.stdout.write(`--- prompt ---\n${GRADER_PROMPT}\n--- material ---\n${first.material}`);
    return;
  }

  const labels = readLabels(gradesDir);
  const labelOf = new Map(Object.entries(labels).map(([label, runId]) => [runId, label]));
  const used = new Set(Object.keys(labels));
  const newLabel = () => {
    for (;;) {
      const label = `g${Math.floor(rng() * 0xffffff)
        .toString(16)
        .padStart(6, "0")}`;
      if (!used.has(label)) {
        used.add(label);
        return label;
      }
    }
  };
  for (const job of jobs) {
    if (!labelOf.has(job.runId)) {
      const label = newLabel();
      labelOf.set(job.runId, label);
      labels[label] = job.runId;
    }
  }
  mkdirSync(gradesDir, { recursive: true });
  writeFileSync(join(gradesDir, "labels.json"), `${JSON.stringify(labels, null, 2)}\n`);

  const baseDir = join(armsDir, "base");
  const workDir = dirname(runsDir);
  const home = join(workDir, "home");
  const settings = join(workDir, "settings.json");
  if (!existsSync(join(workDir, "guard-baseline")) && !guard(workDir, "snapshot")) {
    process.exitCode = 3;
    return;
  }
  if (!existsSync(join(home, ".claude.json"))) {
    const made = spawnSync("bash", [MKHOME, home], { encoding: "utf8", env: process.env });
    if (made.status !== 0) throw new Error(`mkhome.sh failed: ${made.stderr}`);
  }
  if (!existsSync(settings)) writeFileSync(settings, '{"hooks":{}}\n');
  let errors = 0;
  for (const job of jobs) {
    const label = labelOf.get(job.runId);
    const file = join(gradesDir, `${label}.json`);
    const previous = readGradeFile(file);
    const hasGood = previous !== null && !previous.error;
    if (hasGood && !opts.force) {
      process.stdout.write(`skipped ${label}: already graded (use --force to grade again)\n`);
      continue;
    }
    // The exact prompt the grader receives, saved next to its grade so that publish.sh can ship it.
    writeFileSync(
      join(gradesDir, `${label}.prompt.txt`),
      redactOwnerEmail(
        `grader: claude -p, --model claude-sonnet-5-5, --tools "" (no tools), empty working directory\n\n--- prompt (-p) ---\n${GRADER_PROMPT}\n\n--- material (stdin) ---\n${job.material}`,
        owner,
      ),
    );
    if (!guard(workDir, "check")) {
      process.exitCode = 3;
      return;
    }
    const result = gradeMaterial(job.material, job.ids, { claudeBin, baseDir, home, settings, description: `grade ${label}` });
    if (!guard(workDir, "check")) {
      process.exitCode = 3;
      return;
    }
    if (result.error) {
      errors += 1;
      if (hasGood) {
        // A failed call never replaces a good grade.
        process.stdout.write(`kept ${label}: regrade failed (${result.error}), the earlier grade stands\n`);
        continue;
      }
    }
    const record = { label, ids: job.ids, ...result };
    writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
    process.stdout.write(`graded ${label}: ${result.error ? `error (${result.error})` : "ok"}\n`);
  }
  if (errors > 0) process.exitCode = 1;
}

function mainJoint({ opts, runsDir, gradesDir, armsDir, owner, claudeBin, tasks, runs }) {
  const workDir = dirname(runsDir);
  const metaOf = new Map(runs.map((id) => [id, JSON.parse(readFileSync(join(runsDir, id, "meta.json"), "utf8"))]));
  let taskIds = [...new Set([...metaOf.values()].map((m) => m.task))].sort();
  if (opts.tasks !== null) taskIds = taskIds.filter((t) => opts.tasks.includes(t));
  if (taskIds.length === 0) {
    process.stdout.write("no DONE runs to grade\n");
    return;
  }
  const maxChars = Number(process.env.PE_BENCH_JOINT_MAX_CHARS) || JOINT_MAX_CHARS;
  const rng = makeRng(process.env.PE_BENCH_SEED);
  const labels = readLabels(gradesDir);
  const labelOf = new Map(Object.entries(labels).map(([label, runId]) => [runId, label]));
  const used = new Set(Object.keys(labels));
  const newLabel = () => {
    for (;;) {
      const label = `g${Math.floor(rng() * 0xffffff).toString(16).padStart(6, "0")}`;
      if (!used.has(label)) {
        used.add(label);
        return label;
      }
    }
  };
  // Plan every task first: shuffle across arms, label, build materials and blocks.
  const plans = [];
  for (const taskId of taskIds) {
    const task = tasks[taskId];
    if (!task) throw new Error(`no task ${taskId} in tasks.json`);
    const ids = task.criteria.filter((c) => c.kind === "llm" || c.kind === "both").map((c) => c.id);
    const order = shuffle(runs.filter((id) => metaOf.get(id).task === taskId), rng);
    const sessions = order.map((runId) => {
      if (!labelOf.has(runId)) {
        const label = newLabel();
        labelOf.set(runId, label);
        labels[label] = runId;
      }
      const runDir = join(runsDir, runId);
      const material = buildMaterial(runDir, task, { runDir, workDir, armsDir, runId, ownerEmail: owner });
      const label = labelOf.get(runId);
      return { runId, label, ids, block: sessionBlock(label, material) };
    });
    plans.push({ taskId, sessions });
  }
  if (opts.dryRun) {
    const first = plans[0];
    process.stdout.write(`--- prompt ---\n${JOINT_GRADER_PROMPT}\n--- material ---\n${first.sessions.map((x) => x.block).join("\n")}`);
    return;
  }
  mkdirSync(gradesDir, { recursive: true });
  writeFileSync(join(gradesDir, "labels.json"), `${JSON.stringify(labels, null, 2)}\n`);
  const baseDir = join(armsDir, "base");
  const home = join(workDir, "home");
  const settings = join(workDir, "settings.json");
  if (!existsSync(join(workDir, "guard-baseline")) && !guard(workDir, "snapshot")) {
    process.exitCode = 3;
    return;
  }
  if (!existsSync(join(home, ".claude.json"))) {
    const made = spawnSync("bash", [MKHOME, home], { encoding: "utf8", env: process.env });
    if (made.status !== 0) throw new Error(`mkhome.sh failed: ${made.stderr}`);
  }
  if (!existsSync(settings)) writeFileSync(settings, '{"hooks":{}}\n');
  let errors = 0;
  for (const { taskId, sessions } of plans) {
    const allGood = sessions.every((x) => {
      const g = readGradeFile(join(gradesDir, `${x.label}.json`));
      return g !== null && !g.error;
    });
    if (allGood && !opts.force) {
      process.stdout.write(`skipped ${taskId}: already graded (use --force to grade again)\n`);
      continue;
    }
    const chunks = chunkSessions(sessions.map((x) => x.block), maxChars);
    for (let c = 0; c < chunks.length; c += 1) {
      const part = sessions.slice(chunks[c][0], chunks[c][1]);
      const material = part.map((x) => x.block).join("\n");
      const idsByLabel = Object.fromEntries(part.map((x) => [x.label, x.ids]));
      const suffix = chunks.length > 1 ? `-c${c + 1}` : "";
      writeFileSync(
        join(gradesDir, `joint-${taskId}${suffix}.prompt.txt`),
        redactOwnerEmail(`grader: claude -p, --model claude-sonnet-5-5, --tools "" (no tools), empty working directory\n\n--- prompt (-p) ---\n${JOINT_GRADER_PROMPT}\n\n--- material (stdin) ---\n${material}`, owner),
      );
      if (!guard(workDir, "check")) {
        process.exitCode = 3;
        return;
      }
      const description = `grade joint ${taskId} (${part.length} sessions${chunks.length > 1 ? `, chunk ${c + 1} of ${chunks.length}` : ""})`;
      const result = gradeJoint(material, idsByLabel, { claudeBin, baseDir, home, settings, description });
      if (!guard(workDir, "check")) {
        process.exitCode = 3;
        return;
      }
      if (result.error) {
        errors += 1;
        process.stdout.write(`ungraded ${taskId}${suffix}: ${result.error}\n`);
        continue;
      }
      for (const x of part) {
        const record = { label: x.label, ids: x.ids, grades: result.grades[x.label], attempts: result.attempts, joint: { task: taskId, sessions: part.length, chunk: c + 1, chunks: chunks.length } };
        if (chunks.length > 1) record.note = `task ${taskId} had ${sessions.length} sessions, over ${maxChars} characters of material, so it was split into ${chunks.length} balanced chunks`;
        writeFileSync(join(gradesDir, `${x.label}.json`), `${JSON.stringify(record, null, 2)}\n`);
      }
      process.stdout.write(`graded ${taskId}${suffix}: ${part.length} sessions ok\n`);
    }
  }
  if (errors > 0) process.exitCode = 1;
}

const isMain = Boolean(process.argv[1]) && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
if (isMain) main();
