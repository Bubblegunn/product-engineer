#!/bin/bash
G=/private/tmp/pe-r11-final-work; TF=/private/tmp/pe-r11/final/prep/tasks.json; TL=X141,X142,X143,X144,X145,X146
for v in 1 2 3; do (/tmp/gradex.sh $G $TF $TL $v > /private/tmp/pe-r11/f-$v.log 2>&1 &); done
until grep -q VOTEDONE /private/tmp/pe-r11/f-1.log && grep -q VOTEDONE /private/tmp/pe-r11/f-2.log && grep -q VOTEDONE /private/tmp/pe-r11/f-3.log; do sleep 20; done
for v in 4 5; do (/tmp/gradex.sh $G $TF $TL $v > /private/tmp/pe-r11/f-$v.log 2>&1 &); done
until grep -q VOTEDONE /private/tmp/pe-r11/f-4.log && grep -q VOTEDONE /private/tmp/pe-r11/f-5.log; do sleep 20; done
echo FVOTES5
