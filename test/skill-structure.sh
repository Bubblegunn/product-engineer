#!/bin/sh
# test/skill-structure.sh: the skill file has the frontmatter and the seven rules.
set -eu
f="skills/product-engineer/SKILL.md"
fail() { echo "FAIL: $1"; exit 1; }
[ -f "$f" ] || fail "$f missing"
head -1 "$f" | grep -q '^---$' || fail "frontmatter must open with ---"
grep -q '^name: product-engineer$' "$f" || fail "name field"
grep -q '^description: Use when' "$f" || fail "description must start with 'Use when'"
for n in 1 2 3 4 5 6 7; do
  grep -q "^## $n\. " "$f" || fail "rule $n heading missing"
done
grep -q 'For the customer:' "$f" || fail "block heading missing"
grep -c '—' "$f" | grep -q '^0$' || fail "em dash found"
for r in commit-template five-questions definition-of-done plain-language not-shipped; do
  p="skills/product-engineer/references/$r.md"
  [ -f "$p" ] || fail "$p missing"
  grep -c '—' "$p" | grep -q '^0$' || fail "em dash in $p"
done
grep -q '^| idempotent' skills/product-engineer/references/plain-language.md || fail "plain-language table missing idempotent row"
echo "ok: skill structure"
