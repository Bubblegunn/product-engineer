#!/bin/sh
# pre-commit framework entry (stage commit-msg): the message file is the first argument.
# A hook never shows the star hint: the opt-out is set here, whatever the terminal looks like.
export PRODUCT_ENGINEER_NO_STAR_HINT=1
exec node "$(dirname "$0")/../bin/check.mjs" check "$1"
