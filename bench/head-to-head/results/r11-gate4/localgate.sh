#!/bin/bash
# localgate.sh <sha>: Linux gate in Docker node 20/22/24 on a fresh clone of the sha (a clone, not an archive: tests read .git)
SHA=$1
cd /Users/efe/Desktop/Open-Source/projelerim/product-engineer
for N in ${NODES:-20 22 24}; do
  D=/private/tmp/pe-gate-$N; rm -rf $D
  git clone -q --no-hardlinks . $D && git -C $D checkout -q $SHA
  ( docker run --rm -v $D:/w -w /w -e CI=1 node:$N bash -c 'mkdir -p /root/.claude; echo "{}" > /root/.claude.json; echo "{}" > /root/.claude/settings.json; git config --global --add safe.directory "*"; git config --global user.email a@b.c; git config --global user.name t; git config --global init.defaultBranch main; npm test' > /private/tmp/pe-r11/lx$N-$SHA.log 2>&1; echo "exit $?" >> /private/tmp/pe-r11/lx$N-$SHA.log ) &
done
wait
for N in ${NODES:-20 22 24}; do echo "node $N: $(grep -E '^(ℹ|#) (tests|pass|fail) ' /private/tmp/pe-r11/lx$N-$SHA.log | tr '\n' ' ') $(tail -1 /private/tmp/pe-r11/lx$N-$SHA.log)"; done
