// product-engineer verify: objective checks that the Stop hook runs before an agent may finish. Each check
// reads git, the files it names and the session's own tool calls; none calls a model or the network.
// Every finding names the command that settles it. A check that fails returns no finding (fail open),
// and the whole run stops at a time budget.
//
// Checks, each only when the session wrote a file in a git work tree:
//   tests-not-run     a source file was written after the last test command
//   twins-open        the change left near-copies of removed lines (same shape, or same calls and operators) and nothing searched for them
//   refactor-unchecked a refactor changed source with no run of the old and new behaviour before the edit or after it
//   names-dangling    an identifier the change removed is still used in a tracked file
//   notes-check       a release-notes file names a range and announces cancelled work, omits gone names, or leaves a doc describing cancelled work
//   stale-docs        a release-notes, changelog or upgrade-guide file (range from its first line, else the latest tag) with a doc that still describes cancelled work
//   tests-red         the last test run after the last source edit reports failures the answer does not mention
//   fix-not-redgreen  a bug-fix request changed source with no red-then-green test run and no new test run after the edit
//   stubs-in-change   the change adds stub markers or skipped tests (the stubs scan on the change's added lines)
//   unwired-file      a new source file that no tracked or untracked file mentions
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { isDocPath, isLockPath, isTestPath } from "./diff.mjs";
import { twins as twinsOf } from "./twins.mjs";
import { parseRange, range as ledgerRange, tokensOf } from "./range.mjs";
import { notes as checkNotes } from "./notes.mjs";
import { FIX_REQUEST, TEST_RUN, findClaims } from "./claim-gate.mjs";
import { scanAdded } from "./stubs.mjs";
import { readBaseline } from "./brief.mjs";

const BUDGET_MS = 3000;
const SHOWN = 5;
const MENTIONS_SHOWN = 3;
const TOKEN_CAP = 100;
const TOKEN_MIN = 4;
const COMMENT_LINE = /^\s*(?:\/\/|#|\/\*|\*|<!--|--|;)/;
const GIT_COMMIT = /\bgit\s+(?:-\S+\s+)*commit\b/;
const GREP_RUN = /\bgit\s+(?:-\S+\s+)*grep\b|\brg\b|\bgrep\b/;
const TWINS_RUN = /\b(?:product-engineer|check\.mjs)\s+twins\b|\btwins\.mjs\b/;
const NOTES_NAME = /release|changelog|changes|notes|whats[-_ ]?new/i;
const NOTES_EXT = /\.(?:md|txt)$/i;
const STALE_NAME = /release|changelog|upgrad|migrat|notes/i;
const DOC_EXT = /\.(?:md|mdx|txt|rst)$/i;
const ANSWER_MENTIONS_FAILURE = /\bfail\w*|\bred\b|not passing|\bhata\w*|başarısız/i;
const UNWIRED_MAX = 3;
const SKIP_BASENAMES = new Set(["index", "main", "cli", "__init__", "mod"]);
const CODE_FILE = /\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|rb|php|cs|swift|c|cc|cpp|h|hpp)$/i;
const CONFIG_FILE = /(?:^|\/)(?:\.[^/]*|[^/]*\.(?:json|ya?ml|toml|ini|cfg|lock))$/i;
const TEST_STUB_CODES = new Set(["skipped-test", "focused-test"]);

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
function readChange(top, session, sessionId) {
  // With a session baseline (recorded at SessionStart), the change is what the working tree holds beyond the baseline.
  // An empty diff from the baseline means the session changed nothing here, unless it ran git commit.
  const base = baselineRef(top, sessionId);
  if (base) {
    const patch = git(["diff", "-U0", "--no-color", "--no-ext-diff", "--no-renames", "--src-prefix=a/", "--dst-prefix=b/", base], top);
    if (patch.trim()) return { range: "HEAD", baseline: true, ...parseChange(patch) };
    if (!session.events.some((e) => e.kind === "bash" && GIT_COMMIT.test(e.command))) return null;
  }
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

/** The baseline commit or stash of a session when it is recorded and still in the repository, else null. */
function baselineRef(top, sessionId) {
  const b = readBaseline(sessionId);
  const ref = b ? b.stash ?? b.head : null;
  if (!ref) return null;
  try {
    git(["cat-file", "-e", `${ref}^{commit}`], top);
    return ref;
  } catch {
    return null;
  }
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

/**
 * The change narrowed to the files this session wrote. Without a recorded baseline the change is the working tree against
 * HEAD, which also holds the owner's unfinished work in files the session never opened; a finding about those files is not
 * about the session. A write that names no path (sed -i, a redirect, mv) is matched by the file names its command mentions;
 * when such a write names no changed file, the change is kept whole rather than guessed. A change read from a baseline is
 * already the session's own and is returned as it is.
 */
export function scopeChange(change, written, shellCommands = []) {
  if (!change || change.baseline) return change;
  const paths = new Set(written);
  const changed = new Set([...change.removed, ...change.added].map((l) => l.path));
  const mentioned = (p) => shellCommands.some((c) => c.split(/[\s"'<>|;&=()]+/).some((t) => t && (t.replace(/^\.\//, "") === p || p.endsWith(`/${t.replace(/^\.\//, "")}`))));
  if (shellCommands.length) {
    const hit = [...changed].filter(mentioned);
    for (const p of hit) paths.add(p);
  }
  if (!paths.size) return change;
  const keep = (l) => paths.has(l.path);
  return { ...change, removed: change.removed.filter(keep), added: change.added.filter(keep), addedAll: change.added, scope: paths };
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
  // A name written again anywhere in the change (also in a file the session did not write) is not dangling.
  const addedAny = change.addedAll ?? change.added;
  const addedBlob = addedAny.map((a) => a.text).join("\n");
  const candidates = tokens.filter((t) => !wordRe(t).test(addedBlob));
  if (!candidates.length) return [];
  const addedAt = new Set(addedAny.map((a) => `${a.path}:${a.line}`));
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
  const grepped = events.some((e) => e.kind === "bash" && GREP_RUN.test(e.command) && tokens.some((t) => e.command.includes(t)));
  const report = twinsOf({ range: change.range, cwd: ctx.top, paths: change.scope ? [...change.scope] : null });
  const items = [];
  for (const r of grepped ? [] : report.removed) {
    for (const t of r.twins) if (items.length < SHOWN) items.push({ t, r, loose: false });
    for (const t of r.loose) if (items.length < SHOWN) items.push({ t, r, loose: true });
  }
  const stale = (report.stale ?? []).slice(0, SHOWN).map((v) => `${v.path}:${v.line} still says ${v.from} (changed to ${v.to} at ${v.changed})`);
  if (!items.length && !stale.length) return [];
  if (!items.length) return [{ id: "twins-open", text: `Old values still written elsewhere: ${stale.join("; ")}. Run product-engineer twins and update each line that states the same thing, or say why it stays.` }];
  const list = items.map(({ t, r, loose }) => `twin ${t.path}:${t.line} (resembles removed ${r.path}:${r.line} "${clip(r.text, 60)}")${loose ? " (looser match)" : ""}`).join("; ");
  // Comments that name a changed function often point at the copy (`Same calculation as ...`).
  const named = (report.mentions ?? []).slice(0, MENTIONS_SHOWN).map((m) => `${m.path}:${m.line} "${clip(m.text, 60)}"`);
  const comments = named.length ? ` Comments that name the changed code: ${named.join("; ")}.` : "";
  return [{ id: "twins-open", text: `Lines that match lines this change removed: ${list}.${comments} ${stale.length ? ` Old values still written elsewhere: ${stale.join("; ")}.` : ""} Run product-engineer twins and fix each copy that has the same defect, or say why it does not.` }];
}

// A prompt that asks for a refactor, cleanup or merge. A bug fix with none of these words is not checked here.
const REFACTOR = /\brefactor(?:s|ed|ing)?\b|\bpull (?:\w+ ){0,4}into one\b|\bextract\b[^.\n]{0,40}\b(?:into|to) (?:a |an |its own |one |new )?(?:function|helper|module|method|class|component|constant|file)s?\b|\bdedupe\b|\bdeduplicate\b|\bmerge (?:\w+ ){0,3}(?:functions|helpers|modules)\b|\bno behaviou?r change\b|\bclean ?up (?:the |this |these |those )?(?:duplicates?|helpers?|modules?|dead code|duplicated code)\b/i;
const CODE_RUN = /\bnode\s+(?:-[ep]\b|[^-\s])|\bpython3?\s+-c\b/;
const COMPARE_RUN = /\bgit\s+(?:-\S+\s+)*(?:show|stash|worktree)\b/;
const NODE_EVAL = /\bnode\s+-e\b/;

/**
 * A refactor that changed source with no baseline: no command before the first source edit ran code or tests, and no
 * command ran the old and new versions side by side (git show or stash or worktree, with node -e).
 */
function refactorUnchecked(ctx) {
  const { events, prompt } = ctx.session;
  if (!REFACTOR.test(prompt)) return [];
  const edits = sourceEdits(ctx);
  if (!edits.length) return [];
  const firstEdit = edits[0].i;
  if (events.slice(0, firstEdit).some((e) => e.kind === "bash" && (CODE_RUN.test(e.command) || TEST_RUN.test(e.command)))) return [];
  if (events.some((e) => e.kind === "bash" && COMPARE_RUN.test(e.command) && NODE_EVAL.test(e.command))) return [];
  return [{ id: "refactor-unchecked", text: "Before changing code that must keep its behaviour, run the old version on the inputs where the copies differ (git show HEAD:<path> > /tmp/old.js; node -e ...) and compare it with the new one; say what differed." }];
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
    const ledger = ledgerOf(ctx, rangeArg, parsed);
    if (!ledger) continue;
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
    const stale = staleLines(ledger, rel);
    if (stale.length) {
      parts.push(...stale.map(staleText));
      ctx.staleCovered.add(rel);
    }
    if (parts.length) findings.push({ id: "notes-check", text: `${parts.join(" ")} Run product-engineer notes ${rel} --range ${rangeArg} to settle it.` });
  }
  return findings;
}

/** The ledger of a range, read once per range text in a verify run; null when git cannot read the range. */
function ledgerOf(ctx, rangeArg, parsed) {
  if (!ctx.ledgers.has(rangeArg)) {
    let ledger = null;
    try {
      ledger = ledgerRange({ ...parsed, cwd: ctx.top });
    } catch {
      ledger = null;
    }
    ctx.ledgers.set(rangeArg, ledger);
  }
  return ctx.ledgers.get(rangeArg);
}

/** The doc lines a range's cancelled work leaves behind, at most SHOWN, without the notes file itself. */
function staleLines(ledger, rel) {
  return (ledger.staledocs ?? []).filter((d) => d.path !== rel).slice(0, SHOWN);
}

const staleText = (d) => `${d.path}:${d.line} still describes ${d.token}, which was added and reverted in this range. Fix the document or tell the owner it is stale.`;

/** The latest tag as a range to HEAD (`<tag>..HEAD`), or null when the repository has no tag reachable from HEAD. */
function latestTagRange(top) {
  try {
    const tag = git(["describe", "--tags", "--abbrev=0", "HEAD"], top).trim();
    return tag ? `${tag}..HEAD` : null;
  } catch {
    return null;
  }
}

/**
 * The notes-like files the session wrote with no finding from notes-check: a doc at HEAD that still describes work the
 * range cancelled. The range is the one on the first line, else the latest tag to HEAD.
 */
function staleDocs(ctx) {
  const findings = [];
  const seen = new Set();
  for (const e of ctx.session.events) {
    if (e.kind !== "write" || !e.path || seen.has(e.path)) continue;
    seen.add(e.path);
    const base = basename(e.path);
    if (!STALE_NAME.test(base) || !DOC_EXT.test(base)) continue;
    const rel = repoPath(ctx, e.path);
    if (!rel || ctx.staleCovered.has(rel)) continue;
    let text;
    try {
      text = readFileSync(join(ctx.top, rel), "utf8");
    } catch {
      continue;
    }
    const first = text.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
    const rangeArg = rangeOf(first) ?? latestTagRange(ctx.top);
    const parsed = rangeArg && parseRange(rangeArg);
    if (!parsed) continue;
    const ledger = ledgerOf(ctx, rangeArg, parsed);
    if (!ledger) continue;
    const items = staleLines(ledger, rel);
    if (items.length) findings.push({ id: "stale-docs", text: `${items.map(staleText).join(" ")} Run product-engineer range ${rangeArg} to see the cancelled commits.` });
  }
  return findings;
}

/** The failing-test count in a test runner's printed summary: a number (0 for a green run), or null when no known summary is there. */
export function failingCount(output) {
  if (!output) return null;
  // node --test (spec reporter and TAP)
  const node = lastMatch(output, /(?:ℹ fail|^# fail) (\d+)/m);
  if (node) return Number(node[1]);
  // jest and vitest: the "Tests:" (jest) or "Tests  " (vitest) summary line
  const jest = lastMatch(output, /^\s*Tests:?\s+(.+)$/m);
  if (jest) return failedIn(jest[1]);
  // pytest: "=== 1 failed, 2 passed in 0.12s ==="
  const py = lastMatch(output, /^=+ (.*\bin [\d.]+s\b[^=\n]*)=*\s*$/m);
  if (py) return failedIn(py[1]);
  // cargo: "test result: FAILED. 2 passed; 1 failed" (one line per test binary)
  const cargo = [...output.matchAll(/test result: (?:ok|FAILED)\. \d+ passed; (\d+) failed/g)];
  if (cargo.length) return cargo.reduce((n, m) => n + Number(m[1]), 0);
  // go: "--- FAIL: TestX" per failing test, "FAIL\tpkg" per failing package, "ok\tpkg" or "PASS" when green
  const goFail = (output.match(/^--- FAIL:/gm) ?? []).length;
  if (goFail) return goFail;
  if (/^FAIL\t/m.test(output)) return 1;
  if (/^(?:ok\s|PASS$)/m.test(output)) return 0;
  // npm: "npm ERR!" with the runner's "exit code N" line
  const exit = lastMatch(output, /exit code (\d+)/i);
  if (/^npm ERR!/m.test(output) && exit) return Number(exit[1]) === 0 ? 0 : 1;
  return null;
}

const failedIn = (summary) => {
  const m = /(\d+) failed/.exec(summary);
  return m ? Number(m[1]) : 0;
};

function lastMatch(text, re) {
  const g = new RegExp(re.source, `${re.flags.replace("g", "")}g`);
  let m = null;
  for (const x of text.matchAll(g)) m = x;
  return m;
}

/** The session's source writes as event indexes with repository paths; tests, docs and lock files are left out. */
function sourceEdits(ctx) {
  const out = [];
  ctx.session.events.forEach((e, i) => {
    if (e.kind !== "write" || !e.path) return;
    const rel = repoPath(ctx, e.path);
    if (!rel || isTestPath(rel) || isDocPath(rel) || isLockPath(rel)) return;
    out.push({ i, rel });
  });
  return out;
}

function testsRed(ctx) {
  const { events } = ctx.session;
  const edits = sourceEdits(ctx);
  const lastEdit = edits.length ? edits[edits.length - 1].i : -1;
  const runAt = lastIndex(events, (e) => e.kind === "bash" && TEST_RUN.test(e.command));
  if (runAt < 0 || runAt < lastEdit) return [];
  const run = events[runAt];
  if (run.output === undefined) return [];
  const failed = failingCount(run.output);
  if (!failed) return [];
  const cmd = clip(run.command, 80);
  const answer = ctx.answer;
  if (findClaims(answer).some((c) => c.family === "passing")) {
    return [{ id: "tests-red", text: `The last test run (${cmd}) reported ${failed} failing, and your answer says the tests pass. Fix them or report them.` }];
  }
  if (ANSWER_MENTIONS_FAILURE.test(answer)) return [];
  return [{ id: "tests-red", text: `The last test run (${cmd}) reported ${failed} failing; your answer does not say so. Fix them or report them.` }];
}

function fixNotRedGreen(ctx) {
  const { events, prompt } = ctx.session;
  if (!FIX_REQUEST.test(prompt)) return [];
  const edits = sourceEdits(ctx);
  if (!edits.length || !testCommand(ctx)) return [];
  const lastEdit = edits[edits.length - 1].i;
  const runs = events.map((e, i) => ({ e, i })).filter(({ e }) => e.kind === "bash" && TEST_RUN.test(e.command));
  const redBefore = runs.some(({ e, i }) => i < lastEdit && failingCount(e.output) > 0);
  const greenAfter = runs.some(({ e, i }) => i > lastEdit && failingCount(e.output) === 0);
  if (redBefore && greenAfter) return [];
  const testWritten = events.some((e) => e.kind === "write" && e.path && isTestPath(repoPath(ctx, e.path) ?? ""));
  const runAfter = runs.some(({ i }) => i > lastEdit);
  if (testWritten && runAfter) return [];
  return [{ id: "fix-not-redgreen", text: "No red-then-green evidence for the fix: run the new test against the old code (undo the fix, run, restore) or say you could not. Run the test command before the edit, watch it fail, then run it again after the edit." }];
}

/** The repository paths the session wrote that git does not track yet (and does not ignore). */
function untrackedWritten(ctx) {
  const untracked = new Set(git(["ls-files", "--others", "--exclude-standard", "-z"], ctx.top).split("\0").filter(Boolean));
  const out = new Set();
  for (const e of ctx.session.events) {
    if (e.kind !== "write" || !e.path) continue;
    const rel = repoPath(ctx, e.path);
    if (rel && untracked.has(rel)) out.add(rel);
  }
  return out;
}

function stubsInChange(ctx) {
  const change = ctx.change();
  const committed = change?.range === "HEAD~1..HEAD";
  const fresh = untrackedWritten(ctx);
  const added = (change ? change.added : []).filter((a) => !isLockPath(a.path)).map((a) => ({ file: a.path, line: a.line, text: a.text }));
  // A new file the session wrote is part of the change even before git knows about it.
  for (const rel of fresh) {
    let lines;
    try {
      lines = readFileSync(join(ctx.top, rel), "utf8").split("\n");
    } catch {
      continue;
    }
    if (lines.some((l) => l.includes("\0"))) continue;
    lines.forEach((text, i) => added.push({ file: rel, line: i + 1, text }));
  }
  if (!added.length) return [];
  const read = (file) => {
    try {
      return committed && !fresh.has(file) ? git(["show", `HEAD:${file}`], ctx.top).split("\n") : readFileSync(join(ctx.top, file), "utf8").split("\n");
    } catch {
      return null;
    }
  };
  const { findings } = scanAdded(added, { read });
  const kept = findings.filter((f) => !isTestPath(f.file) || TEST_STUB_CODES.has(f.code)).slice(0, SHOWN);
  if (!kept.length) return [];
  const list = kept.map((f) => `${f.file}:${f.line} ${f.code}`).join("; ");
  const scope = committed ? ` --range ${change.range}` : "";
  return [{ id: "stubs-in-change", text: `Added lines carry stub or skip markers: ${list}. Run product-engineer stubs${scope} and fix each one, or say why it stays.` }];
}

/** Relative paths that package.json names as entry points (main, bin, exports), without a leading "./". */
function entryPoints(top) {
  const out = new Set();
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(join(top, "package.json"), "utf8"));
  } catch {
    return out;
  }
  const walk = (v) => {
    if (typeof v === "string") out.add(v.replace(/^\.\//, ""));
    else if (v && typeof v === "object") for (const x of Object.values(v)) walk(x);
  };
  walk(pkg.main);
  walk(pkg.bin);
  walk(pkg.exports);
  return out;
}

function unwiredFile(ctx) {
  const added = new Set();
  const change = ctx.change();
  if (change) {
    const args = change.range === "HEAD" ? ["HEAD"] : ["HEAD~1", "HEAD"];
    for (const p of git(["diff", "--name-only", "--diff-filter=A", "--no-renames", ...args], ctx.top).split("\n")) if (p && (!change.scope || change.scope.has(p))) added.add(p);
  }
  for (const rel of untrackedWritten(ctx)) added.add(rel);
  const entries = entryPoints(ctx.top);
  const items = [];
  for (const rel of [...added].sort()) {
    if (items.length >= UNWIRED_MAX) break;
    if (!CODE_FILE.test(rel) || CONFIG_FILE.test(rel) || isTestPath(rel) || isDocPath(rel) || isLockPath(rel) || entries.has(rel)) continue;
    const noExt = rel.replace(/\.[^/.]+$/, "");
    const name = basename(noExt);
    if (SKIP_BASENAMES.has(name)) continue;
    // The name as a word, the last two path segments (the usual relative import, "./lib/x"), and the full path without extension.
    const needles = [...new Set([name, noExt.split("/").slice(-2).join("/"), noExt])];
    const wired = needles.some((needle) => {
      // --untracked: a new file that another new file imports is wired too.
      const rows = gitGrep(["--untracked", "-n", "-I", "-F", "-e", needle], ctx.top).split("\n");
      return rows.some((row) => {
        const m = /^([^:]+):\d+:(.*)$/.exec(row);
        if (!m || m[1] === rel) return false;
        return needle === name ? wordRe(name).test(m[2]) : m[2].includes(needle);
      });
    });
    if (!wired) items.push({ id: "unwired-file", text: `New file ${rel} is referenced nowhere. Wire it in or say it is standalone.` });
  }
  return items;
}

/**
 * The findings for one session. `limits` may set budgetMs (default 3000) and now (default Date.now); the budget is
 * checked between checks. Any error returns the findings found so far, and no error at all returns no findings.
 */
export function verify({ cwd = process.cwd(), session, limits = {}, answer, sessionId } = {}) {
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
      answer: typeof answer === "string" ? answer : String(session.last ?? ""),
      change: memo(() => {
        try {
          const change = readChange(top, session, sessionId);
          const written = session.events.filter((e) => e.kind === "write" && e.path).map((e) => repoPath({ top, cwd }, e.path)).filter(Boolean);
          const shell = session.events.filter((e) => e.kind === "write" && !e.path).flatMap((e) => (e.touches ?? []).concat(e.command ? [e.command] : []));
          return scopeChange(change, written, shell);
        } catch {
          return null;
        }
      }),
      ledgers: new Map(),
      staleCovered: new Set(),
      tracked: memo(() => {
        try {
          return git(["ls-files", "-z"], top).split("\0").filter(Boolean);
        } catch {
          return [];
        }
      }),
    };
    const checks = [testsNotRun, namesDangling, notesCheck, staleDocs, twinsOpen, refactorUnchecked, testsRed, fixNotRedGreen, stubsInChange, unwiredFile];
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
