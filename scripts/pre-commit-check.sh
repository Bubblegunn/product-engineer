#!/bin/sh
# pre-commit framework entry (stage commit-msg): the message file is the first argument.
exec node "$(dirname "$0")/../bin/check.mjs" check "$1"
