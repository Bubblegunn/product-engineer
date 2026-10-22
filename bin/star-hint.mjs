// The one-time star hint for the product-engineer CLI. It prints one line on stderr after a
// successful run in a terminal, once per machine, and never in CI, in a pipe, in an agent's
// session, in a git hook, or after --quiet or the opt-out variable. Zero dependencies.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const STAR_HINT = "If product-engineer saved you a review round, a star on GitHub helps others find it: https://github.com/Bubblegunn/product-engineer (shown once; PRODUCT_ENGINEER_NO_STAR_HINT=1 hides it)";

const AGENT_VARS = ["CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT", "CODEX_SANDBOX", "CURSOR_AGENT", "GEMINI_CLI", "AIDER_CHAT_HISTORY_FILE", "AGENT"];
const HOOK_VARS = ["GIT_INDEX_FILE", "GIT_EXEC_PATH", "PRE_COMMIT"];

const set = (value) => typeof value === "string" && value !== "";

/** $XDG_CONFIG_HOME when it is set, otherwise ~/.config. */
export function defaultConfigDir(env = process.env) {
  return set(env.XDG_CONFIG_HOME) ? env.XDG_CONFIG_HOME : join(homedir(), ".config");
}

/** The marker that records the hint was shown on this machine. */
export function markerPath(configDir) {
  return join(configDir, "product-engineer", "star-hint-shown");
}

/**
 * Print the hint when every condition allows it. Returns true when it printed.
 * The marker is written before the text, so a config directory that cannot be written
 * suppresses the hint instead of repeating it on every run.
 */
export function maybeShowStarHint({
  exitCode,
  stdout = process.stdout,
  stderr = process.stderr,
  env = process.env,
  argv = [],
  configDir = defaultConfigDir(env),
  write = (text) => stderr.write(text),
} = {}) {
  if (exitCode !== 0) return false;
  if (!stdout?.isTTY || !stderr?.isTTY) return false;
  if (set(env.CI)) return false;
  if (AGENT_VARS.some((name) => set(env[name]))) return false;
  if (HOOK_VARS.some((name) => set(env[name]))) return false;
  if (argv.includes("--quiet") || argv.includes("-q")) return false;
  if (env.PRODUCT_ENGINEER_NO_STAR_HINT === "1") return false;
  // Machine-readable output and the template subcommand are data for a program or a commit message.
  if (argv.includes("--json")) return false;
  if (argv.includes("--format=json")) return false;
  if (argv.some((arg, i) => arg === "--format" && argv[i + 1] === "json")) return false;
  if (argv[0] === "template") return false;
  const marker = markerPath(configDir);
  // Kept although the wx write below also refuses an existing marker: it skips a mkdir and an
  // open on every run after the first. Deleting it alone changes nothing observable.
  if (existsSync(marker)) return false;
  try {
    mkdirSync(dirname(marker), { recursive: true });
    writeFileSync(marker, "shown\n", { flag: "wx" });
  } catch {
    return false;
  }
  write(`${STAR_HINT}\n`);
  return true;
}
