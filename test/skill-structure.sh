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
echo "ok: skill structure"
