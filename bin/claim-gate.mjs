#!/usr/bin/env node
// product-engineer claim-gate: a Stop hook that checks the claims in the agent's last words against
// what the session did, and asks once for the missing evidence.
//
// The claim-to-evidence shape follows groundtruth by Muhammad Salmaan Ahmed Nusrath (MIT) and the
// loop guard (stop_hook_active) and block JSON follow dod-guard by Atos Daniel de Assis Lins (MIT).
// The ideas were taken and the code is written for this tool. The five claim families below are
// the ones those tools do not check: a statement that nothing changed, a statement about the
// starting state, "formatting only", "unchanged", and "fixed" without a test.
//
// It reads the hook input on standard input ({ transcript_path, stop_hook_active, last_assistant_message }),
// reads the transcript, and prints { decision: "block", reason } at most once per session. It never
// blocks a session that used no tools. PRODUCT_ENGINEER_NO_GATE=1 turns it off. English phrases only.
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { isTestPath, isDocPath } from "./diff.mjs";
import { verify, failingCount } from "./verify.mjs";
import { secondEye } from "./second-eye.mjs";

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const BASH_WRITE = /\bsed\s+(?:-[a-zA-Z]*i|--in-place)\b|\bperl\s+-[a-zA-Z]*i\b|\btee\s+(?!\/dev\/null)\S|\bgit\s+(?:apply|checkout\s+--|restore|reset|stash(?!\s+list))\b|\bpatch\s+-|(?:^|[\s\d])>>?\s*(?!&|\/dev\/null)[^\s&|;>]+|\b(?:mv|rm|cp)\s/;
const GIT_STATE = /\bgit\s+(?:-\S+\s+)*(?:status|diff|log|show|stash\s+list|ls-files)\b/;
const WS_DIFF = /\bgit\s+(?:-\S+\s+)*(?:diff|show|log)\b[^\n|;&]*\s(?:-w|-b|--ignore-all-space|--ignore-space-change|--ignore-space-at-eol|--ignore-blank-lines|--word-diff\S*|--color-moved\S*)(?=\s|$)|\bproduct-engineer\s+scope\b|\bcheck\.mjs\s+scope\b/;
export const TEST_RUN = /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b|\bnpm\s+t\b|\bnode\s+(?:--[\w-]+\s+)*--test\b|\bnode\s+\S*\.test\.[cm]?js\b|\bpytest\b|\bpy\.test\b|\bpython3?\s+-m\s+(?:pytest|unittest)\b|\bgo\s+test\b|\bcargo\s+(?:test|nextest)\b|\b(?:vitest|jest|mocha|rspec|phpunit)\b|\bmvn\s+(?:-\S+\s+)*test\b|\bgradlew?\s+test\b|\bdotnet\s+test\b|\bmake\s+(?:test|check)\b|\b(?:bash|sh)\s+\S*test\S*\.sh\b/;

// A starting-state statement that names where it comes from (the snapshot or context the session began with) is a quotation, not a claim about a check.
const SNAPSHOT_SOURCE = /\b(?:snapshot|gitStatus|system context)\b/i;
const NEGATION = /\b(?:not|never|isn't|aren't|wasn't|weren't|no longer|rather than|instead of|more than|beyond)\b|n't\b/i;
const CLAIMS = {
  nochange: /\b(?:no (?:code |file |source )?changes? (?:were |was |have been )?(?:made|needed|necessary|required)(?! to (?:the )?(?:public |user-facing )?(?:api|interface|schema|contract|behaviou?r|format|semantics)\b)|made no (?:code |file )?changes?(?! to (?:the )?(?:public |user-facing )?(?:api|interface|schema|contract|behaviou?r|format|semantics)\b)|(?:did not|didn't|have not|haven't|has not|hasn't) (?:change|modify|edit|touch|alter) (?:anything|any files?|the (?:code|repo\w*|files?))|nothing (?:was |has been |had to be )?(?:changed|modified|edited)|(?:left|leaving) (?:the )?(?:code|repo\w*|files?|tree) (?:as is|untouched|unchanged|alone)|working tree is (?:unchanged|clean))\b/i,
  startstate: /\b(?:(?:working tree|work tree|repo\w*|checkout|directory|git status|status) (?:was|were|is|showed|shows)(?: already)? (?:clean|dirty|empty|uncommitted)|(?:was|were) (?:already )?(?:uncommitted|untracked)|already (?:in|present in) (?:the|your) (?:working tree|repo\w*|checkout)|(?:i|we) (?:did not|didn't|never) (?:write|create|author) (?:it|this|that|these|those|the (?:file|files|module))|(?:before|when) (?:i|we) (?:started|began)|at (?:the )?(?:start|beginning) of the session|pre-?existing (?:changes|edits|files|work))\b/i,
  formatting: /\b(?:formatting[- ]only|only (?:formatting|whitespace|style|cosmetic)|(?:purely|just|merely) (?:formatting|whitespace|style|cosmetic|reformatting)|(?:whitespace|style|cosmetic)[- ]only|no (?:functional|behaviou?ral|behaviou?r) changes?)\b/i,
  unchanged: /\b(?:(?:behaviou?r|logic|output|results?|semantics)\s+(?:is |are |was |remains? |stays? |is still )?(?:unchanged|the same|identical)|(?:behaves?|works?|reads?|looks?|runs?) (?:exactly |just |precisely )?(?:the same|as (?:it did )?before|as previously)|(?:unchanged|identical) (?:behaviou?r|output)|exactly as before|same as before)\b/i,
  passing: /\b(?:(?:all |the |every )?(?:\d+ )?(?:tests?|specs?|suite|checks?)\s+(?:(?:are|is|now|all|still) )*(?:pass(?:ed|es|ing)?|green)|all green|\d+ (?:passing|passed))\b/i,
  addedtests: /\b(?:(?:added|wrote|written|created|authored)(?: (?:an?|the|some|several|a few|a couple of|few|\d+|one|two|three|four|five|six|new|more|additional|extra|regression|unit|integration|failing|e2e)\b)* (?:tests?|test cases?|specs?)\b|(?<!\b(?:existing|old|current|original|legacy|those|these|prior|previous|earlier|other)\s)(?:tests?|test cases?|specs?) (?:were |was |have been |has been )?(?:added|written|created)\b(?! (?:earlier|previously|before|already|in (?:the )?(?:previous|last|earlier|prior)\b)))/i,
  fixed: /\b(?:i (?:have )?(?:fixed|resolved|patched|corrected)|(?:is|are|now) (?:fixed|resolved)|the fix|fixes)\b/i,
  // A count or range summary about the repository ("12 commits", "3 files changed", "all 8 tests", "since v1 there were").
  count: /\b(?:(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty)\s+(?:new\s+|more\s+|total\s+)?(?:commits?|files? changed|tests?|occurrences?|usages?|call sites)\b|\ball\s+\d+\b|\bsince\s+\S+\s+there\s+(?:were|are|was|is)\b)/i,
  // A claim that nothing else is affected ("nothing else uses", "no other callers", "only used in").
  exhaustive: /\b(?:nothing else (?:uses?|calls?|references?|depends on|imports?)|no (?:other|remaining|more) (?:places?|usages?|callers?|references?|occurrences?|uses|call sites|copies)|only (?:used|referenced|called|imported) (?:in|by|from)\b|(?:the )?only (?:place|usage|caller|occurrence|reference)s? (?:is|left|of|that)\b|no remaining references?|(?:all|every) (?:call sites?|usages?|references?|occurrences?) (?:are |have been |were |was )?(?:updated|changed|migrated|renamed|replaced))\b/i,
  // A change stated as done on a remote or in production ("is pushed", "I deployed", "went live", "merged to main").
  landed: /\b(?:(?:has|have|had|was|were|is|are|been|got)\s+(?:been\s+|now\s+|also\s+|already\s+|successfully\s+|just\s+)*(?:pushed|deployed|published|released|merged)|(?:i|we)\s+(?:have\s+|just\s+|already\s+)*(?:pushed|deployed|published|released|merged)\b|(?:is|are|went|has gone|have gone) live\b|(?:pushed|deployed|published|released|merged)\s+(?:to|on|into)\s+(?:origin|master|main|production|prod|npm|pypi|vercel|railway|github)\b)/i,
};
// A word that makes a count, an absence or a remote state a plan, a condition or a negation when it stands in the same clause before the match.
const HEDGE_BEFORE = /\b(?:can|could|will|would|should|may|might|must|to|if|until|no|none|nothing|neither|nor|without)\b/i;
const ABSENCE = /\b(?:no|without|zero|none|already)\b/i;
const PLAIN_REQUEST = /\bplain[- ]language\b|\bplain english\b|\bin plain (?:words|terms|english)\b|\bsimpl(?:e|er|ify) (?:words|terms|language)\b/i;
// The `plain` family checks a rewrite against its source, so it needs both: a request to rewrite (not to write something new), and a source text.
const REWRITE_REQUEST = /\b(?:rewrit\w*|re-?phras\w*|simplif\w*|paraphras\w*|translat\w*|convert\w*|restat\w*|reword\w*)\b/i;
const SOURCE_FILE = /[\w@.~/-]*[\w-]\.(?:md|mdx|txt|rst|adoc|html?|tex|docx?|pdf|rtf)\b|\b(?:README|LICEN[CS]E|TERMS|NOTICE|POLICY|CONTRIBUTING|SECURITY)\b/gi;
const SHOW_FILE = /\b(?:cat|head|tail|less|more|bat|nl|sed|awk|grep|rg)\b/;
const FACTS_RUN = /\bproduct-engineer\s+facts\b|\bcheck\.mjs\s+facts\b/;
// Commands that settle a count (the repository's own counters), a search for every use, or a remote state.
const COUNT_RUN = /\bproduct-engineer\s+(?:range|claims|facts)\b|\bcheck\.mjs\s+(?:range|claims|facts)\b|\bgit\s+(?:-\S+\s+)*rev-list\b[^|;&\n]*--count\b|\bgit\s+(?:-\S+\s+)*log\b[^|;&\n]*\S\.\.\S|\bgit\s+(?:-\S+\s+)*log\b[^|;&\n]*--oneline[^\n]*\|\s*wc\b|\bgit\s+(?:-\S+\s+)*diff\b[^|;&\n]*--(?:stat|numstat|shortstat)\b|\bwc\s+-l\b|\b(?:grep|rg)\s+(?:[^|;&\n]*\s)?-[a-zA-Z]*c\b|\brg\b[^|;&\n]*--count\b|\bfind\b[^\n]*\|\s*wc\b/;
const SEARCH_RUN = /\bproduct-engineer\s+twins\b|\bcheck\.mjs\s+twins\b|\bgit\s+(?:-\S+\s+)*grep\b|\brg\b|\back\b|\bgrep\b[^|;&\n]*\s(?:-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)\b|\bgit\s+(?:-\S+\s+)*ls-files\b[^\n]*\|\s*xargs\b[^\n]*\bgrep\b/;
const REMOTE_RUN = /\bgit\s+(?:-\S+\s+)*ls-remote\b|\bgit\s+(?:-\S+\s+)*status\b[^|;&\n]*\s-[a-zA-Z]*b\b|\bgit\s+(?:-\S+\s+)*status\b[^|;&\n]*--branch\b|\bgit\s+(?:-\S+\s+)*log\b[^|;&\n]*\borigin\/|\bgh\s+(?:run|pr|release)\b|\bcurl\b|\bnpm\s+view\b|\bvercel\b|\brailway\b/;
export const FIX_REQUEST = /\b(?:bug|fix|broken|regression|crash(?:es|ing)?|fails?|failing|not working)\b/i;
// Families that are counts, absences, remote states and the second reading. A read-only session never blocks on them, and the first block of a writing session sends them as advice.
export const NOISE_FAMILIES = new Set(["count", "exhaustive", "landed", "second-eye"]);
// Reasons the session gives once: a later block in the same session does not repeat them.
export const ONCE_FAMILIES = new Set(["addedtests", "fixed"]);
const COMMIT_RUN = /\bgit\s+(?:-\S+\s+)*commit\b/;
const WRITTEN_CLAIM_FILE = /^(?:pr|pull[-_ ]?request|summary|notes?|report|description|answer|review)(?:\b|[-_.\d])/i;

const sentencesOf = (text) =>
  text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/["“][^"”\n]{1,80}["”]/g, " ")
    .split(/(?<=[.!?:])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

const clauseAround = (sentence, at, length) => {
  const start = Math.max(sentence.slice(0, at).lastIndexOf(","), sentence.slice(0, at).lastIndexOf(";"), sentence.slice(0, at).search(/\b(?:but|and|though|although)\b(?![^]*\b(?:but|and|though|although)\b)/));
  const rest = sentence.slice(at + length).search(/[,;]|\b(?:but|and|though|although)\b/);
  return sentence.slice(Math.max(0, start), rest < 0 ? sentence.length : at + length + rest);
};

/** Claim families found in a text, each with the sentence that holds it. A negated phrase is not a claim. */
export function findClaims(text) {
  const found = [];
  for (const sentence of sentencesOf(text)) {
    for (const [family, re] of Object.entries(CLAIMS)) {
      const m = re.exec(sentence);
      if (!m) continue;
      const before = sentence.slice(Math.max(0, m.index - 60), m.index).split(/[,;]|\b(?:but|and|though|although)\b/).pop();
      if (family === "startstate" && SNAPSHOT_SOURCE.test(clauseAround(sentence, m.index, m[0].length))) continue;
      if (family === "addedtests" && ABSENCE.test(before)) continue;
      const self = family === "nochange" || family === "startstate";
      if (!self && NEGATION.test(before)) continue;
      if (["count", "exhaustive", "landed"].includes(family) && HEDGE_BEFORE.test(before)) continue;
      found.push({ family, sentence });
    }
  }
  return found;
}

/** The session as an ordered list of events and the last words of the agent. */
// The output kept for a test command: the last characters, where a runner prints its summary.
const OUTPUT_CAP = 4000;
const resultText = (c) => (typeof c === "string" ? c : (Array.isArray(c) ? c : []).filter((b) => b?.type === "text").map((b) => String(b.text ?? "")).join("\n"));

export function readSession(lines) {
  const events = [];
  // Bash tool_use id -> its event, so the tool_result that answers it can fill in `output`.
  const bashById = new Map();
  let prompt = "";
  let last = "";
  for (const line of lines) {
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (e.isSidechain) continue;
    const content = e.message?.content;
    if (e.type === "user" && !e.isMeta) {
      const text = typeof content === "string" ? content : (Array.isArray(content) ? content : []).filter((b) => b?.type === "text").map((b) => b.text).join("\n");
      // A new person turn starts a new scope: earlier edits belong to an earlier turn.
      if (text.trim()) { prompt = text; events.length = 0; last = ""; bashById.clear(); }
    }
    if (e.type === "user" && Array.isArray(content)) {
      for (const b of content) {
        const ev = b?.type === "tool_result" ? bashById.get(b.tool_use_id) : undefined;
        if (ev) ev.output = resultText(b.content).slice(-OUTPUT_CAP);
      }
    }
    if (e.type !== "assistant" || !Array.isArray(content)) continue;
    const texts = content.filter((b) => b?.type === "text").map((b) => String(b.text ?? ""));
    if (texts.length) last = texts.join("\n");
    for (const b of content) {
      if (b?.type !== "tool_use") continue;
      const input = b.input ?? {};
      if (WRITE_TOOLS.has(b.name)) {
        const path = input.file_path ?? input.notebook_path ?? "";
        const base = String(path).split("/").pop();
        events.push({ kind: "write", path, text: b.name === "Write" && /\.(md|txt)$/i.test(base) && WRITTEN_CLAIM_FILE.test(base) ? String(input.content ?? "") : "" });
      } else if (b.name === "Bash") {
        const command = String(input.command ?? "");
        // The write comes first: a command that redirects its own output is not evidence about later edits.
        // A test run that also writes a test file is a write to that path; the run that follows it is after the write.
        const touches = command.split(/[\s"'<>|;&=()]+/).filter((t) => t && isTestPath(t.replace(/^\.\//, "")));
        if (BASH_WRITE.test(command) && !GIT_STATE.test(command) && (!TEST_RUN.test(command) || touches.length)) events.push({ kind: "write", path: "", text: "", touches, command });
        const ev = { kind: "bash", command };
        events.push(ev);
        if (b.id) bashById.set(b.id, ev);
      } else {
        events.push(b.name === "Read" ? { kind: "read", path: String(input.file_path ?? "") } : { kind: "other" });
      }
    }
  }
  return { events, prompt, last };
}

const indexOfLast = (events, pred) => { for (let i = events.length - 1; i >= 0; i--) if (pred(events[i])) return i; return -1; };
const indexOfFirst = (events, pred) => events.findIndex(pred);
const isWrite = (e) => e.kind === "write";
// A write to a document or generated-text file. Writing a document does not invalidate a test run, but it is still a write for claims about the document.
const isDocWrite = (e) => isWrite(e) && isDocPath(e.path ?? "");
const isCodeWrite = (e) => isWrite(e) && !isDocWrite(e);
const runs = (re) => (e) => e.kind === "bash" && re.test(e.command);

/** Helpers for the provenance rules: the numbers a count sentence states, and the paths a search printed that the session did not write. */
// Every number of the sentence appears as a whole number in some printed output of the turn. A sentence without digits has no number to match.
const numbersPrinted = (sentence, outputs) => {
  const nums = sentence.match(/\d+/g);
  return Boolean(nums) && nums.every((n) => new RegExp(`(?<!\\d)${n}(?!\\d)`).test(outputs));
};
// A search line is "path:line:text" or a bare path. The paths it names that no write of the session matches.
const otherFiles = (output, written) =>
  String(output)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (/^(.+?):\d+[:-]/.exec(l)?.[1] ?? l).replace(/^\.\//, ""))
    .filter((p) => !written.some((w) => w === p || w.endsWith(`/${p}`)));

/**
 * Whether the request gives the session a text to rewrite: a passage pasted into the prompt, or a file the prompt names that the
 * session read (the Read tool or a command that shows it; an edit in place needs a read first). Without one there is nothing to compare the answer with.
 */
export function hasRewriteSource({ events, prompt }) {
  const text = String(prompt ?? "");
  if (/```/.test(text) || /^\s*>\s+\S/m.test(text) || /["“][^"”]{150,}["”]/.test(text) || text.split(/\n\s*\n/).slice(1).some((p) => p.trim().length >= 200)) return true;
  const named = [...new Set((text.match(SOURCE_FILE) ?? []).map((t) => t.split("/").pop().toLowerCase()))];
  const base = (p) => String(p ?? "").split("/").pop().toLowerCase();
  const matches = (name, other) => other === name || (!name.includes(".") && other.startsWith(name));
  return named.some((name) => events.some((e) => (e.kind === "read" && matches(name, base(e.path))) || (e.kind === "bash" && SHOW_FILE.test(e.command) && e.command.toLowerCase().includes(name))));
}

/** Reasons to ask for more evidence, each with its family (also its id); an empty list means every claim has what it needs. */
export function gate(session, claimTexts = [session.last]) {
  return gateItems(session, claimTexts).map((r) => r.text);
}

export function gateItems({ events, prompt, last }, claimTexts = [last]) {
  if (!events.length) return [];
  const claims = claimTexts.flatMap((t) => findClaims(String(t ?? "")));
  const families = new Set(claims.map((c) => c.family));
  // A statement about what a change is or does needs a change in this turn to be about.
  if (indexOfLast(events, isWrite) < 0) { families.delete("unchanged"); families.delete("formatting"); families.delete("fixed"); }
  const quote = (f) => claims.find((c) => c.family === f).sentence.slice(0, 140);
  const lastWrite = indexOfLast(events, isWrite);
  const firstWrite = indexOfFirst(events, isWrite);
  const after = (pred) => indexOfLast(events, pred) > lastWrite;
  // The test-run families count only code writes: a document written after a run does not make the run stale.
  const lastCodeWrite = indexOfLast(events, isCodeWrite);
  const afterCode = (pred) => indexOfLast(events, pred) > lastCodeWrite;
  // A green run after the last write settles a passing claim, however the sentence is phrased.
  const lastRun = indexOfLast(events, runs(TEST_RUN));
  if (lastRun > lastCodeWrite && failingCount(events[lastRun].output) === 0) families.delete("passing");
  const reasons = [];
  const add = (family, text) => reasons.push({ id: family, family, text });

  if (families.has("nochange") && lastWrite >= 0 && !after(runs(GIT_STATE))) {
    add("nochange", `You say nothing was changed ("${quote("nochange")}"), but this session wrote files. Run git status and git diff now, then state what the working tree shows.`);
  }
  if (families.has("startstate") && firstWrite >= 0 && !(indexOfFirst(events, runs(GIT_STATE)) >= 0 && indexOfFirst(events, runs(GIT_STATE)) < firstWrite)) {
    add("startstate", `You describe the starting state of the working tree or who wrote what ("${quote("startstate")}"), but no git status, git diff or git log ran before your first edit. Drop that statement, or say that you did not check it.`);
  }
  if (families.has("formatting") && !events.some(runs(WS_DIFF))) {
    add("formatting", `You call a change formatting-only or free of functional change ("${quote("formatting")}"), but no whitespace-aware diff ran. Run git diff -w <range> --stat (or product-engineer scope <range>) and name each file that still changes; otherwise drop the claim.`);
  }
  if (families.has("unchanged") && !afterCode(runs(TEST_RUN)) && !events.some(runs(WS_DIFF))) {
    add("unchanged", `You say behaviour is unchanged ("${quote("unchanged")}"), but no test command ran after your last edit. Run the project's tests, name them, and say it rests on that run, or drop the claim.`);
  }
  if (families.has("passing") && !afterCode(runs(TEST_RUN))) {
    add("passing", `You say tests pass ("${quote("passing")}"), but no test command ran after your last edit. Run the tests again and quote the result as printed.`);
  }
  if (families.has("addedtests") && !events.some((e) => isCodeWrite(e) && (isTestPath(e.path ?? "") || (e.touches ?? []).length))) {
    add("addedtests", `You say tests were added ("${quote("addedtests")}"), but no write to a test file happened in this turn. Write the test, run it, and name the file; otherwise drop the claim.`);
  }
  if (families.has("fixed") && FIX_REQUEST.test(prompt)) {
    const writes = events.filter(isWrite);
    const source = writes.some((e) => e.path && !isTestPath(e.path) && !isDocPath(e.path));
    const testWritten = writes.some((e) => (e.path && isTestPath(e.path)) || (e.touches ?? []).length > 0);
    if (source && !testWritten) {
      add("fixed", `You report a fix ("${quote("fixed")}"), but no test file was written. Add a test that fails without the fix and passes with it, run it, and report both results.`);
    }
  }
  // Tool steering: a count, an exhaustive search and a remote state each need the command that settles it, run after the last edit.
  // A count is also settled when every number in it was printed by a command of the turn.
  const outputs = events.filter((e) => e.kind === "bash" && e.output !== undefined).map((e) => e.output).join("\n");
  const unproven = claims.filter((c) => c.family === "count" && !numbersPrinted(c.sentence, outputs));
  if (unproven.length && !after(runs(COUNT_RUN))) {
    add("count", `You state a count ("${unproven[0].sentence.slice(0, 140)}") without a command that counted it. Run product-engineer range <from>..<to> (commits) or git rev-list --count, then quote the printed number.`);
  }
  // A search after the last edit settles an exhaustive claim when its output is empty or names only files the session wrote. A search that names other files contradicts it.
  if (families.has("exhaustive")) {
    const written = events.filter(isWrite).map((e) => e.path).filter(Boolean);
    const searches = events.map((e, i) => ({ e, i })).filter(({ e, i }) => i > lastWrite && runs(SEARCH_RUN)(e));
    if (!searches.length) {
      add("exhaustive", `You claim nothing else uses it ("${quote("exhaustive")}") without a search after your last edit. Run git grep or rg for the name (or product-engineer twins), quote the hits, or drop the claim.`);
    } else if (!searches.some(({ e }) => e.output === undefined || otherFiles(e.output, written).length === 0)) {
      const others = otherFiles(searches[searches.length - 1].e.output, written);
      add("exhaustive", `You claim nothing else uses it ("${quote("exhaustive")}"), but the search after your last edit lists files you did not change: ${others.slice(0, 3).join(", ")}. Name each use, or drop the claim.`);
    }
  }
  if (families.has("landed") && !after(runs(REMOTE_RUN))) {
    add("landed", `You say the work is pushed, deployed, published, released or live ("${quote("landed")}"), but no command read the remote after your last edit. Run git ls-remote or git status -sb (or gh, npm view, curl, vercel or railway for the target) and quote the result, or drop the claim.`);
  }
  if (PLAIN_REQUEST.test(prompt) && REWRITE_REQUEST.test(prompt) && hasRewriteSource({ events, prompt }) && lastWrite >= 0 && !after(runs(FACTS_RUN))) {
    add("plain", "You were asked to rewrite a text in plain language, but product-engineer facts <source> <rewrite> did not run after your last edit. Run it and fix every warning, in particular each sentence with no counterpart in the source.");
  }
  return reasons;
}

// The next message becomes the final answer. Without this sentence the agent answers only the check and the deliverable report is lost.
export const REPLY_WHOLE = "After that, write your complete final answer again: everything the person asked for and everything you did and found, with the correction inside it. Never reply with the correction alone.";

async function main() {
  try { await run(); } catch { /* a hook that fails must not stop the agent */ }
}

// Blocks at most twice per session. The state file is keyed by session id; without one the loop is bounded by stop_hook_active alone.
const MAX_BLOCKS = 2;
const stateFile = (sid) => join(tmpdir(), `product-engineer-gate-${sid}.json`);
const readState = (sid) => {
  try {
    const s = JSON.parse(readFileSync(stateFile(sid), "utf8"));
    return {
      blocks: Number.isFinite(s.blocks) ? s.blocks : 0,
      hash: typeof s.hash === "string" ? s.hash : null,
      ids: Array.isArray(s.ids) ? s.ids.filter((x) => typeof x === "string") : [],
    };
  } catch {
    return { blocks: 0, hash: null, ids: [] };
  }
};
const writeState = (sid, state) => { try { writeFileSync(stateFile(sid), JSON.stringify(state)); } catch { /* the state is a bound, not a result */ } };
const hashOf = (text) => createHash("sha1").update(text).digest("hex");

async function run() {
  if (process.env.PRODUCT_ENGINEER_NO_GATE === "1") return;
  let input;
  try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { return; }
  const active = Boolean(input.stop_hook_active);
  const sid = typeof input.session_id === "string" ? input.session_id.replace(/[^A-Za-z0-9_-]/g, "_") : "";
  if (active && !sid) return;
  let lines;
  try { lines = readFileSync(input.transcript_path, "utf8").split("\n"); } catch { return; }
  const state = sid ? readState(sid) : { blocks: 0, hash: null, ids: [] };
  if (state.blocks >= MAX_BLOCKS) return;
  const session = readSession(lines);
  const wrote = session.events.some((e) => e.kind === "write");
  const committed = session.events.some((e) => e.kind === "bash" && COMMIT_RUN.test(e.command));
  // A read-only session (no write, no commit) reports history, so the noise families never block it.
  const readOnly = !wrote && !committed;
  // After a block the agent is already repairing: only the checks that are objective run again, and only a new finding blocks.
  const items = active ? [] : gateItems(session, [String(input.last_assistant_message ?? session.last), ...session.events.filter((e) => e.kind === "write" && e.text).map((e) => e.text)]);
  const kept = items.filter((i) => !(readOnly && NOISE_FAMILIES.has(i.family)) && !(ONCE_FAMILIES.has(i.family) && state.ids.includes(i.id)));
  const findings = verify({ cwd: input.cwd || process.cwd(), session, answer: String(input.last_assistant_message ?? session.last), sessionId: input.session_id });
  const parts = [...kept.map((i) => ({ family: i.family, text: i.text })), ...findings.map((f) => ({ family: "verify", text: f.text }))];
  // The second eye runs only when the other checks leave the answer nearly clean, never on a repair round, and never in a read-only session.
  let eyeText = null;
  if (!active && !readOnly && parts.length < 2 && findings.length < 3) {
    const eye = await secondEye({
      answer: String(input.last_assistant_message ?? session.last),
      commands: session.events.filter((e) => e.kind === "bash").map((e) => ({ command: e.command, output: e.output ?? "" })),
      files: session.events.filter((e) => e.kind === "write" && e.path).map((e) => e.path),
    });
    if (eye.unchecked.length) {
      eyeText = `A second reading of your answer found claims with no supporting command: ${eye.unchecked.map((u) => u.claim.replace(/[.!?]+$/, "")).join("; ")}. Check each (name the command) or remove it.`;
      parts.push({ family: "second-eye", text: eyeText });
    }
  }
  if (!parts.length) return;
  // The first block of a session that has only noise reasons is advice alone: it prints nothing and does not count as a block.
  if (state.blocks === 0 && parts.every((p) => NOISE_FAMILIES.has(p.family))) return;
  const head = "product-engineer claim check (one-time):";
  const hash = hashOf([...findings.map((f) => f.text), ...(eyeText ? [eyeText] : [])].join("\n"));
  if (state.hash !== null && state.hash === hash) return;
  if (sid) writeState(sid, { blocks: state.blocks + 1, hash, ids: [...new Set([...state.ids, ...kept.map((i) => i.id)])] });
  process.stdout.write(JSON.stringify({ decision: "block", reason: `${head} ${parts.map((p) => p.text).join(" ")} ${REPLY_WHOLE}` }) + "\n");
}

const isEntry = () => { try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; } catch { return false; } };
if (isEntry()) main();
