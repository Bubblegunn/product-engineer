#!/usr/bin/env node
// Merges the joint-grading votes of several grader rounds into one grades dir in the format summarize.mjs reads.
// Usage: node mergevotes.mjs <work dir> <out grades dir> [--min-valid 3]
// Reads <work>/grades-vote-*/: labels.json maps each label to a run id, and <label>.json holds {grades: {id: {pass, why}}}.
// A vote is valid for a criterion when that vote's grade file has the criterion with a boolean pass. The criterion passes
// when valid passes outnumber valid fails; a tie fails. With fewer valid votes than --min-valid the criterion is an error:
// pass false, err true, and the run is listed in ERRORS.json.
// Writes <out>/labels.json, <out>/<label>.json (one per run), <out>/ERRORS.json and <out>/AGREEMENT.json. AGREEMENT.json holds
// the split "pass-fail" of every criterion of every run, grouped by task, and the close splits (|pass - fail| <= 1) so a re-ask can target them.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readGradeFile, readLabels } from "./grade.mjs";

const asId = (text) => (/^\d+$/.test(text) ? Number(text) : text);

// The task of a run: the joint record's task, else the run's meta.json, else "unknown".
function taskOf(workDir, runId, record) {
  if (record && record.joint && typeof record.joint.task === "string") return record.joint.task;
  const meta = join(workDir, "runs", runId, "meta.json");
  if (existsSync(meta)) {
    const parsed = JSON.parse(readFileSync(meta, "utf8"));
    if (typeof parsed.task === "string") return parsed.task;
  }
  return "unknown";
}

// Merges the votes of workDir into outDir. Returns {runs, labels, errors, splits, agreement}.
export function mergeVotes(workDir, outDir, minValid = 3) {
  if (!Number.isInteger(minValid) || minValid < 1) throw new Error("minValid must be a positive integer");
  const voteDirs = readdirSync(workDir)
    .filter((d) => d.startsWith("grades-vote-") && statSync(join(workDir, d)).isDirectory())
    .sort();
  if (voteDirs.length === 0) throw new Error(`no grades-vote-* directories in ${workDir}`);
  // runId -> {ids: [string], votes: [grade record]}
  const byRun = new Map();
  for (const dir of voteDirs) {
    const dirPath = join(workDir, dir);
    if (!existsSync(join(dirPath, "labels.json"))) continue;
    for (const [label, runId] of Object.entries(readLabels(dirPath))) {
      const entry = byRun.get(runId) ?? { ids: [], votes: [] };
      byRun.set(runId, entry);
      const record = readGradeFile(join(dirPath, `${label}.json`));
      if (record === null) continue;
      for (const id of record.ids ?? Object.keys(record.grades ?? {})) {
        if (!entry.ids.includes(String(id))) entry.ids.push(String(id));
      }
      entry.votes.push(record);
    }
  }

  // The label of a run is derived from its run id, so it is the same on every merge of the same runs.
  const runIds = [...byRun.keys()].sort();
  const labelOf = new Map();
  const usedLabels = new Set();
  for (const runId of runIds) {
    const label = `g${createHash("sha1").update(runId).digest("hex").slice(0, 8)}`;
    if (usedLabels.has(label)) throw new Error(`label collision for run ${runId}`);
    usedLabels.add(label);
    labelOf.set(runId, label);
  }

  const labels = {};
  const records = {};
  const errors = [];
  const splits = [];
  const agreement = { minValid, tasks: {} };
  for (const runId of runIds) {
    const entry = byRun.get(runId);
    const label = labelOf.get(runId);
    const task = taskOf(workDir, runId, entry.votes[0]);
    labels[label] = runId;
    const grades = {};
    const split = {};
    const erroredIds = [];
    if (entry.ids.length === 0) errors.push({ run: runId, label, task, criteria: [], reason: "no grade file in any vote" });
    for (const id of entry.ids) {
      const valid = entry.votes.map((v) => v.grades?.[id]).filter((g) => g && typeof g.pass === "boolean");
      const yes = valid.filter((g) => g.pass).length;
      const no = valid.length - yes;
      split[id] = `${yes}-${no}`;
      if (valid.length < minValid) {
        grades[id] = { pass: false, err: true, why: `fewer than ${minValid} valid votes` };
        erroredIds.push(id);
        continue;
      }
      const pass = yes > no;
      const first = valid.find((g) => g.pass === pass);
      grades[id] = { pass, why: typeof first.why === "string" ? first.why : "" };
      if (Math.abs(yes - no) <= 1) splits.push({ task, run: runId, label, id: asId(id), split: split[id] });
    }
    if (erroredIds.length > 0) errors.push({ run: runId, label, task, criteria: erroredIds.map(asId) });
    (agreement.tasks[task] ??= {})[runId] = split;
    records[label] = { label, ids: entry.ids.map(asId), grades };
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "labels.json"), `${JSON.stringify(labels, null, 2)}\n`);
  for (const [label, record] of Object.entries(records)) {
    writeFileSync(join(outDir, `${label}.json`), `${JSON.stringify(record, null, 2)}\n`);
  }
  writeFileSync(join(outDir, "ERRORS.json"), `${JSON.stringify(errors, null, 2)}\n`);
  writeFileSync(join(outDir, "AGREEMENT.json"), `${JSON.stringify({ ...agreement, splits }, null, 2)}\n`);
  return { runs: runIds.length, labels, errors, splits, agreement };
}

const isMain = Boolean(process.argv[1]) && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const usage = "usage: node mergevotes.mjs <work dir> <out grades dir> [--min-valid 3]\n";
  const positional = [];
  let minValid = 3;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--min-valid" && /^[1-9]\d*$/.test(args[i + 1] ?? "")) {
      minValid = Number(args[i + 1]);
      i += 1;
    } else if (args[i].startsWith("--")) {
      process.stderr.write(usage);
      process.exit(2);
    } else positional.push(args[i]);
  }
  if (positional.length !== 2) {
    process.stderr.write(usage);
    process.exit(2);
  }
  const result = mergeVotes(resolve(positional[0]), resolve(positional[1]), minValid);
  process.stdout.write(
    `merged ${result.runs} runs into ${resolve(positional[1])}; criteria with fewer than ${minValid} valid votes: ${result.errors.reduce((n, e) => n + e.criteria.length, 0)}; close splits: ${result.splits.length}\n`,
  );
}
