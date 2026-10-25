#!/usr/bin/env node
// product-engineer pre-edit: a PreToolUse hook for Edit, MultiEdit, Write and the Bash commands that write a file in place
// (a heredoc `cat > file`, `sed -i 's/old/new/' file`). Before the first edit that replaces a value
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

// ---- Bash writes -------------------------------------------------------------------------------------------------
// Agents write most files through the shell. Two forms are read, nothing else: `cat > file <<'EOF' ... EOF` (the whole file
// is replaced) and `sed -i 's/old/new/flags' file...` (the substitution is applied line by line). Any other command is left
// alone, so a miss only means no context is added.
const HEREDOC = /\bcat\s*>(?!>)\s*("[^"\n]+"|'[^'\n]+'|[^\s<>|;&]+)\s*<<-?\s*(['"]?)(\w+)\2[^\n]*\n([\s\S]*?)(?:\n|^)[ \t]*\3[ \t]*(?=\n|$)/g;

/** The shell words of one simple command, with quotes removed; null when a quote is left open. */
function shellWords(text) {
  const words = [];
  let cur = "";
  let has = false;
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === "\\" && quote === '"' && i + 1 < text.length) cur += text[++i];
      else cur += c;
    } else if (c === "'" || c === '"') { quote = c; has = true; }
    else if (c === "\\" && i + 1 < text.length) { cur += text[++i]; has = true; }
    else if (/\s/.test(c)) { if (has || cur) { words.push(cur); cur = ""; has = false; } }
    else cur += c;
  }
  if (quote) return null;
  if (has || cur) words.push(cur);
  return words;
}

/** The simple commands of a line of shell: split on && || ; | and newlines outside quotes. */
function simpleCommands(text) {
  const out = [];
  let cur = "";
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { cur += c; if (c === quote) quote = null; else if (c === "\\" && quote === '"') cur += text[++i] ?? ""; continue; }
    if (c === "'" || c === '"') { quote = c; cur += c; continue; }
    if (c === "\n" || c === ";" || c === "|" || (c === "&" && text[i + 1] === "&")) { if (cur.trim()) out.push(cur); cur = ""; if (c === "|" && text[i + 1] === "|") i++; if (c === "&") i++; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/** A sed basic regular expression as a JavaScript one: \( \) \{ \} \| \+ \? are the operators, a bare ( ) { } | + ? is a literal. */
function basicToExtended(pattern) {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\" && i + 1 < pattern.length) {
      const n = pattern[++i];
      out += "(){}|+?".includes(n) ? n : `\\${n}`;
    } else out += "(){}|+?".includes(c) ? `\\${c}` : c;
  }
  return out;
}

/** Substitutions of a sed script: [{ re, replacement, global }]. Only s commands with a literal delimiter are read; any other command makes the script unreadable (null). */
function sedScript(script, extended) {
  const subs = [];
  let rest = script.trim();
  while (rest) {
    const m = /^s(.)/.exec(rest);
    if (!m) return null;
    const d = m[1];
    if (/[\w\s\\]/.test(d)) return null;
    const parts = [];
    let cur = "";
    let i = 1 + 1;
    while (i < rest.length && parts.length < 2) {
      const c = rest[i];
      if (c === "\\" && i + 1 < rest.length) { cur += c + rest[i + 1]; i += 2; continue; }
      if (c === d) { parts.push(cur); cur = ""; i++; continue; }
      cur += c;
      i++;
    }
    if (parts.length < 2) return null;
    const end = rest.slice(i).search(/;/);
    const flags = end < 0 ? rest.slice(i) : rest.slice(i, i + end);
    const next = end < 0 ? "" : rest.slice(i + end + 1);
    if (!/^[gGIi\d]*$/.test(flags.trim())) return null;
    let pattern = parts[0];
    if (!extended) pattern = basicToExtended(pattern);
    pattern = pattern.split(`\\${d}`).join(d);
    let re;
    try { re = new RegExp(pattern, flags.includes("I") || flags.includes("i") ? "i" : ""); } catch { return null; }
    const replacement = parts[1].replace(/\$/g, "$$$$").replace(/\\(\d)/g, "$$$1").replace(/(?<!\\)&/g, "$$&").replace(/\\&/g, "&").split(`\\${d}`).join(d);
    subs.push({ re, replacement, global: flags.includes("g") });
    rest = next.trim();
  }
  return subs.length ? subs : null;
}

/** The files a Bash command rewrites, as { file, before, after } (whole texts), in the order the command writes them. */
export function bashEdits(command, cwd, readFile = (p) => readFileSync(p, "utf8")) {
  const virtual = new Map();
  const read = (file) => { if (virtual.has(file)) return virtual.get(file); try { return readFile(file); } catch { return null; } };
  const first = new Map();
  const note = (file, before, after) => { if (!first.has(file)) first.set(file, before); virtual.set(file, after); };
  const place = (raw) => { const f = raw.replace(/^["']|["']$/g, ""); return /[$`*?]/.test(f) ? null : (isAbsolute(f) ? f : resolve(cwd, f)); };
  let rest = String(command ?? "");
  rest = rest.replace(HEREDOC, (_all, rawFile, _q, _tag, body) => {
    const file = place(rawFile);
    if (file) note(file, read(file), `${body}\n`);
    return " ";
  });
  for (const part of simpleCommands(rest)) {
    const words = shellWords(part);
    if (!words) continue;
    while (words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0])) words.shift();
    if (words[0] === "env") words.shift();
    if (words[0] !== "sed") continue;
    let inPlace = false;
    let extended = false;
    const scripts = [];
    const files = [];
    for (let i = 1; i < words.length; i++) {
      const w = words[i];
      if (w === "--in-place" || /^-i/.test(w) || /^-[A-Za-z]*i/.test(w)) { inPlace = true; if (w === "-i" && words[i + 1] === "") i++; if (/E|r/.test(w.replace(/^-i.*/, ""))) extended = true; continue; }
      if (w === "-E" || w === "-r" || w === "--regexp-extended") { extended = true; continue; }
      if (w === "-e" || w === "--expression") { scripts.push(words[++i] ?? ""); continue; }
      if (w === "-n" || w === "-s" || w === "--") continue;
      if (w.startsWith("-")) { scripts.length = 0; files.length = 0; break; }
      if (!scripts.length) scripts.push(w); else files.push(w);
    }
    if (!inPlace || !scripts.length || !files.length) continue;
    const subs = sedScript(scripts.join(";"), extended);
    if (!subs) continue;
    for (const raw of files) {
      const file = place(raw);
      const before = file ? read(file) : null;
      if (before === null) continue;
      const after = before.split("\n").map((line) => subs.reduce((l, s) => l.replace(s.global ? new RegExp(s.re.source, `${s.re.flags}g`) : s.re, s.replacement), line)).join("\n");
      if (after !== before) note(file, before, after);
    }
  }
  return [...first.entries()].map(([file, before]) => ({ file, before, after: virtual.get(file) })).filter((e) => e.before !== null && e.before !== e.after);
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
  if (!["Edit", "MultiEdit", "Write", "Bash"].includes(tool) || !ti) return;
  if (tool === "Bash" ? typeof ti.command !== "string" : typeof ti.file_path !== "string") return;
  const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : process.cwd();
  let top;
  try { top = realpathSync(git(["rev-parse", "--show-toplevel"], cwd).trim()); } catch { return; }
  // One entry per file the call rewrites: { rel, removed, added }.
  const targets = [];
  const relOf = (file) => {
    let real = file;
    try { real = realpathSync(file); } catch { /* a new file has nothing to compare with */ }
    const rel = relative(top, real).split("\\").join("/");
    return !rel || rel.startsWith("..") || isAbsolute(rel) || isLockPath(rel) ? null : rel;
  };
  if (tool === "Bash") {
    for (const e of bashEdits(ti.command, cwd)) {
      const rel = relOf(e.file);
      if (!rel) continue;
      const before = split(e.before);
      const after = split(e.after);
      if (before.length > MAX_WRITE_LINES || after.length > MAX_WRITE_LINES) continue;
      targets.push({ rel, removed: lineDiff(before, after), added: lineDiff(after, before) });
    }
  } else {
    const file = isAbsolute(ti.file_path) ? ti.file_path : resolve(cwd, ti.file_path);
    const rel = relOf(file);
    const lines = rel ? editLines(tool, { ...ti, file_path: file }) : null;
    if (lines) targets.push({ rel, ...lines });
  }
  const sid = typeof input.session_id === "string" ? input.session_id.replace(/[^A-Za-z0-9_-]/g, "_") : "";
  const state = sid ? readState(sid) : { reports: 0, seen: [] };
  if (state.reports >= MAX_REPORTS) return;
  const seen = new Set(state.seen);
  const texts = [];
  const keys = [];
  for (const t of targets.filter((x) => x.removed.length > 0)) {
    const preview = previewEdit({ path: t.rel, removed: t.removed, added: t.added, cwd: top });
    const d = describe(t.rel, preview, new Set([...seen, ...keys]));
    if (!d) continue;
    texts.push(d.text);
    keys.push(...d.keys);
  }
  if (!texts.length) return;
  if (sid) writeState(sid, { reports: state.reports + 1, seen: [...state.seen, ...keys].slice(-200) });
  process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: texts.join(" ") } })}\n`);
}

const isEntry = () => {
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; } catch { return false; }
};
if (isEntry()) main();
