// Readability of a short text, no dependencies. Flesch reading ease for English,
// Ateşman for Turkish, LIX for any language. Sentence and word splitting is simple
// on purpose: these are numbers to watch, not grades to pass.
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

/** { name, score, band, lix } for the block; name is the language-specific scale. */
export function readability(text, lang = "en") {
  const l = lix(text);
  if (lang === "tr") {
    const s = atesman(text);
    return { name: "Ateşman", score: Math.round(s), band: band(s, 70, 50), lix: Math.round(l) };
  }
  const s = flesch(text);
  return { name: "Flesch", score: Math.round(s), band: band(s, 60, 30), lix: Math.round(l) };
}
