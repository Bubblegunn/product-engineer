import { test } from "node:test";
import assert from "node:assert/strict";
import { syllablesEn, syllablesTr, lix, flesch, atesman, readability, scriptOf } from "../bin/readability.mjs";

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

test("a script these formulas cannot read is refused, not scored zero", () => {
  // Before this, every one of these returned Flesch 0 (hard), LIX 0: a confident wrong
  // number, on the languages whose plain-language tables this repository ships.
  const cases = [
    ["経理担当者が一か月分の予約を表計算ファイルとして取得できます。", "Japanese"],
    ["会计可以下载一个月的预订记录。", "Han"],
    ["회계 담당자가 한 달치 예약을 내려받을 수 있습니다.", "Hangul"],
    ["يمكن للمحاسبين تنزيل حجوزات شهر كامل.", "Arabic"],
    ["רואי החשבון יכולים להוריד חודש של הזמנות.", "Hebrew"],
  ];
  for (const [text, script] of cases) {
    const r = readability(text);
    assert.equal(r.script, script, text);
    assert.equal(r.name, null, `${script} must not be given a scale`);
    assert.equal(r.score, null);
    assert.equal(r.lix, null);
    assert.match(r.reason, /\w/);
  }
});

test("kana anywhere means Japanese, even when kanji outnumber it", () => {
  assert.equal(scriptOf("経理担当者が予約を取得できます"), "Japanese");
  assert.equal(scriptOf("会计可以下载记录"), "Han");
  assert.equal(scriptOf("Hello world"), "Latin");
  assert.equal(scriptOf(""), "Latin");
});

test("Latin scores are unchanged by the refusal path", () => {
  const en = readability("Accountants can download a month of bookings as a spreadsheet. They used to type it by hand every month.");
  assert.equal(en.name, "Flesch");
  assert.equal(en.score, 77);
  assert.equal(en.lix, 31);
  const tr = readability("Muhasebeciler bir aylık rezervasyonu tablo olarak indirebiliyor. Bunu her ay elle yazıyorlardı.", "tr");
  assert.equal(tr.name, "Ateşman");
  assert.equal(tr.score, 63);
  assert.equal(tr.lix, 39);
});
