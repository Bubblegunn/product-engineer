// Deterministic message mutations, for measuring what `check --diff` catches and misses.
//
// Every function here takes a real commit and returns a message that contradicts its own
// diff, or null when the commit is not a candidate. No model, no network, no randomness:
// the same history produces the same corpus, so a rerun is a check rather than a new draw.
//
// Four of the five carry the type names from CodeFuse-CommitEval (Zhang, Liu, Di and Qian,
// arXiv:2511.19875), whose own corpus is unobtainable; see the design document. The fifth,
// file-count, is ours. `operation` is here knowing the checker cannot catch it, because a
// blind spot in the results is visible and a blind spot left out of the corpus is not.
import { isTestPath, isDocPath, namedPaths } from "../../bin/diff.mjs";

/** A path that is in neither the change nor any repository, so check 4 must report it. */
const FABRICATED = "src/internal/registry-adapter.ts";

/**
 * Replace a path named in the message with one that does not exist.
 * Candidate: the message names at least one path.
 */
export function filePath(message, diff) {
  const named = namedPaths(message).filter((p) => p !== FABRICATED);
  if (!named.length) return null;
  const target = named[0];
  const mutated = message.split(target).join(FABRICATED);
  return mutated === message ? null : mutated;
}

const OPPOSITE = [
  [/\badded\b/i, "removed"],
  [/\badds\b/i, "removes"],
  [/\bremoved\b/i, "added"],
  [/\bremoves\b/i, "adds"],
];

/**
 * Swap an operation verb for its opposite.
 * Candidate: the message uses one of the verbs outside a code span.
 */
export function operation(message, diff) {
  const masked = message.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
  for (const [re, to] of OPPOSITE) {
    const m = re.exec(masked);
    if (!m) continue;
    // Replace the same occurrence in the original, preserving everything else, including
    // the capital at a sentence start: a lowercased first word would be a second difference
    // and the corpus is meant to vary one thing.
    const at = message.indexOf(m[0], Math.max(0, m.index - 2));
    if (at < 0) continue;
    const cased = /^[A-Z]/.test(m[0]) ? to[0].toUpperCase() + to.slice(1) : to;
    return message.slice(0, at) + cased + message.slice(at + m[0].length);
  }
  return null;
}

/**
 * Claim tests were added to a change that adds no test file.
 * Candidate: no file under a test path gains a line, and the message makes no such claim.
 */
export function extraTests(message, diff) {
  if (diff.files.some((f) => isTestPath(f.path) && f.added > 0)) return null;
  if (/\btests?\b/i.test(message)) return null;
  return `${message.trimEnd()}\n\nAdded regression tests covering this.\n`;
}

/**
 * Claim the change is documentation only when it touches source or tests.
 * Candidate: at least one file is neither documentation nor already claimed as such.
 */
export function extraDocsOnly(message, diff) {
  const other = diff.files.filter((f) => !isDocPath(f.path));
  if (!other.length) return null;
  if (/documentation|docs?[- ]only/i.test(message)) return null;
  return `${message.trimEnd()}\n\nThis change is documentation only.\n`;
}

/**
 * State a file count the change contradicts.
 * Candidate: the message states no count already.
 */
export function fileCount(message, diff) {
  if (/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+files?\b/i.test(message)) return null;
  const wrong = diff.files.length + 3;
  return `${message.trimEnd()}\n\nThis change updates ${wrong} files.\n`;
}

/** The corpus definition: type name, the CodeFuse-CommitEval type it stands for, and the mutation. */
export const MUTATIONS = [
  { type: "file-path", theirs: "File Path Mismatch", reachable: true, fn: filePath },
  { type: "operation", theirs: "Operation Type Mismatch", reachable: false, fn: operation },
  { type: "extra-tests", theirs: "Extra Feature Description", reachable: true, fn: extraTests },
  { type: "extra-docs-only", theirs: "Extra Feature Description", reachable: true, fn: extraDocsOnly },
  { type: "file-count", theirs: null, reachable: true, fn: fileCount },
];
