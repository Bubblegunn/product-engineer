// product-engineer claims: a read-back of the numbers, versions and names in a text against the
// repository. It lists each one and says whether the text of a tracked file or of the last 50
// commits contains it. The answer is a list of candidates for a check, not a verdict: a name that
// is not in the repository may be correct, and a number that is in it may be about something else.
// No model, no network, no dependency.
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";

const USAGE = "usage: product-engineer claims <file|-> [--repo DIR] [--json]";
const FOOTER = "candidates, not verdicts: a 'not found' item needs a command or a source";
const MAX_FILE = 1024 * 1024;

const git = (args, cwd) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 512 * 1024 * 1024 });

const NOT_UNITS = new Set("a an the and or of to in on at for is are was were with but so as by it its i we you he she they this that these those then than from into not no now still just also only about over under more less both each all any some there here when while if because since after before again once yet".split(" "));

/** Numbers with units or counts, version-like tokens and backticked names, in the order of the text, without duplicates. */
export function extractClaims(text) {
  const out = [];
  const seen = new Set();
  const add = (kind, claim) => {
    const key = `${kind}\0${claim}`;
    if (!claim || seen.has(key)) return;
    seen.add(key);
    out.push({ claim, kind });
  };
  // A fence line (with its language tag) is not text; the lines inside it are.
  let rest = text.replace(/^[ \t]*(?:```+|~~~+)[^\n]*$/gm, "");
  const blank = (re, kind, pick) => {
    rest = rest.replace(re, (...m) => {
      const claim = pick(m);
      if (claim !== null) add(kind, claim);
      return " ".repeat(m[0].length);
    });
  };
  // Order of the text matters for the report, so find positions first, then sort.
  const hits = [];
  const note = (re, kind, pick) => {
    for (const m of rest.matchAll(re)) {
      const claim = pick(m);
      if (claim !== null) hits.push({ at: m.index, kind, claim });
    }
  };
  note(/`([^`\n]{1,80})`/g, "name", (m) => (/\s/.test(m[1].trim()) || !m[1].trim() ? null : m[1].trim()));
  blank(/`[^`\n]*`/g, "name", () => null);
  note(/(?<![\w.])(?:v\d+(?:\.\d+)*|\d+\.\d+\.\d+(?:[-+][\w.]+)?)(?![\w])/g, "version", (m) => m[0]);
  blank(/(?<![\w.])(?:v\d+(?:\.\d+)*|\d+\.\d+\.\d+(?:[-+][\w.]+)?)(?![\w])/g, "version", () => null);
  note(/(?<![\w.])(\d+(?:,\d{3})*(?:\.\d+)?%?)(?:[ \t]+([A-Za-z][A-Za-z-]*))?/g, "number", (m) => {
    const decimal = m[1].includes(".") || m[1].endsWith("%");
    const unit = m[2] && !NOT_UNITS.has(m[2].toLowerCase()) ? m[2] : null;
    if (decimal) return m[1];
    return unit ? `${m[1]} ${unit}` : null;
  });
  hits.sort((a, b) => a.at - b.at);
  for (const h of hits) add(h.kind, h.claim);
  return out;
}

const real = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Look each claim up in the tracked text files and in `git log -p -n 50`. */
function search(items, cwd, skipPath) {
  const texts = [];
  for (const file of git(["ls-files", "-z"], cwd).split("\0").filter(Boolean)) {
    const full = join(cwd, file);
    if (skipPath && real(full) === skipPath) continue;
    try {
      const st = lstatSync(full);
      if (!st.isFile() || st.size > MAX_FILE) continue;
      const buf = readFileSync(full);
      if (buf.subarray(0, 8000).includes(0)) continue;
      texts.push({ where: file, text: buf.toString("utf8") });
    } catch { /* a listed file that is gone is not evidence */ }
  }
  let log = "";
  try { log = git(["log", "-p", "-n", "50", "--no-color", "--no-ext-diff"], cwd); } catch { /* no commit yet */ }
  texts.push({ where: "git log", text: log });
  return items.map((item) => {
    const test = item.kind === "number"
      ? ((re) => (t) => re.test(t))(new RegExp(`(?<![\\w.])${escapeRe(item.claim).replace(/ /g, "\\s+")}(?![\\w])`, "i"))
      : (t) => t.includes(item.claim);
    const hit = texts.find((t) => test(t.text));
    return { ...item, found: Boolean(hit), where: hit ? hit.where : null };
  });
}

export function runClaims(argv, { cwd = process.cwd() } = {}) {
  let source;
  let repo = cwd;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") json = true;
    else if (a === "--repo") {
      if (!argv[i + 1]) return usageError("--repo needs a directory");
      repo = resolve(cwd, argv[++i]);
    } else if (a === "-" || !a.startsWith("-")) {
      if (source !== undefined) return usageError("only one input is allowed");
      source = a;
    } else return usageError(`unknown option ${a}`);
  }
  if (source === undefined) return usageError("pass a file or - for standard input");
  let text;
  try {
    text = source === "-" ? readFileSync(0, "utf8") : readFileSync(resolve(cwd, source), "utf8");
  } catch (err) {
    return usageError(`cannot read ${source === "-" ? "standard input" : source}: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
  }
  if (!text.trim()) {
    console.error("claims: empty input");
    return 1;
  }
  let results;
  try {
    if (!existsSync(repo)) throw new Error(`${repo} does not exist`);
    git(["rev-parse", "--is-inside-work-tree"], repo);
    results = search(extractClaims(text), repo, source === "-" ? null : real(resolve(cwd, source)));
  } catch (err) {
    console.error(`claims: cannot read the repository at ${repo}: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
    return 3;
  }
  if (json) {
    console.log(JSON.stringify(results.map(({ claim, kind, found, where }) => ({ claim, kind, found, where })), null, 2));
    return 0;
  }
  if (!results.length) console.log("claims: no numbers with units, versions or backticked names in the text");
  for (const r of results) console.log(`${r.claim} (${r.kind}): ${r.found ? `found ${r.where}` : "not found"}`);
  console.log(FOOTER);
  return 0;
}

function usageError(message) {
  console.error(`claims: ${message}`);
  console.error(USAGE);
  return 2;
}
