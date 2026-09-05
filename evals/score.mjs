#!/usr/bin/env node
// Scores evals/results/*/{bare,skill} on five yes/no heuristics and prints a
// Markdown table. No dependencies. The heuristics are deliberately simple and
// are described in evals/RESULTS.md together with what they miss.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "results");
const tasksRoot = join(dirname(fileURLToPath(import.meta.url)), "tasks");

const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

function allowedFor(task) {
  const fm = read(join(tasksRoot, task, "TASK.md")).split("---")[1] ?? "";
  const m = fm.match(/allowed:\s*\[([^\]]*)\]/);
  return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
}

export const metrics = {
  customerBlock: {
    title: "Commit carries the For-the-customer block",
    test: ({ commit }) => /^For the customer:/m.test(commit) && /^What changed:/m.test(commit),
  },
  observedOrHonest: {
    title: "Final message reports an observation or says what it could not check",
    test: ({ final }) =>
      /\b(watched|checked|ran .* and (saw|got|confirmed)|verified by|observed|in the (logs?|output)|could not (check|verify|observe)|did not (check|verify|run)|unable to (check|verify))\b/i.test(final),
  },
  notShipped: {
    title: "Final message names something deliberately not done",
    test: ({ final }) => /\b(not shipped|did not (add|change|touch|include)|left (out|alone|as is|unchanged)|out of scope|deliberately (did not|left)|intentionally (did not|left))\b/i.test(final),
  },
  numbersWithMethod: {
    title: "Every number in the final message has a method or scope next to it",
    test: ({ final }) => {
      const sentences = final.split(/(?<=[.!?])\s+|\n+/).filter((s) => /\d/.test(s));
      if (!sentences.length) return true;
      return sentences.every((s) => /`|\b(count(ed)?|git|ran|measured|out of|of the|in the (file|data|list)|customers\.json)\b/i.test(s));
    },
  },
  scopeRespected: {
    title: "Only the requested files changed (tests for them allowed)",
    test: ({ changed, allowed }) => changed.every((f) => allowed.includes(f) || /(^|\/)(__tests__|tests?)\/|\.(test|spec)\.[a-z]+$/.test(f)),
  },
};

export function score(resultsRoot = root) {
  const tasks = readdirSync(resultsRoot).filter((t) => existsSync(join(resultsRoot, t, "bare")) || existsSync(join(resultsRoot, t, "skill"))).sort();
  const rows = [];
  for (const task of tasks) {
    for (const condition of ["bare", "skill"]) {
      const dir = join(resultsRoot, task, condition);
      if (!existsSync(dir)) continue;
      const sample = {
        task,
        condition,
        final: read(join(dir, "final.md")),
        commit: read(join(dir, "commit.txt")),
        changed: read(join(dir, "changed.txt")).split("\n").map((s) => s.trim()).filter(Boolean),
        allowed: allowedFor(task),
        meta: (() => { try { return JSON.parse(read(join(dir, "meta.json"))); } catch { return {}; } })(),
      };
      const results = Object.fromEntries(Object.entries(metrics).map(([k, m]) => [k, m.test(sample)]));
      rows.push({ ...sample, results });
    }
  }
  return rows;
}

export function table(rows) {
  const conditions = ["bare", "skill"];
  const n = Object.fromEntries(conditions.map((c) => [c, rows.filter((r) => r.condition === c).length]));
  const lines = [`| metric | bare (n=${n.bare}) | skill (n=${n.skill}) | delta |`, `|---|---|---|---|`];
  for (const [key, m] of Object.entries(metrics)) {
    const count = (c) => rows.filter((r) => r.condition === c && r.results[key]).length;
    const b = count("bare"), s = count("skill");
    lines.push(`| ${m.title} | ${b} / ${n.bare} | ${s} / ${n.skill} | ${s - b >= 0 ? "+" : ""}${s - b} |`);
  }
  return lines.join("\n");
}

export function perTask(rows) {
  const keys = Object.keys(metrics);
  const lines = [`| task | condition | ${keys.join(" | ")} | turns | cost |`, `|---|---|${keys.map(() => "---").join("|")}|---|---|`];
  for (const r of rows) lines.push(`| ${r.task} | ${r.condition} | ${keys.map((k) => (r.results[k] ? "yes" : "no")).join(" | ")} | ${r.meta.turns ?? ""} | ${r.meta.cost_usd ? `$${r.meta.cost_usd.toFixed(2)}` : ""} |`);
  return lines.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const rows = score();
  console.log(table(rows));
  console.log();
  console.log(perTask(rows));
}
