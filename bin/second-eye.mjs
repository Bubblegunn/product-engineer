#!/usr/bin/env node
// product-engineer second eye: one cheap model call that reads the final answer, the shell commands the agent ran and the
// files it wrote, and lists the factual claims that no command or file supports. It is a second reading, not a verdict.
//
// The call is a child process: `claude -p --model claude-haiku-5-5` with no settings sources, no slash commands and no
// session persistence, run from the temp directory with PRODUCT_ENGINEER_NO_GATE=1 so the child's own Stop hook stays silent.
// Every problem returns a reason in `skipped`; secondEye never throws and never blocks on its own.
// The binary is PE_SECOND_EYE_CLAUDE when set, else `claude`. PRODUCT_ENGINEER_SECOND_EYE=0 disables the call.
// `commands` takes strings or { command, output }; the output is the tail of what the command printed.
import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MODEL = "claude-haiku-5-5";
const MIN_ANSWER = 200;
const MAX_ANSWER = 20000;
const MAX_COMMANDS = 30;
const MAX_COMMAND_CHARS = 160;
const MAX_OUTPUT_CHARS = 300;
const MAX_FILES = 40;
const MAX_ITEMS = 5;
const MAX_TEXT = 300;
const MAX_OUTPUT = 256 * 1024;
const DEFAULT_TIMEOUT_MS = 45000;
const LOG_NAME = "product-engineer-second-eye.log";

const INSTRUCTIONS = [
  "You check the FINAL ANSWER of a coding agent against the evidence the agent produced: the shell commands it ran and the files it wrote.",
  "List each factual claim in the FINAL ANSWER that the commands or files do NOT support. Factual claims are counts, test results, what was checked, and what does or does not exist in the repository.",
  "Do not list opinions, plans or recommendations. Do not list a claim that the evidence supports.",
  "A claim is SUPPORTED when it quotes or follows from the printed output of one of the commands. Each command is followed by its output (the last 300 characters, or (empty)).",
  'Reply with JSON only, no prose and no code fence, in exactly this shape: {"unchecked":[{"claim":"<the claim, quoted or closely paraphrased>","why":"<what evidence is missing>"}]}',
  `At most ${MAX_ITEMS} items. Reply {"unchecked":[]} when every factual claim is supported.`,
].join("\n");

const clip = (s, n) => {
  const t = String(s ?? "").trim();
  return t.length > n ? `${t.slice(0, n - 3)}...` : t;
};

// The last characters of an output, where a runner prints its summary; trailing blank lines are left out.
const tailOf = (s) => {
  const t = String(s ?? "").trimEnd();
  return t.length > MAX_OUTPUT_CHARS ? t.slice(-MAX_OUTPUT_CHARS) : t;
};
const asEntry = (c) => (typeof c === "string" ? { command: c, output: "" } : { command: String(c?.command ?? ""), output: String(c?.output ?? "") });

/** One command with its printed output below it. */
const commandBlock = ({ command, output }) => {
  const tail = tailOf(output);
  if (!tail) return `- ${clip(command, MAX_COMMAND_CHARS)}\n  output: (empty)`;
  const body = tail.split("\n").map((l) => `    ${l}`).join("\n");
  return `- ${clip(command, MAX_COMMAND_CHARS)}\n  output:\n${body}`;
};

/** The prompt sent to the child: fixed instructions, the answer, the last commands with their output, and the written files. */
export function buildPrompt({ answer, commands, files }) {
  const entries = commands.map(asEntry);
  const cmds = entries.slice(-MAX_COMMANDS);
  const paths = [...new Set(files)].slice(0, MAX_FILES);
  const cmdLines = cmds.map(commandBlock).join("\n") || "(none)";
  const fileLines = paths.map((p) => `- ${p}`).join("\n") || "(none)";
  return [
    INSTRUCTIONS,
    "",
    "FINAL ANSWER:",
    "<<<",
    clip(answer, MAX_ANSWER),
    ">>>",
    "",
    `SHELL COMMANDS RUN (last ${cmds.length} of ${entries.length}, in order, each with its printed output):`,
    cmdLines,
    "",
    "FILES WRITTEN:",
    fileLines,
  ].join("\n");
}

/** The first complete JSON object in a text, found by brace depth outside strings; null when there is none. */
function firstObject(text) {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** { unchecked } from the child's output, or null when no JSON object with an unchecked array is there. */
export function parseVerdict(text) {
  const raw = firstObject(String(text ?? ""));
  if (raw === null) return null;
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.unchecked)) return null;
  const unchecked = obj.unchecked
    .filter((u) => u && typeof u === "object" && typeof u.claim === "string" && u.claim.trim())
    .slice(0, MAX_ITEMS)
    .map((u) => ({ claim: clip(u.claim, MAX_TEXT), why: typeof u.why === "string" ? clip(u.why, MAX_TEXT) : "" }));
  return { unchecked };
}

const logLine = (line) => {
  try {
    appendFileSync(join(tmpdir(), LOG_NAME), `${new Date().toISOString()} ${line}\n`);
  } catch {
    // the log is a record, not a result
  }
};

/** Runs the child; resolves to { unchecked } or { skipped }. Never rejects. */
function runChild(bin, args, env, timeoutMs) {
  return new Promise((resolve) => {
    let out = "";
    let settled = false;
    let timer = null;
    let timedOut = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };
    let child;
    try {
      // detached: the child leads its own process group, so a timeout can kill whatever it started as well.
      child = spawn(bin, args, { cwd: tmpdir(), env, stdio: ["ignore", "pipe", "pipe"], detached: true });
    } catch {
      finish({ skipped: "missing-binary" });
      return;
    }
    child.on("error", (err) => finish({ skipped: err && err.code === "ENOENT" ? "missing-binary" : "spawn-error" }));
    child.stdout.on("data", (chunk) => {
      if (out.length < MAX_OUTPUT) out += chunk.toString("utf8");
    });
    child.stderr.on("data", () => {});
    timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        try { child.kill("SIGKILL"); } catch { /* already gone */ }
      }
      // Resolve on the child's close, so the process is reaped before the caller continues; the grace timer bounds a child that never closes.
      setTimeout(() => finish({ skipped: "timeout" }), 1000).unref();
    }, timeoutMs);
    child.on("close", (code) => {
      if (timedOut) return finish({ skipped: "timeout" });
      if (code !== 0) return finish({ skipped: `exit-${code}` });
      const verdict = parseVerdict(out);
      finish(verdict ?? { skipped: "unparseable" });
    });
  });
}

/**
 * The second reading of one answer. Resolves to { unchecked: [{claim, why}], skipped: reason|null, ms }.
 * `commands` are the shell commands of the turn, `files` the paths it wrote. `env` defaults to process.env.
 */
export async function secondEye({ answer = "", commands = [], files = [], env = process.env, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const start = Date.now();
  const done = (skipped, unchecked = []) => {
    const ms = Date.now() - start;
    logLine(`ms=${ms} skipped=${skipped ?? "none"} unchecked=${unchecked.length}`);
    return { unchecked, skipped, ms };
  };
  try {
    const text = String(answer ?? "");
    const cmds = Array.isArray(commands) ? commands.map(asEntry) : [];
    const paths = Array.isArray(files) ? files.map(String) : [];
    if (env.PRODUCT_ENGINEER_SECOND_EYE === "0") return done("disabled");
    if (text.length < MIN_ANSWER) return done("short-answer");
    if (!cmds.length && !paths.length) return done("no-evidence");
    const bin = env.PE_SECOND_EYE_CLAUDE || "claude";
    const prompt = buildPrompt({ answer: text, commands: cmds, files: paths });
    const args = [
      "-p", prompt,
      "--model", MODEL,
      "--output-format", "text",
      "--setting-sources", "",
      "--disable-slash-commands",
      "--no-session-persistence",
    ];
    const childEnv = { ...env, PRODUCT_ENGINEER_NO_GATE: "1", PRODUCT_ENGINEER_SECOND_EYE: "0" };
    const result = await runChild(bin, args, childEnv, timeoutMs);
    if (result.skipped) return done(result.skipped);
    return done(null, result.unchecked);
  } catch {
    return done("error");
  }
}
