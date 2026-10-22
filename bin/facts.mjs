// product-engineer facts <source> <rewrite>: checks that a plain-language rewrite keeps the facts of
// the source and keeps its sentences short. Zero dependencies, Node 22 or newer.
//
// What it reads, and why each part is a warning or a failure:
// - Numbers written as digits must be the same in both files. A dropped or an added number fails.
//   A list marker, a parenthesised clause number and a named clause number ("Clause 3") are not
//   counted, because a rewrite is allowed to renumber them.
// - Obligation phrases in the source (must, shall, prior written consent, terminate ...) should have a
//   plain equivalent in the rewrite. Wording varies, so a missing equivalent is a warning only.
// - Legal phrases such as "hereinafter" left in the rewrite are a warning only.
// - Sentence length in the rewrite: the average and the longest sentence, in words. Exceeding either
//   limit fails.
import { readFileSync } from "node:fs";

const DEFAULT_MAX_SENTENCE = 35;
const DEFAULT_AVG_SENTENCE = 20;

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};
const MONTH = "(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)\\.?";
const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// A unit that follows a number makes it an amount, not a section or a clause number.
const UNIT_LIST = "days?|weeks?|months?|years?|hours?|minutes?|seconds?|nights?|guests?|bookings?|rooms?|euros?|eur|usd|try|gbp|dollars?|pounds?|kg|km|gb|mb|ms|times?|people|users?|pages?|items?|units?|percent|per ?cent";
const UNIT = `(?:%|\\b(?:${UNIT_LIST})\\b)`;
const UNIT_ONLY = new RegExp(`^(?:${UNIT_LIST})$`, "i");

// A date in any of these forms is one value: "14 October 2026", "14th of October, 2026", "October 14, 2026",
// "14.10.2026", "14/10/2026" and "2026-10-14" compare equal. Numeric forms are day-first, because the day comes
// first in the text this checks; a month above 12 is not a date and is left as numbers, so no US order is guessed.
// Each taken match is replaced by a space, so its parts are not read again as numbers.
function takeDates(line, out) {
  return line
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, y, m, d) => {
      out.push(iso(y, Number(m), Number(d)));
      return " ";
    })
    .replace(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH}\\s*,?\\s*(\\d{4})\\b`, "gi"), (_, d, mon, y) => {
      out.push(iso(y, MONTHS[mon.toLowerCase().replace(/\.$/, "")], Number(d)));
      return " ";
    })
    .replace(new RegExp(`\\b${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "gi"), (_, mon, d, y) => {
      out.push(iso(y, MONTHS[mon.toLowerCase().replace(/\.$/, "")], Number(d)));
      return " ";
    })
    .replace(/\b(\d{1,2})([./])(\d{1,2})\2(\d{4})\b/g, (match, d, _sep, m, y) => {
      if (Number(m) < 1 || Number(m) > 12 || Number(d) < 1 || Number(d) > 31) return match;
      out.push(iso(y, Number(m), Number(d)));
      return " ";
    });
}

// A named reference and the numbers it cites: "Clause 3.1", "Article 5(2)", "Sections 3 and 4", "schedule 2",
// "Art. 5", "§ 4". Case-insensitive. A number followed by a unit is an amount ("part 60 days"), not a reference.
const NUM_ITEM = "\\d+(?:\\.\\d+)*(?:\\(\\w{1,3}\\))?";
const NAMED_REFERENCE = new RegExp(
  `(?:\\b(?:clauses?|sections?|articles?|art\\.|schedules?|annex|annexes|appendix|appendices|paragraphs?|paras?\\.|parts?|steps?)|\\bno\\.|§)\\s*(${NUM_ITEM}(?:\\s*(?:,|and|or|&)\\s*${NUM_ITEM})*)(?!\\d)(?!\\s*${UNIT})`,
  "gi",
);

// Digits of a number: thousands commas (12,000), a decimal comma (800,00 is 800.00) and a decimal point.
const NUMBER = /\d{1,3}(?:,\d{3})+(?!\d)|\d+,\d{1,2}(?!\d)|\d+(?:\.\d+)?/g;
function valueOf(text) {
  if (/^\d{1,3}(,\d{3})+$/.test(text)) return String(Number(text.replace(/,/g, "")));
  return String(Number(text.replace(",", ".")));
}

// The words of a title: the text up to the first full stop, question mark or exclamation mark.
const titleWords = (rest) => (/^[^.!?]*/.exec(rest.trim())[0].split(/\s+/).filter(Boolean)).length;

/**
 * Remove a numbering marker at the start of a line and return the rest. A heading number is numbering. A
 * decimal section number ("1.1 Definitions.") is numbering when its title is one or two words. A number with a
 * full stop, bracket or colon ("2. Fees") is numbering up to 99, so "800. Deposit" in a hard-wrapped sentence
 * stays an amount. A bare integer is numbering only on a short line with no sentence end, followed by a
 * capitalised word that is not a unit ("1 Definitions"); "45 days' notice" is an amount.
 */
function stripNumbering(line, heading) {
  const lead = /^\s*(\d+(?:\.\d+)*)([.):]?)(?=\s|$)/.exec(line);
  if (!lead) return line;
  const [whole, num, punct] = lead;
  const rest = line.slice(whole.length);
  let numbering;
  if (heading) numbering = true;
  else if (num.includes(".")) numbering = titleWords(rest) <= 2;
  else if (punct) numbering = Number(num) <= 99;
  else {
    const next = rest.trim().split(/\s+/)[0] ?? "";
    numbering = !/[.!?]/.test(line) && line.trim().split(/\s+/).length < 8 && /^[A-Z]/.test(next) && !UNIT_ONLY.test(next);
  }
  return numbering ? rest : line;
}

/**
 * Facts in a text: numbers written as digits, and dates, each as one value. Markdown marks are removed first,
 * and so are bullets, blockquote marks and URLs (digits in a link are not facts). A table row's first cell is
 * numbering. Numbering is not a fact: the markers of a heading, list or section, an inline "(1)" and a named
 * reference are not counted. 500.00 is 500, 12,000 is 12000, 800,00 is 800.00.
 */
export function numbersIn(text) {
  const out = [];
  for (const raw of text.split("\n")) {
    const heading = /^\s*#{1,6}\s/.test(raw);
    let line = raw
      .replace(/^\s*>\s?/, "")
      .replace(/^\s*#{1,6}\s*/, "")
      .replace(/^\s*[-*+]\s+/, "")
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/[*_`]/g, "");
    let table = false;
    if (/^\s*\|/.test(line)) {
      table = true;
      const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
      if (cells.length && /^\d+(\.\d+)*$/.test(cells[0])) cells.shift();
      line = cells.join("  ");
    }
    line = takeDates(line, out).replace(NAMED_REFERENCE, " ").replace(/(^|\s)\(\d+\)(?=\s)/g, "$1 ");
    if (!table) line = stripNumbering(line, heading);
    for (const m of line.matchAll(NUMBER)) out.push(valueOf(m[0]));
  }
  return out;
}

/** Units of text: a paragraph (its lines joined), or one heading or list item on its own. */
function unitsOf(text) {
  const units = [];
  let para = [];
  const flush = () => {
    if (para.length) units.push(para.join(" "));
    para = [];
  };
  for (const raw of text.split("\n")) {
    const t = raw.trim();
    if (!t) {
      flush();
      continue;
    }
    if (/^#{1,6}\s/.test(t)) {
      flush();
      units.push(t.replace(/^#+\s*/, ""));
      continue;
    }
    const item = t.match(/^(?:[-*+]|\d+[.)]|\(\d+\))\s+(.*)$/);
    if (item) {
      flush();
      units.push(item[1]);
      continue;
    }
    para.push(t);
  }
  flush();
  return units;
}

/** Sentence count, words, the average and the longest sentence in words. A sentence ends after . ? or ! and a space. */
export function sentenceStats(text) {
  const lengths = [];
  for (const unit of unitsOf(text)) {
    for (const s of unit.split(/(?<=[.!?])\s+/)) {
      const words = s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
      if (words) lengths.push(words);
    }
  }
  const words = lengths.reduce((n, x) => n + x, 0);
  return {
    count: lengths.length,
    words,
    average: lengths.length ? words / lengths.length : 0,
    longest: lengths.length ? Math.max(...lengths) : 0,
  };
}

// Each rule: a phrase in the source, and the plain wording a rewrite may use for it.
const OBLIGATIONS = [
  { id: "shall not", source: /\bshall not\b/i, plain: ["may not", "cannot", "can't", "must not", "not allowed to"], expect: /\b(may not|cannot|can't|must not|not allowed to)\b/i },
  { id: "must not", source: /\bmust not\b/i, plain: ["must not", "may not", "cannot", "can't", "not allowed to"], expect: /\b(must not|may not|cannot|can't|not allowed to)\b/i },
  { id: "may not", source: /\bmay not\b/i, plain: ["may not", "cannot", "can't", "must not", "not allowed to"], expect: /\b(may not|cannot|can't|must not|not allowed to)\b/i },
  { id: "shall", source: /\bshall\b(?!\s+not\b)/i, plain: ["must", "have to", "need to"], expect: /\b(must(?!\s+not\b)|have to|need to)\b/i },
  { id: "must", source: /\bmust\b(?!\s+not\b)/i, plain: ["must", "have to", "need to"], expect: /\b(must(?!\s+not\b)|have to|need to)\b/i },
  { id: "prior written consent", source: /\bprior written consent\b/i, plain: ["written permission", "written consent", "permission in writing"], expect: /\b(written permission|written consent|permission in writing)\b/i },
  { id: "non-refundable", source: /\bnon-?refundable\b/i, plain: ["no refund", "not refundable", "non-refundable"], expect: /\b(no refund|not refundable|non-?refundable)\b/i },
  { id: "confidential", source: /\bconfidential\b/i, plain: ["confidential"], expect: /\bconfidential\b/i },
  { id: "terminate", source: /\bterminat(e|es|ed|ion)\b/i, plain: ["terminate", "end the agreement", "end the contract"], expect: /\b(terminat\w*|end (the|this) (agreement|contract|licen[cs]e))\b/i },
];

// A window of days named in the source, such as "within 9 days", must keep the same number.
const windowRule = (days) => ({ id: `within ${days} days`, plain: [`within ${days} days`, `in ${days} days`], expect: new RegExp(`\\b(within|in|no later than) ${days} days?\\b`, "i") });

/** Obligations in the source with no plain equivalent anywhere in the rewrite. */
function missingObligations(source, rewrite) {
  const rules = [...OBLIGATIONS];
  for (const m of source.matchAll(/\bwithin (\d+) days?\b/gi)) rules.push(windowRule(m[1]));
  const seen = new Set();
  const missing = [];
  for (const rule of rules) {
    if (seen.has(rule.id)) continue;
    const named = rule.source ? rule.source.test(source) : true;
    if (!named) continue;
    seen.add(rule.id);
    if (!rule.expect.test(rewrite)) missing.push({ source: rule.id, expected: rule.plain });
  }
  return missing;
}

const LEGALESE = ["hereinafter", "hereunder", "herein", "thereof", "notwithstanding", "forthwith", "aforementioned", "whereas", "hereby", "pursuant to"];

/** Legal phrases left in the rewrite. */
export function legaleseIn(text) {
  return LEGALESE.filter((w) => new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`, "i").test(text));
}

/** The multiset difference of two lists: the items of a that b does not hold, once each. */
function minus(a, b) {
  const rest = [...b];
  const out = [];
  for (const x of a) {
    const i = rest.indexOf(x);
    if (i >= 0) rest.splice(i, 1);
    else out.push(x);
  }
  return out;
}

/**
 * Compare a rewrite with its source. Returns the numbers, the obligations and legalese that need a
 * look, the sentence statistics of the rewrite, and ok, which is false when a number was dropped or
 * added or a limit was exceeded.
 */
export function facts(source, rewrite, { maxSentence = DEFAULT_MAX_SENTENCE, avgSentence = DEFAULT_AVG_SENTENCE } = {}) {
  const sourceNumbers = numbersIn(source);
  const rewriteNumbers = numbersIn(rewrite);
  const dropped = minus(sourceNumbers, rewriteNumbers);
  const added = minus(rewriteNumbers, sourceNumbers);
  const sentences = sentenceStats(rewrite);
  const violations = [];
  if (dropped.length) violations.push(`numbers dropped: ${dropped.join(", ")}`);
  if (added.length) violations.push(`numbers added: ${added.join(", ")}`);
  if (sentences.average > avgSentence) violations.push(`average sentence ${sentences.average.toFixed(1)} words, limit ${avgSentence}`);
  if (sentences.longest > maxSentence) violations.push(`longest sentence ${sentences.longest} words, limit ${maxSentence}`);
  return {
    numbers: { source: sourceNumbers, rewrite: rewriteNumbers, dropped, added },
    obligations: { missing: missingObligations(source, rewrite) },
    legalese: legaleseIn(rewrite),
    sentences: { ...sentences, sourceAverage: sentenceStats(source).average, averageLimit: avgSentence, maxLimit: maxSentence },
    violations,
    ok: violations.length === 0,
  };
}

const USAGE = "usage: product-engineer facts <source> <rewrite> [--max-sentence N] [--avg-sentence N] [--json]";
const VALUED = ["--max-sentence", "--avg-sentence"];

function limitFrom(argv, flag, fallback) {
  const i = argv.indexOf(flag);
  if (i < 0) return fallback;
  const n = Number(argv[i + 1]);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${flag} needs a positive number of words`);
  return n;
}

/** The command. Returns the exit code: 0 when the rewrite keeps its facts, 1 when it does not, 2 on a usage error. */
export function runFacts(argv) {
  let maxSentence;
  let avgSentence;
  try {
    maxSentence = limitFrom(argv, "--max-sentence", DEFAULT_MAX_SENTENCE);
    avgSentence = limitFrom(argv, "--avg-sentence", DEFAULT_AVG_SENTENCE);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 2;
  }
  const skip = new Set(VALUED.map((f) => argv.indexOf(f) + 1).filter((i) => i > 0));
  const files = argv.filter((a, i) => !a.startsWith("-") && !skip.has(i));
  if (files.length !== 2) {
    console.error(USAGE);
    return 2;
  }
  let source;
  let rewrite;
  try {
    source = readFileSync(files[0], "utf8");
    rewrite = readFileSync(files[1], "utf8");
  } catch (err) {
    console.error(`facts: cannot read ${err instanceof Error && err.path ? err.path : files.join(" or ")}: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
    return 2;
  }
  const r = facts(source, rewrite, { maxSentence, avgSentence });
  if (argv.includes("--json")) {
    console.log(JSON.stringify(r, null, 2));
    return r.ok ? 0 : 1;
  }
  const list = (xs) => (xs.length ? xs.join(", ") : "none");
  const s = r.sentences;
  console.log(`numbers in the source: ${list(r.numbers.source)}; in the rewrite: ${list(r.numbers.rewrite)}`);
  console.log(`numbers dropped: ${list(r.numbers.dropped)}`);
  console.log(`numbers added: ${list(r.numbers.added)}`);
  if (r.obligations.missing.length) {
    console.log("warn  obligations with no plain equivalent in the rewrite (wording varies):");
    for (const o of r.obligations.missing) console.log(`        "${o.source}" in the source; the rewrite could use ${o.expected.join(", ")}`);
  } else console.log("obligations with no plain equivalent in the rewrite: none");
  if (r.legalese.length) console.log(`warn  legalese left in the rewrite: ${list(r.legalese)}`);
  else console.log("legalese left in the rewrite: none");
  console.log(`sentences in the rewrite: ${s.count}, average ${s.average.toFixed(1)} words (limit ${s.averageLimit}), longest ${s.longest} (limit ${s.maxLimit})`);
  console.log(r.ok ? "result: ok" : `result: fail (${r.violations.join("; ")})`);
  return r.ok ? 0 : 1;
}
