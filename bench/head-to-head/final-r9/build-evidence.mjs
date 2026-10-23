#!/usr/bin/env node
// Builds the published evidence folder of one round set from a work directory: per-cell answer, trace and cost, the merged
// grades, the task and label files, cells.csv (the scores, same cell scoring as final-score.mjs) and cost.csv (the dollar
// costs). Every text file it writes is redacted; the output is then scanned for leaks and the build exits 1 when one remains.
// Usage: node build-evidence.mjs --set <name> --work <work dir> --tasks <tasks.json> --labels <labels.json> --out <dir>
//          [--fixtures <dir>]
// <work dir> holds runs/ (DONE runs), grades/ (merged grades of mergevotes.mjs) and grades-vote-*/. The --fixtures dir is
// copied verbatim (not redacted); the leak scan covers it too.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collectRuns, isOutcome, loadCriterionLabels, outcomeScore } from "../summarize.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ARMS_FILE = join(HERE, "..", "arms.json");
export const FILE_LIMIT = 100 * 1024;
export const TRACE_LINE_LIMIT = 300;
const CELL_HEADER = "set,task,arm,rep,outcome_score,outcome_max,process_score";
const COST_HEADER = "task,arm,rep,usd,turns,duration_ms";
const LEAK_PATTERNS = ["/Users/", "@gmail", "sk-ant"];

const TOKEN = /\b(?:sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|xox[abprs]-[A-Za-z0-9-]{8,})/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// Replaces the work directory with <WORK> (and any other /private/tmp path), /Users/<name> with <HOME>, e-mail addresses with
// user@example.com and token-shaped strings with <redacted-token>.
export function redactText(text, work) {
  let out = text;
  const roots = [...new Set([resolve(work), existsSync(work) ? realpathSync(work) : resolve(work)])].sort((a, b) => b.length - a.length);
  for (const root of roots) out = out.split(root).join("<WORK>");
  out = out.replace(/\/private\/tmp\/[^\s"'`<>()[\]{},;]*/g, "<WORK>");
  out = out.replace(/\/Users\/[^\s"'`<>()[\]{},;/]+/g, "<HOME>");
  out = out.replace(EMAIL, "user@example.com");
  out = out.replace(TOKEN, "<redacted-token>");
  return out;
}

const csvField = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function readEvents(runDir) {
  const file = join(runDir, "out.jsonl");
  if (!existsSync(file)) return [];
  const events = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    try {
      const value = JSON.parse(line);
      if (value && typeof value === "object") events.push(value);
    } catch {
      // a line that is not JSON is skipped, as objective.mjs does
    }
  }
  return events;
}

// One trace line per tool_use of the assistant, and one per hook response. Lines are capped at TRACE_LINE_LIMIT characters.
export function traceLines(events) {
  const lines = [];
  let n = 0;
  for (const e of events) {
    if (e.type === "assistant" && Array.isArray(e.message?.content)) {
      for (const block of e.message.content) {
        if (!block || block.type !== "tool_use") continue;
        n += 1;
        const input = block.input ?? {};
        const detail = input.command ?? input.file_path ?? input.path ?? input.pattern ?? input.skill ?? input.url ?? "";
        const text = `${String(n).padStart(3, "0")} ${block.name} ${String(detail).replace(/\r?\n/g, "\\n")}`;
        lines.push(text.slice(0, TRACE_LINE_LIMIT));
      }
    } else if (e.type === "system" && e.subtype === "hook_response") {
      lines.push(`HOOK ${e.hook_name ?? "?"} exit=${e.exit_code ?? "?"} outcome=${e.outcome ?? "?"}`.slice(0, TRACE_LINE_LIMIT));
    }
  }
  return lines;
}

// Files for files/: RELEASE_NOTES.md, PR.md and the root *.md files the agent created or changed (git status, untracked or modified).
export function reportFiles(repo) {
  if (!existsSync(repo)) return [];
  const names = new Set(["RELEASE_NOTES.md", "PR.md"].filter((f) => existsSync(join(repo, f))));
  // Without its own .git, git would report the enclosing repository, so nothing else is listed.
  if (!existsSync(join(repo, ".git"))) return [...names].sort();
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));
  const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: repo, env, encoding: "utf8" });
  for (const line of status.split("\n")) {
    if (line.length < 4) continue;
    const code = line.slice(0, 2);
    const path = line.slice(3);
    if (!path.includes("/") && path.endsWith(".md") && (code === "??" || code.includes("M")) && existsSync(join(repo, path))) {
      names.add(path);
    }
  }
  return [...names].sort();
}

function isText(buffer) {
  return !buffer.includes(0);
}

// Copies a tree. With work, every text file is redacted; without it the copy is verbatim.
function copyTree(src, dst, work) {
  mkdirSync(dst, { recursive: true });
  for (const name of readdirSync(src).sort()) {
    const from = join(src, name);
    const to = join(dst, name);
    if (statSync(from).isDirectory()) {
      copyTree(from, to, work);
    } else if (work === null) {
      cpSync(from, to);
    } else {
      const buffer = readFileSync(from);
      if (isText(buffer)) writeFileSync(to, redactText(buffer.toString("utf8"), work));
      else writeFileSync(to, buffer);
    }
  }
}

// Every file under dir whose text contains a leak pattern, as paths relative to dir.
export function leakScan(dir) {
  const hits = [];
  const walk = (current) => {
    for (const name of readdirSync(current).sort()) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      const buffer = readFileSync(full);
      if (!isText(buffer)) continue;
      const text = buffer.toString("utf8");
      if (LEAK_PATTERNS.some((p) => text.includes(p))) hits.push(full.slice(dir.length + 1));
    }
  };
  walk(dir);
  return hits;
}

function sizeOf(dir) {
  let bytes = 0;
  let files = 0;
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) walk(full);
      else {
        bytes += statSync(full).size;
        files += 1;
      }
    }
  };
  walk(dir);
  return { bytes, files };
}

// Builds the evidence folder and returns the counts. Throws on bad input. The leak scan is run by the CLI after this returns.
export function buildEvidence({ set, work, tasksFile, labelsFile, out, fixtures = null }) {
  if (!set) throw new Error("--set is required");
  if (existsSync(out) && readdirSync(out).length > 0) throw new Error(`${out} exists and is not empty; remove it first`);
  const tasks = readJson(tasksFile);
  const labels = loadCriterionLabels(labelsFile);
  const runsDir = join(work, "runs");
  const gradesDir = join(work, "grades");
  const runs = collectRuns(runsDir, gradesDir, tasks, labels);
  mkdirSync(out, { recursive: true });

  const cellRows = [];
  const costRows = [];
  const byCell = (a, b) => a.task.localeCompare(b.task) || a.arm.localeCompare(b.arm) || Number(readJson(join(runsDir, a.id, "meta.json")).rep) - Number(readJson(join(runsDir, b.id, "meta.json")).rep);
  for (const run of [...runs].sort(byCell)) {
    const runDir = join(runsDir, run.id);
    const meta = readJson(join(runDir, "meta.json"));
    const rep = Number(meta.rep);
    const events = readEvents(runDir);
    const result = [...events].reverse().find((e) => e.type === "result");
    if (!result) throw new Error(`no result event in run ${run.id}`);
    const target = join(out, "runs", run.task, run.arm, String(rep));
    mkdirSync(target, { recursive: true });
    const usage = result.usage ?? {};
    const cost = {
      total_cost_usd: result.total_cost_usd ?? null,
      num_turns: result.num_turns ?? null,
      duration_ms: result.duration_ms ?? null,
      input_tokens: usage.input_tokens ?? null,
      output_tokens: usage.output_tokens ?? null,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? null,
      cache_creation_input_tokens: usage.cache_creation_input_tokens ?? null,
      model: meta.model ?? null,
      claude_code_version: meta.claude_version ?? null,
    };
    writeFileSync(join(target, "answer.md"), redactText(typeof result.result === "string" ? result.result : "", work));
    writeFileSync(join(target, "trace.txt"), redactText(`${traceLines([...events]).join("\n")}\n`, work));
    writeFileSync(join(target, "cost.json"), redactText(`${JSON.stringify(cost, null, 2)}\n`, work));
    const repo = join(runDir, "repo");
    for (const name of reportFiles(repo)) {
      const buffer = readFileSync(join(repo, name));
      const clipped = buffer.length > FILE_LIMIT ? Buffer.concat([buffer.subarray(0, FILE_LIMIT), Buffer.from("\n[truncated at 100 KB]\n")]) : buffer;
      mkdirSync(join(target, "files"), { recursive: true });
      writeFileSync(join(target, "files", name), isText(clipped) ? redactText(clipped.toString("utf8"), work) : clipped);
    }

    const outcomeMax = run.criteria.filter(isOutcome).length;
    const processScore = run.criteria.filter((c) => c.pass && !isOutcome(c)).length;
    cellRows.push({ task: run.task, arm: run.arm, rep, outcome: outcomeScore(run), max: outcomeMax, process: processScore });
    costRows.push({ task: run.task, arm: run.arm, rep, usd: cost.total_cost_usd, turns: cost.num_turns, duration: cost.duration_ms });
  }

  const cellsCsv = [CELL_HEADER, ...cellRows.map((r) => [set, r.task, r.arm, r.rep, r.outcome, r.max, r.process].map(csvField).join(","))];
  const costCsv = [COST_HEADER, ...costRows.map((r) => [r.task, r.arm, r.rep, r.usd, r.turns, r.duration].map(csvField).join(","))];
  writeFileSync(join(out, "cells.csv"), redactText(`${cellsCsv.join("\n")}\n`, work));
  writeFileSync(join(out, "cost.csv"), redactText(`${costCsv.join("\n")}\n`, work));

  for (const entry of readdirSync(work).sort()) {
    const full = join(work, entry);
    if (entry.startsWith("grades-vote-") && statSync(full).isDirectory()) copyTree(full, join(out, entry), work);
  }
  if (existsSync(gradesDir)) copyTree(gradesDir, join(out, "grades"), work);
  for (const [src, name] of [[tasksFile, "tasks.json"], [labelsFile, "labels.json"], [ARMS_FILE, "arms.json"]]) {
    writeFileSync(join(out, name), redactText(readFileSync(src, "utf8"), work));
  }
  if (fixtures !== null) copyTree(resolve(fixtures), join(out, "fixtures"), null);

  const { bytes, files } = sizeOf(out);
  return { runs: runs.length, cells: cellRows.length, costs: costRows.length, files, bytes, out };
}

const isMain = Boolean(process.argv[1]) && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const keys = { "--set": "set", "--work": "work", "--tasks": "tasks", "--labels": "labels", "--out": "out", "--fixtures": "fixtures" };
  const opts = {};
  for (let i = 0; i < args.length; i += 1) {
    if (keys[args[i]] && args[i + 1] !== undefined) {
      opts[keys[args[i]]] = args[i + 1];
      i += 1;
    } else {
      process.stderr.write("usage: node build-evidence.mjs --set <name> --work <dir> --tasks <tasks.json> --labels <labels.json> --out <dir> [--fixtures <dir>]\n");
      process.exit(2);
    }
  }
  for (const required of ["set", "work", "tasks", "labels", "out"]) {
    if (!opts[required]) {
      process.stderr.write(`build-evidence.mjs: --${required} is required\n`);
      process.exit(2);
    }
  }
  const result = buildEvidence({
    set: opts.set,
    work: resolve(opts.work),
    tasksFile: resolve(opts.tasks),
    labelsFile: resolve(opts.labels),
    out: resolve(opts.out),
    fixtures: opts.fixtures ?? null,
  });
  process.stdout.write(
    `built ${result.out}: ${result.runs} DONE runs, ${result.cells} cells, ${result.files} files, ${(result.bytes / 1024).toFixed(1)} KB\n`,
  );
  // The leak scan runs on the output after writing, so a single missed pattern in the code fails the build.
  const leaks = leakScan(result.out);
  if (leaks.length > 0) {
    process.stderr.write(`leak scan: ${leaks.length} file(s) still match ${LEAK_PATTERNS.join(", ")}:\n${leaks.map((f) => `  ${f}`).join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write("leak scan: clean\n");
}
