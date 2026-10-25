#!/usr/bin/env node
// product-engineer pre-edit: a PreToolUse hook for Edit, MultiEdit and Write. Before the first edit that replaces a value
// or takes a name away, it searches the repository for what the edit will leave behind and hands the result to the agent
// as context: lines with the same shape as a removed line (twins), old values still written elsewhere, and other uses of a
// name the edit removes. The search runs before the write, so the agent edits those places in the same pass instead of
// being asked to go back after it has written its answer. It never blocks and never denies; it adds context or says nothing.
//
// Reads { session_id, cwd, tool_name, tool_input } on standard input. PRODUCT_ENGINEER_NO_GATE=1 turns it off.
// Each candidate is reported once per session. No model, no network.
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { isLockPath } from "./diff.mjs";
import { previewEdit } from "./twins.mjs";

const MAX_REPORTS = 6;
const MAX_ITEMS = 8;
const MAX_TEXT = 90;
const MAX_WRITE_LINES = 4000;

const clip = (s, n = MAX_TEXT) => {
  const t = String(s).trim();
  return t.length > n ? `${t.slice(0, n - 3)}...` : t;
};

const stateFile = (sid) => join(tmpdir(), `product-engineer-preedit-${sid}.json`);
function readState(sid) {
  try {
    const s = JSON.parse(readFileSync(stateFile(sid), "utf8"));
    return { reports: Number.isFinite(s.reports) ? s.reports : 0, seen: Array.isArray(s.seen) ? s.seen.filter((x) => typeof x === "string") : [] };
  } catch {
    return { reports: 0, seen: [] };
  }
}
const writeState = (sid, state) => {
  try { writeFileSync(stateFile(sid), JSON.stringify(state)); } catch { /* the state only bounds the output */ }
};

/** Lines of `before` that `after` does not have (as a multiset of trimmed lines), in order. */
export function lineDiff(before, after) {
  const counts = new Map();
  for (const l of after) counts.set(l.trim(), (counts.get(l.trim()) ?? 0) + 1);
  const out = [];
  for (const l of before) {
    const k = l.trim();
    const n = counts.get(k) ?? 0;
    if (n > 0) counts.set(k, n - 1);
    else out.push(l);
  }
  return out;
}

const split = (text) => String(text ?? "").split("\n");

/** The text after one edit is applied, or null when old_string is not in the text. */
function applyEdit(text, edit) {
  const old = String(edit?.old_string ?? "");
  if (old === "") return null;
  if (!text.includes(old)) return null;
  const next = String(edit?.new_string ?? "");
  return edit?.replace_all ? text.split(old).join(next) : text.replace(old, () => next);
}

/**
 * The removed and added whole lines of one tool call, as the file will differ after it, or null when it replaces nothing in
 * an existing file. An edit names a fragment of a line; the lines are computed on the whole file, so they match what a
 * diff of the finished edit shows.
 */
export function editLines(toolName, input, readFile = (p) => readFileSync(p, "utf8")) {
  let existing;
  try { existing = readFile(input.file_path); } catch { existing = null; }
  const fragments = () => {
    const edits = toolName === "Edit" ? [input] : toolName === "MultiEdit" && Array.isArray(input.edits) ? input.edits : [];
    const removed = [];
    const added = [];
    for (const e of edits) {
      removed.push(...lineDiff(split(e?.old_string), split(e?.new_string)));
      added.push(...lineDiff(split(e?.new_string), split(e?.old_string)));
    }
    return { removed, added };
  };
  if (toolName === "Write") {
    if (existing === null) return null;
    const before = split(existing);
    const after = split(input.content);
    if (before.length > MAX_WRITE_LINES || after.length > MAX_WRITE_LINES) return null;
    return { removed: lineDiff(before, after), added: lineDiff(after, before) };
  }
  if (toolName !== "Edit" && toolName !== "MultiEdit") return null;
  if (existing === null || split(existing).length > MAX_WRITE_LINES) return fragments();
  let text = existing;
  for (const e of toolName === "Edit" ? [input] : Array.isArray(input.edits) ? input.edits : []) {
    const next = applyEdit(text, e);
    if (next === null) return fragments();
    text = next;
  }
  return { removed: lineDiff(split(existing), split(text)), added: lineDiff(split(text), split(existing)) };
}

/** The context text for a preview, and the keys of the candidates it names. Null when the preview holds nothing new. */
export function describe(path, preview, seen = new Set()) {
  const items = [];
  const keys = [];
  const add = (key, text) => {
    if (seen.has(key) || keys.includes(key)) return;
    keys.push(key);
    items.push(text);
  };
  for (const v of preview.stale) add(`stale|${v.path}:${v.line}|${v.from}`, `the value ${v.from} (this edit writes ${v.to}) is still written at ${v.path}:${v.line}: ${clip(v.text)}`);
  for (const v of preview.numbers ?? []) add(`num|${v.path}:${v.line}|${v.from}`, `the number ${v.from} (this edit writes ${v.to}) also appears at ${v.path}:${v.line}: ${clip(v.text)} (check whether it is the same thing)`);
  for (const u of preview.uses) add(`use|${u.path}:${u.line}|${u.name}`, `the name ${u.name} (this edit takes it away) is still used at ${u.path}:${u.line}: ${clip(u.text)}`);
  for (const t of preview.twins) {
    for (const x of [...t.twins, ...t.loose]) add(`twin|${x.path}:${x.line}|${clip(t.text, 40)}`, `${x.path}:${x.line} has the same shape as the line this edit removes (${clip(t.text, 60)}): ${clip(x.text)}`);
  }
  if (!items.length) return null;
  const shown = items.slice(0, MAX_ITEMS);
  const more = items.length > shown.length ? ` ${items.length - shown.length} more not shown.` : "";
  const text = `product-engineer: before this edit to ${path}, the repository already holds ${items.length} other place${items.length === 1 ? "" : "s"} that this edit leaves behind. ${shown.map((s, i) => `(${i + 1}) ${s}`).join(" ")}${more} Read each one and edit it in the same pass if it says the same thing; if one stays as it is, say why in your answer.`;
  return { text, keys: keys.slice(0, shown.length) };
}

const git = (args, cwd) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

function main() {
  try { run(); } catch { /* a hook that fails must not stop the agent */ }
}

function run() {
  if (process.env.PRODUCT_ENGINEER_NO_GATE === "1") return;
  let input;
  try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { return; }
  const tool = input?.tool_name;
  const ti = input?.tool_input;
  if (!["Edit", "MultiEdit", "Write"].includes(tool) || !ti || typeof ti.file_path !== "string") return;
  const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : process.cwd();
  const file = isAbsolute(ti.file_path) ? ti.file_path : resolve(cwd, ti.file_path);
  let top;
  try { top = realpathSync(git(["rev-parse", "--show-toplevel"], cwd).trim()); } catch { return; }
  let real = file;
  try { real = realpathSync(file); } catch { /* a new file has nothing to compare with */ }
  const rel = relative(top, real).split("\\").join("/");
  if (!rel || rel.startsWith("..") || isAbsolute(rel) || isLockPath(rel)) return;
  const lines = editLines(tool, { ...ti, file_path: file });
  if (!lines || lines.removed.length === 0) return;
  const sid = typeof input.session_id === "string" ? input.session_id.replace(/[^A-Za-z0-9_-]/g, "_") : "";
  const state = sid ? readState(sid) : { reports: 0, seen: [] };
  if (state.reports >= MAX_REPORTS) return;
  const preview = previewEdit({ path: rel, removed: lines.removed, added: lines.added, cwd: top });
  const d = describe(rel, preview, new Set(state.seen));
  if (!d) return;
  if (sid) writeState(sid, { reports: state.reports + 1, seen: [...state.seen, ...d.keys].slice(-200) });
  process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: d.text } })}\n`);
}

const isEntry = () => {
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; } catch { return false; }
};
if (isEntry()) main();
