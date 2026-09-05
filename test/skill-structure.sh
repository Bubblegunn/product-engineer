#!/bin/sh
# test/skill-structure.sh: every skill has spec-complete frontmatter; the core skill has the seven rules.
set -eu
fail() { echo "FAIL: $1"; exit 1; }
for dir in product-engineer customer-block done-means-observed release-notes; do
  f="skills/$dir/SKILL.md"
  [ -f "$f" ] || fail "$f missing"
  head -1 "$f" | grep -q '^---$' || fail "$f: frontmatter must open with ---"
  grep -q "^name: $dir$" "$f" || fail "$f: name must equal the directory"
  grep -q '^description: Use when' "$f" || fail "$f: description must start with 'Use when'"
  grep -q '^license: MIT$' "$f" || fail "$f: license: MIT"
  grep -q '^metadata:$' "$f" || fail "$f: metadata block"
  grep -q '^  author: ' "$f" || fail "$f: metadata.author"
  grep -q '^  version: ' "$f" || fail "$f: metadata.version"
  grep -q '^  source: https://github.com/Bubblegunn/product-engineer' "$f" || fail "$f: metadata.source"
  [ "$(wc -l < "$f")" -le 120 ] || fail "$f: over 120 lines"
  grep -c '—' "$f" | grep -q '^0$' || fail "em dash in $f"
done
f="skills/product-engineer/SKILL.md"
for n in 1 2 3 4 5 6 7; do
  grep -q "^## $n\. " "$f" || fail "rule $n heading missing"
done
grep -q 'For the customer:' "$f" || fail "block heading missing"
for r in commit-template five-questions definition-of-done plain-language not-shipped press-release ship-show-ask appetite; do
  p="skills/product-engineer/references/$r.md"
  [ -f "$p" ] || fail "$p missing"
done
for p in skills/product-engineer/references/*.md; do
  grep -c '—' "$p" | grep -q '^0$' || fail "em dash in $p"
done
grep -q '^| idempotent' skills/product-engineer/references/plain-language.md || fail "plain-language table missing idempotent row"
for j in .claude-plugin/marketplace.json .claude-plugin/plugin.json; do
  [ -f "$j" ] || fail "$j missing"
  node -e "JSON.parse(require('fs').readFileSync('$j','utf8'))" || fail "$j is not valid JSON"
done
grep -q '"name": "product-engineer"' .claude-plugin/plugin.json || fail "plugin name"
grep -q '"version": "0.3.0"' .claude-plugin/plugin.json || fail "plugin version 0.3.0"
[ -f AGENTS.md ] || fail "AGENTS.md missing"
echo "ok: skill structure (4 skills)"
