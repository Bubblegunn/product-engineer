// Readability of a short text, no dependencies. These are numbers to watch, not grades to
// pass, and sentence and word splitting is simple on purpose.
//
// Flesch reading ease, Flesch (1948), "A new readability yardstick", Journal of Applied
// Psychology 32(3), counts syllables per word and words per sentence in English.
// Ateşman (1997), "Türkçede okunabilirliğin ölçülmesi", Dil Dergisi 58, is the Turkish
// recalibration of the same shape. LIX, Björnsson (1968), counts long words instead of
// syllables.
//
// All three are defined on an alphabet whose words are separated by spaces and whose
// syllables can be counted from vowels. Japanese, Chinese, Korean, Arabic, Hebrew and Thai
// break at least one of those assumptions, and the syllable heuristics below read Latin
// letters only. For text in those scripts this module refuses to score rather than
// returning zero, because rule 5 of the skill is that a number comes from a count.
const sentencesOf = (t) => t.split(/[.!?]+(\s|$)/).map((s) => (s ?? "").trim()).filter((s) => /\w/.test(s));
const wordsOf = (t) => t.match(/[\p{L}\p{N}']+/gu) ?? [];

export function syllablesEn(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  let n = (w.replace(/e$/, "").match(/[aeiouy]+/g) ?? []).length;
  if (/le$/.test(w) && !/[aeiouy]le$/.test(w)) n++;
  return Math.max(1, n);
}

export function syllablesTr(word) {
  return Math.max(1, (word.toLowerCase().match(/[aeıioöuüâîû]/g) ?? []).length);
}

export function lix(text) {
  const words = wordsOf(text), sentences = sentencesOf(text);
  if (!words.length || !sentences.length) return 0;
  const long = words.filter((w) => w.length > 6).length;
  return words.length / sentences.length + (100 * long) / words.length;
}

export function flesch(text) {
  const words = wordsOf(text), sentences = sentencesOf(text);
  if (!words.length || !sentences.length) return 0;
  const syl = words.reduce((s, w) => s + syllablesEn(w), 0);
  return 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syl / words.length);
}

export function atesman(text) {
  const words = wordsOf(text), sentences = sentencesOf(text);
  if (!words.length || !sentences.length) return 0;
  const syl = words.reduce((s, w) => s + syllablesTr(w), 0);
  return 198.825 - 40.175 * (syl / words.length) - 2.61 * (words.length / sentences.length);
}

const band = (score, easyAbove, hardBelow) => (score >= easyAbove ? "easy" : score < hardBelow ? "hard" : "medium");

/** The scripts these formulas cannot read, and what a reader should know instead. */
const UNREADABLE = {
  Japanese: "Japanese is not separated into words by spaces, and its syllables are not the vowel runs these formulas count",
  Han: "Chinese is not separated into words by spaces, and its characters carry no vowel syllables to count",
  Hangul: "Korean syllables are written as blocks, not as the vowel runs these formulas count",
  Arabic: "Arabic is normally written without the short vowels these formulas count",
  Hebrew: "Hebrew is normally written without the vowels these formulas count",
  Thai: "Thai is written without spaces between words",
};

const SCRIPTS = ["Latin", "Cyrillic", "Han", "Hiragana", "Katakana", "Hangul", "Arabic", "Hebrew", "Thai"];

/**
 * The script most of the letters are in, or "Latin" when there are no letters at all.
 * Kana anywhere means Japanese, even when kanji outnumber it, which is the usual case.
 */
export function scriptOf(text) {
  const counts = new Map();
  for (const name of SCRIPTS) {
    const n = (text.match(new RegExp(`\\p{Script=${name}}`, "gu")) ?? []).length;
    if (n) counts.set(name, n);
  }
  if (!counts.size) return "Latin";
  if (counts.has("Hiragana") || counts.has("Katakana")) return "Japanese";
  return [...counts].sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * { name, score, band, lix } for the block; name is the language-specific scale.
 * For a script no scale here covers, { name: null, script, reason } and no numbers.
 */
export function readability(text, lang = "en") {
  const script = scriptOf(text);
  const reason = UNREADABLE[script];
  if (reason) return { name: null, score: null, band: null, lix: null, script, reason };
  const l = lix(text);
  if (lang === "tr") {
    const s = atesman(text);
    return { name: "Ateşman", score: Math.round(s), band: band(s, 70, 50), lix: Math.round(l), script };
  }
  const s = flesch(text);
  return { name: "Flesch", score: Math.round(s), band: band(s, 60, 30), lix: Math.round(l), script };
}
