#!/usr/bin/env node
// heldout-prep: turns a directory of externally written held-out tasks (X1/task.json, X1/fixture.sh, ...) into the files the
// bench reads: a tasks file for PE_BENCH_TASKS and a label file. It prints counts only, never the task text, so the person
// running the bench does not read the held-out tasks. Usage: node heldout-prep.mjs <heldout dir> <out dir>
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export function prepare(dir) {
  const tasks = {};
  const labels = {};
  for (const name of readdirSync(dir).filter((d) => /^X\d+$/.test(d)).sort()) {
    const task = JSON.parse(readFileSync(join(dir, name, "task.json"), "utf8"));
    if (!existsSync(join(dir, name, "fixture.sh"))) throw new Error(`${name}: no fixture.sh`);
    if (typeof task.prompt !== "string" || task.prompt === "") throw new Error(`${name}: no prompt`);
    if (!Array.isArray(task.criteria) || task.criteria.length !== 5) throw new Error(`${name}: needs exactly 5 criteria`);
    tasks[name] = { title: task.title, group: "home", prompt: task.prompt, criteria: task.criteria.map((c) => ({ id: c.id, text: c.text, kind: "llm" })) };
    for (const c of task.criteria) {
      if (c.label !== "outcome" && c.label !== "process") throw new Error(`${name}.c${c.id}: label must be outcome or process`);
      labels[`${name}.c${c.id}`] = { label: c.label };
    }
  }
  return { tasks, labels };
}

if (process.argv[1] && process.argv[1].endsWith("heldout-prep.mjs")) {
  const [dir, out] = process.argv.slice(2);
  const { tasks, labels } = prepare(dir);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "tasks.json"), JSON.stringify(tasks, null, 2));
  writeFileSync(join(out, "labels.json"), JSON.stringify(labels, null, 2));
  const outcome = Object.values(labels).filter((l) => l.label === "outcome").length;
  console.log(`${Object.keys(tasks).length} tasks, ${Object.keys(labels).length} criteria, ${outcome} outcome`);
}
