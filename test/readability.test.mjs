import { test } from "node:test";
import assert from "node:assert/strict";
import { syllablesEn, syllablesTr, lix, flesch, atesman, readability } from "../bin/readability.mjs";

test("syllable counts", () => {
  assert.equal(syllablesEn("customer"), 3);
  assert.equal(syllablesEn("the"), 1);
  assert.equal(syllablesTr("müşteri"), 3);
});

test("short plain English scores as easy on Flesch and LIX", () => {
  const t = "The badge shows a number. The number means something needs you.";
  assert.ok(flesch(t) > 70);
  assert.ok(lix(t) < 35);
});

test("Turkish uses Atesman", () => {
  const t = "Rozet bir sayı gösterir. Sayı size bir şey gerektiğini söyler.";
  assert.ok(atesman(t) > 60);
  assert.equal(readability(t, "tr").name, "Ateşman");
});

test("empty text scores zero instead of NaN", () => {
  assert.equal(flesch(""), 0);
  assert.equal(readability("", "en").score, 0);
});
