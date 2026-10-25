#!/bin/bash
G=/private/tmp/pe-r11-gate4-work; TF=/private/tmp/pe-r11/gate4/prep/tasks.json; TL=X111,X112,X113,X114,X121,X122,X123,X124,X131,X132,X133,X134
for v in 1 2 3; do (/tmp/gradex.sh $G $TF $TL $v > /private/tmp/pe-r11/g4-$v.log 2>&1 &); done
until grep -q VOTEDONE /private/tmp/pe-r11/g4-1.log && grep -q VOTEDONE /private/tmp/pe-r11/g4-2.log && grep -q VOTEDONE /private/tmp/pe-r11/g4-3.log; do sleep 20; done
for v in 4 5; do (/tmp/gradex.sh $G $TF $TL $v > /private/tmp/pe-r11/g4-$v.log 2>&1 &); done
until grep -q VOTEDONE /private/tmp/pe-r11/g4-4.log && grep -q VOTEDONE /private/tmp/pe-r11/g4-5.log; do sleep 20; done
echo G4VOTES5
