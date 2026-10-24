// product-engineer range: a ledger of candidates for a git range, read from git alone.
//
// Each commit of the range is listed oldest first with its class (docs, test, config, source, version,
// merge) and a flag for each thing git shows that a reader should check: a change reverted later in the
// range, a patch-identical duplicate (cherry-pick), security or performance wording in the subject, a
// breaking-change marker, a conventional type that the changed files contradict, and a requirement change
// (a runtime or engine line in a manifest). A flag on a changed-file contradiction or a requirement change
// prints up to six of the changed lines under it. A doc at <to> that still names a token only a reverted commit
// added is listed under "docs that still describe cancelled work". A revert names the
// commit it undoes; a revert of a revert puts that change back, so the net state follows the chain in
// order. Facts come from `git log`, `git diff-tree`, `git show` and `git patch-id --stable` (the same
// patch id means the same change). No model and no network. Every line is a candidate to check against
// the diff, not a verdict.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classOf } from "./scope.mjs";

const USAGE = `usage: product-engineer range <from>..<to> [--first-parent] [--json]
       product-engineer range <ref>            (the same as <ref>..HEAD)
       product-engineer range [<ref>] --since <date> [--until <date>] [--first-parent] [--json]
Lists each commit of the range, oldest first, with its class and candidate flags. A change that a
later commit reverts is shown as "net: cancelled"; a revert of a revert shows "net: present" again.
--first-parent lists only the first-parent chain (a merge is one line; the commits it brought in are not).
--since and --until pick the commits by committer date on <ref> (default HEAD) and print the resolved
range: from is the parent of the oldest commit in the window, to is the newest.
Every line is a candidate to check against the diff. Exit 0 for a ledger, 2 for usage or a bad range.`;

const FOOTER = "Candidates only. Read the diff before you write a line about any of these.";
// Names gone at <to>: a name a removed line carried that the tree at <to> no longer holds. Names are checked in
// at most GONE_CAP distinct tokens (first seen first), the section lists GONE_SHOWN, and a name counts as
// "was in" a file when a non-test file at <from> holds it as a whole word.
const GONE_CAP = 300;
const GONE_SHOWN = 8;
const GONE_FILES_SHOWN = 3;
const GONE_MIN = 5;
const GONE_CHECK_BATCH = 100;
// A range of more than RANGE_LIMIT commits is read for its last RANGE_WINDOW commits only.
const RANGE_LIMIT = 3000;
const RANGE_WINDOW = 500;
// Evidence lines (a git show per file) are read for at most this many flagged commits per range.
const EVIDENCE_COMMITS = 40;
const WORD_CHAR = /[A-Za-z0-9_]/;
const GONE_STOP = new Set(["return", "const", "function", "length", "string", "number", "object", "value", "default", "error", "import", "export", "class", "undefined", "null", "true", "false", "this", "that", "with", "from", "then", "else", "while", "break", "continue", "await", "async", "throw", "catch", "finally", "typeof", "before", "after"]);
const GONE_FLAG = /(?<![\w-])--[A-Za-z][A-Za-z0-9-]*/g;
const GONE_WORD = /(?<![\w-])[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*/g;
// A comment line (a removed comment names nothing that is still in use).
const COMMENT_LINE = /^\s*(?:\/\/|#|\/\*|\*|<!--|--|;)/;
const SECURITY = /security|CVE|vuln|escape|sanitiz|xss|csrf|injection|auth/i;
const PERFORMANCE = /perf|faster|speed|cache|optimi|latency|throughput/i;
const BENCH = /(bench|timing|perf)/i;
const CONVENTIONAL = /^([a-z]+)(\([^)]*\))?(!)?:/i;
const VERSION_FILE = /(^|\/)(package(-lock)?\.json|[^/]*\.toml|setup\.cfg|gradle\.properties|VERSION|version\.(txt|json))$/;
const TYPES_WITHOUT_SOURCE = new Set(["docs", "test", "chore", "style", "ci", "build"]);
const KIND_NAME = { doc: "docs", test: "test", config: "config", source: "source" };
const ORDER = ["docs", "test", "config", "source"];
const kindOf = (p) => KIND_NAME[classOf(p)];
// A requirement change: a file that says how or where the project runs, and a changed line that says so.
const REQUIREMENT_FILE = /(^|\/)(package\.json|pyproject\.toml|Cargo\.toml|go\.mod|\.nvmrc|\.node-version|\.python-version|\.tool-versions|Dockerfile)$/;
const REQUIREMENT_LINE = /engines|"node"|node-version|python|rust-version|requires-python|FROM |^go [0-9]/i;
// A file whose content is only a runtime version: every changed line in it is a requirement change.
const VERSION_ONLY_FILE = /(^|\/)(\.nvmrc|\.node-version|\.python-version|\.tool-versions)$/;
// Evidence under a flag: at most this many changed lines, from at most this many files, each cut to this width.
const EVIDENCE_FILES = 2;
const EVIDENCE_LINES = 6;
const EVIDENCE_WIDTH = 100;
// Stale docs: the doc files searched at <to>, the lines shown in the section, and the width of a subject shown.
const DOC_PATHSPECS = ["*.md", "*.mdx", "*.rst", "*.txt", "docs/*", "*/docs/*"];
const STALE_SHOWN = 8;
const SUBJECT_SHOWN = 50;

const git = (args, cwd, input) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd, encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });
// The same, as bytes: blob contents can be binary or have very long lines.
const gitBytes = (args, cwd, input) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd, input, stdio: ["pipe", "pipe", "pipe"], maxBuffer: 1024 * 1024 * 1024 });
// git grep exits 1 when nothing matches; that is an empty answer here, not an error.
const grep = (args, cwd) => {
  try {
    return git(["grep", ...args], cwd);
  } catch (err) {
    if (err && err.status === 1) return "";
    throw err;
  }
};

/**
 * The changed lines of one commit in one file, whitespace-only changes skipped (the same `-b --ignore-blank-lines`
 * as scope.mjs): [{ sign, text }]. Diff headers are skipped by position, so a removed line that starts with `--` is kept.
 */
function changedLines(sha, path, cwd) {
  const patch = git(["show", "-U0", "-b", "--ignore-blank-lines", "--no-color", "--no-ext-diff", "--format=", sha, "--", path], cwd);
  const out = [];
  let inHunk = false;
  for (const line of patch.split("\n")) {
    if (line.startsWith("diff ")) inHunk = false;
    else if (line.startsWith("@@")) inHunk = true;
    else if (inHunk && (line[0] === "+" || line[0] === "-")) out.push({ sign: line[0], text: line.slice(1) });
  }
  return out;
}

const shownText = (text) => {
  const t = text.trim();
  return t.length > EVIDENCE_WIDTH ? `${t.slice(0, EVIDENCE_WIDTH - 3)}...` : t;
};

/**
 * Evidence for a flag: up to EVIDENCE_LINES changed lines from the first EVIDENCE_FILES paths, and moreLines, the
 * count of matching changed lines in all paths that were not printed. `keep` filters the changed lines.
 */
function evidenceOf(sha, paths, cwd, keep = () => true) {
  const perFile = paths.map((p) => changedLines(sha, p, cwd).filter(keep));
  const shown = perFile.slice(0, EVIDENCE_FILES).flat().slice(0, EVIDENCE_LINES).map(({ sign, text }) => ({ sign, text: shownText(text) }));
  return { evidence: shown, moreLines: perFile.flat().length - shown.length };
}

/**
 * Whether `token` occurs in `text` as a whole word: the characters on both sides are not word characters (the
 * same rule as `git grep -w`). Plain indexOf, so a long minified line costs one scan, not one per pattern.
 */
function hasWord(text, token) {
  for (let i = text.indexOf(token); i !== -1; i = text.indexOf(token, i + 1)) {
    const before = i > 0 ? text[i - 1] : "";
    const after = text[i + token.length] ?? "";
    if (!WORD_CHAR.test(before) && !WORD_CHAR.test(after)) return true;
  }
  return false;
}

/** The added lines of one patch as { path, text }: the hunk lines that start with "+", with the new-side path of their file. */
function addedLinesOf(patch) {
  const out = [];
  let path = null;
  let inHunk = false;
  for (const line of patch.split("\n")) {
    if (line.startsWith("diff --git ")) { inHunk = false; path = null; continue; }
    if (!inHunk) {
      if (line.startsWith("+++ ")) {
        const p = line.slice(4).replace(/\t$/, "");
        path = p === "/dev/null" ? null : p.replace(/^b\//, "");
      } else if (line.startsWith("@@")) inHunk = true;
      continue;
    }
    if (line[0] === "+" && path !== null) out.push({ path, text: line.slice(1) });
  }
  return out;
}

/**
 * The doc lines at <to> that name a token which only cancelled commits of the range added: no change that stays in the
 * range adds it. Each entry: { path, line, token, sha, subject } where sha and subject are the first cancelled commit
 * that added the token. Doc and test files are not read for the added tokens; only doc files at <to> are searched.
 */
function staleDocsOf(commits, patchOf, toSha, cwd, notes) {
  const addedBy = new Map();
  const kept = new Set();
  for (const c of commits) {
    if (c.kind || c.merge) continue;
    for (const { path, text } of addedLinesOf(patchOf.get(c.sha) ?? "")) {
      const kind = classOf(path);
      if (kind === "test" || kind === "doc" || COMMENT_LINE.test(text)) continue;
      for (const t of tokensOf(text)) {
        if (c.net.state !== "cancelled") kept.add(t);
        else if (!addedBy.has(t)) addedBy.set(t, c);
      }
    }
  }
  const tokens = [...addedBy.keys()].filter((t) => !kept.has(t));
  if (tokens.length === 0) return [];
  const checked = tokens.slice(0, GONE_CAP);
  if (tokens.length > GONE_CAP) notes.push(`docs that still describe cancelled work: checked the first ${GONE_CAP} of ${tokens.length} tokens`);
  const dir = mkdtempSync(join(tmpdir(), "pe-range-"));
  try {
    const patternFile = join(dir, "stale-tokens.txt");
    writeFileSync(patternFile, `${checked.join("\n")}\n`);
    const out = grep(["-l", "-z", "-w", "-F", "-f", patternFile, toSha, "--", ...DOC_PATHSPECS], cwd);
    const paths = out.split("\0").filter(Boolean).map((l) => l.slice(toSha.length + 1));
    const found = [];
    for (const { path, text } of blobsOf(paths, toSha, cwd)) {
      text.split("\n").forEach((line, i) => {
        for (const token of checked) {
          if (!hasWord(line, token)) continue;
          const c = addedBy.get(token);
          found.push({ path, line: i + 1, token, sha: c.short, subject: c.subject });
        }
      });
    }
    return found;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** `<from>..<to>` or a bare ref (which means `<ref>..HEAD`). Null when the text is not a range this reads. */
export function parseRange(arg) {
  if (typeof arg !== "string" || arg.startsWith("-") || arg.includes("...")) return null;
  const i = arg.indexOf("..");
  if (i === -1) return arg === "" ? null : { from: arg, to: "HEAD" };
  const from = arg.slice(0, i);
  const to = arg.slice(i + 2) || "HEAD"; // `HEAD~1..` is `HEAD~1..HEAD`
  if (!from || from.startsWith("-") || to.startsWith("-")) return null;
  return { from, to };
}

// Notes traceability reads the vocabulary of a range only up to this many commits, and keeps at most this many words.
export const VOCAB_COMMIT_LIMIT = 2000;
export const VOCAB_CAP = 20000;
const WORD = /\p{L}{5,}/gu;
const wordsOf = (text) => text.toLowerCase().match(WORD) ?? [];

/**
 * The words of a range that release notes may match: the words of each commit subject and body, of each changed
 * path, and of each added or removed diff line (lowercased, five letters or more). `words` is null when the range has
 * more than VOCAB_COMMIT_LIMIT commits (the check is skipped); `capped` is true when VOCAB_CAP words were reached.
 */
export function vocabularyOf({ from, to, cwd = process.cwd(), firstParent = false }) {
  const span = `${resolve(from, cwd)}..${resolve(to, cwd)}`;
  const fp = firstParent ? ["--first-parent"] : [];
  const total = Number(git(["rev-list", "--count", ...fp, span], cwd).trim());
  if (total > VOCAB_COMMIT_LIMIT) return { commits: total, words: null, capped: false };
  const log = git(["log", "--no-color", "--no-ext-diff", "--no-renames", "-p", "--format=%x1e%s%x1f%b%x1f", ...fp, span], cwd);
  const words = new Set();
  let capped = false;
  const add = (text) => {
    for (const w of wordsOf(text)) {
      if (words.size >= VOCAB_CAP) { capped = true; return; }
      words.add(w);
    }
  };
  for (const record of log.split("\x1e").slice(1)) {
    const a = record.indexOf("\x1f");
    const b = record.indexOf("\x1f", a + 1);
    add(record.slice(0, a));
    add(record.slice(a + 1, b));
    for (const line of record.slice(b + 1).split("\n")) {
      if (line.startsWith("diff --git ")) add(line);
      else if ((line[0] === "+" || line[0] === "-") && !/^(\+\+\+|---) /.test(line)) add(line.slice(1));
      if (capped) break;
    }
    if (capped) break;
  }
  return { commits: total, words, capped };
}

/**
 * The commits of `tip` (default HEAD) whose committer date is in [since, until], resolved to a range: from is the
 * parent of the oldest such commit, to is the newest. Throws when no commit is in the window or the oldest commit
 * has no parent (the window starts at the first commit of the history).
 */
export function windowOf({ since, until, tip = "HEAD", firstParent = false, cwd = process.cwd() }) {
  const tipSha = resolve(tip, cwd);
  const dated = [...(since === undefined ? [] : [`--since=${since}`]), ...(until === undefined ? [] : [`--until=${until}`])];
  const list = git(["rev-list", ...(firstParent ? ["--first-parent"] : []), ...dated, tipSha], cwd).split("\n").filter(Boolean);
  const window = `${since ?? "the beginning"} to ${until ?? "now"}`;
  if (list.length === 0) throw new Error(`no commit between ${window} on ${tip}`);
  const newest = list[0];
  const oldest = list[list.length - 1];
  const parent = git(["rev-list", "--parents", "-n", "1", oldest], cwd).trim().split(/\s+/)[1];
  if (!parent) throw new Error(`the window ${window} starts at the first commit of the history (${oldest.slice(0, 7)}); name the range with from..to`);
  const dateOf = (sha) => git(["log", "-1", "--format=%ci", sha], cwd).trim();
  return {
    since: since ?? null,
    until: until ?? null,
    commits: list.length,
    first: { sha: oldest, date: dateOf(oldest) },
    last: { sha: newest, date: dateOf(newest) },
    from: parent,
    to: newest,
  };
}

/** The sha of a ref. Throws `unknown revision: <ref>` when the ref does not name a commit. */
function resolve(ref, cwd) {
  try {
    return git(["rev-parse", "--verify", "-q", `${ref}^{commit}`], cwd).trim();
  } catch {
    throw new Error(`unknown revision: ${ref}`);
  }
}

/** The identifier-like tokens of one line: --long-flags and words of `min` (default 5) or more characters with a letter, minus the stoplist. */
export function tokensOf(text, min = GONE_MIN) {
  const flags = text.match(GONE_FLAG) ?? [];
  const rest = text.replace(GONE_FLAG, " ");
  const words = (rest.match(GONE_WORD) ?? []).filter((w) => w.length >= min && /[A-Za-z]/.test(w) && !GONE_STOP.has(w.toLowerCase()));
  return [...flags.filter((f) => f.length >= min), ...words];
}

/**
 * The names a range removed: Map of token to the set of old paths whose removed lines carried it. Only removed
 * lines of non-test, non-doc files count, and comment lines do not count.
 */
export function removedNames(diff) {
  const names = new Map();
  let path = null;
  let inHunk = false;
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) { inHunk = false; path = null; continue; }
    if (!inHunk) {
      if (line.startsWith("--- a/")) path = line.slice(6).replace(/\t$/, "");
      else if (line.startsWith("--- ")) path = null;
      else if (line.startsWith("@@")) inHunk = true;
      continue;
    }
    if (line.startsWith("@@") || line[0] !== "-" || path === null) continue;
    const kind = classOf(path);
    if (kind === "test" || kind === "doc") continue;
    const text = line.slice(1);
    if (COMMENT_LINE.test(text)) continue;
    for (const token of tokensOf(text)) {
      if (!names.has(token)) names.set(token, new Set());
      names.get(token).add(path);
    }
  }
  return names;
}

/**
 * The files of one tree that hold any token of the batch as a whole word, from one `git grep -l -w -F -f` scan.
 * Paths of test files are left out when `skipTests` is set (a name in a test file does not count as in use).
 */
function candidatesOf(batch, treeSha, cwd, patternFile, skipTests) {
  writeFileSync(patternFile, `${batch.join("\n")}\n`);
  const out = grep(["-l", "-z", "-w", "-F", "-f", patternFile, treeSha], cwd);
  const paths = out.split("\0").filter(Boolean).map((l) => l.slice(treeSha.length + 1));
  return skipTests ? paths.filter((p) => classOf(p) !== "test") : paths;
}

/** The text of each blob of `treeSha:<path>`, in the order given. A path git cannot read is skipped. */
function blobsOf(paths, treeSha, cwd) {
  if (paths.length === 0) return [];
  const buf = gitBytes(["cat-file", "--batch"], cwd, `${paths.map((p) => `${treeSha}:${p}`).join("\n")}\n`);
  const out = [];
  let pos = 0;
  for (const path of paths) {
    const nl = buf.indexOf(10, pos);
    if (nl === -1) break;
    const header = buf.toString("utf8", pos, nl).split(" ");
    if (header.length !== 3) { pos = nl + 1; continue; } // "<object> missing"
    const size = Number(header[2]);
    out.push({ path, text: buf.toString("utf8", nl + 1, nl + 1 + size) });
    pos = nl + 1 + size + 1;
  }
  return out;
}

/** The tokens (in order) that occur as whole words somewhere in the tree. Batches of GONE_CHECK_BATCH tokens. */
function tokensPresent(tokens, treeSha, cwd, patternFile) {
  const found = new Set();
  for (let k = 0; k < tokens.length; k += GONE_CHECK_BATCH) {
    const batch = tokens.slice(k, k + GONE_CHECK_BATCH).filter((t) => !found.has(t));
    if (batch.length === 0) continue;
    for (const { text } of blobsOf(candidatesOf(batch, treeSha, cwd, patternFile, false), treeSha, cwd)) {
      for (const t of batch) if (!found.has(t) && hasWord(text, t)) found.add(t);
    }
  }
  return found;
}

/** Per token, the non-test paths at `treeSha` that hold it as a whole word, in path order. */
function pathsHolding(tokens, treeSha, cwd, patternFile) {
  const holding = new Map(tokens.map((t) => [t, []]));
  for (let k = 0; k < tokens.length; k += GONE_CHECK_BATCH) {
    const batch = tokens.slice(k, k + GONE_CHECK_BATCH);
    for (const { path, text } of blobsOf(candidatesOf(batch, treeSha, cwd, patternFile, true), treeSha, cwd)) {
      for (const t of batch) if (hasWord(text, t)) holding.get(t).push(path);
    }
  }
  return holding;
}

/**
 * The names gone at <to>, most-mentioned first, up to GONE_SHOWN. Each: { name, files, paths } where files counts the
 * non-test files at <from> that hold the name as a whole word, and paths lists them. Names beyond GONE_CAP are not
 * checked; `notes` receives the line that says so.
 */
export function goneNames(names, fromSha, toSha, cwd, notes = []) {
  const all = [...names.keys()];
  const tokens = all.slice(0, GONE_CAP);
  if (all.length > GONE_CAP) notes.push(`names gone: checked the first ${GONE_CAP} of ${all.length} removed names; the rest were not checked`);
  const dir = mkdtempSync(join(tmpdir(), "pe-range-"));
  const patternFile = join(dir, "tokens.txt");
  try {
    const present = tokensPresent(tokens, toSha, cwd, patternFile);
    const absent = tokens.filter((t) => !present.has(t));
    const holding = pathsHolding(absent, fromSha, cwd, patternFile);
    const gone = [];
    for (const name of absent) {
      const paths = holding.get(name);
      if (paths.length > 0) gone.push({ name, files: paths.length, paths });
    }
    gone.sort((a, b) => b.files - a.files || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    return gone.slice(0, GONE_SHOWN);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The ledger of a range. `from` and `to` are refs as the user wrote them; `from` is excluded, `to` included.
 * Throws `unknown revision: <ref>` when either ref does not name a commit.
 */
export function range({ from, to, cwd = process.cwd(), firstParent = false } = {}) {
  const fromRef = resolve(from, cwd);
  const toSha = resolve(to, cwd);
  const notes = [];
  // A long range is read for its last RANGE_WINDOW commits: the window starts after the commit RANGE_WINDOW back.
  const fp = firstParent ? ["--first-parent"] : [];
  const total = Number(git(["rev-list", "--count", ...fp, `${fromRef}..${toSha}`], cwd).trim());
  const limited = total > RANGE_LIMIT;
  const fromSha = limited ? git(["rev-list", "--topo-order", ...fp, `--skip=${RANGE_WINDOW}`, "-n", "1", `${fromRef}..${toSha}`], cwd).trim() : fromRef;
  if (limited) notes.push(`range too large (${total} commits); showing the last ${RANGE_WINDOW}`);
  const cap = limited ? [`--max-count=${RANGE_WINDOW}`] : [];
  // Three batched reads for the whole range, not three processes per commit: one log for the subjects, bodies
  // and file lists (NUL-separated), one log of the patches, and one `git patch-id --stable` over that patch
  // log. The same patch id means the same change (a cherry-pick gives the same id).
  const span = `${fromSha}..${toSha}`;
  const names = git(["log", "--topo-order", "--reverse", "--root", "--no-renames", "--name-only", "-z", "--format=%x1e%H%x1f%P%x1f%s%x1f%b%x1f", ...fp, ...cap, span], cwd);
  const patchLog = git(["log", "--topo-order", "--reverse", "--root", "--no-renames", "--no-color", "--no-ext-diff", "-p", "--format=commit %H", ...fp, ...cap, span], cwd);
  const patchIdOf = new Map(git(["patch-id", "--stable"], cwd, patchLog).split("\n").filter(Boolean).map((l) => {
    const [id, commit] = l.split(/\s+/);
    return [commit, id];
  }));
  // Splitting on the `commit <sha>` header gives [sha, patch, sha, patch, ...]; a diff line never starts with "commit ".
  const patchOf = new Map();
  const parts = patchLog.split(/^commit ([0-9a-f]{40})$/m);
  for (let k = 1; k + 1 < parts.length; k += 2) patchOf.set(parts[k], parts[k + 1]);
  const records = names.split("\x1e").filter((r) => r.trim() !== "");

  const commits = records.map((r) => {
    const [head = "", ...fileParts] = r.split("\0");
    const [sha, parents = "", subject = "", bodyRaw = ""] = head.split("\x1f");
    const body = bodyRaw.trim();
    const merge = parents.trim().split(/\s+/).filter(Boolean).length > 1;
    const parentList = parents.trim().split(/\s+/).filter(Boolean);
    const files = merge ? [] : fileParts.map((f) => f.replace(/^\n/, "")).filter(Boolean);
    const patch = merge ? "" : patchOf.get(sha) ?? "";
    const patchId = patchIdOf.get(sha) ?? null;
    const changed = patch.split("\n").filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---) /.test(l));
    const versionOnly = files.length > 0 && files.every((f) => VERSION_FILE.test(f)) && changed.every((l) => /version/i.test(l));
    const classes = merge ? ["merge"] : files.length === 0 ? ["empty"] : versionOnly ? ["version"] : ORDER.filter((k) => files.some((f) => kindOf(f) === k));
    const conventional = CONVENTIONAL.exec(subject);
    return {
      sha, short: sha.slice(0, 7), subject, body, merge, parents: parentList, files, classes, patchId,
      type: conventional ? conventional[1].toLowerCase() : null,
      breakingBang: Boolean(conventional && conventional[3]),
      breakingBody: /BREAKING CHANGE/.test(body),
      kind: null, reverts: null, outsideSha: null, root: null, events: [], net: null,
    };
  });

  // Reverts and reapplies, resolved against earlier commits of the range only.
  commits.forEach((c, i) => {
    const earlier = commits.slice(0, i);
    // git writes a revert of a revert as `Reapply "..."` with a `This reverts commit` body: that is a reapply.
    c.kind = /^Reapply "/.test(c.subject) ? "reapply" : /^Revert "/.test(c.subject) || /^This reverts commit /m.test(c.body) ? "revert" : null;
    if (!c.kind) { c.root = c; return; }
    let target = null;
    for (const m of c.body.matchAll(/This reverts commit ([0-9a-f]{7,40})/g)) {
      target = [...earlier].reverse().find((e) => e.sha.startsWith(m[1])) ?? null;
      if (target) break;
      c.outsideSha = c.outsideSha ?? m[1];
    }
    if (!target) {
      const inner = /^(?:Revert|Reapply) "(.*)"$/.exec(c.subject);
      if (inner) target = [...earlier].reverse().find((e) => e.subject === inner[1]) ?? null;
    }
    c.reverts = target ? target.sha : null;
    if (target) c.outsideSha = null;
    c.root = target ? target.root : null;
    if (c.root) c.root.events.push(c);
  });

  // Net state: each revert or reapply that follows a change flips it. An odd count leaves it cancelled.
  for (const c of commits) {
    if (c.kind) continue;
    const last = c.events.at(-1);
    c.net = c.events.length % 2 === 1 ? { state: "cancelled", by: last.short } : { state: "present", lastBy: last ? last.short : null };
  }
  // A merge that a revert cancels (git revert -m 1) takes the commits it brought in with it, unless each of
  // those was reverted on its own. Those commits are the ones reachable from the second parent and not the first.
  const bySha = new Map(commits.map((c) => [c.sha, c]));
  for (const m of commits) {
    // A merge whose subject reads as a revert has no net state (kind is set), so it is skipped here too.
    if (!m.merge || !m.net || m.net.state !== "cancelled") continue;
    const reverter = m.events.at(-1);
    const brought = git(["rev-list", `${m.parents[0]}..${m.parents[1]}`], cwd).split("\n").filter(Boolean);
    for (const sha of brought) {
      const c = bySha.get(sha);
      if (c && c.events.length === 0) c.net = { state: "cancelled", by: reverter.short, merge: m.short };
    }
  }

  // Names gone at <to>, from the net diff (a name removed and re-added inside the range is still present).
  const gonenames = goneNames(removedNames(git(["diff", "-U0", "--no-color", "--no-ext-diff", "--no-renames", fromSha, toSha], cwd)), fromSha, toSha, cwd, notes);
  const staledocs = staleDocsOf(commits, patchOf, toSha, cwd, notes);

  const firstByPatch = new Map();
  const duplicateOf = new Map();
  for (const c of commits) {
    if (!c.patchId || c.kind) continue;
    const first = firstByPatch.get(c.patchId);
    if (first) duplicateOf.set(c.sha, first);
    else firstByPatch.set(c.patchId, c);
  }
  const benchPaths = [...new Set(commits.flatMap((c) => c.files).filter((p) => BENCH.test(p)))];
  // Evidence lines are read for the first EVIDENCE_COMMITS flagged commits only; later ones keep their flag text.
  const evidenced = new Set();
  let evidenceCut = false;
  const evidenceFor = (sha, paths, keep) => {
    if (!evidenced.has(sha)) {
      if (evidenced.size >= EVIDENCE_COMMITS) {
        evidenceCut = true;
        return { evidence: [], moreLines: 0, cut: true };
      }
      evidenced.add(sha);
    }
    const { evidence, moreLines } = evidenceOf(sha, paths, cwd, keep);
    return { evidence, moreLines, cut: false };
  };

  for (const c of commits) {
    const flags = [];
    if (c.kind) {
      const verb = c.kind === "revert" ? "reverts" : "reapplies";
      const target = c.reverts ? commits.find((x) => x.sha === c.reverts) : null;
      if (target) flags.push({ code: "link", text: `${verb} ${target.short}: ${target.subject}` });
      else if (c.outsideSha) flags.push({ code: "link", text: `${verb} ${c.outsideSha.slice(0, 7)}, which is outside this range` });
      if (c.merge) flags.push({ code: "merge", text: "merge commit whose subject reads as a revert: its net state is not computed; read the merge" });
    } else {
      const cancelledBy = c.net.merge ? `branch merged by ${c.net.merge} was reverted by ${c.net.by}` : `reverted by ${c.net.by}`;
      const state = c.net.state === "cancelled" ? `net: cancelled (${cancelledBy})` : c.net.lastBy ? `net: present (restored by ${c.net.lastBy})` : "net: present";
      flags.push({ code: "net", text: state });
    }
    if (duplicateOf.has(c.sha)) flags.push({ code: "duplicate", text: `same change as ${duplicateOf.get(c.sha).short}` });
    if (SECURITY.test(c.subject)) flags.push({ code: "security", text: "security wording: describe what it protects, give no steps to abuse it" });
    if (PERFORMANCE.test(c.subject)) {
      if (benchPaths.length === 0) flags.push({ code: "performance", text: "performance wording: no timing file or benchmark change in this range" });
      else for (const p of benchPaths) flags.push({ code: "bench", text: `a bench/timing file changed in the range: ${p}` });
    }
    if (c.breakingBang || c.breakingBody) {
      const where = [c.breakingBang ? "`!` in the subject type" : "", c.breakingBody ? "BREAKING CHANGE in the body" : ""].filter(Boolean).join(" and ");
      flags.push({ code: "breaking", text: `breaking-change marker: ${where}` });
    }
    const sourceFiles = c.files.filter((p) => kindOf(p) === "source");
    if (c.type && TYPES_WITHOUT_SOURCE.has(c.type) && sourceFiles.length > 0) {
      flags.push({ code: "type", text: `type says ${c.type} but the commit changes source files: ${sourceFiles.slice(0, 3).join(", ")}`, ...evidenceFor(c.sha, sourceFiles) });
    }
    const configFiles = c.files.filter((p) => kindOf(p) === "config");
    if (c.type === "refactor" && configFiles.length > 0) flags.push({ code: "type", text: `refactor touches config: ${configFiles.slice(0, 3).join(", ")}`, ...evidenceFor(c.sha, configFiles) });
    for (const p of c.files.filter((f) => REQUIREMENT_FILE.test(f))) {
      const ev = evidenceFor(c.sha, [p], (l) => VERSION_ONLY_FILE.test(p) || REQUIREMENT_LINE.test(l.text.trim()));
      // Past the evidence cap the changed lines are not read, so the flag says the file changed and no more.
      if (ev.cut) { flags.push({ code: "requirement", text: `requirement file changed: ${p}; its lines were not read (evidence cap)` }); continue; }
      if (ev.evidence.length > 0) flags.push({ code: "requirement", text: `requirement change: ${p} changes how or where this runs; owners who run it themselves may need to act`, ...ev });
    }
    c.flags = flags.map((f) => ({ evidence: [], moreLines: 0, ...f }));
  }

  if (evidenceCut) notes.push(`evidence for the first ${EVIDENCE_COMMITS} flagged commits only`);
  const originals = commits.filter((c) => !c.kind && !c.merge);
  const cancelled = originals.filter((c) => c.net.state === "cancelled").length;
  const present = originals.length - cancelled;
  const label = `${from}..${to}`;
  // Candidate themes: the files of the range grouped by their first two directory levels. Shown only when the range
  // touches at least two directories; the top three by file count.
  const filesByDir = new Map();
  for (const f of new Set(commits.flatMap((c) => c.files))) {
    const dirs = f.split("/").slice(0, -1);
    if (dirs.length === 0) continue;
    const key = dirs.slice(0, 2).join("/");
    filesByDir.set(key, (filesByDir.get(key) ?? 0) + 1);
  }
  const themes = filesByDir.size < 2 ? [] : [...filesByDir]
    .map(([dir, files]) => ({ dir, files }))
    .sort((a, b) => b.files - a.files || (a.dir < b.dir ? -1 : a.dir > b.dir ? 1 : 0))
    .slice(0, 3);
  return {
    range: { from, to },
    firstParent,
    header: `range ${label}${firstParent ? " (first parent)" : ""}: ${commits.length} commit${commits.length === 1 ? "" : "s"}, ${present} net change${present === 1 ? "" : "s"} present, ${cancelled} cancelled`,
    summary: { commits: commits.length, present, cancelled },
    themes,
    commits: commits.map((c) => ({ sha: c.sha, short: c.short, subject: c.subject, merge: c.merge, classes: c.classes, files: c.files, patchId: c.patchId, net: c.kind ? null : c.net, flags: c.flags.map(({ code, text, evidence, moreLines }) => ({ code, text, evidence, moreLines })) })),
    gonenames,
    staledocs,
    notes,
    footer: FOOTER,
  };
}

export function render(report) {
  const out = [];
  if (report.window) {
    const w = report.window;
    out.push(`window ${w.since ?? "the beginning"} to ${w.until ?? "now"}: first commit ${w.first.date}, last commit ${w.last.date}`);
    out.push(`resolved ${w.from}..${w.to}`);
  }
  out.push(report.header, ...(report.notes ?? []).map((note) => `note: ${note}`));
  for (const c of report.commits) {
    out.push(`${c.short} ${c.classes.join("+")}  ${c.subject}`);
    for (const f of c.flags) {
      out.push(`    ${f.text}`);
      for (const e of f.evidence) out.push(`    ${e.sign} ${e.text}`);
      if (f.moreLines > 0) out.push(`    (${f.moreLines} more changed lines; read the diff)`);
    }
  }
  if (report.themes?.length) {
    out.push(`candidate themes: ${report.themes.map((t) => `${t.dir} (${t.files} file${t.files === 1 ? "" : "s"})`).join(", ")}`);
  }
  if (report.gonenames?.length) {
    out.push(`names gone at ${report.range.to}:`);
    for (const g of report.gonenames) {
      const shown = g.paths.slice(0, GONE_FILES_SHOWN).join(", ") + (g.paths.length > GONE_FILES_SHOWN ? ", ..." : "");
      out.push(`  ${g.name}  (was in ${g.files} file${g.files === 1 ? "" : "s"}: ${shown})`);
    }
    out.push("Candidates: a name that disappeared may be a renamed or removed option, flag, setting or function that users call. Check before you write the release notes.");
  }
  if (report.staledocs?.length) {
    out.push("docs that still describe cancelled work:");
    for (const d of report.staledocs.slice(0, STALE_SHOWN)) {
      const subject = d.subject.length > SUBJECT_SHOWN ? `${d.subject.slice(0, SUBJECT_SHOWN - 3)}...` : d.subject;
      out.push(`  ${d.path}:${d.line}  mentions ${d.token} (added in ${d.sha} "${subject}", reverted in this range)`);
    }
    if (report.staledocs.length > STALE_SHOWN) out.push(`  ... and ${report.staledocs.length - STALE_SHOWN} more (--json lists all)`);
  }
  out.push(report.footer);
  return out.join("\n");
}

/** Removes `name value` or `name=value` from argv: { value (undefined when absent), present, rest }. */
function takeValue(argv, name) {
  const i = argv.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (i === -1) return { value: undefined, present: false, rest: argv };
  const inline = argv[i].startsWith(`${name}=`);
  const value = inline ? argv[i].slice(name.length + 1) : argv[i + 1];
  return { value: value === "" || value?.startsWith("-") ? undefined : value, present: true, rest: argv.filter((_, k) => k !== i && (inline || k !== i + 1)) };
}

// --since and --until take a calendar date, optionally with a time: git reads a future --since as "every commit" and
// an impossible date (2026-13-45) as a real one, so the form is checked here before git sees it.
const DATE_FORM = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
function dateProblem(name, value, isSince) {
  if (!DATE_FORM.test(value)) return `${name} takes a date such as 2026-10-01 (got "${value}")`;
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > new Date(Date.UTC(y, m, 0)).getUTCDate()) return `${name} is not a real date: "${value}"`;
  const t = Date.parse(value.replace(" ", "T"));
  if (Number.isNaN(t)) return `${name} is not a real date: "${value}"`;
  if (isSince && t > Date.now()) return `${name} is in the future ("${value}"): a window cannot start after now`;
  return null;
}

export function runRange(argv) {
  const json = argv.includes("--json");
  const firstParent = argv.includes("--first-parent");
  let rest = argv.filter((a) => a !== "--json" && a !== "--first-parent");
  const since = takeValue(rest, "--since");
  rest = since.rest;
  const until = takeValue(rest, "--until");
  rest = until.rest;
  if ((since.present && since.value === undefined) || (until.present && until.value === undefined) || rest.some((a) => a.startsWith("-"))) {
    console.error(USAGE);
    return 2;
  }
  const windowMode = since.present || until.present;
  const problem = (since.value !== undefined && dateProblem("--since", since.value, true)) || (until.value !== undefined && dateProblem("--until", until.value, false));
  if (problem) {
    console.error(`range: ${problem}`);
    return 2;
  }
  let parsed;
  if (windowMode) {
    if (rest.length > 1 || rest.some((a) => a.includes(".."))) { console.error(USAGE); return 2; }
  } else {
    parsed = rest.length === 1 ? parseRange(rest[0]) : null;
    if (!parsed) { console.error(USAGE); return 2; }
  }
  let report;
  try {
    let window = null;
    if (windowMode) {
      window = windowOf({ since: since.value, until: until.value, tip: rest[0] ?? "HEAD", firstParent, cwd: process.cwd() });
      parsed = { from: window.from, to: window.to };
    }
    report = range({ ...parsed, firstParent, cwd: process.cwd() });
    if (window) report.window = window;
  } catch (err) {
    const what = windowMode ? "the window" : `the range ${parsed.from}..${parsed.to}`;
    console.error(`range: cannot read ${what}: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
    return 2;
  }
  console.log(json ? JSON.stringify(report, null, 2) : render(report));
  return 0;
}
