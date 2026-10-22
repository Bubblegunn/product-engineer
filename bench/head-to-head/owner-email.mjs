#!/usr/bin/env node
// The owner's account address, read at run time, and its redaction. The Claude CLI puts the logged-in account's address
// into the agent's context, so it can appear in a transcript. Graded material and published files replace it with
// user@example.com (docs/HEAD-TO-HEAD.md, "Changes after the freeze"). The address is read from
// $REAL_HOME/.claude.json (default $HOME; PE_BENCH_REAL_CLAUDE_JSON overrides the file) and is never written anywhere.
// CLI: node owner-email.mjs --scrub-tree <dir>, with the address in PE_OWNER_EMAIL, rewrites every text file under dir.
import { existsSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const PLACEHOLDER = "user@example.com";

export function ownerClaudeJson(env = process.env) {
  return env.PE_BENCH_REAL_CLAUDE_JSON || join(env.REAL_HOME || env.HOME, ".claude.json");
}

// The address, or null when the file is absent or holds no account address. Throws when the file is not JSON, so a
// broken file never reads as "no address".
export function ownerEmail(env = process.env) {
  const file = ownerClaudeJson(env);
  if (!existsSync(file)) return null;
  const real = JSON.parse(readFileSync(file, "utf8"));
  const mail = real && real.oauthAccount ? real.oauthAccount.emailAddress : undefined;
  return typeof mail === "string" && mail.includes("@") ? mail.trim() : null;
}

const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

// Replaces the address, in any letter case, with user@example.com. It also replaces the local part followed by an @ and
// a domain, so the same account under another domain does not survive. Over-replacing is the safe direction.
export function redactOwnerEmail(text, email) {
  if (!email) return text;
  const at = email.indexOf("@");
  const local = email.slice(0, at);
  let out = text.replace(new RegExp(escapeRe(email), "gi"), PLACEHOLDER);
  if (local !== "") {
    out = out.replace(new RegExp(`(?<![A-Za-z0-9._%+-])${escapeRe(local)}@[A-Za-z0-9.-]*`, "gi"), PLACEHOLDER);
  }
  return out;
}

// Rewrites every text file under dir (files holding a NUL byte are binary and skipped). Returns the number rewritten.
export function scrubTree(dir, email) {
  let rewritten = 0;
  for (const name of readdirSync(dir, { recursive: true })) {
    const path = join(dir, name);
    if (!statSync(path).isFile()) continue;
    const buffer = readFileSync(path);
    if (buffer.includes(0)) continue;
    const text = buffer.toString("utf8");
    const clean = redactOwnerEmail(text, email);
    if (clean !== text) {
      writeFileSync(path, clean);
      rewritten += 1;
    }
  }
  return rewritten;
}

const isMain = Boolean(process.argv[1]) && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--scrub-tree") {
    process.stderr.write("usage: owner-email.mjs --scrub-tree <dir> (address in PE_OWNER_EMAIL)\n");
    process.exit(2);
  }
  const email = process.env.PE_OWNER_EMAIL || null;
  if (email) scrubTree(args[1], email);
}
