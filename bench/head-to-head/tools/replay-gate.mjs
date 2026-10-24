#!/usr/bin/env node
// replay-gate: run the claim-gate text and transcript families over recorded transcripts, without
// the repository. Each transcript is cut at the first person turn that carries "Stop hook feedback"
// (the point where the gate had already blocked), or read to its end. The last assistant text is the
// answer. Prints, per family, the number of transcripts where it fires and their names.
//
// usage: node replay-gate.mjs <glob of out.jsonl files>... [--json] [--gate <path to claim-gate.mjs>]
import { readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_GATE = resolve(HERE, "../../../bin/claim-gate.mjs");
const FEEDBACK = "Stop hook feedback";

const userText = (e) => {
  const c = e?.message?.content;
  if (typeof c === "string") return c;
  return Array.isArray(c) ? c.filter((b) => b?.type === "text").map((b) => String(b.text ?? "")).join("\n") : "";
};

/** The lines of a transcript before the first person turn that carries the stop-hook feedback. */
export function cutLines(lines) {
  for (let i = 0; i < lines.length; i++) {
    let e;
    try { e = JSON.parse(lines[i]); } catch { continue; }
    if (e.type === "user" && !e.isMeta && userText(e).includes(FEEDBACK)) return lines.slice(0, i);
  }
  return lines;
}

/** Families that fire on one transcript's text, from the gate module's readSession and gateItems. */
export function replayLines(lines, gate) {
  const session = gate.readSession(cutLines(lines));
  return [...new Set(gate.gateItems(session, [session.last]).map((i) => i.family))];
}

/** Expand a glob whose only wildcard is `*` inside one path segment, as the shell would. Plain paths pass through. */
export function expandGlob(pattern) {
  if (!/[*?]/.test(pattern)) return [pattern];
  const abs = pattern.startsWith("/");
  const segs = pattern.split("/").filter((s, i) => s !== "" || i === 0);
  let paths = [abs ? "/" : "."];
  for (const seg of segs) {
    if (seg === "") continue;
    const next = [];
    for (const base of paths) {
      if (!/[*?]/.test(seg)) { next.push(join(base, seg)); continue; }
      const re = new RegExp(`^${seg.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]")}$`);
      let entries = [];
      try { entries = readdirSync(base); } catch { continue; }
      for (const name of entries.sort()) if (re.test(name)) next.push(join(base, name));
    }
    paths = next;
  }
  return paths.filter((p) => { try { statSync(p); return true; } catch { return false; } });
}

/** Replay every file. Returns the number of transcripts, the fired families with their transcript names, and the total fired. */
export function replay(files, gate) {
  const perFamily = new Map();
  let fired = 0;
  for (const file of files) {
    const families = replayLines(readFileSync(file, "utf8").split("\n"), gate);
    // A transcript is named by its batch and run directory, since every file is out.jsonl and run names repeat across batches.
    const name = `${basename(dirname(dirname(file)))}/${basename(dirname(file))}`;
    if (families.length) fired++;
    for (const f of families) {
      if (!perFamily.has(f)) perFamily.set(f, []);
      perFamily.get(f).push(name);
    }
  }
  const families = [...perFamily.entries()]
    .map(([family, names]) => ({ family, count: names.length, transcripts: names }))
    .sort((a, b) => b.count - a.count || a.family.localeCompare(b.family));
  return { transcripts: files.length, fired, families };
}

export async function loadGate(path) {
  return import(pathToFileURL(resolve(path)).href);
}

async function main(argv) {
  const patterns = [];
  let json = false;
  let gatePath = DEFAULT_GATE;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") json = true;
    else if (a === "--gate") gatePath = argv[++i];
    else patterns.push(a);
  }
  if (!patterns.length) {
    process.stderr.write("usage: node replay-gate.mjs <glob of out.jsonl files>... [--json] [--gate <claim-gate.mjs>]\n");
    return 2;
  }
  const files = [...new Set(patterns.flatMap(expandGlob))];
  const gate = await loadGate(gatePath);
  const result = replay(files, gate);
  if (json) {
    process.stdout.write(JSON.stringify({ gate: resolve(gatePath), ...result }, null, 2) + "\n");
    return 0;
  }
  process.stdout.write(`gate: ${resolve(gatePath)}\ntranscripts: ${result.transcripts}\n`);
  for (const f of result.families) process.stdout.write(`${f.family}\t${f.count}\t${f.transcripts.join(", ")}\n`);
  process.stdout.write(`total fired: ${result.fired} of ${result.transcripts}\n`);
  return 0;
}

const isEntry = () => { try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; } catch { return false; } };
if (isEntry()) main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
