#!/usr/bin/env node
// Sweep: run the product-engineer CLI (bin/check.mjs) over public clones and compare
// each command's output with independent references computed with plain git.
//
// Usage: node bench/head-to-head/sweep/sweep.mjs [repoName ...]
//   With no arguments every repository in repos.json is run. Names are the
//   "name" field (owner__repo). Scratch output goes under /private/tmp/pe-sweep.
//
// The references in this file deliberately do not import anything from bin/.
// Where a reference has to pick a definition that the CLI also picks (for
// example what counts as "documentation"), the choice is written next to it.

import { execFileSync, spawnSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, unlinkSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PRODUCT = resolve(HERE, "..", "..", "..");
const CLI = join(PRODUCT, "bin", "check.mjs");
const SCRATCH = "/private/tmp/pe-sweep";
const REPOS_DIR = join(SCRATCH, "repos");
const MSG_DIR = join(SCRATCH, "msgs");
const GL_DIR = join(SCRATCH, "gitleaks");
const RESULTS = join(SCRATCH, "results.json");
const TIMEOUT_MS = 120_000;
const SLOW_S = 10;
const MAX_BUF = 1024 * 1024 * 1024;
const CLONE_TIMEOUT_MS = 600_000;

// Commit types whose changes should not touch source (the CLI's TYPES_WITHOUT_SOURCE).
const TYPES_NO_SOURCE = new Set(["docs", "test", "chore", "style", "ci", "build"]);
// Reference path classes (written here, not imported).
const DOC_RE = /\.(md|mdx|rst|txt|adoc|markdown)$|(^|\/)(docs?|documentation)\//i;
const TEST_RE = /(^|\/)(tests?|__tests__|spec|specs)\/|\.(test|spec)\.[^/]+$|_test\.(go|py|rb)$|(^|\/)test_[^/]*\.py$|_spec\.rb$/i;
// Approximation of "config, not source" used only by the type-vs-files reference.
const CONFIG_RE = /(^|\/)(package(-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|go\.sum|poetry\.lock|Gemfile\.lock|Makefile|Dockerfile)$|\.(ya?ml|toml|ini|cfg|lock|json)$|(^|\/)\.[^/]+$|^\.github\//i;
const SUBJECT_TYPE_RE = /^([a-z]+)(\([^)]*\))?(!)?:/i;
const SECRET_CONTENT_RE = /looks like a secret \(([^)]*)\): (.+):(\d+); the value/;
const SECRET_FILE_RE = /file looks like a secret: (.+?); remove/;
const CRASH_STDERR_RE = /\bat [^\n]+:\d+:\d+\)|\b(TypeError|RangeError|ReferenceError|SyntaxError)\b/;

const cleanEnv = () => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));
  env.GIT_TERMINAL_PROMPT = "0";
  return env;
};

function git(cwd, args, { input, timeout = TIMEOUT_MS } = {}) {
  return execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    cwd, env: cleanEnv(), encoding: "utf8", maxBuffer: MAX_BUF, input, timeout, stdio: ["pipe", "pipe", "pipe"],
  });
}
const tryGit = (cwd, args) => {
  try { return git(cwd, args).trim(); } catch { return null; }
};

// ---------- clone ----------

function cloneRepo(repo) {
  const dir = join(REPOS_DIR, repo.name);
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    rmSync(dir, { recursive: true, force: true });
    const t0 = Date.now();
    try {
      execFileSync("git", ["clone", "--quiet", "--depth", "400", "--no-single-branch", "--tags", repo.url, dir], {
        env: cleanEnv(), stdio: ["ignore", "ignore", "pipe"], timeout: CLONE_TIMEOUT_MS,
      });
      return {
        ok: true, dir, attempts: attempt, cloneSeconds: (Date.now() - t0) / 1000,
        sha: git(dir, ["rev-parse", "HEAD"]).trim(),
        shallow: git(dir, ["rev-parse", "--is-shallow-repository"]).trim() === "true",
        clonedAt: new Date().toISOString(),
      };
    } catch (e) {
      lastErr = String(e.stderr || e.message).split("\n")[0].slice(0, 200);
    }
  }
  return { ok: false, attempts: 2, error: lastErr };
}

// ---------- CLI runner ----------

function runCli(cwd, args) {
  const t0 = process.hrtime.bigint();
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd, env: cleanEnv(), encoding: "utf8", timeout: TIMEOUT_MS, maxBuffer: MAX_BUF,
  });
  const seconds = Number(process.hrtime.bigint() - t0) / 1e9;
  const timedOut = r.error?.code === "ETIMEDOUT";
  const stderr = r.stderr ?? "";
  return {
    exit: r.status,
    signal: r.signal,
    timedOut,
    seconds,
    stderrBytes: Buffer.byteLength(stderr),
    stderr,
    stdout: r.stdout ?? "",
    error: r.error ? r.error.code ?? r.error.message : null,
    argv: ["bin/check.mjs", ...args].join(" "),
  };
}

// The same command with stdout written to a file. A pipe is what a user or CI step gets,
// so the pipe run is the record; the file run only supplies the complete output for the
// references when the pipe run was cut off.
function runCliToFile(cwd, args) {
  mkdirSync(join(SCRATCH, "fileout"), { recursive: true });
  const out = join(SCRATCH, "fileout", `${process.pid}-${Date.now()}.out`);
  const fd = openSync(out, "w");
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd, env: cleanEnv(), stdio: ["ignore", fd, "pipe"], timeout: TIMEOUT_MS, maxBuffer: MAX_BUF,
  });
  closeSync(fd);
  const stdout = readFileSync(out, "utf8");
  unlinkSync(out);
  return { status: r.status, stdout, stderr: r.stderr ?? "" };
}

// JSON-producing commands: the pipe run is the record. If that run's stdout does not parse but
// the file run's does, the pipe cut the output off; the record says so and the file output is used.
function runCliJson(cwd, args) {
  const pipe = runCli(cwd, args);
  if (pipe.timedOut || pipe.exit === null || parseJson(pipe) !== undefined) return pipe;
  const file = runCliToFile(cwd, args);
  const fileOk = (() => { try { JSON.parse(file.stdout); return true; } catch { return false; } })();
  if (!fileOk) return pipe;
  return { ...pipe, stdout: file.stdout, pipeTruncated: true, pipeBytes: Buffer.byteLength(pipe.stdout) };
}

function parseJson(res) {
  try { return JSON.parse(res.stdout); } catch { return undefined; }
}

// Crash rules: a non-zero exit that is not one of the documented findings exits
// (stubs 1, check 1), any signal, an error reported on stderr that looks like a
// JavaScript exception, or unparseable JSON on a --json command.
function classify(res, allowedExits, jsonExpected) {
  const issues = [];
  if (res.timedOut) issues.push("timeout");
  else if (res.signal) issues.push(`signal ${res.signal}`);
  else if (res.exit !== 0 && !allowedExits.includes(res.exit)) issues.push(`exit ${res.exit} (not documented)`);
  if (res.error && !res.timedOut) issues.push(`spawn error ${res.error}`);
  if (res.pipeTruncated) issues.push(`stdout cut off at ${res.pipeBytes} bytes on a pipe (CLI calls process.exit before the pipe drains)`);
  if (CRASH_STDERR_RE.test(res.stderr)) issues.push("exception text on stderr");
  if (jsonExpected && res.exit !== null && res.exit !== undefined && res.stdout && parseJson(res) === undefined) {
    issues.push("stdout is not JSON");
  }
  return issues;
}

function cmdRecord(base, command, res, { ref = null, ours = null, match = null, note = "", allowedExits = [0], json = true } = {}) {
  const issues = classify(res, allowedExits, json);
  return {
    ...base,
    command,
    exit: res.exit,
    seconds: Number(res.seconds.toFixed(3)),
    stderrBytes: res.stderrBytes,
    ref,
    ours,
    match,
    note,
    crash: issues.some((i) => i !== "timeout"),
    timeout: res.timedOut,
    slow: res.seconds > SLOW_S,
    noise: res.exit === 0 && res.stderrBytes > 0,
    stderrHead: res.stderrBytes > 0 ? res.stderr.split("\n")[0].slice(0, 160) : undefined,
    issues,
  };
}

// ---------- ranges ----------

function semverTags(dir) {
  const merged = (tryGit(dir, ["tag", "--merged", "HEAD"]) || "").split("\n").filter(Boolean);
  return merged
    .map((t) => { const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(t); return m ? { tag: t, v: [+m[1], +m[2], +m[3]] } : null; })
    .filter(Boolean)
    .sort((a, b) => b.v[0] - a.v[0] || b.v[1] - a.v[1] || b.v[2] - a.v[2])
    .map((x) => x.tag);
}

const countRange = (dir, a, b) => {
  const n = tryGit(dir, ["rev-list", "--count", `${a}..${b}`]);
  return n === null ? null : Number(n);
};

function pickRanges(dir) {
  const tags = semverTags(dir);
  const out = [];
  // R1: first consecutive pair of semver tags (newest first) that is 5..300 commits apart.
  let r1 = null;
  for (let i = 0; i + 1 < tags.length && i < 10; i++) {
    const n = countRange(dir, tags[i + 1], tags[i]);
    if (n !== null && n >= 5 && n <= 300) { r1 = { range: `${tags[i + 1]}..${tags[i]}`, kind: "tag-pair", count: n }; break; }
  }
  if (!r1) {
    const total = Number(tryGit(dir, ["rev-list", "--count", "HEAD"]) ?? 0);
    const k = Math.min(60, total - 1);
    if (k >= 1) r1 = { range: `HEAD~${k}..HEAD`, kind: "last-commits", count: k };
  }
  if (r1) out.push({ id: "R1", ...r1 });
  // R2: the most recent merge (within 300 merges) whose first-parent range is 1..300 commits.
  const merges = (tryGit(dir, ["rev-list", "--merges", "-n", "300", "HEAD"]) || "").split("\n").filter(Boolean);
  for (const m of merges) {
    const n = countRange(dir, `${m}^1`, m);
    if (n !== null && n >= 1 && n <= 300) { out.push({ id: "R2", range: `${m}^1..${m}`, kind: "merge", count: n, merge: m }); break; }
  }
  // R3: the newest semver tag against the one before it, with no size filter.
  if (tags.length >= 2) {
    const range = `${tags[1]}..${tags[0]}`;
    if (!r1 || r1.range !== range) out.push({ id: "R3", range, kind: "newest-tag", count: countRange(dir, tags[1], tags[0]) });
  }
  return out;
}

// ---------- reference helpers (plain git) ----------

// Commits of a range, oldest first, with parents, subject and body.
function rangeCommits(dir, range) {
  const out = git(dir, ["log", "--reverse", "--format=%x1e%H%x1f%P%x1f%s%x1f%b", range]);
  return out.split("\x1e").map((s) => s.trim()).filter(Boolean).map((rec) => {
    const [sha, parents, subject, body = ""] = rec.split("\x1f");
    const ps = parents.split(" ").filter(Boolean);
    return { sha, merge: ps.length > 1, subject, body };
  });
}

// Patch id per non-merge commit, from git's own patch-id (stable).
function patchIds(dir, range) {
  const out = execFileSync("sh", ["-c", `git -c core.quotepath=false log --reverse --no-merges --no-color --no-ext-diff -p '${range}' | git patch-id --stable`], {
    cwd: dir, env: cleanEnv(), encoding: "utf8", maxBuffer: MAX_BUF, timeout: TIMEOUT_MS, stdio: ["ignore", "pipe", "pipe"],
  });
  const map = new Map();
  for (const line of out.split("\n")) {
    const [pid, cid] = line.trim().split(/\s+/);
    if (pid && cid) map.set(cid, pid);
  }
  return map;
}

// Patch text with the headers removed: what the duplicate check compares literally.
function normalizedPatch(dir, sha) {
  const raw = git(dir, ["show", "--format=", "--no-color", "--no-ext-diff", "-p", sha]);
  return raw.split("\n").filter((l) => !/^(diff --git |index |--- |\+\+\+ |@@|similarity |rename |new file mode|deleted file mode|old mode|new mode)/.test(l)).join("\n");
}

// Revert analysis, written from the git conventions: "Revert \"...\"" with a
// "This reverts commit <sha>" body; a revert of a revert is "Reapply \"...\"" and
// names the revert it undoes. Net state is cancelled when the number of
// revert or reapply commits that target a change is odd.
function revertReference(dir, commits) {
  const inRange = new Map(commits.map((c) => [c.sha, c]));
  const targetOf = (c) => { const m = /This reverts commit ([0-9a-f]{40})/.exec(c.body); return m ? m[1] : null; };
  const kindOf = (c) => (/^Reapply "/.test(c.subject) ? "reapply" : (/^Revert "/.test(c.subject) || targetOf(c)) ? "revert" : null);
  const events = new Map();
  const push = (k, v) => { if (!events.has(k)) events.set(k, []); events.get(k).push(v); };
  let revertLinks = 0;
  for (const c of commits) {
    const k = kindOf(c);
    if (!k) continue;
    if (k === "revert") revertLinks++;
    const t = targetOf(c);
    if (!t || !inRange.has(t)) continue;
    if (k === "revert") push(t, c.sha);
    else if (k === "reapply") {
      const r = inRange.get(t);
      if (r && kindOf(r) === "revert") { const root = targetOf(r); if (root && inRange.has(root)) push(root, c.sha); }
    }
  }
  const odd = (sha) => (events.get(sha) ?? []).length % 2 === 1;
  const cancelledMerges = commits.filter((c) => c.merge && odd(c.sha)).map((c) => c.sha);
  const cancelled = new Set();
  for (const c of commits) if (!c.merge && !kindOf(c) && odd(c.sha)) cancelled.add(c.sha);
  for (const m of cancelledMerges) {
    const brought = (tryGit(dir, ["rev-list", "--no-merges", m, `^${m}^1`]) || "").split("\n").filter(Boolean);
    for (const b of brought) {
      if (inRange.has(b) && !inRange.get(b).merge && !kindOf(inRange.get(b)) && (events.get(b) ?? []).length === 0) cancelled.add(b);
    }
  }
  const isRevertLike = (c) => kindOf(c) !== null;
  return { revertLinks, cancelled, isRevertLike, kindOf };
}

// Per-file whitespace-only status from git's own -w numstat.
function whitespaceNumstat(dir, range) {
  const out = git(dir, ["diff", "-w", "--numstat", "--no-renames", "-z", range]);
  const map = new Map();
  for (const rec of out.split("\0")) {
    const m = /^(\S+)\t(\S+)\t([\s\S]*)$/.exec(rec);
    if (!m) continue;
    const zero = m[1] === "0" && m[2] === "0";
    map.set(m[3], zero);
  }
  return map;
}

// ---------- per-range sweep ----------

function sweepRange(repo, dir, r, records, summary) {
  const base = { repo: repo.name, rangeId: r.id, range: r.range, rangeKind: r.kind };
  const tipSha = r.range.split("..")[1];

  // 1. range (ledger)
  const ledgerRes = runCliJson(dir, ["range", r.range, "--json"]);
  const L = parseJson(ledgerRes);
  records.push(cmdRecord(base, "range --json", ledgerRes, { allowedExits: [0], json: true, note: L ? "" : "ledger JSON did not parse" }));

  // 2. scope
  const scopeRes = runCliJson(dir, ["scope", r.range, "--json"]);
  const S = parseJson(scopeRes);

  // 3. stubs
  const stubsRes = runCliJson(dir, ["stubs", "--range", r.range, "--json"]);
  const ST = parseJson(stubsRes);

  // 4. check --diff (tip commit message, offline)
  mkdirSync(MSG_DIR, { recursive: true });
  const msgPath = join(MSG_DIR, `${repo.name}-${r.id}.txt`);
  writeFileSync(msgPath, git(dir, ["log", "-1", "--format=%B", tipSha]));
  const checkRes = runCliJson(dir, ["check", msgPath, "--format", "json", "--references", "off", "--diff", r.range]);
  const CK = parseJson(checkRes);

  // ---- references ----
  // (a) commit count
  if (L) {
    const refCount = countRange(dir, r.range.split("..")[0], r.range.split("..")[1]);
    const ours = L.commits.length;
    records.push({ ...base, command: "ref:commit-count", exit: null, seconds: null, stderrBytes: 0, ref: refCount, ours, match: refCount === ours, note: "ours = commits[].length; ref = git rev-list --count", crash: false, timeout: false, slow: false, noise: false, issues: [] });
  }

  // (b) reverts and cancelled
  const commits = rangeCommits(dir, r.range);
  const rev = revertReference(dir, commits);
  if (L) {
    const oursLinks = L.commits.filter((c) => c.flags.some((f) => f.code === "link" && /^reverts /.test(f.text))).length;
    const refLinks = commits.filter((c) => /^Revert "/.test(c.subject) || (rev.kindOf(c) === "revert")).length;
    records.push({ ...base, command: "ref:revert-links", exit: null, seconds: null, stderrBytes: 0, ref: refLinks, ours: oursLinks, match: refLinks === oursLinks, note: "ours = link flags 'reverts ...'; ref = Revert-subject or 'This reverts commit' commits", crash: false, timeout: false, slow: false, noise: false, issues: [] });
    const oursCancelledSet = new Set(L.commits.filter((c) => c.net?.state === "cancelled" && !c.merge && !c.flags.some((f) => f.code === "link")).map((c) => c.sha));
    const refCancelledSet = rev.cancelled;
    const onlyOurs = [...oursCancelledSet].filter((s) => !refCancelledSet.has(s));
    const onlyRef = [...refCancelledSet].filter((s) => !oursCancelledSet.has(s));
    const eq = onlyOurs.length === 0 && onlyRef.length === 0;
    records.push({ ...base, command: "ref:cancelled-set", exit: null, seconds: null, stderrBytes: 0, ref: refCancelledSet.size, ours: oursCancelledSet.size, match: eq, note: eq ? "" : `ours-only ${onlyOurs.length}, ref-only ${onlyRef.length} (shas: ${[...onlyOurs, ...onlyRef].slice(0, 3).map((s) => s.slice(0, 7)).join(",")})`, crash: false, timeout: false, slow: false, noise: false, issues: [] });
    const sumOk = L.summary.cancelled === refCancelledSet.size;
    records.push({ ...base, command: "ref:summary-cancelled", exit: null, seconds: null, stderrBytes: 0, ref: refCancelledSet.size, ours: L.summary.cancelled, match: sumOk, note: "ours = summary.cancelled", crash: false, timeout: false, slow: false, noise: false, issues: [] });
  }

  // (c) duplicates and patch ids
  if (L) {
    const pids = patchIds(dir, r.range);
    const groups = new Map();
    for (const c of commits) {
      if (c.merge || rev.isRevertLike(c)) continue;
      const pid = pids.get(c.sha);
      if (!pid) continue;
      if (!groups.has(pid)) groups.set(pid, []);
      groups.get(pid).push(c.sha);
    }
    const refDup = new Set();
    for (const list of groups.values()) for (const s of list.slice(1)) refDup.add(s);
    const oursDupCommits = L.commits.filter((c) => c.flags.some((f) => f.code === "duplicate"));
    const oursDup = new Set(oursDupCommits.map((c) => c.sha));
    const onlyOurs = [...oursDup].filter((s) => !refDup.has(s));
    const onlyRef = [...refDup].filter((s) => !oursDup.has(s));
    records.push({ ...base, command: "ref:duplicates", exit: null, seconds: null, stderrBytes: 0, ref: refDup.size, ours: oursDup.size, match: onlyOurs.length === 0 && onlyRef.length === 0, note: onlyOurs.length || onlyRef.length ? `ours-only ${onlyOurs.length}, ref-only ${onlyRef.length}` : "", crash: false, timeout: false, slow: false, noise: false, issues: [] });

    // literal patch text check of each duplicate pair the CLI reports
    let pairOk = 0; const pairBad = [];
    const byShort = new Map(L.commits.map((c) => [c.short, c.sha]));
    for (const c of oursDupCommits) {
      const f = c.flags.find((x) => x.code === "duplicate");
      const short = /same change as ([0-9a-f]{7,40})/.exec(f.text)?.[1];
      const other = short ? (byShort.get(short) ?? commits.find((x) => x.sha.startsWith(short))?.sha) : null;
      if (!other) { pairBad.push(`${c.short}: partner not found`); continue; }
      if (normalizedPatch(dir, c.sha) === normalizedPatch(dir, other)) pairOk++;
      else pairBad.push(`${c.short}~${short}: patch text differs`);
    }
    records.push({ ...base, command: "ref:duplicate-literal-text", exit: null, seconds: null, stderrBytes: 0, ref: oursDupCommits.length, ours: pairOk, match: pairBad.length === 0, note: pairBad.slice(0, 3).join("; "), crash: false, timeout: false, slow: false, noise: false, issues: [] });

    // patch id agreement with the ledger's own patchId field
    const pidMismatch = L.commits.filter((c) => !c.merge && c.patchId && pids.get(c.sha) && pids.get(c.sha) !== c.patchId).length;
    records.push({ ...base, command: "ref:patch-id", exit: null, seconds: null, stderrBytes: 0, ref: pids.size, ours: L.commits.filter((c) => c.patchId).length, match: pidMismatch === 0, note: `patch id disagreements: ${pidMismatch}`, crash: false, timeout: false, slow: false, noise: false, issues: [] });

    // (d) type-vs-files
    const nameOnly = git(dir, ["log", "--reverse", "--no-merges", "--name-only", "--format=%x1e%H%x1f%s", r.range]).split("\x1e").map((s) => s.trim()).filter(Boolean);
    const refType = new Set();
    for (const rec of nameOnly) {
      const nl = rec.indexOf("\n");
      const head = nl === -1 ? rec : rec.slice(0, nl);
      const files = nl === -1 ? [] : rec.slice(nl + 1).split("\n").filter(Boolean);
      const [sha, subject] = head.split("\x1f");
      const type = SUBJECT_TYPE_RE.exec(subject ?? "")?.[1]?.toLowerCase();
      if (!type || !TYPES_NO_SOURCE.has(type)) continue;
      if (files.some((p) => !DOC_RE.test(p) && !TEST_RE.test(p) && !CONFIG_RE.test(p))) refType.add(sha);
    }
    const oursType = new Set(L.commits.filter((c) => c.flags.some((f) => f.code === "type" && f.text.startsWith("type says"))).map((c) => c.sha));
    const fp = [...oursType].filter((s) => !refType.has(s));
    const missed = [...refType].filter((s) => !oursType.has(s));
    records.push({ ...base, command: "ref:type-vs-files", exit: null, seconds: null, stderrBytes: 0, ref: refType.size, ours: oursType.size, match: fp.length === 0 && missed.length === 0, note: `flagged but no source path by reference: ${fp.length}; reference found but not flagged: ${missed.length}. Reference treats config files as non-source, so a diff here is a mapping gap until read.`, crash: false, timeout: false, slow: false, noise: false, issues: [] });
  }

  // (e) scope whitespace-only
  if (S) {
    const refMap = whitespaceNumstat(dir, r.range);
    let disagree = []; let oursWs = 0;
    for (const f of S.files) {
      if (f.whitespaceOnly) oursWs++;
      const refZero = refMap.get(f.path);
      const ref0 = refZero === undefined ? true : refZero;
      if (Boolean(f.whitespaceOnly) !== ref0 && !(f.binary)) disagree.push(f.path);
    }
    const refWs = [...refMap.values()].filter(Boolean).length;
    records.push({ ...base, command: "ref:scope-whitespace", exit: null, seconds: null, stderrBytes: 0, ref: refWs, ours: oursWs, match: disagree.length === 0, note: disagree.length ? `${disagree.length} files differ, first: ${disagree.slice(0, 3).join(", ")}. CLI uses diff -b --ignore-blank-lines; reference uses diff -w` : "", crash: false, timeout: false, slow: false, noise: false, issues: [] });
  }
  if (S) {
    records.push(cmdRecord(base, "scope --json", scopeRes, { allowedExits: [0], json: true }));
  } else {
    records.push(cmdRecord(base, "scope --json", scopeRes, { allowedExits: [0], json: true, note: "scope JSON did not parse" }));
  }

  // 3b stubs record and TODO/FIXME reference
  const stubRecord = cmdRecord(base, "stubs --range --json", stubsRes, { allowedExits: [0, 1], json: true });
  records.push(stubRecord);
  {
    const patch = git(dir, ["diff", "--unified=0", "--no-color", "--no-ext-diff", r.range], { timeout: TIMEOUT_MS });
    let raw2 = 0; let raw3 = 0; let commentApprox = 0;
    for (const line of patch.split("\n")) {
      if (!line.startsWith("+") || line.startsWith("+++")) continue;
      const body = line.slice(1);
      if (/TODO|FIXME/.test(body)) raw2++;
      if (/TODO|FIXME|XXX/.test(body)) raw3++;
      if (/(\/\/|#|\/\*|<!--|^\s*\*|^\s*--).*\b(TODO|FIXME|XXX)\b/.test(body)) commentApprox++;
    }
    const oursMarkers = ST ? ST.findings.filter((f) => f.code === "stub-marker").length : null;
    const oursAllCodes = ST ? ST.findings.reduce((m, f) => { m[f.code] = (m[f.code] || 0) + 1; return m; }, {}) : null;
    records.push({ ...base, command: "ref:stub-markers", exit: null, seconds: null, stderrBytes: 0, ref: raw3, ours: oursMarkers, match: oursMarkers === raw3, note: `ref = added lines (git diff -U0, '+++' excluded) matching TODO|FIXME|XXX anywhere; ref TODO|FIXME only = ${raw2}; ref restricted to comment syntax (approximation) = ${commentApprox}; ours codes = ${JSON.stringify(oursAllCodes)}`, crash: false, timeout: false, slow: false, noise: false, issues: [] });
  }

  // 4. check --diff record and secret comparison
  const checkRecord = cmdRecord(base, "check --diff --format json", checkRes, { allowedExits: [0, 1], json: true, note: "" });
  records.push(checkRecord);
  if (CK) {
    const oursSecret = new Map();
    for (const f of CK.findings) {
      if (f.code === "diff-secret-content") {
        const m = SECRET_CONTENT_RE.exec(f.message);
        if (m) oursSecret.set(`${m[2]}:${m[3]}`, m[1]);
      } else if (f.code === "diff-secret-file") {
        const m = SECRET_FILE_RE.exec(f.message);
        if (m) oursSecret.set(m[1], "secret-file");
      }
    }
    const oursFiles = new Set([...oursSecret.keys()].map((k) => k.replace(/:\d+$/, "")));
    const skipped = CK.findings.some((f) => f.code === "diff-secret-skipped");
    // gitleaks: commits in the range, not the net diff. Paths only; the report is redacted.
    if (summary.gitleaks) {
      mkdirSync(GL_DIR, { recursive: true });
      const rep = join(GL_DIR, `${repo.name}-${r.id}.json`);
      const t0 = Date.now();
      const gl = spawnSync("gitleaks", ["git", dir, `--log-opts=${r.range}`, "--report-format=json", `--report-path=${rep}`, "--redact", "--exit-code=0", "--no-banner", "--no-color"], { encoding: "utf8", timeout: TIMEOUT_MS, env: cleanEnv(), maxBuffer: 64 * 1024 * 1024 });
      const glSec = (Date.now() - t0) / 1000;
      const glStderrBytes = Buffer.byteLength(gl.stderr ?? "");
      let glFiles = new Set(); let glRules = {}; let glCount = 0; let glNote = "";
      if (gl.error?.code === "ETIMEDOUT") glNote = "gitleaks timeout";
      else if (existsSync(rep)) {
        try {
          const arr = JSON.parse(readFileSync(rep, "utf8")) ?? [];
          glCount = arr.length;
          for (const x of arr) { glFiles.add(x.File); glRules[x.RuleID] = (glRules[x.RuleID] || 0) + 1; }
        } catch { glNote = "gitleaks report unreadable"; }
        unlinkSync(rep);
      } else if (gl.status === 0) { glNote = "no report written (no leaks)"; }
      else glNote = `gitleaks exit ${gl.status}`;
      const onlyOurs = [...oursFiles].filter((f) => !glFiles.has(f));
      const onlyGl = [...glFiles].filter((f) => !oursFiles.has(f));
      records.push({ ...base, command: "gitleaks git --log-opts", exit: gl.status, seconds: Number(glSec.toFixed(3)), stderrBytes: glStderrBytes, stderrHead: glStderrBytes ? (gl.stderr ?? "").split("\n")[0].slice(0, 160) : undefined, ref: glFiles.size, ours: oursFiles.size, match: onlyOurs.length === 0 && onlyGl.length === 0, note: `${glNote ? glNote + "; " : ""}gitleaks hits=${glCount} rules=${JSON.stringify(glRules)}; ours=check --diff net added lines (${oursSecret.size} line hits). File-set compare. ours-only paths: ${onlyOurs.slice(0, 5).join(", ")}; gitleaks-only paths: ${onlyGl.slice(0, 5).join(", ")}${skipped ? "; CLI secret-content check was skipped (diff too large)" : ""}`, crash: false, timeout: gl.error?.code === "ETIMEDOUT", slow: glSec > SLOW_S, noise: false, issues: [] });
    }
    records.push({ ...base, command: "ref:secret-hits", exit: null, seconds: null, stderrBytes: 0, ref: null, ours: oursSecret.size, match: null, note: `ours by code: content=${[...oursSecret.values()].filter((v) => v !== "secret-file").length}, file=${[...oursSecret.values()].filter((v) => v === "secret-file").length}; values are never stored`, crash: false, timeout: false, slow: false, noise: false, issues: [] });
  }
  summary.rangesRun++;
}

// ---------- main ----------

const allRepos = JSON.parse(readFileSync(join(HERE, "repos.json"), "utf8"));
const filter = process.argv.slice(2);
const repos = filter.length ? allRepos.filter((r) => filter.includes(r.name)) : allRepos;

const gitleaksOk = (() => { try { execFileSync("gitleaks", ["version"], { stdio: "ignore" }); return true; } catch { return false; } })();
const summary = { rangesRun: 0, gitleaks: gitleaksOk };
const records = [];
const repoInfo = [];
const started = Date.now();
mkdirSync(REPOS_DIR, { recursive: true });

for (const repo of repos) {
  const info = { name: repo.name, url: repo.url, reason: repo.reason };
  process.stderr.write(`[${repo.name}] clone\n`);
  const cl = cloneRepo(repo);
  if (!cl.ok) {
    Object.assign(info, { status: "skipped", cloneError: cl.error, attempts: cl.attempts });
    repoInfo.push(info); continue;
  }
  Object.assign(info, { status: "done", headSha: cl.sha, shallow: cl.shallow, cloneSeconds: Number(cl.cloneSeconds.toFixed(2)), clonedAt: cl.clonedAt, attempts: cl.attempts });
  const ranges = pickRanges(cl.dir);
  info.ranges = ranges.map((r) => ({ id: r.id, range: r.range, kind: r.kind, count: r.count }));
  if (ranges.length === 0) info.status = "no-ranges";
  for (const r of ranges) {
    process.stderr.write(`[${repo.name}] ${r.id} ${r.range}\n`);
    try {
      sweepRange(repo, cl.dir, r, records, summary);
    } catch (e) {
      records.push({ repo: repo.name, rangeId: r.id, range: r.range, command: "harness", exit: null, seconds: null, stderrBytes: 0, ref: null, ours: null, match: null, note: `harness error: ${String(e.message).split("\n")[0].slice(0, 300)}`, crash: true, timeout: false, slow: false, noise: false, issues: ["harness error"] });
    }
  }
  repoInfo.push(info);
}

const results = {
  generatedAt: new Date().toISOString(),
  wallSeconds: Number(((Date.now() - started) / 1000).toFixed(1)),
  cli: "bin/check.mjs",
  gitleaks: gitleaksOk,
  repos: repoInfo,
  records,
};
mkdirSync(SCRATCH, { recursive: true });
writeFileSync(RESULTS, JSON.stringify(results, null, 2));

// ---------- digest ----------

const done = repoInfo.filter((r) => r.status === "done" || r.status === "no-ranges");
const skipped = repoInfo.filter((r) => r.status === "skipped");
const crashes = records.filter((r) => r.crash);
const timeouts = records.filter((r) => r.timeout);
const slow = records.filter((r) => r.slow);
const noise = records.filter((r) => r.noise);
const mismatches = records.filter((r) => r.match === false);
const perType = {};
for (const m of mismatches) perType[m.command] = (perType[m.command] || 0) + 1;
const checked = {};
for (const r of records) if (r.match !== null && r.match !== undefined) checked[r.command] = (checked[r.command] || 0) + 1;

const interesting = [
  ...crashes.map((r) => ({ r, w: 0, why: r.issues.join("; ") })),
  ...timeouts.map((r) => ({ r, w: 1, why: "timeout" })),
  ...mismatches.map((r) => ({ r, w: 2, why: `ours ${r.ours} vs ref ${r.ref}` })),
  ...slow.map((r) => ({ r, w: 3, why: `${r.seconds}s` })),
  ...noise.map((r) => ({ r, w: 4, why: `stderr ${r.stderrBytes} bytes on exit 0` })),
].sort((a, b) => a.w - b.w).slice(0, 15);

const lines = [];
lines.push(`repos: ${repoInfo.length} listed, ${done.length} done, ${skipped.length} skipped (clone failed twice)`);
lines.push(`ranges run: ${summary.rangesRun}; records: ${records.length}; wall ${results.wallSeconds}s; gitleaks ${gitleaksOk ? "available" : "absent (secret comparison skipped)"}`);
lines.push(`crashes: ${crashes.length}; timeouts: ${timeouts.length}; over ${SLOW_S}s: ${slow.length}; stderr noise on exit 0: ${noise.length}`);
lines.push(`mismatches by command (of checked):`);
for (const k of Object.keys(checked).sort()) lines.push(`  ${k}: ${perType[k] || 0} / ${checked[k]}`);
lines.push(`15 most interesting:`);
interesting.forEach((x, i) => lines.push(`  ${i + 1}. ${x.r.repo} ${x.r.rangeId} ${x.r.range} | ${x.r.command} | ${x.why}${x.r.note ? " | " + x.r.note.slice(0, 220) : ""}`));
console.log(lines.join("\n"));
