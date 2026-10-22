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
for r in commit-template five-questions definition-of-done plain-language not-shipped press-release ship-show-ask appetite headings; do
  p="skills/product-engineer/references/$r.md"
  [ -f "$p" ] || fail "$p missing"
done
for p in skills/product-engineer/references/*.md; do
  grep -c '—' "$p" | grep -q '^0$' || fail "em dash in $p"
done
for t in plain-language plain-language.tr plain-language.ja plain-language.zh; do
  p="skills/product-engineer/references/$t.md"
  [ -f "$p" ] || fail "$p missing"
  grep -q '^| idempotent' "$p" || fail "$p missing idempotent row"
  [ "$(grep '^| ' "$p" | grep -vc '^| term')" -eq 15 ] || fail "$p must have 15 rows"
done
# The pack gate: a skill in skills/ must name metrics that evals/score.mjs actually scores,
# and a skill in skills/.experimental/ must name none and say so in its own description. Without
# this a contributed skill joins the pack by being copied into the directory.
metrics=$(node -e "import('./evals/score.mjs').then(m => console.log(Object.keys(m.metrics).join(' ')))")
for f in skills/*/SKILL.md; do
  dir=$(basename "$(dirname "$f")")
  line=$(grep '^  measuredBy: \[' "$f" || true)
  [ -n "$line" ] || fail "$f: a skill in the pack must declare metadata.measuredBy naming metrics from evals/score.mjs, or live in skills/.experimental/"
  names=$(printf '%s' "$line" | sed 's/^  measuredBy: \[//; s/\]$//; s/,/ /g')
  [ -n "$names" ] || fail "$f: measuredBy is empty; move the skill to skills/.experimental/"
  for m in $names; do
    case " $metrics " in *" $m "*) ;; *) fail "$f: measuredBy names $m, which evals/score.mjs does not score" ;; esac
  done
done
for f in skills/.experimental/*/SKILL.md; do
  [ -e "$f" ] || continue
  grep -q '^  measuredBy:' "$f" && fail "$f: an experimental skill is not measured; drop measuredBy or move it into the pack"
  grep -q '^description: Experimental:' "$f" || fail "$f: description must open with 'Experimental:', because that marker is what travels with the file once installed"
done

for j in .claude-plugin/marketplace.json .claude-plugin/plugin.json; do
  [ -f "$j" ] || fail "$j missing"
  node -e "JSON.parse(require('fs').readFileSync('$j','utf8'))" || fail "$j is not valid JSON"
done
grep -q '"name": "product-engineer"' .claude-plugin/plugin.json || fail "plugin name"
v=$(node -p "require('./package.json').version")
grep -q "\"version\": \"$v\"" .claude-plugin/plugin.json || fail "plugin version must equal package.json ($v)"
[ -f AGENTS.md ] || fail "AGENTS.md missing"
# The hook is generated from the headings table; every shipped block heading must be in it.
sed -n 's/^| \([a-z][a-z]\) | \([^|]*\) |.*/\2/p' skills/product-engineer/references/headings.md | while read -r h; do
  h=$(printf '%s' "$h" | sed 's/[[:space:]]*$//; s/:$//')
  grep -qF "$h" scripts/commit-msg || fail "commit-msg hook does not carry the heading: $h"
done
# The release-notes rules that the eval task 09 and its heuristics depend on. Each phrase is one a
# reader of the skill would need; without this check a rewrite could drop a rule without any test noticing.
rn="skills/release-notes/SKILL.md"
grep -qF '## Seven rules' "$rn" || fail "$rn: the heading must say Seven rules"
grep -qF 'docs-only' "$rn" || fail "$rn: rule 2 must name the docs-only commit that gets no line"
grep -qF 'version-bump' "$rn" || fail "$rn: rule 2 must name the version-bump commit that gets no line"
grep -qF 'Not in this release:' "$rn" || fail "$rn: rule 5 must keep the Not in this release section"
grep -qF 'reverted' "$rn" || fail "$rn: rule 5 must say a reverted item is not announced"
grep -qF 'Changes since v2.3.0 (commit abc1234 to def5678)' "$rn" || fail "$rn: rule 7 must show the range line"
grep -qF 'The release name goes on the line after' "$rn" || fail "$rn: rule 7 must place the release name after the range line"
grep -qF 'git log' "$rn" || fail "$rn: rule 7 must check the range against git log"
grep -qF 'faster' "$rn" || fail "$rn: rule 6 must name the unmeasured effect it forbids"
# The stubs check names the fallback first and the npx command from 0.8.0, and the commit split rule is kept.
grep -qF '`product-engineer stubs` does this mechanically' skills/done-means-observed/SKILL.md || fail "done-means-observed must say product-engineer stubs does it mechanically"
grep -qF '`npx product-engineer stubs` runs the same check' skills/done-means-observed/SKILL.md || fail "done-means-observed must name the npx form once, as the alternative"
grep -qF 'one commit per group' skills/customer-block/SKILL.md || fail "customer-block must split a mixed change into one commit per group"
grep -qF 'git restore --staged' skills/customer-block/SKILL.md || fail "customer-block must unstage a secret-looking file before the first commit"
# Benchmark values from the release-notes fixture must not return to the skills or the eval task.
for w in 'v1.4.0' '50 bookings' '50 per page' 'stayhub' 'bulk cancel' 'heatmap' 'orders-api' 'LICENCE-plain' 'sk_live' 'refund' 'hereinafter' 'Licensee'; do
  if grep -rqiF -- "$w" skills evals/tasks/09-release-notes; then fail "skills or eval task 09 must not contain the benchmark value: $w"; fi
done
# Round 2 (task 17): the unfinished-integration rule is the first section of done-means-observed; the
# fix, refactor and plain-language rewrite rules are in the core skill and in customer-block.
dms="skills/done-means-observed/SKILL.md"
[ "$(grep '^## ' "$dms" | head -1)" = "## Part of the work cannot run yet" ] || fail "$dms: the first section must be 'Part of the work cannot run yet'"
grep -q '^description:.*501' "$dms" || fail "$dms: the description must name the 501 or 503 response"
grep -qF 'HTTP 501 or 503' "$dms" || fail "$dms: the unfinished-integration rule must name HTTP 501 or 503"
grep -qF 'no TODO, FIXME or' "$dms" || fail "$dms: the rule must forbid a TODO, FIXME or return null marker"
grep -qF 'nothing happens yet' "$dms" || fail "$dms: the answer must say plainly that nothing happens yet"
ps="skills/product-engineer/SKILL.md"
grep -qF 'HTTP 501 or 503' "$ps" || fail "$ps: rule 4 must mirror the 501 or 503 rule"
grep -qF 'fails before the fix and passes after' "$ps" || fail "$ps: rule 3 must say a fix ships with a test that fails before and passes after"
grep -qF 'users see no change' "$ps" || fail "$ps: rule 3 must say a refactor claims users see no change"
grep -q '^description:.*rewrite in plain language' "$ps" || fail "$ps: the description must name the rewrite in plain language trigger"
grep -qF 'product-engineer facts source rewrite' "$ps" || fail "$ps: the rewrite rule must run product-engineer facts source rewrite"
grep -qF 'sentences at most 20 words on average and 35 at most' "$ps" || fail "$ps: the rewrite rule must state the sentence limits"
cbs="skills/customer-block/SKILL.md"
grep -qF 'fails before the fix and passes after' "$cbs" || fail "$cbs: a fix without a test that fails before and passes after is not done"
grep -qF 'users see no change' "$cbs" || fail "$cbs: a refactor says users see no change"
grep -qF 'unless you measured it' "$cbs" || fail "$cbs: a refactor names no benefit unless measured"
echo "ok: skill structure (4 skills)"
