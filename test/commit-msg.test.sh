#!/bin/sh
# test/commit-msg.test.sh
set -eu
hook="scripts/commit-msg"
tmp=$(mktemp -d)
pass=0; fail=0
check() { # $1 expected exit, $2 name, $3 message
  printf '%s\n' "$3" > "$tmp/msg"
  if sh "$hook" "$tmp/msg" >/dev/null 2>&1; then got=0; else got=1; fi
  if [ "$got" = "$1" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: $2 (expected exit $1, got $got)"; fi
}
check 0 "full block" "feat: thing

For the customer:
What changed: People can export their bookings.
Why it matters: Accountants asked for it every month."
check 1 "missing block" "feat: thing without the block"
check 1 "heading without what-changed" "feat: thing

For the customer:
Why it matters: nothing"
check 0 "merge commit" "Merge branch 'main' into feature"
check 0 "fixup" "fixup! feat: thing"
check 0 "revert" "Revert \"feat: thing\""
check 0 "opt out" "chore: bump deps [no-customer]"
rm -rf "$tmp"
echo "commit-msg: $pass passed, $fail failed"
[ "$fail" = 0 ]
