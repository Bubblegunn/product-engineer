// product-engineer range: a ledger of candidates for a git range, read from git alone.
//
// Each commit of the range is listed oldest first with its class (docs, test, config, source, version,
// merge) and a flag for each thing git shows that a reader should check: a change reverted later in the
// range, a patch-identical duplicate (cherry-pick), security or performance wording in the subject, a
// breaking-change marker, and a conventional type that the changed files contradict. A revert names the
// commit it undoes; a revert of a revert puts that change back, so the net state follows the chain in
// order. Facts come from `git log`, `git diff-tree`, `git show` and `git patch-id --stable` (the same
// patch id means the same change). No model and no network. Every line is a candidate to check against
// the diff, not a verdict.
import { execFileSync } from "node:child_process";
import { classOf } from "./scope.mjs";

const USAGE = `usage: product-engineer range <from>..<to> [--json]
       product-engineer range <ref>            (the same as <ref>..HEAD)
Lists each commit of the range, oldest first, with its class and candidate flags. A change that a
later commit reverts is shown as "net: cancelled"; a revert of a revert shows "net: present" again.
Every line is a candidate to check against the diff. Exit 0 for a ledger, 2 for usage or a bad range.`;

const FOOTER = "Candidates only. Read the diff before you write a line about any of these.";
const SECURITY = /security|CVE|vuln|escape|sanitiz|xss|csrf|injection|auth/i;
const PERFORMANCE = /perf|faster|speed|cache|optimi|latency|throughput/i;
const BENCH = /(bench|timing|perf)/i;
const CONVENTIONAL = /^([a-z]+)(\([^)]*\))?(!)?:/i;
const VERSION_FILE = /(^|\/)(package(-lock)?\.json|[^/]*\.toml|setup\.cfg|gradle\.properties|VERSION|version\.(txt|json))$/;
const TYPES_WITHOUT_SOURCE = new Set(["docs", "test", "chore", "style", "ci", "build"]);
const KIND_NAME = { doc: "docs", test: "test", config: "config", source: "source" };
const ORDER = ["docs", "test", "config", "source"];
const kindOf = (p) => KIND_NAME[classOf(p)];

const git = (args, cwd, input) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd, encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });

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

/** The sha of a ref. Throws `unknown revision: <ref>` when the ref does not name a commit. */
function resolve(ref, cwd) {
  try {
    return git(["rev-parse", "--verify", "-q", `${ref}^{commit}`], cwd).trim();
  } catch {
    throw new Error(`unknown revision: ${ref}`);
  }
}

/**
 * The ledger of a range. `from` and `to` are refs as the user wrote them; `from` is excluded, `to` included.
 * Throws `unknown revision: <ref>` when either ref does not name a commit.
 */
export function range({ from, to, cwd = process.cwd() } = {}) {
  const fromSha = resolve(from, cwd);
  const toSha = resolve(to, cwd);
  // Three batched reads for the whole range, not three processes per commit: one log for the subjects, bodies
  // and file lists (NUL-separated), one log of the patches, and one `git patch-id --stable` over that patch
  // log. The same patch id means the same change (a cherry-pick gives the same id).
  const span = `${fromSha}..${toSha}`;
  const names = git(["log", "--topo-order", "--reverse", "--root", "--no-renames", "--name-only", "-z", "--format=%x1e%H%x1f%P%x1f%s%x1f%b%x1f", span], cwd);
  const patchLog = git(["log", "--topo-order", "--reverse", "--root", "--no-renames", "--no-color", "--no-ext-diff", "-p", "--format=commit %H", span], cwd);
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
    if (!m.merge || m.net.state !== "cancelled") continue;
    const reverter = m.events.at(-1);
    const brought = git(["rev-list", `${m.parents[0]}..${m.parents[1]}`], cwd).split("\n").filter(Boolean);
    for (const sha of brought) {
      const c = bySha.get(sha);
      if (c && c.events.length === 0) c.net = { state: "cancelled", by: reverter.short, merge: m.short };
    }
  }

  const firstByPatch = new Map();
  const duplicateOf = new Map();
  for (const c of commits) {
    if (!c.patchId || c.kind) continue;
    const first = firstByPatch.get(c.patchId);
    if (first) duplicateOf.set(c.sha, first);
    else firstByPatch.set(c.patchId, c);
  }
  const benchPaths = [...new Set(commits.flatMap((c) => c.files).filter((p) => BENCH.test(p)))];

  for (const c of commits) {
    const flags = [];
    if (c.kind) {
      const verb = c.kind === "revert" ? "reverts" : "reapplies";
      const target = c.reverts ? commits.find((x) => x.sha === c.reverts) : null;
      if (target) flags.push({ code: "link", text: `${verb} ${target.short}: ${target.subject}` });
      else if (c.outsideSha) flags.push({ code: "link", text: `${verb} ${c.outsideSha.slice(0, 7)}, which is outside this range` });
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
      flags.push({ code: "type", text: `type says ${c.type} but the commit changes source files: ${sourceFiles.slice(0, 3).join(", ")}` });
    }
    const configFiles = c.files.filter((p) => kindOf(p) === "config");
    if (c.type === "refactor" && configFiles.length > 0) flags.push({ code: "type", text: `refactor touches config: ${configFiles.slice(0, 3).join(", ")}` });
    c.flags = flags;
  }

  const originals = commits.filter((c) => !c.kind && !c.merge);
  const cancelled = originals.filter((c) => c.net.state === "cancelled").length;
  const present = originals.length - cancelled;
  const label = `${from}..${to}`;
  return {
    range: { from, to },
    header: `range ${label}: ${commits.length} commit${commits.length === 1 ? "" : "s"}, ${present} net change${present === 1 ? "" : "s"} present, ${cancelled} cancelled`,
    summary: { commits: commits.length, present, cancelled },
    commits: commits.map((c) => ({ sha: c.sha, short: c.short, subject: c.subject, merge: c.merge, classes: c.classes, files: c.files, patchId: c.patchId, net: c.kind ? null : c.net, flags: c.flags.map(({ code, text }) => ({ code, text })) })),
    footer: FOOTER,
  };
}

export function render(report) {
  const out = [report.header];
  for (const c of report.commits) {
    out.push(`${c.short} ${c.classes.join("+")}  ${c.subject}`);
    for (const f of c.flags) out.push(`    ${f.text}`);
  }
  out.push(report.footer);
  return out.join("\n");
}

export function runRange(argv) {
  const json = argv.includes("--json");
  const rest = argv.filter((a) => a !== "--json");
  const parsed = rest.length === 1 ? parseRange(rest[0]) : null;
  if (!parsed) { console.error(USAGE); return 2; }
  let report;
  try { report = range({ ...parsed, cwd: process.cwd() }); } catch (err) {
    console.error(`range: cannot read the range ${parsed.from}..${parsed.to}: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
    return 2;
  }
  console.log(json ? JSON.stringify(report, null, 2) : render(report));
  return 0;
}
