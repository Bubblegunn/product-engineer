#!/usr/bin/env node
// product-engineer commit-guard: a PreToolUse hook for the Bash tool. It denies a command that would put
// a credential file, a credential-shaped value, a merge conflict marker or a junk path into a commit.
// It works out what the command would commit without running it, so the deny happens before anything
// is staged or committed. The detection rules are the ones bin/diff.mjs uses for check --diff.
//
// It reads the hook input on standard input ({ tool_name, tool_input: { command }, cwd }) and prints one
// JSON line with permissionDecision "deny", or nothing (allow). It never throws. PRODUCT_ENGINEER_NO_GATE=1
// turns it off. PE_ALLOW_STAGED=1 passes a git call only when it is an environment assignment in that
// call's own segment (for example `PE_ALLOW_STAGED=1 git commit`), for the case where the person asked for
// that file by name. The matched value is never printed, only the path, the line and the kind of finding.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { conflictMarkerHitsIn, isSecretPath, secretHitsIn } from "./diff.mjs";

const MAX_LISTED = 8;
const MAX_UNTRACKED_BYTES = 1024 * 1024;
const UNTRACKED_BUDGET_BYTES = 50 * 1024 * 1024;
const CHUNK = 200;
const MAX_BUFFER = 256 * 1024 * 1024;
const DIFF_FLAGS = ["--no-color", "--no-ext-diff", "--src-prefix=a/", "--dst-prefix=b/", "-U0"];
const GIT_ENV_DROP = ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_PREFIX"];

export const KIND = {
  secretPath: "a credential file name",
  conflict: "a merge conflict marker",
  nodeModules: "a node_modules folder, which is installed output",
  dsStore: "a macOS Finder file (.DS_Store)",
};

// What put a path into the commit. Named in the deny text so the person knows which command did it.
export const SITUATION = {
  staged: "already staged",
  addAll: "git add -A would stage",
  addNamed: "git add would stage",
  commitAll: "commit -a would include",
  commitNamed: "git commit would include",
  fallback: "would be committed",
};

// A here-document: keep the rest of the line it started on, drop its body and terminator.
const HEREDOC = /(<<-?\s*(['"]?)([A-Za-z_]\w*)\2)([^\n]*)\n(?:[\s\S]*?\n)?[ \t]*\3[ \t]*(?=\n|$)/g;
// A quoted string. Its text is kept aside so that separators inside it do not split a command.
const QUOTED = /"(?:[^"\\]|\\.)*"|'[^']*'/g;
const PLACEHOLDER = /\u0001(\d+)\u0001/g;
// A shell comment: a # that starts a word, to the end of the line.
const COMMENT = /(^|[\s;&|(){}])#[^\n]*/g;
// Separators between commands, and the grouping characters a subshell or a brace group adds.
const SEPARATOR = /&&|\|\||[;|&\n(){}]/;

// Words that run the command after them and take no value of their own.
const PLAIN_WRAPPERS = new Set(["then", "do", "else", "elif", "if", "while", "until", "!", "exec", "builtin"]);
// Options of the wrapper that take a value in the next word.
const WRAPPER_VALUE_OPTIONS = { env: /^-[uCS]$/, sudo: /^-[ugCpDRT]$/, time: /^-[fo]$/, command: null };
const SHELL = /^(?:.*\/)?(?:ba|z|da|k)?sh$/;
const SHELL_C_FLAG = /^-[a-zA-Z]*c[a-zA-Z]*$/;

// Options of `git commit` that take a value in the next word (or attached to the short flag).
const COMMIT_VALUE_LONG = new Set(["--message", "--file", "--author", "--date", "--cleanup", "--template", "--fixup", "--squash", "--trailer", "--reuse-message", "--reedit-message", "--pathspec-from-file"]);
const COMMIT_VALUE_SHORT = "mFcCt";

// A word is a pathspec with wildcards when it has * or ?, or when it is "." or uses pathspec magic (:).
// A bracket is a literal character in a file name, so [id] is one path, not a set of characters.
const isWild = (p) => p === "." || p.startsWith(":") || /[*?]/.test(p);

/** Run git and return its standard output. Throws on a non-zero exit, which the caller treats as "no answer". */
function run(args, cwd, maxBuffer = MAX_BUFFER) {
  const env = { ...process.env };
  for (const k of GIT_ENV_DROP) delete env[k];
  env.GIT_LITERAL_PATHSPECS = "1";
  return execFileSync("git", args, { cwd, env, encoding: "utf8", maxBuffer, stdio: ["ignore", "pipe", "ignore"] });
}

const tryRun = (args, cwd) => {
  try {
    return run(args, cwd);
  } catch {
    return null;
  }
};

const lines0 = (out) => (out ?? "").split("\0").filter(Boolean);
const chunks = (arr) => Array.from({ length: Math.ceil(arr.length / CHUNK) }, (_, i) => arr.slice(i * CHUNK, (i + 1) * CHUNK));
const isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};
const tryReal = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return null;
  }
};

/**
 * Split a command into segments of words. Here-documents and quoted strings are taken out first, so a
 * message such as -m "fix && git add -A" is one word, not a second command. Each quoted string comes back
 * as one word with its text. Subshell and brace grouping characters separate segments too.
 */
export function parseCommand(command) {
  const quoted = [];
  const text = command
    .replace(HEREDOC, (m, marker, q, id, rest) => rest)
    .replace(QUOTED, (q) => {
      quoted.push(q.slice(1, -1));
      return `\u0001${quoted.length - 1}\u0001`;
    })
    .replace(COMMENT, "$1");
  const restore = (t) => t.replace(PLACEHOLDER, (_, i) => quoted[Number(i)]);
  return text
    .split(SEPARATOR)
    .map((seg) => seg.trim().split(/\s+/).filter(Boolean).map(restore))
    .filter((words) => words.length > 0);
}

/**
 * Remove the words that only run the command that follows them: assignments (FOO=1), env, command, time,
 * sudo, and keywords such as then, do and !. Returns the words that remain and the assignments found.
 */
export function stripWrappers(words) {
  const assigns = [];
  const isAssign = (w) => /^[A-Za-z_]\w*=/.test(w ?? "");
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (isAssign(w)) {
      assigns.push(w);
      i++;
    } else if (PLAIN_WRAPPERS.has(w)) {
      i++;
    } else if (Object.hasOwn(WRAPPER_VALUE_OPTIONS, w)) {
      const valueOpt = WRAPPER_VALUE_OPTIONS[w];
      i++;
      while (i < words.length && (isAssign(words[i]) || words[i].startsWith("-"))) {
        if (isAssign(words[i])) assigns.push(words[i]);
        else if (valueOpt?.test(words[i])) i++;
        i++;
      }
    } else {
      break;
    }
  }
  return { rest: words.slice(i), assigns };
}

/** The git subcommand and its arguments, with the global options (-C, -c, ...) read and removed. */
function gitCall(words) {
  const first = words[0] ?? "";
  if (first !== "git" && !first.endsWith("/git")) return null;
  const dirs = [];
  let j = 1;
  while (j < words.length && words[j].startsWith("-")) {
    const w = words[j];
    if (w === "-C") {
      if (words[j + 1] !== undefined) dirs.push(words[j + 1]);
      j += 2;
    } else if (w === "-c" || w === "--git-dir" || w === "--work-tree" || w === "--namespace") {
      j += 2;
    } else {
      j += 1;
    }
  }
  return { sub: words[j], args: words.slice(j + 1), dirs };
}

/** Options and paths of `git commit`. -a and --all take every tracked change; a word after -- or a bare word is a path. */
function parseCommitArgs(args) {
  const out = { all: false, paths: [] };
  let pathsOnly = false;
  for (let k = 0; k < args.length; k++) {
    const t = args[k];
    if (pathsOnly) {
      if (isWild(t)) out.all = true;
      else out.paths.push(t);
      continue;
    }
    if (t === "--") {
      pathsOnly = true;
    } else if (t.startsWith("--")) {
      if (t === "--all") out.all = true;
      else if (!t.includes("=") && COMMIT_VALUE_LONG.has(t)) k++;
    } else if (t.startsWith("-") && t.length > 1) {
      for (let c = 1; c < t.length; c++) {
        const ch = t[c];
        if (ch === "a") out.all = true;
        else if (COMMIT_VALUE_SHORT.includes(ch)) {
          if (c === t.length - 1) k++;
          break;
        }
      }
    } else if (isWild(t)) {
      out.all = true;
    } else {
      out.paths.push(t);
    }
  }
  return out;
}

/** Options and paths of `git add`. -A, --all, -u and --update take every change; ".", "*" and patterns are wild. */
function parseAddArgs(args) {
  const out = { all: false, paths: [] };
  let pathsOnly = false;
  for (let k = 0; k < args.length; k++) {
    const t = args[k];
    if (pathsOnly) {
      if (isWild(t)) out.all = true;
      else out.paths.push(t);
      continue;
    }
    if (t === "--") {
      pathsOnly = true;
    } else if (t.startsWith("--")) {
      if (t === "--all" || t === "--update") out.all = true;
      else if (t === "--pathspec-from-file" && !t.includes("=")) k++;
    } else if (t.startsWith("-") && t.length > 1) {
      if (/[Au]/.test(t.slice(1))) out.all = true;
    } else if (isWild(t)) {
      out.all = true;
    } else {
      out.paths.push(t);
    }
  }
  return out;
}

/**
 * The git commit and git add segments of a command, each with the directory it runs in. A `cd` changes
 * the directory for the segments after it; a `cd` to a directory that cannot be resolved keeps the last
 * good one. A shell started with -c is read as a command of its own. Returns [] when the command neither
 * commits nor adds, or when every such call carries PE_ALLOW_STAGED=1 in its own segment.
 */
export function planFor(command, cwd, depth = 0) {
  const segs = [];
  let here = cwd;
  for (const words of parseCommand(command)) {
    const { rest, assigns } = stripWrappers(words);
    if (rest.length === 0) continue;
    if (SHELL.test(rest[0])) {
      const c = rest.findIndex((w, k) => k > 0 && SHELL_C_FLAG.test(w));
      if (c > 0 && rest[c + 1] !== undefined && depth < 3) segs.push(...planFor(rest[c + 1], here, depth + 1));
      continue;
    }
    if (rest[0] === "cd") {
      const target = rest[1] ?? ".";
      const next = tryReal(resolve(here, target.startsWith("~") ? target.replace(/^~/, process.env.HOME ?? "") : target));
      if (next && isDir(next)) here = next;
      continue;
    }
    const call = gitCall(rest);
    if (!call) continue;
    if (assigns.includes("PE_ALLOW_STAGED=1")) continue;
    const segCwd = tryReal(call.dirs.reduce((d, x) => resolve(d, x), here));
    if (!segCwd || !isDir(segCwd)) continue;
    if (call.sub === "commit") segs.push({ sub: "commit", cwd: segCwd, ...parseCommitArgs(call.args) });
    else if (call.sub === "add") segs.push({ sub: "add", cwd: segCwd, ...parseAddArgs(call.args) });
  }
  return segs;
}

/**
 * Repository-relative paths the worktree side of the command would take, each with the situation that
 * puts it in the commit. Tracked changes and untracked files.
 */
function worktreeCandidates(segs, top) {
  const out = new Map();
  const put = (p, situation) => {
    if (!out.has(p)) out.set(p, situation);
  };
  const list = (extra) => lines0(tryRun(["ls-files", "-z", "--full-name", "--exclude-standard", ...extra], top));
  for (const seg of segs) {
    const allSituation = seg.sub === "add" ? SITUATION.addAll : SITUATION.commitAll;
    const namedSituation = seg.sub === "add" ? SITUATION.addNamed : SITUATION.commitNamed;
    if (seg.all) for (const p of list(seg.sub === "add" ? ["-m", "-o"] : ["-m"])) put(p, allSituation);
    for (const raw of seg.paths) {
      const rel = relative(top, resolve(seg.cwd, raw));
      if (rel === "" || rel === ".." || rel.startsWith("../") || isAbsolute(rel)) {
        for (const p of list(["-m", "-o"])) put(p, namedSituation);
      } else if (isDir(join(top, rel))) {
        for (const p of list(["-m", "-o", "--", rel])) put(p, namedSituation);
      } else {
        put(rel, namedSituation);
      }
    }
  }
  return out;
}

const newFilePatch = (path, text) => {
  const body = text.endsWith("\n") ? text.slice(0, -1) : text;
  const lines = body === "" ? [] : body.split("\n");
  return [`diff --git a/${path} b/${path}`, `+++ b/${path}`, `@@ -0,0 +1,${lines.length} @@`, ...lines.map((l) => `+${l}`)].join("\n") + "\n";
};

const contentHits = (patch) => [...secretHitsIn(patch), ...conflictMarkerHitsIn(patch)];

const pathKinds = (p) => {
  const kinds = [];
  if (isSecretPath(p)) kinds.push(KIND.secretPath);
  if (p.split("/").includes("node_modules")) kinds.push(KIND.nodeModules);
  if (p.split("/").pop() === ".DS_Store") kinds.push(KIND.dsStore);
  return kinds;
};

/**
 * What the command would commit that should not be committed. Returns [{ path, line, kind, situation }];
 * line is null for a finding about the path itself. An empty array means allow.
 *
 * Each read is its own step. A step that throws (an unreadable file, a diff over the buffer) loses only
 * its own findings, so the deny still fires on what the other steps found.
 */
export function commitHits(command, cwd) {
  const segs = planFor(command, cwd);
  if (!segs.length) return [];
  const top = run(["rev-parse", "--show-toplevel"], segs[0].cwd).trim();
  const hasHead = tryRun(["rev-parse", "--verify", "-q", "HEAD"], top) !== null;
  // A commit with paths and no -a takes only those paths, so the other staged files are not part of it.
  const takesStaged = segs.some((s) => s.sub === "commit" && (s.all || s.paths.length === 0));
  const staged = takesStaged ? lines0(tryRun(["diff", "--cached", "--name-only", "--diff-filter=d", "-z"], top)) : [];
  const worktree = [...worktreeCandidates(segs, top)].filter(([p]) => existsSync(join(top, p)) && !isDir(join(top, p)));

  const situations = new Map();
  for (const p of staged) situations.set(p, SITUATION.staged);
  for (const [p, s] of worktree) if (!situations.has(p)) situations.set(p, s);

  const hits = [];
  const seen = new Set();
  const push = (h) => {
    const key = `${h.path}\0${h.line}\0${h.kind}`;
    if (!seen.has(key)) {
      seen.add(key);
      hits.push(h);
    }
  };
  const safely = (step) => {
    try {
      step();
    } catch {
      /* one unreadable file or failed read must not discard the findings already collected */
    }
  };
  const found = (hs) => {
    for (const h of hs) push({ ...h, situation: situations.get(h.path) ?? SITUATION.fallback });
  };
  const pathFindings = (p) => {
    for (const kind of pathKinds(p)) push({ path: p, line: null, kind, situation: situations.get(p) ?? SITUATION.fallback });
  };

  for (const p of staged) pathFindings(p);
  for (const chunk of chunks(staged)) {
    safely(() => found(contentHits(run(["diff", "--cached", ...DIFF_FLAGS, "--", ...chunk], top, MAX_BUFFER))));
  }

  for (const [p] of worktree) pathFindings(p);
  let budget = UNTRACKED_BUDGET_BYTES;
  for (const chunk of chunks(worktree.map(([p]) => p))) {
    const tracked = new Set(lines0(tryRun(["ls-files", "-z", "--full-name", "--", ...chunk], top)));
    for (const p of chunk) {
      if (tracked.has(p)) continue;
      if (budget <= 0) break;
      safely(() => {
        const full = join(top, p);
        const size = statSync(full).size;
        if (size > MAX_UNTRACKED_BYTES) return;
        budget -= size;
        const buf = readFileSync(full);
        if (buf.includes(0)) return;
        found(contentHits(newFilePatch(p, buf.toString("utf8"))));
      });
    }
    const trackedPaths = chunk.filter((p) => tracked.has(p));
    const args = hasHead ? ["diff", "HEAD", ...DIFF_FLAGS, "--"] : ["diff", ...DIFF_FLAGS, "--"];
    for (const sub of chunks(trackedPaths)) {
      safely(() => found(contentHits(run([...args, ...sub], top))));
    }
  }
  return hits;
}

/** The deny text. Plain English, one line per hit, no matched value, and the exact way out. */
export function reasonFor(hits) {
  const shown = hits.slice(0, MAX_LISTED).map((h) => `${h.line ? `${h.path}:${h.line}` : h.path} (${h.kind}), ${h.situation}`);
  const more = hits.length > MAX_LISTED ? `, and ${hits.length - MAX_LISTED} more` : "";
  const staged = hits.some((h) => h.situation === SITUATION.staged);
  const notStaged = hits.some((h) => h.situation !== SITUATION.staged);
  const commitAll = hits.some((h) => h.situation === SITUATION.commitAll);
  const conflict = hits.some((h) => h.kind === KIND.conflict);
  return [
    `product-engineer commit guard blocked this command because it would commit something that should not be committed: ${shown.join("; ")}${more}. The matched values are not shown.`,
    staged ? "For a path that is already staged, run `git restore --staged <path>` (this also works for a newly added file). Keep that file out, finish the commit with the rest, and name each file you left out and why in your final answer." : null,
    commitAll ? "For a tracked file that is modified but not staged, commit by name or revert that edit; unstaging does not apply to it, and commit -a would include the edit." : null,
    notStaged ? "For a path that is not staged yet, do not add it: stage the other files by name instead of using git add -A or git commit -a." : null,
    conflict ? "A conflict marker means the file still holds merge markers. Resolve the conflict, or tell the person the file is unresolved; do not commit it silently." : null,
    "If the person explicitly asked to commit that file, run the same command again with PE_ALLOW_STAGED=1 in front of the git command.",
  ]
    .filter(Boolean)
    .join(" ");
}

function main() {
  try {
    run_();
  } catch {
    /* a hook that fails must not block the agent */
  }
}

function run_() {
  if (process.env.PRODUCT_ENGINEER_NO_GATE === "1") return;
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return;
  }
  if (input?.tool_name !== "Bash") return;
  const command = input.tool_input?.command;
  if (typeof command !== "string" || !command.trim()) return;
  const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : process.cwd();
  const hits = commitHits(command, cwd);
  if (!hits.length) return;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reasonFor(hits) } }) + "\n");
}

const isEntry = () => {
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
};
if (isEntry()) main();
