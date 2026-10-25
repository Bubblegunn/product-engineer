#!/bin/bash
G=/private/tmp/pe-r11-gate5-work; TF=/private/tmp/pe-r11/gate5/prep/tasks.json; TL=X151,X152,X153,X154,X161,X162,X163,X164,X171,X172,X173,X174
for v in 1 2 3; do (/tmp/gradex.sh $G $TF $TL $v > /private/tmp/pe-r11/g5-$v.log 2>&1 &); done
until grep -q VOTEDONE /private/tmp/pe-r11/g5-1.log && grep -q VOTEDONE /private/tmp/pe-r11/g5-2.log && grep -q VOTEDONE /private/tmp/pe-r11/g5-3.log; do sleep 20; done
for v in 4 5; do (/tmp/gradex.sh $G $TF $TL $v > /private/tmp/pe-r11/g5-$v.log 2>&1 &); done
until grep -q VOTEDONE /private/tmp/pe-r11/g5-4.log && grep -q VOTEDONE /private/tmp/pe-r11/g5-5.log; do sleep 20; done
echo G5VOTES5
