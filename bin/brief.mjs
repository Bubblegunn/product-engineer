// product-engineer brief: a plain-text brief of a git repository for the start of an agent session.
// Facts come from git and the files on disk. No model, no network. Silent outside a git work tree.
// `--hook` prints the SessionStart JSON line instead, and records the session's baseline ref (the stash
// commit of a dirty tree, else HEAD) so verify can read only what the session changed.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { isDocPath, isLockPath, isTestPath } from "./diff.mjs";
import { range, tokensOf } from "./range.mjs";

export const MAX_CHARS = 1500;
const COMMITS_SHOWN = 6;
const NAMES_SHOWN = 6;
const BRANCHES_SHOWN = 5;
const SKIPPED_SHOWN = 3;
const IDENTIFIERS_SHOWN = 8;
const IDENTIFIER_MIN = 4;
const HOT_WINDOW = 20;
const HOT_MIN = 3;
const HOT_SHOWN = 5;
const AUTHORS_SHOWN = 3;
const AUTHOR_FILES = 50;
const AUTHOR_COMMITS = 1000;
const SUBJECT_WIDTH = 72;
const BRANCH_WIDTH = 100;
const COMMENT_LINE = /^\s*(?:\/\/|#|\/\*|\*|<!--|--|;)/;
const CONVENTIONAL = /^([a-z]+)(\([^)]*\))?!?:/i;
// Skipped or disabled tests, as added or present text (no word boundaries: git grep -E must read the same on every platform).
const SKIP_PATTERN = "\\.(skip|todo)\\(|(^|[^A-Za-z0-9_])x(it|describe|test)\\(|@pytest\\.mark\\.skip|t\\.Skip(Now)?\\(|#\\[ignore\\]|@Disabled|@unittest\\.skip|[{,] *(skip|todo) *: *(true|[\"'`])";
const FINAL = 'Settle counts with product-engineer range / claims, repeated code with twins, and "nothing else uses X" with git grep before you say it.';
/**
 * Rules that hold for every task, printed after the brief at every session start. The skill that carries the long form loads in
 * only some sessions; these lines load in all of them. Each one is general: none names a file, a setting or a value.
 */
export const RULES = [
  "product-engineer rules (they apply to every task in this repository):",
  "1. The request decides the shape of the deliverable. Do what it says in the form it asks for: one commit for one change unless parts are clearly unrelated, and a test-run result goes in your answer, not in a commit message.",
  "2. Before you edit a value, a limit, a version or a name, search the whole repository for it (git grep) and update every place that says the same thing; say which you left and why.",
  "3. Read each file the change touches before you edit it.",
  "4. Report the real test state: run the tests, name each failing, skipped or TODO test, and say what you did not check.",
  "5. Look at every branch (git branch -a, git log --all) before you say what is done or missing.",
  "6. Keep the names and numbers a reader must type, change or check (a setting, option, limit, version). Explain them in plain words next to the exact name; do not remove them.",
  "7. A line that says none or nothing is true only for what was searched; say what that was.",
  "8. State only what a command of this session shows. Leave unrelated work of the owner out of your commit.",
  "9. When a request asks you to do something and you find its premise is off (a wrong version, a branch you did not expect), still do the part that can be undone (an edit, a local commit, a local tag), say what you assumed and what you found, and ask only before something that cannot be undone (a push, a publish, a delete).",
].join("\n");

const USAGE = `usage: product-engineer brief [--hook]
Prints a plain-text brief of the repository: branch, state of the tree, the last commits with their
classes, tests, unmerged branches, the latest tag, skipped tests, identifiers changed, hot files and
the authors of the changed files. At most ${MAX_CHARS} characters; the least important lines go first.
No model and no network. Silent with exit 0 outside a git work tree.
--hook reads the SessionStart JSON on standard input, prints one JSON line with the brief and the
always-on rules as additionalContext, and records the session baseline. PRODUCT_ENGINEER_NO_BRIEF=1 prints no brief.`;

const git = (args, cwd) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });
// A failing git call (no commit yet, no match for git grep, an unknown ref) is an empty answer, not an error.
const gitOrNull = (args, cwd) => {
  try {
    return git(args, cwd);
  } catch {
    return null;
  }
};
const lines = (text) => (text ?? "").split("\n").filter(Boolean);
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 3)}...` : s);
const listOf = (names, n) => {
  const shown = names.slice(0, n).join(", ");
  return names.length > n ? `${shown}, +${names.length - n} more` : shown;
};

/** The top of the work tree (its real path), or null when cwd is not inside one. */
export function repoTop(cwd) {
  if (gitOrNull(["rev-parse", "--is-inside-work-tree"], cwd)?.trim() !== "true") return null;
  const top = gitOrNull(["rev-parse", "--show-toplevel"], cwd)?.trim();
  return top ? realpathSync(top) : null;
}

/** state: the staged, unstaged and untracked files, names capped; or the clean-tree line. */
function stateBlock(top) {
  const entries = git(["status", "--porcelain=v1", "-z"], top).split("\0").filter(Boolean);
  const staged = [];
  const unstaged = [];
  const untracked = [];
  for (let i = 0; i < entries.length; i++) {
    const [x, y] = entries[i];
    const path = entries[i].slice(3);
    // A rename or copy is followed by its original path, which is not a changed file of its own.
    if (x === "R" || x === "C") i++;
    if (x === "?" && y === "?") {
      untracked.push(path);
      continue;
    }
    if (x !== " ") staged.push(path);
    if (y !== " ") unstaged.push(path);
  }
  if (!staged.length && !unstaged.length && !untracked.length) return ["state: clean tree"];
  const items = [];
  for (const [label, names] of [["staged", staged], ["unstaged", unstaged], ["untracked", untracked]]) {
    if (names.length) items.push(`  ${label} (${names.length}): ${listOf(names, NAMES_SHOWN)}`);
  }
  return [`state: ${staged.length} staged, ${unstaged.length} unstaged, ${untracked.length} untracked`, ...items];
}

/** last commits: sha7 type/classes subject, newest first; a mark when the title type contradicts the files. */
function commitsBlock(top) {
  if (gitOrNull(["rev-parse", "--verify", "-q", "HEAD"], top) === null) return ["last commits: none, no commit yet"];
  const count = Number(git(["rev-list", "--count", "HEAD"], top).trim());
  // range() needs a starting commit, so the root commit of the repository is never listed: a repository with one
  // commit has nothing to list, and in a shorter history the root is the one commit left out.
  if (count < 2) return ["last commits: none listed, the only commit is the root commit"];
  // range() lists the commits after HEAD~n, oldest first, with the class and the flags git and the files give.
  const n = Math.min(COMMITS_SHOWN, count - 1);
  const { commits } = range({ from: `HEAD~${n}`, to: "HEAD", cwd: top });
  const items = commits.slice().reverse().map((c) => {
    const type = CONVENTIONAL.exec(c.subject)?.[1].toLowerCase() ?? "untyped";
    const mark = c.flags.some((f) => f.code === "type") ? " [type contradicts the files]" : "";
    return `  ${c.short} ${type}/${c.classes.join("+")} ${clip(c.subject, SUBJECT_WIDTH)}${mark}`;
  });
  return ["last commits (newest first):", ...items];
}

/** tests: the test command, from package.json, then the test files git tracks. */
export function testCommand(top) {
  try {
    const pkg = JSON.parse(readFileSync(join(top, "package.json"), "utf8"));
    const script = pkg?.scripts?.test;
    if (typeof script === "string" && script.trim() && !/no test specified/.test(script)) return "npm test";
  } catch {
    // no readable package.json: the next detectors decide
  }
  const files = lines(gitOrNull(["ls-files"], top));
  if (files.some((f) => /(^|\/)[^/]+\.test\.(mjs|cjs|js)$/.test(f))) return "node --test";
  if (files.some((f) => /(^|\/)test_[^/]+\.py$/.test(f) || /(^|\/)[^/]+_test\.py$/.test(f))) return "pytest";
  if (files.some((f) => /(^|\/)[^/]+_test\.go$/.test(f))) return "go test ./...";
  if (files.includes("Cargo.toml")) return "cargo test";
  return null;
}
const testsBlock = (top) => [`tests: ${testCommand(top) ?? "no test command found (looked at the package.json test script and the names of tracked test files)"}`];

/** unmerged branches: local and remote-tracking refs not reachable from HEAD, with commits ahead, last author and date. */
function branchesBlock(top) {
  const out = gitOrNull(["for-each-ref", "--no-merged=HEAD", "--sort=-committerdate", "--format=%(refname:short)%09%(symref)%09%(committerdate:short)%09%(authorname)", "refs/heads", "refs/remotes"], top);
  if (out === null) return null;
  const rows = lines(out).map((l) => l.split("\t")).filter(([, symref]) => !symref);
  if (!rows.length) return ["unmerged branches: none (searched local and remote-tracking branches)"];
  const items = rows.slice(0, BRANCHES_SHOWN).map(([name, , date, author]) => {
    const ahead = Number(git(["rev-list", "--count", `HEAD..${name}`], top).trim());
    return `  ${clip(name, BRANCH_WIDTH)}: ${ahead} ahead, last by ${author}, ${date}`;
  });
  if (rows.length > BRANCHES_SHOWN) items.push(`  +${rows.length - BRANCHES_SHOWN} more`);
  return [`unmerged branches (local and remote, not in HEAD): ${rows.length}`, ...items];
}

/** latest tag and the commits since it. */
function tagBlock(top) {
  const tag = gitOrNull(["describe", "--tags", "--abbrev=0"], top)?.trim();
  if (!tag) return ["latest tag: none reachable from HEAD"];
  const since = Number(git(["rev-list", "--count", `${tag}..HEAD`], top).trim());
  return [`latest tag: ${tag}, ${since} commit${since === 1 ? "" : "s"} since`];
}

const SKIP_RE = new RegExp(SKIP_PATTERN);
const BRANCH_TESTS_SHOWN = 3;
const BRANCH_LINES_SHOWN = 2;

/** Skip markers a branch adds over its merge base with HEAD, in test files: { path, line } list. */
function skipsAddedOn(ref, top) {
  const patch = gitOrNull(["diff", "-U0", "--no-color", "--no-ext-diff", "--no-renames", `HEAD...${ref}`], top);
  if (patch === null) return null;
  const hits = [];
  let path = null;
  let n = 0;
  for (const line of patch.split("\n")) {
    if (line.startsWith("+++ ")) { path = line.startsWith("+++ b/") ? line.slice(6) : null; continue; }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(line);
    if (hunk) { n = Number(hunk[1]); continue; }
    if (line.startsWith("+") && !line.startsWith("+++")) {
      if (path && isTestPath(path) && SKIP_RE.test(line.slice(1))) hits.push({ path, line: n });
      n++;
    }
  }
  return hits;
}

/**
 * skipped or disabled tests: in the tracked test files of this branch (the count and the first path:line) and in what each
 * unmerged branch adds. "none" is printed only with the scope it covers: untracked files and branches beyond the first five are not searched.
 */
function skippedBlock(top) {
  const out = gitOrNull(["grep", "-n", "-I", "-E", "-e", SKIP_PATTERN], top) ?? "";
  const hits = lines(out)
    .map((l) => /^([^:]+):(\d+):/.exec(l))
    .filter((m) => m && isTestPath(m[1]))
    .map((m) => `${m[1]}:${m[2]}`);
  const refs = lines(gitOrNull(["for-each-ref", "--no-merged=HEAD", "--sort=-committerdate", "--format=%(refname:short)%09%(symref)", "refs/heads", "refs/remotes"], top))
    .map((l) => l.split("\t"))
    .filter(([, symref]) => !symref)
    .map(([name]) => name);
  const searched = refs.slice(0, BRANCHES_SHOWN);
  const onBranches = [];
  for (const ref of searched) {
    const added = skipsAddedOn(ref, top);
    if (added?.length) onBranches.push({ ref, added });
  }
  const scope = refs.length > searched.length ? `; ${refs.length - searched.length} more unmerged branches not searched` : "";
  const out2 = [];
  if (hits.length) out2.push(`skipped or todo tests: ${hits.length} in tracked test files on this branch`, ...hits.slice(0, SKIPPED_SHOWN).map((h) => `  ${h}`));
  for (const { ref, added } of onBranches.slice(0, BRANCH_TESTS_SHOWN)) {
    out2.push(`  not merged, on ${clip(ref, BRANCH_WIDTH)}: ${added.slice(0, BRANCH_LINES_SHOWN).map((a) => `${a.path}:${a.line}`).join(", ")}${added.length > BRANCH_LINES_SHOWN ? `, +${added.length - BRANCH_LINES_SHOWN} more` : ""}`);
  }
  if (!out2.length) return [`skipped or todo tests: none in tracked test files on this branch or in the ${searched.length} unmerged branch${searched.length === 1 ? "" : "es"} searched${scope}; untracked files not searched`];
  if (!hits.length) out2.unshift("skipped or todo tests: none in tracked test files on this branch, but unmerged branches add some");
  if (scope) out2.push(`  (${scope.slice(2)})`);
  return out2;
}

/** identifiers changed: tokens of removed lines that no added line carries, in the working tree against HEAD. */
function identifiersBlock(top) {
  const patch = gitOrNull(["diff", "-U0", "--no-color", "--no-ext-diff", "--no-renames", "HEAD"], top);
  if (patch === null) return ["identifiers changed: not checked (the working tree could not be compared with HEAD)"];
  const removed = [];
  const added = new Set();
  let path = null;
  let inHunk = false;
  for (const line of patch.split("\n")) {
    if (line.startsWith("diff --git ")) {
      inHunk = false;
      path = null;
      continue;
    }
    if (line.startsWith("@@")) {
      inHunk = true;
      continue;
    }
    if (!inHunk) {
      // A deleted file keeps its old path: its header has no +++ b/ line.
      if (line.startsWith("--- a/") || line.startsWith("+++ b/")) path = line.slice(6);
      continue;
    }
    if (line.startsWith("+")) for (const t of tokensOf(line.slice(1), IDENTIFIER_MIN)) added.add(t);
    else if (line.startsWith("-") && path && !isDocPath(path) && !isLockPath(path) && !isTestPath(path) && !COMMENT_LINE.test(line.slice(1))) removed.push(line.slice(1));
  }
  const names = [];
  const seen = new Set();
  for (const text of removed) {
    for (const t of tokensOf(text, IDENTIFIER_MIN)) {
      if (seen.has(t)) continue;
      seen.add(t);
      if (!added.has(t)) names.push(t);
    }
  }
  if (!names.length) return ["identifiers changed in the working tree against HEAD: none"];
  return [`identifiers changed (removed, not added back): ${listOf(names, IDENTIFIERS_SHOWN)}`];
}

/** hot files: touched by HOT_MIN or more of the last HOT_WINDOW commits. */
function hotBlock(top) {
  const out = gitOrNull(["log", "-n", String(HOT_WINDOW), "--no-merges", "--no-renames", "--name-only", "--format="], top);
  if (out === null) return null;
  const count = new Map();
  for (const f of lines(out)) count.set(f, (count.get(f) ?? 0) + 1);
  const hot = [...count].filter(([, n]) => n >= HOT_MIN).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).slice(0, HOT_SHOWN);
  if (!hot.length) return [`hot files (${HOT_MIN}+ of last ${HOT_WINDOW} commits): none`];
  return [`hot files (${HOT_MIN}+ of last ${HOT_WINDOW} commits): ${hot.map(([f, n]) => `${f} (${n})`).join(", ")}`];
}

/** authors of changed files: the people whose commits touch the changed tracked files most. */
function authorsBlock(top) {
  const changed = lines(gitOrNull(["diff", "--name-only", "HEAD"], top)).slice(0, AUTHOR_FILES);
  if (!changed.length) return ["authors of changed files: none (no tracked file differs from HEAD)"];
  const log = gitOrNull(["--literal-pathspecs", "log", "-n", String(AUTHOR_COMMITS), "--no-merges", "--format=%an", "--", ...changed], top);
  if (log === null) return null;
  const count = new Map();
  for (const a of lines(log)) count.set(a, (count.get(a) ?? 0) + 1);
  const top3 = [...count].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).slice(0, AUTHORS_SHOWN);
  if (!top3.length) return ["authors of changed files: none in history"];
  return [`authors of changed files: ${top3.map(([a, n]) => `${a} (${n})`).join(", ")}`];
}

/**
 * Joins the header, the blocks (most important first, each a list of lines whose first line is its title) and the
 * final line into at most `max` characters, dropping lines from the end of the list: items of the last block, then
 * its title, then the block before it. The header and the final line are kept.
 */
export function assemble(header, blocks, final, max = MAX_CHARS) {
  const groups = blocks.map((b) => [...b]);
  const text = () => [header, ...groups.flat(), final].join("\n");
  // The last block is the least important: its items go first, then its title, then the block before it.
  while (text().length > max && groups.length) {
    const last = groups.at(-1);
    if (last.length > 1) last.pop();
    else groups.pop();
  }
  const out = text();
  return out.length > max ? `${out.slice(0, Math.max(0, max - final.length - 1))}\n${final}` : out;
}

/** The brief for the repository at cwd, or null when cwd is not inside a git work tree. */
export function brief({ cwd = process.cwd(), max = MAX_CHARS } = {}) {
  let top;
  try {
    top = repoTop(cwd);
  } catch {
    return null;
  }
  if (!top) return null;
  const sections = [stateBlock, commitsBlock, testsBlock, branchesBlock, tagBlock, skippedBlock, identifiersBlock, hotBlock, authorsBlock];
  const blocks = [];
  for (const section of sections) {
    try {
      const block = section(top);
      if (block) blocks.push(block);
    } catch {
      // a section that cannot read git says nothing
    }
  }
  const branch = gitOrNull(["symbolic-ref", "--short", "-q", "HEAD"], top)?.trim() || "(detached HEAD)";
  return assemble(`repo brief: branch ${clip(branch, BRANCH_WIDTH)}`, blocks, FINAL, max);
}

/** The baseline file of a session, or null when the session id is empty. The id is cleaned the way claim-gate cleans it. */
export function baselinePath(sessionId) {
  const sid = typeof sessionId === "string" ? sessionId.replace(/[^A-Za-z0-9_-]/g, "_") : "";
  return sid ? join(tmpdir(), `product-engineer-baseline-${sid}.json`) : null;
}

/**
 * Records the session baseline: { head, stash, time }. `git stash create` writes a commit for a dirty tree and prints
 * nothing for a clean one; it does not touch the stash list or the work tree. A compact or resume keeps an existing
 * baseline, so the session's change is not reset mid-session.
 */
export function writeBaseline({ cwd = process.cwd(), sessionId, source, now = Date.now() } = {}) {
  const path = baselinePath(sessionId);
  if (!path) return null;
  try {
    const top = repoTop(cwd);
    if (!top) return null;
    if ((source === "compact" || source === "resume") && existsSync(path)) return path;
    const head = gitOrNull(["rev-parse", "--verify", "-q", "HEAD"], top)?.trim() || null;
    const stash = gitOrNull(["stash", "create"], top)?.trim() || null;
    if (!head && !stash) return null;
    writeFileSync(path, `${JSON.stringify({ head, stash, time: new Date(now).toISOString() })}\n`);
    return path;
  } catch {
    return null;
  }
}

/** The baseline of a session as { head, stash, time }, or null when none was recorded or the file cannot be read. */
export function readBaseline(sessionId) {
  const path = baselinePath(sessionId);
  if (!path) return null;
  try {
    const b = JSON.parse(readFileSync(path, "utf8"));
    if (!b || typeof b !== "object") return null;
    const head = typeof b.head === "string" ? b.head : null;
    const stash = typeof b.stash === "string" ? b.stash : null;
    if (!head && !stash) return null;
    return { head, stash, time: typeof b.time === "string" ? b.time : null };
  } catch {
    return null;
  }
}

const readStdin = () => {
  if (process.stdin.isTTY) return "";
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
};

export function runBrief(argv = []) {
  if (argv.includes("-h") || argv.includes("--help")) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (!argv.includes("--hook")) {
    const text = brief({ cwd: process.cwd() });
    if (text) process.stdout.write(`${text}\n`);
    return 0;
  }
  let input = {};
  try {
    const parsed = JSON.parse(readStdin() || "{}");
    if (parsed && typeof parsed === "object") input = parsed;
  } catch {
    // no usable hook input: the session is recorded without an id, which means no baseline
  }
  const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : process.cwd();
  writeBaseline({ cwd, sessionId: input.session_id, source: input.source });
  if (process.env.PRODUCT_ENGINEER_NO_BRIEF === "1") return 0;
  const text = brief({ cwd });
  if (text) process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: `${text}\n\n${RULES}` } })}\n`);
  return 0;
}

const isEntry = () => {
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
};
if (isEntry()) process.exitCode = runBrief(process.argv.slice(2));
