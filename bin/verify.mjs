// product-engineer verify: objective checks that the Stop hook runs before an agent may finish. Each check
// reads git, the files it names and the session's own tool calls; none calls a model or the network.
// Every finding names the command that settles it. A check that fails returns no finding (fail open),
// and the whole run stops at a time budget.
//
// Checks, each only when the session wrote a file in a git work tree:
//   tests-not-run     a source file was written after the last test command
//   twins-open        the change left near-copies of removed lines and nothing searched for them
//   names-dangling    an identifier the change removed is still used in a tracked file
//   notes-check       a release-notes file names a range and announces cancelled work or omits gone names
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { isDocPath, isLockPath, isTestPath } from "./diff.mjs";
import { twins as twinsOf } from "./twins.mjs";
import { parseRange, range as ledgerRange, tokensOf } from "./range.mjs";
import { notes as checkNotes } from "./notes.mjs";
import { TEST_RUN } from "./claim-gate.mjs";

const BUDGET_MS = 3000;
const SHOWN = 5;
const TOKEN_CAP = 100;
const TOKEN_MIN = 4;
const COMMENT_LINE = /^\s*(?:\/\/|#|\/\*|\*|<!--|--|;)/;
const GIT_COMMIT = /\bgit\s+(?:-\S+\s+)*commit\b/;
const GREP_RUN = /\bgit\s+(?:-\S+\s+)*grep\b|\brg\b|\bgrep\b/;
const TWINS_RUN = /\b(?:product-engineer|check\.mjs)\s+twins\b|\btwins\.mjs\b/;
const NOTES_NAME = /release|changelog|changes|notes|whats[-_ ]?new/i;
const NOTES_EXT = /\.(?:md|txt)$/i;

const git = (args, cwd) =>
  execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });
// git grep exits 1 when nothing matches: an empty answer, not an error.
const gitGrep = (args, cwd) => {
  try {
    return git(["grep", ...args], cwd);
  } catch (err) {
    if (err && err.status === 1) return "";
    throw err;
  }
};

const clip = (s, n = 80) => {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n - 3)}...` : t;
};
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (token) => new RegExp(`(?<![A-Za-z0-9_])${escapeRe(token)}(?![A-Za-z0-9_])`);
const lastIndex = (list, pred) => {
  for (let i = list.length - 1; i >= 0; i--) if (pred(list[i])) return i;
  return -1;
};
const memo = (fn) => {
  let done = false;
  let value;
  return () => {
    if (!done) { value = fn(); done = true; }
    return value;
  };
};

/** The new-side path of a patch header line ("+++ b/x"), or the old side ("--- a/x"); null for /dev/null. */
const sidePath = (raw, prefix) => {
  const p = raw.replace(/\t$/, "").replace(/^"|"$/g, "");
  if (p === "/dev/null") return null;
  return p.startsWith(prefix) ? p.slice(prefix.length) : p;
};

/** Removed and added lines of a zero-context patch, with their line numbers on each side. */
export function parseChange(patch) {
  const removed = [];
  const added = [];
  let oldPath = null;
  let newPath = null;
  let header = false;
  let oldN = 0;
  let newN = 0;
  for (const line of patch.split("\n")) {
    if (line.startsWith("diff --git ")) { header = true; oldPath = null; newPath = null; continue; }
    if (header) {
      if (line.startsWith("--- ")) { oldPath = sidePath(line.slice(4), "a/"); continue; }
      if (line.startsWith("+++ ")) { newPath = sidePath(line.slice(4), "b/"); continue; }
      const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (hunk) { header = false; oldN = Number(hunk[1]); newN = Number(hunk[2]); }
      continue;
    }
    if (line.startsWith("-")) {
      if (oldPath) removed.push({ path: oldPath, line: oldN, text: line.slice(1) });
      oldN++;
    } else if (line.startsWith("+")) {
      if (newPath) added.push({ path: newPath, line: newN, text: line.slice(1) });
      newN++;
    } else if (line.startsWith(" ")) {
      oldN++;
      newN++;
    }
  }
  return { removed, added };
}

/**
 * The session's change: the working tree (staged and unstaged) against HEAD, else the last commit when the session
 * ran git commit. Null when there is neither, or when HEAD cannot be read.
 */
function readChange(top, session) {
  let range;
  try {
    if (git(["diff", "--name-only", "HEAD"], top).trim()) range = "HEAD";
  } catch {
    return null;
  }
  if (!range) {
    if (!session.events.some((e) => e.kind === "bash" && GIT_COMMIT.test(e.command))) return null;
    range = "HEAD~1..HEAD";
  }
  const args = range === "HEAD" ? ["HEAD"] : ["HEAD~1", "HEAD"];
  const patch = git(["diff", "-U0", "--no-color", "--no-ext-diff", "--no-renames", "--src-prefix=a/", "--dst-prefix=b/", ...args], top);
  return { range, ...parseChange(patch) };
}

/** Identifier-like tokens of the removed lines of non-test, non-doc, non-lock files, comments left out. */
function removedTokens(change) {
  const set = new Set();
  for (const r of change.removed) {
    if (isTestPath(r.path) || isDocPath(r.path) || isLockPath(r.path)) continue;
    if (COMMENT_LINE.test(r.text)) continue;
    for (const t of tokensOf(r.text, TOKEN_MIN)) set.add(t);
  }
  return [...set];
}

/** The repository top (its real path), or null when cwd is not inside a git work tree. */
function repoTop(cwd) {
  try {
    if (git(["rev-parse", "--is-inside-work-tree"], cwd).trim() !== "true") return null;
    return realpathSync(git(["rev-parse", "--show-toplevel"], cwd).trim());
  } catch {
    return null;
  }
}

/** The real path of a path that may not exist yet: its nearest existing ancestor is resolved, the rest is appended. */
function realOf(path) {
  const rest = [];
  let cur = path;
  for (;;) {
    try {
      return join(realpathSync(cur), ...rest.reverse());
    } catch {
      const parent = dirname(cur);
      if (parent === cur) return path;
      rest.push(basename(cur));
      cur = parent;
    }
  }
}

/** A written path as a repository-relative path, or null when it lies outside the repository. */
function repoPath(ctx, path) {
  const rel = relative(ctx.top, realOf(resolve(ctx.cwd, path)));
  if (!rel || rel === ".." || rel.startsWith("../") || isAbsolute(rel)) return null;
  return rel.split("\\").join("/");
}

/** The test command the repository has, or null. package.json wins; otherwise the test files name their runner. */
function testCommand(ctx) {
  try {
    const script = JSON.parse(readFileSync(join(ctx.top, "package.json"), "utf8"))?.scripts?.test;
    if (typeof script === "string" && script.trim() && !/no test specified/.test(script)) return "npm test";
  } catch { /* no package.json */ }
  const files = ctx.tracked();
  if (files.some((f) => /\.test\.(?:js|mjs|cjs|ts)$/.test(f))) return "node --test";
  if (files.some((f) => /(^|\/)test_[^/]*\.py$/.test(f))) return "pytest";
  if (files.some((f) => /_test\.go$/.test(f))) return "go test ./...";
  return null;
}

function testsNotRun(ctx) {
  const { events } = ctx.session;
  const lastRun = lastIndex(events, (e) => e.kind === "bash" && TEST_RUN.test(e.command));
  const files = [];
  for (const e of events.slice(lastRun + 1)) {
    if (e.kind !== "write" || !e.path) continue;
    const rel = repoPath(ctx, e.path);
    if (!rel || isTestPath(rel) || isDocPath(rel) || isLockPath(rel)) continue;
    if (!files.includes(rel)) files.push(rel);
  }
  if (!files.length) return [];
  const command = testCommand(ctx);
  if (!command) return [];
  const more = files.length > SHOWN ? `, and ${files.length - SHOWN} more` : "";
  return [{ id: "tests-not-run", text: `Source files changed after the last test run (${files.slice(0, SHOWN).join(", ")}${more}). Run ${command} and read the result.` }];
}

function namesDangling(ctx) {
  const change = ctx.change();
  if (!change) return [];
  const tokens = removedTokens(change).slice(0, TOKEN_CAP);
  const addedBlob = change.added.map((a) => a.text).join("\n");
  const candidates = tokens.filter((t) => !wordRe(t).test(addedBlob));
  if (!candidates.length) return [];
  const addedAt = new Set(change.added.map((a) => `${a.path}:${a.line}`));
  const dir = mkdtempSync(join(tmpdir(), "pe-verify-"));
  const items = [];
  try {
    const patternFile = join(dir, "tokens.txt");
    writeFileSync(patternFile, `${candidates.join("\n")}\n`);
    const rows = gitGrep(["-n", "-I", "-w", "-F", "-f", patternFile], ctx.top).split("\n");
    const matchers = candidates.map((t) => [t, wordRe(t)]);
    for (const row of rows) {
      if (items.length >= SHOWN) break;
      const m = /^([^:]+):(\d+):(.*)$/.exec(row);
      if (!m || addedAt.has(`${m[1]}:${m[2]}`)) continue;
      for (const [token, re] of matchers) {
        if (items.length < SHOWN && re.test(m[3])) items.push({ token, path: m[1], line: Number(m[2]) });
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  if (!items.length) return [];
  const where = items.map((i) => `${i.token} at ${i.path}:${i.line}`).join("; ");
  return [{ id: "names-dangling", text: `Still referenced after the change: ${where}. Run git grep -n -w <name> for each name above and update or remove each reference.` }];
}

function twinsOpen(ctx) {
  const change = ctx.change();
  if (!change) return [];
  const { events } = ctx.session;
  if (events.some((e) => e.kind === "bash" && TWINS_RUN.test(e.command))) return [];
  const tokens = removedTokens(change);
  if (events.some((e) => e.kind === "bash" && GREP_RUN.test(e.command) && tokens.some((t) => e.command.includes(t)))) return [];
  const report = twinsOf({ range: change.range, cwd: ctx.top });
  const items = [];
  for (const r of report.removed) for (const t of r.twins) if (items.length < SHOWN) items.push({ t, r });
  if (!items.length) return [];
  const list = items.map(({ t, r }) => `twin ${t.path}:${t.line} (resembles removed ${r.path}:${r.line} "${clip(r.text, 60)}")`).join("; ");
  return [{ id: "twins-open", text: `Lines with the same shape as lines this change removed: ${list}. Run product-engineer twins and fix each copy that has the same defect, or say why it does not.` }];
}

/** A range named on the first line of a notes file: "since <ref>" or "<a>..<b>". Null when neither is there. */
export function rangeOf(line) {
  const since = /\bsince\s+([^\s`*_()]+)/i.exec(line);
  if (since) return since[1].replace(/[.,;:]+$/, "");
  const dots = /([^\s`*_()]+)\.\.([^\s`*_()]*)/.exec(line);
  if (dots) return `${dots[1]}..${dots[2] || "HEAD"}`;
  return null;
}

function notesCheck(ctx) {
  const findings = [];
  const seen = new Set();
  for (const e of ctx.session.events) {
    if (e.kind !== "write" || !e.path || seen.has(e.path)) continue;
    seen.add(e.path);
    const base = basename(e.path);
    if (!NOTES_NAME.test(base) || !NOTES_EXT.test(base)) continue;
    const rel = repoPath(ctx, e.path);
    if (!rel) continue;
    let text;
    try {
      text = readFileSync(join(ctx.top, rel), "utf8");
    } catch {
      continue;
    }
    const first = text.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
    const rangeArg = rangeOf(first);
    const parsed = rangeArg && parseRange(rangeArg);
    if (!parsed) continue;
    let ledger;
    try {
      ledger = ledgerRange({ ...parsed, cwd: ctx.top });
    } catch {
      continue;
    }
    const cancelled = ledger.commits.filter((c) => c.net?.state === "cancelled").map((c) => ({ subject: c.subject, by: c.net.by }));
    const announced = checkNotes(text, { cancelled }).findings.filter((f) => f.code === "cancelled-announced");
    const lower = text.toLowerCase();
    const gone = ledger.gonenames.filter((g) => g.files >= 2 && !lower.includes(g.name.toLowerCase())).slice(0, SHOWN).map((g) => g.name);
    const parts = [];
    if (announced.length) {
      const items = announced.slice(0, SHOWN).map((f) => `${rel}:${f.line}`).join(", ");
      parts.push(`Release notes announce work this range cancelled: ${items}. Move each such line under "Not in this release" or remove it.`);
    }
    if (gone.length) {
      parts.push(`Names gone since ${parsed.from} that the notes never mention: ${gone.join(", ")}. Check each one before the notes ship.`);
    }
    if (parts.length) findings.push({ id: "notes-check", text: `${parts.join(" ")} Run product-engineer notes ${rel} --range ${rangeArg} to settle it.` });
  }
  return findings;
}

/**
 * The findings for one session. `limits` may set budgetMs (default 3000) and now (default Date.now); the budget is
 * checked between checks. Any error returns the findings found so far, and no error at all returns no findings.
 */
export function verify({ cwd = process.cwd(), session, limits = {} } = {}) {
  try {
    if (!session || !Array.isArray(session.events) || !session.events.some((e) => e.kind === "write")) return [];
    const budget = limits.budgetMs ?? BUDGET_MS;
    const now = limits.now ?? Date.now;
    const start = now();
    const over = () => now() - start > budget;
    const top = repoTop(cwd);
    if (!top) return [];
    const ctx = {
      cwd,
      top,
      session,
      change: memo(() => {
        try {
          return readChange(top, session);
        } catch {
          return null;
        }
      }),
      tracked: memo(() => {
        try {
          return git(["ls-files", "-z"], top).split("\0").filter(Boolean);
        } catch {
          return [];
        }
      }),
    };
    const checks = [testsNotRun, namesDangling, notesCheck, twinsOpen];
    const findings = [];
    for (const check of checks) {
      if (over()) break;
      try {
        findings.push(...check(ctx));
      } catch {
        // fail open: a check that errors says nothing
      }
    }
    return findings;
  } catch {
    return [];
  }
}
