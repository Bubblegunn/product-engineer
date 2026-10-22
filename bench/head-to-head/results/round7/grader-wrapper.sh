#!/bin/bash
# Grader wrapper for the Agent SDK shim. The shim does not read stdin when -p has a prompt argument (the plain CLI appends piped
# stdin to it), so the grader material was lost and the pipe broke (EPIPE). This wrapper moves the -p prompt behind the stdin
# material, as the CLI does, and calls the SDK shim, not the real CLI. Set PE_BENCH_CLAUDE to this file.
prompt=""; args=(); skip=0
while [ $# -gt 0 ]; do
  if [ "$1" = "-p" ] && [ -n "${2:-}" ] && [ "$skip" = 0 ]; then prompt=$2; args+=("-p"); shift 2; skip=1; continue; fi
  args+=("$1"); shift
done
{ cat; printf '\n\n%s\n' "$prompt"; } | <RUNS>/sdk-shim/claude "${args[@]}"
