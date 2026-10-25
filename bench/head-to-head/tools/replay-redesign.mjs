#!/usr/bin/env node
// replay-redesign: offline replay of the changed checkers on stored sessions, with no model call. For every stored session
// of the "ours" arm it runs the OLD and the NEW checker code side by side and prints what changed:
//   gate    the Stop-hook claim families on the final answer (old claim-gate.mjs against new)
//   notes   the notes checker on the release-notes or status files the session left in its repository (customers audience)
//   verify  the Stop-hook repository checks on the final repository state
//   brief   the SessionStart brief on a rebuilt fixture (the lines that say "none")
//   edits   the pre-edit search, run before each Edit, MultiEdit and Write of the session replayed on a rebuilt fixture
// Nothing here reads a grade or tunes a rule; it only reports where old and new code decide differently so that each
// changed decision can be read and judged against the stored grader reasons by a person.
//
// usage: node replay-redesign.mjs --old <dir holding bin/ of the old commit> --cells <label>=<runs>@<fixtures>@<tasks.json>... [--only gate,notes,verify,brief,edits] [--json out.json]
//   --cells <label>=<runs dir>@<fixtures dir>@<tasks.json>   (runs dir holds <task>-ours-<n>/, fixtures dir holds <task>/fixture.sh, tasks.json maps the task id to its prompt)
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const NEW_BIN = resolve(HERE, "../../../bin");
const mod = (dir, name) => import(pathToFileURL(join(dir, name)).href);
const NOTES_NAME = /release|notes|changelog|status|upgrade|summary|report|whats[-_ ]?new/i;

const git = (cwd, ...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });

/** The ours cells of a runs directory: [{ id, task, dir }]. */
export function cellsOf(runsDir) {
  return readdirSync(runsDir)
    .map((name) => /^(X\d+)-ours-(\d+)$/.exec(name))
    .filter(Boolean)
    .map((m) => ({ id: m[0], task: m[1], rep: Number(m[2]), dir: join(runsDir, m[0]) }))
    .filter((c) => existsSync(join(c.dir, "out.jsonl")))
    .sort((a, b) => (a.task === b.task ? a.rep - b.rep : a.task.localeCompare(b.task, "en", { numeric: true })));
}

const FEEDBACK = "Stop hook feedback";
const textOf = (e) => {
  const c = e?.message?.content;
  return typeof c === "string" ? c : Array.isArray(c) ? c.filter((b) => b?.type === "text").map((b) => String(b.text ?? "")).join("\n") : "";
};

/**
 * A stored stream-json session as the Stop hook saw it. The stream carries neither the request nor the isMeta flag the
 * session file has: the request is put back as the first person turn, an injected turn (a loaded skill, a hook message)
 * is marked isMeta as in the session file, and the lines are cut before the first stop-hook message, where the gate ran.
 */
export function asHookSaw(lines, prompt) {
  const out = [];
  for (const line of lines) {
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (e.type === "user" && !e.isMeta && textOf(e).includes(FEEDBACK)) break;
    if (e.type === "user" && e.isSynthetic) e.isMeta = true;
    out.push(JSON.stringify(e));
  }
  return [JSON.stringify({ type: "user", message: { role: "user", content: prompt ?? "" } }), ...out];
}

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

/** Families that fire on one transcript, with the module's own session reader. */
function familiesOf(gate, lines) {
  const session = gate.readSession(lines);
  return [...new Set(gate.gateItems(session, [session.last]).map((i) => i.family))].sort();
}

/** Tool calls of a transcript in order: { name, input }. */
export function toolCalls(lines) {
  const out = [];
  for (const line of lines) {
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (e.type !== "assistant" || e.isSidechain || !Array.isArray(e.message?.content)) continue;
    for (const b of e.message.content) if (b?.type === "tool_use") out.push({ name: b.name, input: b.input ?? {} });
  }
  return out;
}

/** A fixture rebuilt from its fixture.sh in a fresh directory under the temp directory; null when it cannot be built. */
function rebuild(fixtureDir, task) {
  const script = join(fixtureDir, task, "fixture.sh");
  if (!existsSync(script)) return null;
  const dir = mkdtempSync(join(tmpdir(), "pe-replay-fx-"));
  const r = spawnSync("bash", [script, dir], { encoding: "utf8" });
  return r.status === 0 ? dir : null;
}

function noteFiles(repo) {
  let changed = "";
  try { changed = git(repo, "status", "--porcelain", "-uall"); } catch { /* not a repository */ }
  const names = new Set(changed.split("\n").map((l) => l.slice(3).trim()).filter(Boolean));
  try { for (const f of git(repo, "show", "--name-only", "--format=", "HEAD").split("\n")) if (f.trim()) names.add(f.trim()); } catch { /* no commit */ }
  return [...names].filter((n) => /\.(md|txt)$/i.test(n) && NOTES_NAME.test(basename(n)) && existsSync(join(repo, n)));
}

async function replayNotes(cell, oldMods, newMods) {
  const out = [];
  for (const file of noteFiles(join(cell.dir, "repo"))) {
    const text = readFileSync(join(cell.dir, "repo", file), "utf8");
    const o = oldMods.notes.notes(text);
    const n = newMods.notes.notes(text);
    const key = (r) => r.findings.map((f) => `${f.level}:${f.code}:${f.line}`);
    if (!sameSet(key(o), key(n))) {
      const gone = key(o).filter((k) => !key(n).includes(k));
      const added = key(n).filter((k) => !key(o).includes(k));
      const lines = text.split(/\r?\n/);
      out.push({ file, oldErrors: o.errors, newErrors: n.errors, dropped: gone.map((k) => ({ finding: k, text: lines[Number(k.split(":")[2]) - 1]?.trim().slice(0, 160) })), added });
    }
  }
  return out;
}

function replayVerify(cell, lines, oldMods, newMods) {
  const repo = join(cell.dir, "repo");
  if (!existsSync(join(repo, ".git"))) return null;
  const run = (m) => {
    const session = m.gate.readSession(lines);
    return m.verify.verify({ cwd: repo, session, answer: session.last }).map((f) => f.id).sort();
  };
  const o = run(oldMods);
  const n = run(newMods);
  return sameSet(o, n) ? null : { old: o, new: n };
}

async function replayEdits(cell, lines, fixtureDir, newMods) {
  const fx = rebuild(fixtureDir, cell.task);
  if (!fx) return { skipped: "fixture not rebuilt" };
  const calls = toolCalls(lines);
  const written = [];
  const shown = [];
  let applied = 0;
  let unreplayable = 0;
  let bashUnparsed = 0;
  try {
    const record = (rel, removed, added) => {
      if (!removed.length) return;
      let preview = null;
      try { preview = newMods.twins.previewEdit({ path: rel, removed, added, cwd: fx }); } catch { preview = null; }
      const d = preview ? newMods.preEdit.describe(rel, preview, new Set(shown.flatMap((x) => x.keys))) : null;
      if (d) shown.push({ at: rel, keys: d.keys, files: [...new Set(d.keys.map((k) => k.split("|")[1].split(":")[0]))], text: d.text });
    };
    const inCell = (text) => String(text).split(join(cell.dir, "repo")).join(fx);
    for (const call of calls) {
      if (call.name === "Bash") {
        const command = inCell(call.input.command ?? "");
        let edits = [];
        try { edits = newMods.preEdit.bashEdits(command, fx); } catch { edits = []; }
        if (!edits.length && /\bsed\s+-i|<<\s*['"]?\w+|\btee\b|>>?\s*\S/.test(command)) bashUnparsed++;
        for (const e of edits) {
          const rel = e.file.startsWith(fx) ? e.file.slice(fx.length + 1) : e.file;
          const b = e.before.split("\n");
          const a = e.after.split("\n");
          record(rel, newMods.preEdit.lineDiff(b, a), newMods.preEdit.lineDiff(a, b));
          try { writeFileSync(e.file, e.after); applied++; written.push(rel); } catch { unreplayable++; }
        }
        continue;
      }
      if (!["Edit", "MultiEdit", "Write"].includes(call.name)) continue;
      const file = String(call.input.file_path ?? "");
      const rel = file.includes("/repo/") ? file.slice(file.indexOf("/repo/") + 6) : file.replace(/^\/+/, "");
      const full = join(fx, rel);
      const before = existsSync(full) && statSync(full).isFile() ? readFileSync(full, "utf8") : null;
      const lns = newMods.preEdit.editLines(call.name, { ...call.input, file_path: full }, () => { if (before === null) throw new Error("none"); return before; });
      if (lns) record(rel, lns.removed, lns.added);
      // Apply the edit so that later previews see the tree the session saw.
      try {
        mkdirSync(dirname(full), { recursive: true });
        if (call.name === "Write") writeFileSync(full, String(call.input.content ?? ""));
        else if (before !== null) {
          let text = before;
          for (const e of call.name === "Edit" ? [call.input] : call.input.edits ?? []) {
            if (!text.includes(e.old_string)) throw new Error("old_string missing");
            text = e.replace_all ? text.split(e.old_string).join(e.new_string) : text.replace(e.old_string, () => e.new_string);
          }
          writeFileSync(full, text);
        } else throw new Error("no file");
        applied++;
        written.push(rel);
      } catch { unreplayable++; }
    }
  } finally {
    rmSync(fx, { recursive: true, force: true });
  }
  // Files the context pointed at that the session wrote later (or earlier): the search named a place the session also edited.
  const wrote = new Set(written);
  const contexts = shown.map((s) => ({ at: s.at, files: s.files, alsoEdited: s.files.filter((f) => wrote.has(f)), neverEdited: s.files.filter((f) => !wrote.has(f)) }));
  return { edits: applied, unreplayable, bashUnparsed, contexts: shown.length, detail: contexts, sample: shown.slice(0, 1).map((s) => s.text.slice(0, 500)) };
}

function replayBrief(cell, fixtureDir, oldMods, newMods) {
  const fx = rebuild(fixtureDir, cell.task);
  if (!fx) return { skipped: "fixture not rebuilt" };
  try {
    const old = oldMods.brief.brief({ cwd: fx }) ?? "";
    const now = newMods.brief.brief({ cwd: fx }) ?? "";
    const none = (t) => t.split("\n").filter((l) => /\bnone\b|no test command/.test(l));
    return { oldNone: none(old), newNone: none(now), changed: old !== now };
  } finally {
    rmSync(fx, { recursive: true, force: true });
  }
}

export async function replayAll({ oldBin, specs, only }) {
  const newMods = { gate: await mod(NEW_BIN, "claim-gate.mjs"), verify: await mod(NEW_BIN, "verify.mjs"), notes: await mod(NEW_BIN, "notes.mjs"), brief: await mod(NEW_BIN, "brief.mjs"), preEdit: await mod(NEW_BIN, "pre-edit.mjs"), twins: await mod(NEW_BIN, "twins.mjs") };
  const oldMods = { gate: await mod(oldBin, "claim-gate.mjs"), verify: await mod(oldBin, "verify.mjs"), notes: await mod(oldBin, "notes.mjs"), brief: await mod(oldBin, "brief.mjs") };
  const report = { cells: 0, gate: [], notes: [], verify: [], brief: [], edits: [] };
  for (const { label, runsDir, fixtureDir, tasks } of specs) {
    for (const cell of cellsOf(runsDir)) {
      report.cells++;
      const raw = readFileSync(join(cell.dir, "out.jsonl"), "utf8").split("\n");
      const lines = asHookSaw(raw, tasks[cell.task]?.prompt);
      const id = `${label}/${cell.id}`;
      if (only.has("gate")) {
        const o = familiesOf(oldMods.gate, lines);
        const n = familiesOf(newMods.gate, lines);
        if (!sameSet(o, n)) report.gate.push({ id, old: o, new: n });
      }
      if (only.has("notes")) for (const r of await replayNotes(cell, oldMods, newMods)) report.notes.push({ id, ...r });
      if (only.has("verify")) { const r = replayVerify(cell, lines, oldMods, newMods); if (r) report.verify.push({ id, ...r }); }
      if (only.has("brief")) report.brief.push({ id, ...replayBrief(cell, fixtureDir, oldMods, newMods) });
      if (only.has("edits")) report.edits.push({ id, ...(await replayEdits(cell, lines, fixtureDir, newMods)) });
    }
  }
  return report;
}

async function main(argv) {
  let oldBin = null;
  const specs = [];
  let only = new Set(["gate", "notes", "verify", "brief", "edits"]);
  let json = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--old") oldBin = join(resolve(argv[++i]), "bin");
    else if (a === "--only") only = new Set(argv[++i].split(","));
    else if (a === "--json") json = argv[++i];
    else if (a === "--cells") {
      const m = /^([^=]+)=(.+)@(.+)@(.+)$/.exec(argv[++i] ?? "");
      if (!m) { process.stderr.write("--cells needs <label>=<runs dir>@<fixtures dir>@<tasks.json>\n"); return 2; }
      specs.push({ label: m[1], runsDir: resolve(m[2]), fixtureDir: resolve(m[3]), tasks: JSON.parse(readFileSync(resolve(m[4]), "utf8")) });
    }
  }
  if (!oldBin || !specs.length) { process.stderr.write("usage: node replay-redesign.mjs --old <dir with bin/> --cells <label>=<runs>@<fixtures>... [--only gate,notes,verify,brief,edits] [--json out.json]\n"); return 2; }
  const report = await replayAll({ oldBin, specs, only });
  if (json) writeFileSync(json, JSON.stringify(report, null, 2));
  process.stdout.write(`cells: ${report.cells}\n`);
  for (const [k, v] of Object.entries(report)) if (Array.isArray(v)) process.stdout.write(`${k}: ${v.length} entries\n`);
  return 0;
}

const isEntry = () => { try { return import.meta.url === pathToFileURL(process.argv[1]).href; } catch { return false; } };
if (isEntry()) main(process.argv.slice(2)).then((c) => { process.exitCode = c; });
